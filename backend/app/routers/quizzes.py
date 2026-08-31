import datetime
import json
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, List, Dict, Any

from ..database import get_db
from ..dependencies import get_current_user, get_current_student, get_current_admin, get_optional_user, check_student_subscription, get_active_student_or_admin
from ..models import QuizCreateRequest, QuizUpdateRequest, QuizSubmitRequest

router = APIRouter(prefix="/api/quizzes", tags=["Quizzes & Mini-Assessments"])

opt_keys = ["A", "B", "C", "D", "E", "F"]


def _format_question_for_quiz(q_row: dict, cursor, is_admin: bool) -> dict:
    """Format question dict and redact answer/explanation for students."""
    qd = dict(q_row)
    q_id = qd["id"]

    cursor.execute("""
    SELECT option_key as key, option_text as text, is_correct as isCorrect
    FROM question_options
    WHERE question_id = ?
    ORDER BY order_index ASC, id ASC
    """, (q_id,))
    opts = [dict(opt) for opt in cursor.fetchall()]

    qd["options"] = [opt["text"] for opt in opts]
    qd["optionsDetailed"] = opts

    if not is_admin:
        qd.pop("correct_answer", None)
        qd.pop("correctAnswer", None)
        qd.pop("explanation", None)
        for opt in opts:
            opt["isCorrect"] = False

    return qd


@router.get("")
def get_quizzes(unit_id: Optional[str] = None, lesson_id: Optional[str] = None, current_user: Optional[dict] = Depends(get_optional_user)):
    """Fetch quizzes list. Filter by unit_id or lesson_id."""
    is_admin = current_user and current_user.get("role") == "admin"
    user_id = current_user["id"] if current_user else None

    with get_db() as conn:
        cursor = conn.cursor()
        query = """
        SELECT q.*, l.title as lesson_title, u.title as unit_title
        FROM quizzes q
        LEFT JOIN lessons l ON q.lesson_id = l.id
        LEFT JOIN units u ON q.unit_id = u.id
        """
        params = []
        conds = []

        if not is_admin:
            conds.append("(q.is_published = 1 OR q.published = 1)")
        if unit_id:
            conds.append("q.unit_id = ?")
            params.append(unit_id)
        if lesson_id:
            conds.append("q.lesson_id = ?")
            params.append(lesson_id)

        if conds:
            query += " WHERE " + " AND ".join(conds)
        query += " ORDER BY q.created_at ASC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        result = []

        for r in rows:
            q_dict = dict(r)
            q_id = q_dict["id"]

            cursor.execute("SELECT COUNT(*) as cnt FROM quiz_questions WHERE quiz_id = ?", (q_id,))
            q_cnt = cursor.fetchone()["cnt"]
            q_dict["question_count"] = q_cnt

            q_dict["myAttemptsCount"] = 0
            q_dict["bestScore"] = None
            q_dict["passed"] = False

            if user_id:
                cursor.execute("""
                SELECT COUNT(*) as cnt, MAX(percentage) as best, MAX(passed) as is_passed
                FROM quiz_attempts
                WHERE quiz_id = ? AND student_id = ?
                """, (q_id, user_id))
                att_stat = cursor.fetchone()
                if att_stat:
                    q_dict["myAttemptsCount"] = att_stat["cnt"] or 0
                    q_dict["bestScore"] = att_stat["best"]
                    q_dict["passed"] = bool(att_stat["is_passed"])

            result.append(q_dict)

        return {"success": True, "quizzes": result}


@router.get("/lesson/{lesson_id}")
def get_quiz_for_lesson(lesson_id: str, current_user: Optional[dict] = Depends(get_optional_user)):
    """Fetch or generate quiz for a specific lesson with questions."""
    if current_user and current_user.get("role") != "admin":
        if not check_student_subscription(current_user):
            raise HTTPException(status_code=403, detail="انتهى اشتراكك، يرجى تجديد الاشتراك.")
    is_admin = current_user and current_user.get("role") == "admin"

    with get_db() as conn:
        cursor = conn.cursor()
        
        # Verify lesson exists
        cursor.execute("SELECT * FROM lessons WHERE id = ?", (lesson_id,))
        lesson = cursor.fetchone()
        if not lesson:
            raise HTTPException(status_code=404, detail="الدرس غير موجود")

        # Check if a quiz is registered in quizzes table
        cursor.execute("SELECT * FROM quizzes WHERE lesson_id = ?", (lesson_id,))
        quiz_row = cursor.fetchone()

        quiz_dict = None
        questions = []

        if quiz_row:
            quiz_dict = dict(quiz_row)
            cursor.execute("""
            SELECT q.*
            FROM quiz_questions qq
            JOIN questions q ON qq.question_id = q.id
            WHERE qq.quiz_id = ? AND (q.is_published = 1 OR ? = 1)
            ORDER BY qq.order_index ASC
            """, (quiz_dict["id"], 1 if is_admin else 0))
            q_rows = cursor.fetchall()
            for qr in q_rows:
                questions.append(_format_question_for_quiz(qr, cursor, is_admin))
        
        # If no quiz or no questions in quiz_questions, check direct questions linked to lesson_id
        if not questions:
            cursor.execute("""
            SELECT * FROM questions
            WHERE lesson_id = ? AND (is_published = 1 OR ? = 1)
            ORDER BY created_at ASC
            """, (lesson_id, 1 if is_admin else 0))
            direct_q_rows = cursor.fetchall()
            for qr in direct_q_rows:
                questions.append(_format_question_for_quiz(qr, cursor, is_admin))

        if not quiz_dict:
            quiz_dict = {
                "id": f"quiz_{lesson_id}",
                "lesson_id": lesson_id,
                "unit_id": lesson["unit_id"],
                "title": f"اختبار قصير: {lesson['title']}",
                "description": "اختبر استيعابك للمفاهيم الأساسية الواردة في هذا الدرس",
                "duration_minutes": 10,
                "passing_score": 60,
                "is_published": True
            }

        quiz_dict["questions"] = questions
        quiz_dict["total_questions"] = len(questions)

        return {"success": True, "quiz": quiz_dict}


@router.get("/{quiz_id}")
def get_quiz_detail(quiz_id: str, current_user: Optional[dict] = Depends(get_optional_user)):
    """Fetch quiz details and questions."""
    if current_user and current_user.get("role") != "admin":
        if not check_student_subscription(current_user):
            raise HTTPException(status_code=403, detail="انتهى اشتراكك، يرجى تجديد الاشتراك.")
    is_admin = current_user and current_user.get("role") == "admin"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT q.*, l.title as lesson_title, u.title as unit_title FROM quizzes q LEFT JOIN lessons l ON q.lesson_id = l.id LEFT JOIN units u ON q.unit_id = u.id WHERE q.id = ?", (quiz_id,))
        row = cursor.fetchone()
        if not row:
            # Fallback to lesson-based quiz if ID format is quiz_lesson_X
            if quiz_id.startswith("quiz_"):
                l_id = quiz_id.replace("quiz_", "")
                return get_quiz_for_lesson(l_id, current_user)
            raise HTTPException(status_code=404, detail="الاختبار القصير غير موجود")

        quiz = dict(row)
        if not (quiz.get("is_published") or quiz.get("published")) and not is_admin:
            raise HTTPException(status_code=403, detail="هذا الاختبار القصير غير منشور حاليًا")

        cursor.execute("""
        SELECT q.*
        FROM quiz_questions qq
        JOIN questions q ON qq.question_id = q.id
        WHERE qq.quiz_id = ? AND (q.is_published = 1 OR ? = 1)
        ORDER BY qq.order_index ASC
        """, (quiz_id, 1 if is_admin else 0))
        q_rows = cursor.fetchall()

        questions = []
        for qr in q_rows:
            questions.append(_format_question_for_quiz(qr, cursor, is_admin))

        quiz["questions"] = questions
        quiz["total_questions"] = len(questions)

        return {"success": True, "quiz": quiz}


@router.post("/submit")
def submit_quiz(req: QuizSubmitRequest, student: dict = Depends(get_active_student_or_admin)):
    """
    Server-side evaluation and grading of student quiz submission.
    Calculates score, awards XP, records attempt, and returns review with explanations.
    """
    student_id = student["id"]
    quiz_id = req.quiz_id
    lesson_id = req.lesson_id
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()

        # Find questions
        q_rows = []
        passing_score = 60
        real_quiz_id = quiz_id

        if quiz_id and not quiz_id.startswith("quiz_"):
            cursor.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))
            quiz_row = cursor.fetchone()
            if quiz_row:
                passing_score = quiz_row["passing_score"] or 60
                lesson_id = quiz_row["lesson_id"] or lesson_id
                cursor.execute("""
                SELECT q.* FROM quiz_questions qq
                JOIN questions q ON qq.question_id = q.id
                WHERE qq.quiz_id = ?
                ORDER BY qq.order_index ASC
                """, (quiz_id,))
                q_rows = cursor.fetchall()

        if not q_rows and lesson_id:
            cursor.execute("SELECT * FROM questions WHERE lesson_id = ? ORDER BY created_at ASC", (lesson_id,))
            q_rows = cursor.fetchall()

        if not q_rows and quiz_id:
            # Fallback by unit or all
            cursor.execute("SELECT * FROM questions LIMIT 5")
            q_rows = cursor.fetchall()

        if not q_rows:
            raise HTTPException(status_code=400, detail="لا توجد أسئلة مسجلة لهذا الاختبار القصير")

        total_count = len(q_rows)
        correct_count = 0
        total_possible = 0
        earned_score = 0
        reviews = []

        for qr in q_rows:
            q = dict(qr)
            q_id = q["id"]
            q_score = q.get("score", 10) or 10
            total_possible += q_score

            cursor.execute("SELECT option_key as key, option_text as text, is_correct as isCorrect FROM question_options WHERE question_id = ? ORDER BY order_index ASC, id ASC", (q_id,))
            opts = [dict(opt) for opt in cursor.fetchall()]
            opt_texts = [o["text"] for o in opts]

            correct_raw = q.get("correct_answer", "0")
            correct_idx = 0
            try:
                correct_idx = int(correct_raw)
            except ValueError:
                for i, k in enumerate(opt_keys):
                    if k == correct_raw:
                        correct_idx = i
                        break

            # Find selected answer
            selected_val = req.answers.get(q_id)
            selected_idx = None
            if selected_val is not None:
                try:
                    selected_idx = int(selected_val)
                except ValueError:
                    for i, k in enumerate(opt_keys):
                        if k == str(selected_val):
                            selected_idx = i
                            break
                    if selected_idx is None:
                        for i, opt in enumerate(opts):
                            if opt["text"] == selected_val:
                                selected_idx = i
                                break

            is_correct = (selected_idx is not None and selected_idx == correct_idx)
            if is_correct:
                correct_count += 1
                earned_score += q_score

            reviews.append({
                "question_id": q_id,
                "question": q["question"],
                "options": opt_texts,
                "selected_option": selected_idx,
                "correct_answer": correct_idx,
                "is_correct": is_correct,
                "explanation": q.get("explanation") or "إجابة نموذجية."
            })

        percentage = round((earned_score / total_possible * 100)) if total_possible > 0 else 0
        passed = percentage >= passing_score
        xp_earned = 30 if passed else 10

        # Create or ensure quiz entry exists
        final_quiz_id = real_quiz_id or f"quiz_{lesson_id or 'gen'}"
        cursor.execute("SELECT id FROM quizzes WHERE id = ?", (final_quiz_id,))
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO quizzes (id, lesson_id, title, duration, duration_minutes, passing_score, is_published, published, created_at, updated_at)
            VALUES (?, ?, 'اختبار قصير للدرس', 10, 10, ?, 1, 1, ?, ?)
            """, (final_quiz_id, lesson_id, passing_score, now, now))

        now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
        attempt_id = f"qatt_{now_ts}"
        cursor.execute("""
        INSERT INTO quiz_attempts (id, quiz_id, student_id, score, percentage, passed, started_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (attempt_id, final_quiz_id, student_id, earned_score, percentage, 1 if passed else 0, now, now))

        for rev in reviews:
            ans_id = f"qans_{attempt_id}_{rev['question_id']}"
            cursor.execute("""
            INSERT INTO quiz_answers (id, attempt_id, question_id, selected_option, is_correct)
            VALUES (?, ?, ?, ?, ?)
            """, (ans_id, attempt_id, rev["question_id"], str(rev["selected_option"]), 1 if rev["is_correct"] else 0))

        # Award XP and update student profile
        cursor.execute("""
        UPDATE student_profiles
        SET xp = xp + ?, last_activity = ?, updated_at = ?
        WHERE user_id = ?
        """, (xp_earned, now, now, student_id))

        return {
            "success": True,
            "attempt_id": attempt_id,
            "score": earned_score,
            "total_score": total_possible,
            "percentage": percentage,
            "correct_count": correct_count,
            "total_count": total_count,
            "passed": passed,
            "xp_earned": xp_earned,
            "reviews": reviews,
            "message": f"تم تقييم الاختبار القصير بنجاح! نتيجتك: {percentage}% (+{xp_earned} XP)"
        }


@router.get("/attempts/{attempt_id}")
def get_quiz_attempt_result(attempt_id: str, current_user: dict = Depends(get_current_user)):
    """Fetch detailed result of a completed quiz attempt."""
    is_admin = current_user.get("role") == "admin"
    user_id = current_user["id"]

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM quiz_attempts WHERE id = ?", (attempt_id,))
        att_row = cursor.fetchone()
        if not att_row:
            raise HTTPException(status_code=404, detail="محاولة الاختبار القصير غير موجودة")

        att = dict(att_row)
        if not is_admin and att["student_id"] != user_id:
            raise HTTPException(status_code=403, detail="غير مصرح لك بالاطلاع على محاولة طالب آخر")

        cursor.execute("""
        SELECT qa.*, q.question, q.explanation, q.correct_answer, q.score
        FROM quiz_answers qa
        JOIN questions q ON qa.question_id = q.id
        WHERE qa.attempt_id = ?
        """, (attempt_id,))
        ans_rows = cursor.fetchall()
        answers = []
        for ar in ans_rows:
            ad = dict(ar)
            cursor.execute("SELECT option_key as key, option_text as text FROM question_options WHERE question_id = ?", (ad["question_id"],))
            ad["options"] = [o["text"] for o in cursor.fetchall()]
            answers.append(ad)

        att["answers"] = answers
        return {"success": True, "result": att}


# ==================== ADMIN QUIZ MANAGEMENT ====================

@router.post("")
def admin_create_quiz(req: QuizCreateRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Create new quiz."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    q_id = f"quiz_{now_ts}"
    duration = req.duration_minutes or req.duration or 10

    with get_db() as conn:
        cursor = conn.cursor()
        is_pub = 1 if (req.is_published if req.is_published is not None else req.published) else 0
        cursor.execute("""
        INSERT INTO quizzes (id, lesson_id, unit_id, title, description, duration, duration_minutes, passing_score, is_published, published, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (q_id, req.lesson_id, req.unit_id, req.title, req.description or "", duration, duration, req.passing_score or 60, is_pub, is_pub, now, now))

        if req.question_ids:
            for idx, qid in enumerate(req.question_ids):
                cursor.execute("""
                INSERT INTO quiz_questions (quiz_id, question_id, order_index)
                VALUES (?, ?, ?)
                """, (q_id, qid, idx))

        return {"success": True, "quiz_id": q_id, "message": "تم إنشاء الاختبار القصير بنجاح"}


@router.put("/{quiz_id}")
def admin_update_quiz(quiz_id: str, req: QuizUpdateRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Update quiz details and linked questions."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="الاختبار القصير غير موجود")

        updates = []
        params = []
        for field, val in req.dict(exclude_unset=True).items():
            if field == "question_ids":
                continue
            if field in ("is_published", "published"):
                updates.append("is_published = ?")
                updates.append("published = ?")
                params.extend([1 if val else 0, 1 if val else 0])
            else:
                updates.append(f"{field} = ?")
                params.append(val)

        if updates:
            updates.append("updated_at = ?")
            params.append(now)
            params.append(quiz_id)
            cursor.execute(f"UPDATE quizzes SET {', '.join(updates)} WHERE id = ?", params)

        if req.question_ids is not None:
            cursor.execute("DELETE FROM quiz_questions WHERE quiz_id = ?", (quiz_id,))
            for idx, qid in enumerate(req.question_ids):
                cursor.execute("INSERT INTO quiz_questions (quiz_id, question_id, order_index) VALUES (?, ?, ?)", (quiz_id, qid, idx))

        return {"success": True, "message": "تم تحديث الاختبار القصير بنجاح"}


@router.delete("/{quiz_id}")
def admin_delete_quiz(quiz_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Delete quiz."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM quizzes WHERE id = ?", (quiz_id,))
        return {"success": True, "message": "تم حذف الاختبار القصير بنجاح"}


@router.patch("/{quiz_id}/publish")
def admin_toggle_quiz_publish(quiz_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Toggle quiz publish status."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT is_published, published FROM quizzes WHERE id = ?", (quiz_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الاختبار القصير غير موجود")
        current_status = row["is_published"] or row["published"] or 0
        new_status = 0 if current_status == 1 else 1
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        cursor.execute("UPDATE quizzes SET is_published = ?, published = ?, updated_at = ? WHERE id = ?", (new_status, new_status, now, quiz_id))
        return {"success": True, "is_published": bool(new_status), "message": f"تم {'نشر' if new_status else 'إلغاء نشر'} الاختبار القصير بنجاح"}


admin_router = APIRouter(prefix="/api/admin/quizzes", tags=["Admin Quizzes Management"])

@admin_router.get("")
def admin_get_quizzes_list(unit_id: Optional[str] = None, lesson_id: Optional[str] = None, admin: dict = Depends(get_current_admin)):
    return get_quizzes(unit_id=unit_id, lesson_id=lesson_id, current_user=admin)

@admin_router.post("")
def admin_create_quiz_route(req: QuizCreateRequest, admin: dict = Depends(get_current_admin)):
    return admin_create_quiz(req=req, admin=admin)

@admin_router.get("/{quiz_id}")
def admin_get_quiz_route(quiz_id: str, admin: dict = Depends(get_current_admin)):
    return get_quiz_detail(quiz_id=quiz_id, current_user=admin)

@admin_router.put("/{quiz_id}")
def admin_update_quiz_route(quiz_id: str, req: QuizUpdateRequest, admin: dict = Depends(get_current_admin)):
    return admin_update_quiz(quiz_id=quiz_id, req=req, admin=admin)

@admin_router.delete("/{quiz_id}")
def admin_delete_quiz_route(quiz_id: str, admin: dict = Depends(get_current_admin)):
    return admin_delete_quiz(quiz_id=quiz_id, admin=admin)

@admin_router.patch("/{quiz_id}/publish")
def admin_toggle_quiz_publish_route(quiz_id: str, admin: dict = Depends(get_current_admin)):
    return admin_toggle_quiz_publish(quiz_id=quiz_id, admin=admin)
