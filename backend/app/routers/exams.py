import datetime
import json
import random
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, List, Dict, Any
from ..database import get_db, log_activity
from ..dependencies import get_current_user, get_current_student, get_current_admin, get_current_super_admin, get_current_staff, get_optional_user, check_student_subscription, get_active_student_or_admin
from ..models import ExamCreateRequest, ExamUpdateRequest, ExamSubmitRequest

router = APIRouter(prefix="/api/exams", tags=["Exams & Evaluation"])

@router.get("")
def get_exams(unit_id: Optional[str] = None, current_user: Optional[dict] = Depends(get_optional_user)):
    """Fetch exams with student attempt summary."""
    user_id = current_user["id"] if current_user else None
    is_admin = current_user and current_user.get("role") == "admin"

    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT e.*, u.title as unit_title FROM exams e LEFT JOIN units u ON e.unit_id = u.id"
        params = []
        conds = []

        if not is_admin:
            conds.append("e.is_published = 1")
        if unit_id:
            conds.append("e.unit_id = ?")
            params.append(unit_id)

        if conds:
            query += " WHERE " + " AND ".join(conds)
        query += " ORDER BY e.created_at ASC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        result = []
        for r in rows:
            e = dict(r)
            e_id = e["id"]
            
            # Fetch question count
            cursor.execute("SELECT COUNT(*) as cnt FROM exam_questions WHERE exam_id = ?", (e_id,))
            q_cnt = cursor.fetchone()["cnt"]
            e["totalQuestions"] = q_cnt if q_cnt > 0 else e.get("total_questions", 10)

            # Student attempts stats
            e["myAttemptsCount"] = 0
            e["bestScore"] = None
            e["passed"] = False
            if user_id:
                cursor.execute("""
                SELECT COUNT(*) as cnt, MAX(percentage) as best, MAX(passed) as is_passed
                FROM exam_attempts WHERE student_id = ? AND exam_id = ?
                """, (user_id, e_id))
                st = cursor.fetchone()
                if st:
                    e["myAttemptsCount"] = st["cnt"]
                    e["bestScore"] = st["best"]
                    e["passed"] = bool(st["is_passed"])

            e["isPublished"] = bool(e["is_published"])
            result.append(e)

        return {"success": True, "exams": result}

@router.get("/{exam_id}")
def get_exam_detail(exam_id: str, current_user: Optional[dict] = Depends(get_optional_user)):
    """Fetch exam details and questions. Never exposes answers to students prior to submission."""
    if current_user and current_user.get("role") != "admin":
        if not check_student_subscription(current_user):
            raise HTTPException(status_code=403, detail="انتهى اشتراكك، يرجى تجديد الاشتراك.")
    is_admin = current_user and current_user.get("role") == "admin"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT e.*, u.title as unit_title FROM exams e LEFT JOIN units u ON e.unit_id = u.id WHERE e.id = ?", (exam_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الاختبار غير موجود")
        
        exam = dict(row)
        if not exam["is_published"] and not is_admin:
            raise HTTPException(status_code=403, detail="هذا الاختبار غير منشور حاليًا")

        # Fetch questions assigned to this exam
        cursor.execute("""
        SELECT q.*, eq.order_index as exam_order
        FROM exam_questions eq
        JOIN questions q ON eq.question_id = q.id
        WHERE eq.exam_id = ? AND (q.is_published = 1 OR ? = 1)
        ORDER BY eq.order_index ASC
        """, (exam_id, 1 if is_admin else 0))
        q_rows = cursor.fetchall()
        
        # If no questions explicitly linked, fetch from unit
        if not q_rows and exam.get("unit_id"):
            cursor.execute("""
            SELECT q.*, 0 as exam_order
            FROM questions q
            WHERE q.unit_id = ? AND (q.is_published = 1 OR ? = 1)
            ORDER BY q.created_at ASC LIMIT ?
            """, (exam["unit_id"], 1 if is_admin else 0, exam.get("total_questions", 10)))
            q_rows = cursor.fetchall()

        questions = []
        for qr in q_rows:
            qd = dict(qr)
            q_id = qd["id"]
            
            cursor.execute("SELECT option_key as key, option_text as text, is_correct as isCorrect FROM question_options WHERE question_id = ? ORDER BY id ASC", (q_id,))
            opts = [dict(opt) for opt in cursor.fetchall()]
            
            qd["options"] = [opt["text"] for opt in opts]
            
            # Security Rule: Redact correct answers and explanations for students taking the exam
            if not is_admin:
                qd.pop("correct_answer", None)
                qd.pop("explanation", None)
                for opt in opts:
                    opt.pop("isCorrect", None)
            else:
                qd["optionsDetailed"] = opts
                if qd.get("correct_answer") is not None:
                    try:
                        qd["correctAnswer"] = int(qd["correct_answer"])
                    except ValueError:
                        qd["correctAnswer"] = qd["correct_answer"]

            questions.append(qd)

        if exam.get("randomize_questions") and not is_admin:
            random.shuffle(questions)

        exam["isPublished"] = bool(exam["is_published"])
        exam["totalQuestions"] = len(questions)
        exam["questions"] = questions

        return {
            "success": True,
            "exam": exam,
            "questions": questions
        }

@router.post("/submit")
def submit_exam(req: ExamSubmitRequest, student: dict = Depends(get_active_student_or_admin)):
    """Server-side graded exam evaluation and persistence to prevent client-side score manipulation."""
    student_id = student["id"]
    exam_id = req.exam_id
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        
        # Verify exam
        cursor.execute("SELECT * FROM exams WHERE id = ?", (exam_id,))
        exam_row = cursor.fetchone()
        if not exam_row:
            raise HTTPException(status_code=404, detail="الاختبار غير موجود")
        exam = dict(exam_row)

        # Fetch questions for this exam
        cursor.execute("""
        SELECT q.*
        FROM exam_questions eq
        JOIN questions q ON eq.question_id = q.id
        WHERE eq.exam_id = ?
        ORDER BY eq.order_index ASC
        """, (exam_id,))
        q_rows = cursor.fetchall()
        
        if not q_rows and exam.get("unit_id"):
            cursor.execute("SELECT * FROM questions WHERE unit_id = ? ORDER BY created_at ASC LIMIT ?", (exam["unit_id"], exam.get("total_questions", 10)))
            q_rows = cursor.fetchall()

        if not q_rows:
            # Fallback to all questions
            cursor.execute("SELECT * FROM questions LIMIT 10")
            q_rows = cursor.fetchall()

        total_count = len(q_rows)
        correct_count = 0
        total_possible_score = 0
        earned_score = 0
        
        detailed_reviews = []
        topic_performance = {}

        opt_keys = ["A", "B", "C", "D", "E", "F"]

        for qr in q_rows:
            q = dict(qr)
            q_id = q["id"]
            q_score = q.get("score", 10)
            total_possible_score += q_score
            
            # Fetch options
            cursor.execute("SELECT option_key as key, option_text as text, is_correct as isCorrect FROM question_options WHERE question_id = ? ORDER BY id ASC", (q_id,))
            options_rows = [dict(opt) for opt in cursor.fetchall()]
            options_texts = [opt["text"] for opt in options_rows]

            # Determine correct option index and value
            correct_raw = q.get("correct_answer", "0")
            correct_idx = 0
            try:
                correct_idx = int(correct_raw)
            except ValueError:
                # Key match
                for i, k in enumerate(opt_keys):
                    if k == correct_raw:
                        correct_idx = i
                        break

            student_answer_raw = req.answers.get(q_id)
            student_idx = None
            if student_answer_raw is not None:
                try:
                    student_idx = int(student_answer_raw)
                except ValueError:
                    for i, k in enumerate(opt_keys):
                        if k == str(student_answer_raw):
                            student_idx = i
                            break

            is_correct = (student_idx == correct_idx)
            if is_correct:
                correct_count += 1
                earned_score += q_score

            topic = q.get("type", "عام")
            if topic not in topic_performance:
                topic_performance[topic] = {"correct": 0, "total": 0}
            topic_performance[topic]["total"] += 1
            if is_correct:
                topic_performance[topic]["correct"] += 1

            detailed_reviews.append({
                "questionId": q_id,
                "question": q["question"],
                "options": options_texts,
                "selectedAnswer": student_idx,
                "correctAnswer": correct_idx,
                "isCorrect": is_correct,
                "explanation": q.get("explanation", ""),
                "score": q_score if is_correct else 0
            })

        percentage = round((earned_score / total_possible_score * 100)) if total_possible_score > 0 else 0
        passing_score = exam.get("passing_score", 60)
        passed = (percentage >= passing_score)

        # Strengths & Weaknesses analysis
        strengths = []
        weaknesses = []
        for topic, stat in topic_performance.items():
            topic_name = "المتغيرات وأنواع البيانات" if "mcq" in topic else ("التفكير المنطقي والخوارزميات" if "true_false" in topic else "كتابة وتتبع الكود")
            if stat["correct"] == stat["total"]:
                if topic_name not in strengths:
                    strengths.append(topic_name)
            else:
                if topic_name not in weaknesses:
                    weaknesses.append(topic_name)

        if not strengths:
            strengths.append("المفاهيم النظرية الأساسية")
        if not weaknesses:
            weaknesses.append("لا توجد نقاط ضعف ملحوظة — أداء استثنائي!")

        # Create Attempt Record
        now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
        attempt_id = f"att_{now_ts}"
        cursor.execute("""
        INSERT INTO exam_attempts (
            id, exam_id, student_id, score, total_score, percentage, correct_count, total_count,
            time_spent_seconds, strengths_json, weaknesses_json, passed, started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            attempt_id, exam_id, student_id, earned_score, total_possible_score, percentage,
            correct_count, total_count, req.time_spent_seconds,
            json.dumps(strengths), json.dumps(weaknesses), 1 if passed else 0, now, now
        ))

        # Save Answers
        for r in detailed_reviews:
            cursor.execute("""
            INSERT INTO exam_answers (id, attempt_id, question_id, selected_option, is_correct)
            VALUES (?, ?, ?, ?, ?)
            """, (f"ans_{attempt_id}_{r['questionId']}", attempt_id, r["questionId"], str(r["selectedAnswer"]), 1 if r["isCorrect"] else 0))

        # Award Student XP and update stats
        xp_gain = 100 if passed else 30
        cursor.execute("""
        UPDATE student_profiles
        SET xp = xp + ?, last_activity = ?, updated_at = ?
        WHERE user_id = ?
        """, (xp_gain, now, now, student_id))

        # Notification for completion
        now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
        notif_id = f"notif_{now_ts}"
        notif_title = f"🎉 أحسنت! أنهيت {exam['title']}" if passed else f"📝 تم إنهاء {exam['title']}"
        notif_msg = f"حصلت على نتيجة {percentage}% ({correct_count}/{total_count} إجابة صحيحة)."
        cursor.execute("""
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        """, (notif_id, student_id, notif_title, notif_msg, 'success' if passed else 'info', f"#exam-result/{attempt_id}", now))

        return {
            "success": True,
            "attemptId": attempt_id,
            "score": earned_score,
            "totalScore": total_possible_score,
            "percentage": percentage,
            "correctCount": correct_count,
            "totalCount": total_count,
            "passed": passed,
            "timeSpentSeconds": req.time_spent_seconds,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "questions": detailed_reviews,
            "xpAwarded": xp_gain,
            "message": "تم رصد النتيجة وتقييم الاختبار بنجاح"
        }

@router.get("/attempts/{attempt_id}")
def get_attempt_result(attempt_id: str, current_user: dict = Depends(get_current_user)):
    """Retrieve full graded exam attempt breakdown."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT ea.*, e.title as exam_title, e.description as exam_description, u.title as unit_title
        FROM exam_attempts ea
        JOIN exams e ON ea.exam_id = e.id
        LEFT JOIN units u ON e.unit_id = u.id
        WHERE ea.id = ?
        """, (attempt_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="نتيجة الاختبار غير موجودة")

        attempt = dict(row)
        
        # Access control: only owner or admin can view attempt
        if current_user["role"] != "admin" and attempt["student_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="لا يمكنك استعراض نتائج طالب آخر")

        # Fetch answers and questions
        cursor.execute("""
        SELECT ea.selected_option, ea.is_correct as answer_is_correct, q.*
        FROM exam_answers ea
        JOIN questions q ON ea.question_id = q.id
        WHERE ea.attempt_id = ?
        """, (attempt_id,))
        ans_rows = cursor.fetchall()
        
        questions_review = []
        opt_keys = ["A", "B", "C", "D", "E", "F"]
        for ar in ans_rows:
            qd = dict(ar)
            q_id = qd["id"]
            cursor.execute("SELECT option_key as key, option_text as text FROM question_options WHERE question_id = ? ORDER BY id ASC", (q_id,))
            opts = [dict(opt) for opt in cursor.fetchall()]
            
            c_raw = qd.get("correct_answer", "0")
            c_idx = 0
            try:
                c_idx = int(c_raw)
            except ValueError:
                for i, k in enumerate(opt_keys):
                    if k == c_raw:
                        c_idx = i
                        break

            sel_idx = None
            if qd.get("selected_option") is not None and qd["selected_option"] != "None":
                try:
                    sel_idx = int(qd["selected_option"])
                except ValueError:
                    sel_idx = None

            questions_review.append({
                "questionId": q_id,
                "question": qd["question"],
                "options": [opt["text"] for opt in opts],
                "selectedAnswer": sel_idx,
                "correctAnswer": c_idx,
                "isCorrect": bool(qd["answer_is_correct"]),
                "explanation": qd.get("explanation", ""),
                "score": qd.get("score", 10) if qd["answer_is_correct"] else 0
            })

        attempt["exam"] = {
            "id": attempt["exam_id"],
            "title": attempt.get("exam_title", "الاختبار الشامل"),
            "unitTitle": attempt.get("unit_title", "المنهج الدراسي")
        }
        attempt["strengths"] = json.loads(attempt["strengths_json"]) if attempt.get("strengths_json") else []
        attempt["weaknesses"] = json.loads(attempt["weaknesses_json"]) if attempt.get("weaknesses_json") else []
        attempt["questions"] = questions_review

        return {"success": True, "result": attempt}

@router.get("/admin/all-results")
def get_admin_all_results(
    search: Optional[str] = None,
    exam_id: Optional[str] = None,
    grade: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Search and filter all student exam results."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
        SELECT ea.*, u.name as student_name, u.phone as student_phone, u.avatar as student_avatar,
               sp.grade as student_grade, e.title as exam_title
        FROM exam_attempts ea
        JOIN users u ON ea.student_id = u.id
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        JOIN exams e ON ea.exam_id = e.id
        """
        params = []
        conds = []

        if search:
            conds.append("(u.name LIKE ? OR u.phone LIKE ? OR e.title LIKE ?)")
            p = f"%{search.strip()}%"
            params.extend([p, p, p])
        if exam_id:
            conds.append("ea.exam_id = ?")
            params.append(exam_id)
        if grade:
            conds.append("sp.grade = ?")
            params.append(grade)

        if conds:
            query += " WHERE " + " AND ".join(conds)
        query += " ORDER BY ea.completed_at DESC"

        cursor.execute(query, params)
        results = [dict(r) for r in cursor.fetchall()]
        return {"success": True, "results": results}

@router.post("")
def create_exam(req: ExamCreateRequest, staff: dict = Depends(get_current_staff)):
    """Admin: Create new exam."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    e_id = f"exam_{now_ts}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO exams (id, unit_id, title, description, duration_minutes, total_questions, passing_score, attempts_allowed, randomize_questions, is_published, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            e_id, req.unit_id, req.title, req.description, req.duration_minutes, req.total_questions,
            req.passing_score, req.attempts_allowed, 1 if req.randomize_questions else 0,
            1 if req.is_published else 0, now, now
        ))

        # Insert question mappings if provided
        q_list = getattr(req, 'question_ids', None) or [q['id'] if isinstance(q, dict) else q for q in (getattr(req, 'questions', None) or [])]
        for idx, q_id in enumerate(q_list):
            cursor.execute("SELECT 1 FROM exam_questions WHERE exam_id = ? AND question_id = ?", (e_id, str(q_id)))
            if not cursor.fetchone():
                cursor.execute("""
                INSERT INTO exam_questions (id, exam_id, question_id, order_index)
                VALUES (?, ?, ?, ?)
                """, (f"eq_{e_id}_{q_id}", e_id, str(q_id), idx))

        log_activity(
            user_id=staff["id"],
            user_name=staff["name"],
            user_role=staff["role"],
            action="CREATE_EXAM",
            target_type="EXAM",
            target_id=e_id,
            target_name=req.title,
            details={"unit_id": req.unit_id, "duration": req.duration_minutes},
            conn=conn
        )

        return {"success": True, "exam_id": e_id, "message": "تم إنشاء الاختبار بنجاح"}

@router.put("/{exam_id}")
def update_exam(exam_id: str, req: ExamUpdateRequest, staff: dict = Depends(get_current_staff)):
    """Admin: Update exam settings and assigned questions."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM exams WHERE id = ?", (exam_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="الاختبار غير موجود")

        updates = []
        params = []
        for field, val in req.dict(exclude_unset=True).items():
            if field == "question_ids":
                continue
            if field == "is_published":
                updates.append("is_published = ?")
                params.append(1 if val else 0)
            elif field == "randomize_questions":
                updates.append("randomize_questions = ?")
                params.append(1 if val else 0)
            else:
                updates.append(f"{field} = ?")
                params.append(val)

        if updates:
            updates.append("updated_at = ?")
            params.append(now)
            params.append(exam_id)
            cursor.execute(f"UPDATE exams SET {', '.join(updates)} WHERE id = ?", params)

        if req.question_ids is not None:
            cursor.execute("DELETE FROM exam_questions WHERE exam_id = ?", (exam_id,))
            for idx, q_id in enumerate(req.question_ids):
                cursor.execute("""
                INSERT INTO exam_questions (id, exam_id, question_id, order_index)
                VALUES (?, ?, ?, ?)
                """, (f"eq_{exam_id}_{q_id}", exam_id, q_id, idx))

        return {"success": True, "message": "تم تحديث الاختبار بنجاح"}

@router.delete("/{exam_id}")
def delete_exam(exam_id: str, staff: dict = Depends(get_current_staff)):
    """Admin: Delete exam."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM exams WHERE id = ?", (exam_id,))
        return {"success": True, "message": "تم حذف الاختبار بنجاح"}
