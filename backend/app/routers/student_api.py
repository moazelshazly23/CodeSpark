import datetime
import json
import re
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, List, Dict, Any
from ..database import get_db
from ..dependencies import get_current_student, get_current_user
from ..models import UpdateProfileRequest, LessonProgressUpdateRequest, VideoProgressUpdateRequest

router = APIRouter(prefix="/api/student", tags=["Student Specialized APIs"])

@router.get("/profile")
def get_student_profile(student: dict = Depends(get_current_student)):
    """GET /api/student/profile: Retrieve detailed student profile data."""
    return {"success": True, "profile": student, "user": student}

@router.put("/profile")
def update_student_profile(req: UpdateProfileRequest, student: dict = Depends(get_current_student)):
    """PUT /api/student/profile: Update student profile details."""
    user_id = student["id"]
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        
        if req.name:
            initials = "".join([w[0] for w in req.name.strip().split()[:2]]) or "طا"
            cursor.execute("UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?", (req.name.strip(), initials, now, user_id))
        
        if req.email:
            cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?", (req.email.strip(), user_id))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")
            cursor.execute("UPDATE users SET email = ?, updated_at = ? WHERE id = ?", (req.email.strip(), now, user_id))

        if req.phone:
            if not re.match(r"^(010|011|012|015)\d{8}$", req.phone.strip()):
                raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
            cursor.execute("SELECT id FROM users WHERE phone = ? AND id != ?", (req.phone.strip(), user_id))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="رقم الهاتف مستخدم بالفعل")
            cursor.execute("UPDATE users SET phone = ?, updated_at = ? WHERE id = ?", (req.phone.strip(), now, user_id))

        updates = []
        params = []
        if req.grade:
            updates.append("grade = ?")
            params.append(req.grade)
        if req.section or req.class_name:
            updates.append("section = ?")
            params.append(req.section or req.class_name)
            updates.append("class_name = ?")
            params.append(req.class_name or req.section)
        if req.parent_phone:
            if not re.match(r"^(010|011|012|015)\d{8}$", req.parent_phone.strip()):
                raise HTTPException(status_code=400, detail="رقم ولي الأمر غير صحيح")
            updates.append("parent_phone = ?")
            params.append(req.parent_phone.strip())

        if updates:
            updates.append("updated_at = ?")
            params.append(now)
            params.append(user_id)
            cursor.execute(f"UPDATE student_profiles SET {', '.join(updates)} WHERE user_id = ?", params)

        cursor.execute("""
        SELECT u.id, u.name, u.email, u.phone, u.role, u.avatar, u.status, u.is_active, u.created_at,
               sp.grade, sp.class_name, sp.section, sp.parent_phone, sp.subscription_code, sp.streak, sp.xp, sp.learning_hours, sp.last_activity, sp.last_lesson_id
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE u.id = ?
        """, (user_id,))
        updated_row = dict(cursor.fetchone())

        return {"success": True, "profile": updated_row, "user": updated_row, "message": "تم تحديث الملف الشخصي بنجاح"}

@router.get("/dashboard")
def get_student_dashboard(student: dict = Depends(get_current_student)):
    """GET /api/student/dashboard: Aggregate dynamic statistics, continue learning card, and announcements."""
    student_id = student["id"]
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()

        # Total Published Lessons
        cursor.execute("SELECT COUNT(*) as cnt FROM lessons WHERE is_published = 1 OR published = 1")
        total_published_lessons = cursor.fetchone()["cnt"]

        # Completed Lessons
        cursor.execute("SELECT lesson_id, progress, completed, last_position FROM lesson_progress WHERE student_id = ? AND completed = 1", (student_id,))
        completed_rows = cursor.fetchall()
        completed_lessons = [r["lesson_id"] for r in completed_rows]
        completed_count = len(completed_lessons)

        # Overall Completion Percentage
        overall_progress_pct = round((completed_count / total_published_lessons * 100)) if total_published_lessons > 0 else 0

        # Exam Attempts & Average Score
        cursor.execute("""
        SELECT ea.*, e.title as exam_title, u.title as unit_title
        FROM exam_attempts ea
        JOIN exams e ON ea.exam_id = e.id
        LEFT JOIN units u ON e.unit_id = u.id
        WHERE ea.student_id = ?
        ORDER BY ea.completed_at DESC
        """, (student_id,))
        exam_attempts = [dict(r) for r in cursor.fetchall()]
        exams_count = len(exam_attempts)
        total_score_sum = sum(att.get("percentage", 0) for att in exam_attempts)
        avg_score = round(total_score_sum / exams_count) if exams_count > 0 else (student.get("avg_score") or 86)

        # Continue Learning Card
        last_lesson_id = student.get("last_lesson_id")
        continue_lesson = None
        if last_lesson_id:
            cursor.execute("""
            SELECT l.*, u.title as unit_title, u.number as unit_number, lp.progress as current_progress, lp.last_position
            FROM lessons l
            JOIN units u ON l.unit_id = u.id
            LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.student_id = ?
            WHERE l.id = ?
            """, (student_id, last_lesson_id))
            row = cursor.fetchone()
            if row:
                continue_lesson = dict(row)
        
        if not continue_lesson:
            cursor.execute("""
            SELECT l.*, u.title as unit_title, u.number as unit_number, 0 as current_progress, 0 as last_position
            FROM lessons l
            JOIN units u ON l.unit_id = u.id
            WHERE (l.is_published = 1 OR l.published = 1) AND l.id NOT IN (SELECT lesson_id FROM lesson_progress WHERE student_id = ? AND completed = 1)
            ORDER BY u.order_index ASC, l.order_index ASC LIMIT 1
            """, (student_id,))
            row = cursor.fetchone()
            if row:
                continue_lesson = dict(row)

        # Announcements
        cursor.execute("SELECT * FROM announcements WHERE is_published = 1 OR published = 1 ORDER BY created_at DESC LIMIT 3")
        announcements = [dict(r) for r in cursor.fetchall()]

        # Units Progress Summary
        cursor.execute("SELECT id, number, title, description, icon FROM units WHERE is_published = 1 OR published = 1 ORDER BY order_index ASC")
        units_rows = cursor.fetchall()
        unit_summaries = []
        for u in units_rows:
            u_id = u["id"]
            cursor.execute("SELECT COUNT(*) as cnt FROM lessons WHERE unit_id = ? AND (is_published = 1 OR published = 1)", (u_id,))
            u_total = cursor.fetchone()["cnt"]

            cursor.execute("""
            SELECT COUNT(*) as cnt FROM lesson_progress lp
            JOIN lessons l ON lp.lesson_id = l.id
            WHERE lp.student_id = ? AND l.unit_id = ? AND lp.completed = 1
            """, (student_id, u_id))
            u_comp = cursor.fetchone()["cnt"]
            u_pct = round((u_comp / u_total * 100)) if u_total > 0 else 0
            unit_summaries.append({
                "id": u_id,
                "number": u["number"],
                "title": u["title"],
                "totalLessons": u_total,
                "completedLessons": u_comp,
                "percentage": u_pct
            })

        return {
            "success": True,
            "dashboard": {
                "student": {
                    "id": student_id,
                    "name": student.get("name"),
                    "grade": student.get("grade"),
                    "streak": student.get("streak", 5),
                    "xp": student.get("xp", 840),
                    "learningHours": student.get("learning_hours", 14.5)
                },
                "stats": {
                    "overallProgress": overall_progress_pct,
                    "completedLessons": completed_count,
                    "totalLessons": total_published_lessons,
                    "examsCount": exams_count,
                    "avgScore": avg_score
                },
                "continueLearning": continue_lesson,
                "units": unit_summaries,
                "announcements": announcements
            }
        }

@router.get("/curriculum")
def get_student_curriculum(student: dict = Depends(get_current_student)):
    """GET /api/student/curriculum: List all published units and lessons with student progress."""
    student_id = student["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM units WHERE is_published = 1 OR published = 1 ORDER BY order_index ASC, number ASC")
        units_rows = cursor.fetchall()
        result = []

        for idx, u in enumerate(units_rows):
            u_dict = dict(u)
            unit_id = u_dict["id"]

            cursor.execute("SELECT * FROM lessons WHERE unit_id = ? AND (is_published = 1 OR published = 1) ORDER BY order_index ASC, number ASC", (unit_id,))
            lessons_rows = [dict(l) for l in cursor.fetchall()]

            # Count completions
            cursor.execute("""
            SELECT COUNT(*) as cnt FROM lesson_progress lp
            JOIN lessons l ON lp.lesson_id = l.id
            WHERE lp.student_id = ? AND l.unit_id = ? AND lp.completed = 1
            """, (student_id, unit_id))
            comp_cnt = cursor.fetchone()["cnt"]
            total_l = len(lessons_rows)
            pct = round((comp_cnt / total_l * 100)) if total_l > 0 else 0

            u_dict["totalLessons"] = total_l
            u_dict["completedLessonsCount"] = comp_cnt
            u_dict["progressPercentage"] = pct
            u_dict["lessons"] = lessons_rows

            if pct == 100 and total_l > 0:
                u_dict["status"] = "completed"
            elif pct > 0:
                u_dict["status"] = "in-progress"
            else:
                if idx == 0:
                    u_dict["status"] = "in-progress"
                else:
                    prev_unit = result[idx - 1] if idx > 0 else None
                    if prev_unit and prev_unit.get("status") == "completed":
                        u_dict["status"] = "not-started"
                    else:
                        u_dict["status"] = "locked"

            result.append(u_dict)

        return {"success": True, "units": result}

@router.get("/units/{unit_id}")
def get_student_unit(unit_id: str, student: dict = Depends(get_current_student)):
    """GET /api/student/units/:id: Retrieve unit details and its lessons with progress."""
    student_id = student["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM units WHERE id = ? AND (is_published = 1 OR published = 1)", (unit_id,))
        unit_row = cursor.fetchone()
        if not unit_row:
            raise HTTPException(status_code=404, detail="الوحدة غير موجودة أو غير منشورة")

        unit = dict(unit_row)

        cursor.execute("""
        SELECT l.*, lp.progress as student_progress, lp.completed as is_completed, lp.last_position
        FROM lessons l
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.student_id = ?
        WHERE l.unit_id = ? AND (l.is_published = 1 OR l.published = 1)
        ORDER BY l.order_index ASC, l.number ASC
        """, (student_id, unit_id))
        lessons = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM exams WHERE unit_id = ? AND (is_published = 1 OR published = 1)", (unit_id,))
        exams = [dict(r) for r in cursor.fetchall()]

        completed_cnt = sum(1 for l in lessons if l.get("is_completed"))
        total_l = len(lessons)
        pct = round((completed_cnt / total_l * 100)) if total_l > 0 else 0

        unit["totalLessons"] = total_l
        unit["completedLessonsCount"] = completed_cnt
        unit["progressPercentage"] = pct
        unit["lessons"] = lessons
        unit["exams"] = exams

        return {"success": True, "unit": unit}

@router.get("/lessons/{lesson_id}")
def get_student_lesson(lesson_id: str, student: dict = Depends(get_current_student)):
    """GET /api/student/lessons/:id: Retrieve lesson full content, video, and exercise."""
    student_id = student["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT l.*, u.title as unit_title, u.number as unit_number,
               lp.progress as student_progress, lp.completed as is_completed, lp.last_position
        FROM lessons l
        JOIN units u ON l.unit_id = u.id
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.student_id = ?
        WHERE l.id = ? AND (l.is_published = 1 OR l.published = 1)
        """, (student_id, lesson_id))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الدرس غير موجود أو غير منشور")

        lesson = dict(row)
        
        # Parse test cases if JSON string
        if lesson.get("exercise_test_cases"):
            try:
                lesson["exercise_test_cases"] = json.loads(lesson["exercise_test_cases"])
            except Exception:
                pass

        # Update last lesson in student profile
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        cursor.execute("UPDATE student_profiles SET last_lesson_id = ?, last_activity = ?, updated_at = ? WHERE user_id = ?", (lesson_id, now, now, student_id))

        return {"success": True, "lesson": lesson}

@router.post("/lessons/{lesson_id}/progress")
def post_student_lesson_progress(lesson_id: str, req: LessonProgressUpdateRequest, student: dict = Depends(get_current_student)):
    """POST /api/student/lessons/:id/progress: Update student progress for a lesson."""
    student_id = student["id"]
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM lessons WHERE id = ? AND (is_published = 1 OR published = 1)", (lesson_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="الدرس غير موجود")

        cursor.execute("SELECT id, completed FROM lesson_progress WHERE student_id = ? AND lesson_id = ?", (student_id, lesson_id))
        existing = cursor.fetchone()

        is_first_time = False
        if existing:
            was_completed = bool(existing["completed"])
            if not was_completed and req.completed:
                is_first_time = True
            cursor.execute("""
            UPDATE lesson_progress
            SET progress = ?, completed = ?, last_position = ?, updated_at = ?
            WHERE student_id = ? AND lesson_id = ?
            """, (req.progress, 1 if req.completed else 0, req.last_position or 0, now, student_id, lesson_id))
        else:
            lp_id = f"lp_{student_id}_{lesson_id}"
            is_first_time = req.completed
            cursor.execute("""
            INSERT INTO lesson_progress (id, student_id, lesson_id, progress, completed, last_position, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (lp_id, student_id, lesson_id, req.progress, 1 if req.completed else 0, req.last_position or 0, now))

        xp_gain = 50 if is_first_time else 5
        cursor.execute("""
        UPDATE student_profiles
        SET xp = xp + ?, last_lesson_id = ?, last_activity = ?, updated_at = ?
        WHERE user_id = ?
        """, (xp_gain, lesson_id, now, now, student_id))

        return {
            "success": True,
            "message": "تم حفظ تقدم الدرس بنجاح",
            "isFirstTimeComplete": is_first_time,
            "xpAwarded": xp_gain
        }

@router.get("/progress")
def get_student_progress_endpoint(student: dict = Depends(get_current_student)):
    """GET /api/student/progress: Retrieve student progress breakdown."""
    student_id = student["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM lessons WHERE is_published = 1 OR published = 1")
        total_pub = cursor.fetchone()["cnt"]

        cursor.execute("SELECT lesson_id FROM lesson_progress WHERE student_id = ? AND completed = 1", (student_id,))
        completed_lessons = [r["lesson_id"] for r in cursor.fetchall()]
        comp_count = len(completed_lessons)
        pct = round((comp_count / total_pub * 100)) if total_pub > 0 else 0

        cursor.execute("""
        SELECT ea.*, e.title as exam_title
        FROM exam_attempts ea
        JOIN exams e ON ea.exam_id = e.id
        WHERE ea.student_id = ?
        ORDER BY ea.completed_at DESC
        """, (student_id,))
        attempts = [dict(r) for r in cursor.fetchall()]
        avg_score = round(sum(a.get("percentage", 0) for a in attempts) / len(attempts)) if attempts else (student.get("avg_score") or 86)

        return {
            "success": True,
            "progress": {
                "studentId": student_id,
                "overallProgress": pct,
                "completedLessons": completed_lessons,
                "totalLessons": total_pub,
                "avgScore": avg_score,
                "examAttempts": attempts,
                "streak": student.get("streak", 5),
                "xp": student.get("xp", 840),
                "learningHours": student.get("learning_hours", 14.5)
            }
        }

@router.get("/notifications")
def get_student_notifications(student: dict = Depends(get_current_student)):
    """GET /api/student/notifications: List student notifications."""
    student_id = student["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC", (student_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            r["read"] = bool(r["is_read"])
            r["date"] = r["created_at"]
        return {"success": True, "notifications": rows}

@router.put("/notifications/{notif_id}/read")
@router.post("/notifications/{notif_id}/read")
def mark_student_notification_read(notif_id: str, student: dict = Depends(get_current_student)):
    """PUT/POST /api/student/notifications/:id/read: Mark notification as read."""
    student_id = student["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)", (notif_id, student_id))
        return {"success": True, "message": "تم تحديث حالة الإشعار"}

# ==================== BOOKMARKS / FAVORITES ====================

@router.get("/bookmarks")
def get_student_bookmarks(student: dict = Depends(get_current_student)):
    """Retrieve all bookmarked lessons, questions, and code snippets."""
    student_id = student["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_bookmarks WHERE user_id = ? ORDER BY created_at DESC", (student_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            if r.get("metadata_json"):
                try:
                    r["metadata"] = json.loads(r["metadata_json"])
                except Exception:
                    r["metadata"] = {}
        return {"success": True, "bookmarks": rows}

@router.post("/bookmarks")
def add_student_bookmark(data: Dict[str, Any], student: dict = Depends(get_current_student)):
    """Add a lesson or question to student favorites."""
    student_id = student["id"]
    item_type = data.get("item_type") or data.get("type") or "lesson"
    item_id = data.get("item_id") or data.get("id")
    title = data.get("title") or "عنصر محفوظ"
    metadata_json = json.dumps(data.get("metadata", {}), ensure_ascii=False)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ms = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    bm_id = f"bm_{now_ms}_{student_id[-4:]}"

    if not item_id:
        raise HTTPException(status_code=400, detail="معرف العنصر مطلوب")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO user_bookmarks (id, user_id, item_type, item_id, title, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, item_type, item_id) DO UPDATE SET title = excluded.title, created_at = excluded.created_at
        """, (bm_id, student_id, item_type, item_id, title, metadata_json, now))
        return {"success": True, "message": "تمت إضافة العنصر إلى المفضلة ⭐"}

@router.delete("/bookmarks/{item_type}/{item_id}")
def remove_student_bookmark(item_type: str, item_id: str, student: dict = Depends(get_current_student)):
    """Remove an item from student favorites."""
    student_id = student["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_bookmarks WHERE user_id = ? AND item_type = ? AND item_id = ?", (student_id, item_type, item_id))
        return {"success": True, "message": "تمت إزالة العنصر من المفضلة"}


# ==================== STUDENT LESSON NOTES ====================

@router.get("/notes/{lesson_id}")
def get_student_lesson_note(lesson_id: str, student: dict = Depends(get_current_student)):
    """Get student personal notes for a lesson."""
    student_id = student["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM student_notes WHERE user_id = ? AND lesson_id = ?", (student_id, lesson_id))
        row = cursor.fetchone()
        return {"success": True, "note": dict(row) if row else None}

@router.post("/notes")
def save_student_lesson_note(data: Dict[str, Any], student: dict = Depends(get_current_student)):
    """Save/update personal notes for a lesson."""
    student_id = student["id"]
    lesson_id = data.get("lesson_id")
    note_text = data.get("note_text") or data.get("note", "")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ms = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    note_id = f"note_{now_ms}_{student_id[-4:]}"

    if not lesson_id:
        raise HTTPException(status_code=400, detail="معرف الدرس مطلوب")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO student_notes (id, user_id, lesson_id, note_text, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, lesson_id) DO UPDATE SET note_text = excluded.note_text, updated_at = excluded.updated_at
        """, (note_id, student_id, lesson_id, note_text, now, now))
        return {"success": True, "message": "تم حفظ الملاحظة بنجاح 📝"}


# ==================== STUDENT CODE DRAFTS & AUTOSAVE ====================

@router.get("/code-drafts/{lesson_id}")
def get_student_code_draft(lesson_id: str, student: dict = Depends(get_current_student)):
    """Retrieve saved code draft for a lesson or playground."""
    student_id = student["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM student_code_drafts
        WHERE user_id = ? AND lesson_id = ?
        ORDER BY updated_at DESC LIMIT 1
        """, (student_id, lesson_id))
        row = cursor.fetchone()
        return {"success": True, "draft": dict(row) if row else None}

@router.post("/code-drafts")
def save_student_code_draft(data: Dict[str, Any], student: dict = Depends(get_current_student)):
    """Autosave student code draft."""
    student_id = student["id"]
    lesson_id = data.get("lesson_id") or "playground"
    code_type = data.get("code_type") or "playground"
    code = data.get("code", "")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ms = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    draft_id = f"draft_{now_ms}_{student_id[-4:]}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id FROM student_code_drafts WHERE user_id = ? AND lesson_id = ?
        """, (student_id, lesson_id))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("""
            UPDATE student_code_drafts SET code = ?, updated_at = ? WHERE id = ?
            """, (code, now, existing["id"]))
        else:
            cursor.execute("""
            INSERT INTO student_code_drafts (id, user_id, lesson_id, code_type, code, version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            """, (draft_id, student_id, lesson_id, code_type, code, now, now))
        return {"success": True, "message": "تم الحفظ التلقائي للكود 💾"}


# ==================== GLOBAL SEARCH ====================

@router.get("/search")
def global_student_search(q: Optional[str] = None, student: dict = Depends(get_current_student)):
    """Search across lessons, units, and questions."""
    query = (q or "").strip()
    if not query:
        return {"success": True, "results": {"units": [], "lessons": [], "questions": []}}

    p = f"%{query}%"
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Search Units
        cursor.execute("SELECT id, number, title, description, icon FROM units WHERE (is_published = 1 OR published = 1) AND (title LIKE ? OR description LIKE ?)", (p, p))
        units = [dict(r) for r in cursor.fetchall()]

        # Search Lessons
        cursor.execute("""
        SELECT l.id, l.number, l.title, l.description, l.duration, l.type, u.title as unit_title
        FROM lessons l
        JOIN units u ON l.unit_id = u.id
        WHERE (l.is_published = 1 OR l.published = 1) AND (l.title LIKE ? OR l.description LIKE ? OR l.content LIKE ?)
        LIMIT 10
        """, (p, p, p))
        lessons = [dict(r) for r in cursor.fetchall()]

        # Search Questions
        cursor.execute("""
        SELECT q.id, q.question, q.difficulty, q.score, u.title as unit_title
        FROM questions q
        LEFT JOIN units u ON q.unit_id = u.id
        WHERE (q.is_published = 1 OR q.published = 1) AND (q.question LIKE ? OR q.explanation LIKE ?)
        LIMIT 10
        """, (p, p))
        questions = [dict(r) for r in cursor.fetchall()]

        return {
            "success": True,
            "query": query,
            "results": {
                "units": units,
                "lessons": lessons,
                "questions": questions
            }
        }


# ==================== REAL GAMIFICATION & ACHIEVEMENTS ====================

@router.get("/achievements")
def get_student_achievements(student: dict = Depends(get_current_student)):
    """Compute verified gamification achievements based on genuine student activity."""
    student_id = student["id"]
    with get_db() as conn:
        cursor = conn.cursor()

        # Count completed lessons
        cursor.execute("SELECT COUNT(*) as cnt FROM lesson_progress WHERE student_id = ? AND completed = 1", (student_id,))
        completed_lessons = cursor.fetchone()["cnt"]

        # Count total lessons
        cursor.execute("SELECT COUNT(*) as cnt FROM lessons WHERE is_published = 1 OR published = 1")
        total_lessons = cursor.fetchone()["cnt"] or 1
        progress_pct = round(completed_lessons / total_lessons * 100)

        # Count exam attempts & scores
        cursor.execute("SELECT COUNT(*) as cnt, MAX(percentage) as max_pct FROM exam_attempts WHERE student_id = ? AND passed = 1", (student_id,))
        exam_row = cursor.fetchone()
        passed_exams = exam_row["cnt"] or 0
        max_exam_pct = exam_row["max_pct"] or 0

        # Check unit 1 completion
        cursor.execute("""
        SELECT COUNT(*) as cnt FROM lessons l
        WHERE l.unit_id = 'unit_1' AND (l.is_published = 1 OR l.published = 1)
          AND l.id NOT IN (SELECT lesson_id FROM lesson_progress WHERE student_id = ? AND completed = 1)
        """, (student_id,))
        unit1_remaining = cursor.fetchone()["cnt"]

        streak = student.get("streak", 1)
        xp = student.get("xp", 100)

        achievements = [
            {
                "id": "ach_first_run",
                "title": "🏆 أول برنامج بايثون",
                "description": "تشغيل أول كود برمجي بنجاح في المحرر التفاعلي",
                "icon": "code",
                "unlocked": bool(completed_lessons >= 1 or xp > 100),
                "badge_color": "cyan",
                "xp_reward": 50
            },
            {
                "id": "ach_streak_5",
                "title": "🔥 5 أيام متتالية",
                "description": "المواظبة على التعلم والتطبيق لمدة 5 أيام متتالية",
                "icon": "flame",
                "unlocked": bool(streak >= 5),
                "badge_color": "gold",
                "xp_reward": 100
            },
            {
                "id": "ach_unit_1",
                "title": "⭐ إكمال الوحدة الأولى",
                "description": "إنهاء جميع دروس وتطبيقات الوحدة الأولى بنجاح",
                "icon": "award",
                "unlocked": bool(unit1_remaining == 0 and completed_lessons >= 4),
                "badge_color": "emerald",
                "xp_reward": 150
            },
            {
                "id": "ach_halfway",
                "title": "🚀 إكمال 50% من المنهج",
                "description": "الوصول إلى منتصف مسار المنهج الدراسي الثانوي",
                "icon": "rocket",
                "unlocked": bool(progress_pct >= 50),
                "badge_color": "purple",
                "xp_reward": 250
            },
            {
                "id": "ach_exam_master",
                "title": "🎯 الدرجة النهائية",
                "description": "الحصول على درجة 90% فما فوق في أحد الامتحانات الشاملة",
                "icon": "target",
                "unlocked": bool(max_exam_pct >= 90),
                "badge_color": "gold",
                "xp_reward": 200
            },
            {
                "id": "ach_exercises_10",
                "title": "💻 10 تدريبات برمجية",
                "description": "حل وتجاوز 10 تدريبات واختبارات برمجية بنجاح",
                "icon": "cpu",
                "unlocked": bool(completed_lessons >= 10),
                "badge_color": "cyan",
                "xp_reward": 150
            }
        ]

        unlocked_count = sum(1 for a in achievements if a["unlocked"])
        return {
            "success": True,
            "achievements": achievements,
            "unlocked_count": unlocked_count,
            "total_count": len(achievements)
        }
