import datetime
import json
import re
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, List, Dict, Any
from ..database import get_db, log_activity
from ..dependencies import get_current_admin, get_current_super_admin, get_current_staff, is_super_admin_user, is_assistant_user
from ..security import hash_password
from ..subscription_utils import enrich_user_subscription
from ..models import (
    StudentCreateRequest, StudentStatusUpdateRequest,
    UnitCreateRequest, UnitUpdateRequest,
    LessonCreateRequest, LessonUpdateRequest,
    QuestionCreateRequest, QuestionUpdateRequest,
    ExamCreateRequest, ExamUpdateRequest,
    AnnouncementCreateRequest, AnnouncementUpdateRequest
)

router = APIRouter(prefix="/api/admin", tags=["Admin Management & Analytics"])

# ==================== 1. STUDENTS MANAGEMENT ====================

@router.get("/students")
def get_students_list(
    search: Optional[str] = None,
    grade: Optional[str] = None,
    status_filter: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    staff: dict = Depends(get_current_staff)
):
    """Admin: Search, filter and list students with live progress metrics and pagination."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as cnt FROM lessons WHERE is_published = 1 OR published = 1")
        total_pub_lessons = cursor.fetchone()["cnt"]

        base_query = """
        SELECT u.id, u.name, u.email, u.phone, u.avatar, u.status, u.is_active, u.is_deleted, u.deleted_at, u.created_at,
               sp.grade, sp.class_name, sp.section, sp.parent_phone, sp.subscription_code,
               sp.subscription_status, sp.subscription_start, sp.subscription_expires_at,
               sp.subscription_duration_days, sp.subscription_type,
               sp.streak, sp.xp, sp.learning_hours, sp.last_activity
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE (LOWER(u.role) = 'student' OR LOWER(u.role) = 'demo')
        """
        params = []
        conds = []

        if search:
            conds.append("(u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR sp.parent_phone LIKE ?)")
            p = f"%{search.strip()}%";
            params.extend([p, p, p, p])
        if grade:
            conds.append("sp.grade = ?")
            params.append(grade)
        if status_filter:
            conds.append("(u.status = ? OR (? = \x27active\x27 AND u.is_active = 1) OR (? = \x27disabled\x27 AND u.is_active = 0))")
            params.extend([status_filter, status_filter, status_filter])

        if conds:
            base_query += " AND " + " AND ".join(conds)
            
        count_query = f"SELECT COUNT(*) as total FROM ({base_query})"
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()["total"]

        offset = max(0, (page - 1) * limit)
        data_query = base_query + f" ORDER BY u.created_at DESC LIMIT {limit} OFFSET {offset}"
        cursor.execute(data_query, params)
        rows = cursor.fetchall()

        students = []
        for r in rows:
            s = dict(r)
            s_id = s["id"]

            cursor.execute("SELECT COUNT(*) as cnt FROM lesson_progress WHERE student_id = ? AND completed = 1", (s_id,))
            comp_cnt = cursor.fetchone()["cnt"]
            prog_pct = round((comp_cnt / total_pub_lessons * 100)) if total_pub_lessons > 0 else 0
            
            cursor.execute("SELECT COUNT(*) as cnt, AVG(percentage) as avg_s FROM exam_attempts WHERE student_id = ?", (s_id,))
            att = cursor.fetchone()
            exams_cnt = att["cnt"]
            avg_s = round(att["avg_s"]) if att["avg_s"] is not None else 0

            s["completedLessonsCount"] = comp_cnt
            s["progress"] = prog_pct
            s["examsCount"] = exams_cnt
            s["avgScore"] = avg_s
            s["isActive"] = bool(s.get("is_active", 1) and s.get("status") == "active")
            students.append(s)

        return {
            "success": True,
            "students": students,
            "total": total_count,
            "page": page,
            "limit": limit,
            "totalPages": max(1, (total_count + limit - 1) // limit)
        }

@router.post("/students")
def create_student_by_admin(req: StudentCreateRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Manually add a new student account."""
    name = req.name.strip()
    phone = req.phone.strip()
    parent_phone = req.parent_phone.strip() if req.parent_phone else ""
    raw_password = req.password or "123456"

    if len(name) < 3:
        raise HTTPException(status_code=400, detail="اسم الطالب يجب أن يكون ثلاثياً على الأقل")
    if not re.match(r"^(010|011|012|015)\d{8}$", phone):
        raise HTTPException(status_code=400, detail="رقم هاتف الطالب غير صحيح")

    email = req.email.strip() if req.email else f"{phone}@student.codespark.edu.eg"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE phone = ? OR LOWER(email) = LOWER(?)", (phone, email))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="رقم الهاتف أو البريد مسجل بالفعل")

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
        user_id = f"student_{now_ts}"
        pw_hash = hash_password(raw_password)
        initials = "".join([w[0] for w in name.split()[:2]]) or "طا"

        cursor.execute("""
        INSERT INTO users (id, name, email, phone, role, avatar, password_hash, is_active, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, \x27student\x27, ?, ?, 1, \x27active\x27, ?, ?)
        """, (user_id, name, email, phone, initials, pw_hash, now, now))

        grade = req.grade or "الصف الأول الثانوي"
        section = req.section or req.class_name or None
        sub_code = req.subscription_code or "SPARK-ADMIN"

        cursor.execute("""
        INSERT INTO student_profiles (id, user_id, grade, class_name, section, parent_phone, subscription_code, subscription_status, subscription_start, subscription_expires_at, subscription_duration_days, subscription_type, streak, xp, learning_hours, last_activity, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NULL, -1, 'lifetime', 1, 100, 0.0, ?, ?, ?)
        """, (f"sp_{user_id}", user_id, grade, section, section, parent_phone, sub_code, now, now, now, now))

        return {"success": True, "student_id": user_id, "message": "تم إضافة الطالب بنجاح"}

@router.get("/students/{student_id}")
def get_student_detail(student_id: str, staff: dict = Depends(get_current_staff)):
    """Admin: Fetch detailed profile, lessons progress, and exam history for a single student."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT u.id, u.name, u.email, u.phone, u.avatar, u.status, u.is_active, u.is_deleted, u.deleted_at, u.created_at,
               sp.grade, sp.class_name, sp.section, sp.parent_phone, sp.subscription_code,
               sp.subscription_status, sp.subscription_start, sp.subscription_expires_at,
               sp.subscription_duration_days, sp.subscription_type,
               sp.streak, sp.xp, sp.learning_hours, sp.last_activity
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE u.id = ? AND u.role = \x27student\x27
        """, (student_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الطالب غير موجود")

        student = dict(row)
        student["isActive"] = bool(student.get("is_active", 1) and student.get("status") == "active")

        cursor.execute("""
        SELECT lp.*, l.title as lesson_title, l.number as lesson_number, u.title as unit_title
        FROM lesson_progress lp
        JOIN lessons l ON lp.lesson_id = l.id
        JOIN units u ON l.unit_id = u.id
        WHERE lp.student_id = ?
        ORDER BY lp.updated_at DESC
        """, (student_id,))
        progress_rows = [dict(r) for r in cursor.fetchall()]

        cursor.execute("""
        SELECT ea.*, e.title as exam_title
        FROM exam_attempts ea
        JOIN exams e ON ea.exam_id = e.id
        WHERE ea.student_id = ?
        ORDER BY ea.completed_at DESC
        """, (student_id,))
        exam_rows = [dict(r) for r in cursor.fetchall()]

        return {
            "success": True,
            "student": student,
            "lessonProgress": progress_rows,
            "examAttempts": exam_rows
        }

@router.put("/students/{student_id}")
def update_student(student_id: str, data: Dict[str, Any], admin: dict = Depends(get_current_admin)):
    """Admin: Update student profile details."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE id = ? AND role = \x27student\x27", (student_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="الطالب غير موجود")

        if any(k in data for k in ["name", "status", "phone", "email", "is_active"]):
            u_updates = []
            u_params = []
            if "name" in data:
                u_updates.append("name = ?")
                u_params.append(data["name"])
            if "status" in data:
                u_updates.append("status = ?")
                u_params.append(data["status"])
                u_updates.append("is_active = ?")
                u_params.append(1 if data["status"] == "active" else 0)
            if "is_active" in data:
                u_updates.append("is_active = ?")
                u_params.append(1 if data["is_active"] else 0)
                u_updates.append("status = ?")
                u_params.append("active" if data["is_active"] else "disabled")
            if "phone" in data:
                u_updates.append("phone = ?")
                u_params.append(data["phone"])
            if "email" in data:
                u_updates.append("email = ?")
                u_params.append(data["email"])

            u_updates.append("updated_at = ?")
            u_params.append(now)
            u_params.append(student_id)
            cursor.execute(f"UPDATE users SET {', '.join(u_updates)} WHERE id = ?", u_params)

        sp_updates = []
        sp_params = []
        if "grade" in data:
            sp_updates.append("grade = ?")
            sp_params.append(data["grade"])
        if "section" in data or "class_name" in data:
            val = data.get("section") or data.get("class_name")
            sp_updates.append("section = ?")
            sp_params.append(val)
            sp_updates.append("class_name = ?")
            sp_params.append(val)
        if "parent_phone" in data:
            sp_updates.append("parent_phone = ?")
            sp_params.append(data["parent_phone"])
        if "subscription_code" in data:
            sp_updates.append("subscription_code = ?")
            sp_params.append(data["subscription_code"])

        if sp_updates:
            sp_updates.append("updated_at = ?")
            sp_params.append(now)
            sp_params.append(student_id)
            cursor.execute(f"UPDATE student_profiles SET {', '.join(sp_updates)} WHERE user_id = ?", sp_params)

        return {"success": True, "message": "تم تحديث بيانات الطالب بنجاح"}

@router.patch("/students/{student_id}/status")
def patch_student_status(student_id: str, req: StudentStatusUpdateRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Toggle active/disabled student status."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_status = req.status or ("active" if req.is_active else "disabled")
    is_active_val = 1 if new_status == "active" else 0
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET status = ?, is_active = ?, updated_at = ? WHERE id = ? AND role = \x27student\x27", (new_status, is_active_val, now, student_id))
        return {"success": True, "message": f"تم تعديل حالة الطالب إلى {new_status}", "status": new_status, "is_active": bool(is_active_val)}

@router.post("/students/{student_id}/reset-password")
def reset_student_password(student_id: str, data: Dict[str, Any], admin: dict = Depends(get_current_admin)):
    """Admin: Reset student password."""
    new_pw = data.get("password") or data.get("new_password") or "123456"
    if len(new_pw) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب ألا تقل عن 6 أحرف")

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_hash = hash_password(new_pw)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ? AND role = \x27student\x27", (new_hash, now, student_id))
        return {"success": True, "message": "تمت إعادة تعيين كلمة مرور الطالب بنجاح"}

@router.delete("/students/{student_id}")
def delete_student(student_id: str, admin: dict = Depends(get_current_super_admin)):
    """Super Admin: Soft delete student account (for subscription cancelation) preserving all progress and grades."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM users WHERE id = ? AND role IN ('student', 'STUDENT')", (student_id,))
        s_row = cursor.fetchone()
        if not s_row:
            raise HTTPException(status_code=404, detail="الطالب غير موجود")
        
        s_name = s_row["name"]
        cursor.execute("""
        UPDATE users
        SET status = 'deleted', is_deleted = 1, is_active = 0, deleted_at = ?, updated_at = ?
        WHERE id = ?
        """, (now, now, student_id))

        cursor.execute("""
        UPDATE student_profiles
        SET subscription_status = 'canceled', updated_at = ?
        WHERE user_id = ?
        """, (now, student_id))

        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="SOFT_DELETE_STUDENT",
            target_type="STUDENT",
            target_id=student_id,
            target_name=s_name,
            details={"reason": "Subscription canceled / Soft deleted by Super Admin", "deleted_at": now},
            conn=conn
        )

        return {"success": True, "message": f"تم حذف وتعطيل حساب الطالب ({s_name}) مع الحفاظ على جميع نتائجه وسجلاته الأكاديمية بنجاح"}

# ==================== 2. ANALYTICS & RESULTS ====================

@router.get("/analytics")
def get_admin_dashboard_analytics(staff: dict = Depends(get_current_staff)):
    """Admin: Dynamic KPI metrics, counts, score averages, and recent activity."""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as total, SUM(CASE WHEN status = \x27active\x27 OR is_active = 1 THEN 1 ELSE 0 END) as active FROM users WHERE role = \x27student\x27")
        s_row = cursor.fetchone()
        total_students = s_row["total"] or 0
        active_students = s_row["active"] or 0

        cursor.execute("SELECT COUNT(*) as cnt FROM units")
        units_count = cursor.fetchone()["cnt"]

        cursor.execute("SELECT COUNT(*) as cnt FROM lessons")
        lessons_count = cursor.fetchone()["cnt"]

        cursor.execute("SELECT COUNT(*) as cnt FROM questions")
        questions_count = cursor.fetchone()["cnt"]

        cursor.execute("SELECT COUNT(*) as cnt FROM exams")
        exams_count = cursor.fetchone()["cnt"]

        cursor.execute("SELECT AVG(percentage) as avg_s FROM exam_attempts")
        avg_score_row = cursor.fetchone()
        avg_score = round(avg_score_row["avg_s"]) if avg_score_row["avg_s"] is not None else 86

        cursor.execute("SELECT COUNT(*) as total_completions FROM lesson_progress WHERE completed = 1")
        total_completions = cursor.fetchone()["total_completions"] or 0
        potential_total = (total_students * lessons_count) if (total_students * lessons_count) > 0 else 1
        completion_rate = round(total_completions / potential_total * 100)

        cursor.execute("""
        SELECT ea.id, ea.percentage, ea.score, ea.total_score, ea.correct_count, ea.total_count, ea.completed_at, ea.time_spent_seconds, ea.passed,
               u.name as student_name, u.avatar as student_avatar, sp.grade as student_grade, e.title as exam_title
        FROM exam_attempts ea
        JOIN users u ON ea.student_id = u.id
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        JOIN exams e ON ea.exam_id = e.id
        ORDER BY ea.completed_at DESC LIMIT 8
        """)
        recent_exams = [dict(r) for r in cursor.fetchall()]

        # Weekly Activity Distribution Simulation for Chart
        activity_distribution = [14, 22, 35, 28, 42, 48, 38]

        return {
            "success": True,
            "analytics": {
                "totalStudents": total_students,
                "activeStudents": active_students,
                "unitsCount": units_count,
            "totalUnits": units_count,
            "totalLessons": lessons_count,
            "totalQuestions": questions_count,
            "totalExams": exams_count,
                "lessonsCount": lessons_count,
                "questionsCount": questions_count,
                "examsCount": exams_count,
                "avgScore": avg_score,
                "completionRate": completion_rate,
                "recentActivity": recent_exams,
                "activityDistribution": activity_distribution
            }
        }

@router.get("/results")
def get_admin_results(
    search: Optional[str] = None,
    exam_id: Optional[str] = None,
    grade: Optional[str] = None,
    passed_filter: Optional[str] = None,
    staff: dict = Depends(get_current_staff)
):
    """Admin: Search and filter all students exam results."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
        SELECT ea.*, u.name as student_name, u.phone as student_phone, u.avatar as student_avatar,
               sp.grade as student_grade, e.title as exam_title, u.email as student_email
        FROM exam_attempts ea
        JOIN users u ON ea.student_id = u.id
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        JOIN exams e ON ea.exam_id = e.id
        """
        params = []
        conds = []

        if search:
            conds.append("(u.name LIKE ? OR u.phone LIKE ? OR e.title LIKE ?)")
            p = f"%{search.strip()}%";
            params.extend([p, p, p])
        if exam_id:
            conds.append("ea.exam_id = ?")
            params.append(exam_id)
        if grade:
            conds.append("sp.grade = ?")
            params.append(grade)
        if passed_filter:
            if passed_filter == "passed":
                conds.append("ea.passed = 1")
            elif passed_filter == "failed":
                conds.append("ea.passed = 0")

        if conds:
            query += " WHERE " + " AND ".join(conds)
        query += " ORDER BY ea.completed_at DESC"

        cursor.execute(query, params)
        results = [dict(r) for r in cursor.fetchall()]
        return {"success": True, "results": results}

# ==================== 3. CURRICULUM MANAGEMENT ====================

@router.get("/units")
def admin_get_units(staff: dict = Depends(get_current_staff)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM units ORDER BY order_index ASC, number ASC")
        units = []
        for r in cursor.fetchall():
            ud = dict(r)
            u_id = ud["id"]
            cursor.execute("SELECT COUNT(*) as cnt FROM lessons WHERE unit_id = ?", (u_id,))
            ud["totalLessons"] = cursor.fetchone()["cnt"]
            cursor.execute("SELECT COUNT(*) as cnt FROM exams WHERE unit_id = ?", (u_id,))
            ud["totalExams"] = cursor.fetchone()["cnt"]
            ud["isPublished"] = bool(ud.get("is_published", 1) or ud.get("published", 1))
            units.append(ud)
        return {"success": True, "units": units}

@router.post("/units")
def admin_create_unit(req: UnitCreateRequest, admin: dict = Depends(get_current_admin)):
    from .curriculum import create_unit
    return create_unit(req, admin)

@router.get("/units/{unit_id}")
def admin_get_unit(unit_id: str, admin: dict = Depends(get_current_admin)):
    from .curriculum import get_unit_detail
    return get_unit_detail(unit_id, admin)

@router.put("/units/{unit_id}")
def admin_update_unit(unit_id: str, req: UnitUpdateRequest, admin: dict = Depends(get_current_admin)):
    from .curriculum import update_unit
    return update_unit(unit_id, req, admin)

@router.patch("/units/{unit_id}/publish")
def admin_toggle_unit_publish(unit_id: str, data: Dict[str, Any], admin: dict = Depends(get_current_admin)):
    is_pub = 1 if data.get("is_published", data.get("published", True)) else 0
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE units SET is_published = ?, published = ?, updated_at = ? WHERE id = ?", (is_pub, is_pub, now, unit_id))
        return {"success": True, "is_published": bool(is_pub), "message": "تم تحديث حالة نشر الوحدة"}

@router.patch("/units/reorder")
def admin_reorder_units(data: Dict[str, Any], admin: dict = Depends(get_current_admin)):
    orders = data.get("orders", []) # list of {id, order_index}
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        for item in orders:
            cursor.execute("UPDATE units SET order_index = ?, updated_at = ? WHERE id = ?", (item.get("order_index", 0), now, item.get("id")))
        return {"success": True, "message": "تم إعادة ترتيب الوحدات بنجاح"}

@router.delete("/units/{unit_id}")
def admin_delete_unit(unit_id: str, admin: dict = Depends(get_current_admin)):
    from .curriculum import delete_unit
    return delete_unit(unit_id, admin)

# ==================== 4. LESSONS MANAGEMENT ====================

@router.get("/lessons")
def admin_get_lessons(unit_id: Optional[str] = None, staff: dict = Depends(get_current_staff)):
    with get_db() as conn:
        cursor = conn.cursor()
        if unit_id:
            cursor.execute("SELECT l.*, u.title as unit_title FROM lessons l JOIN units u ON l.unit_id = u.id WHERE l.unit_id = ? ORDER BY l.order_index ASC, l.number ASC", (unit_id,))
        else:
            cursor.execute("SELECT l.*, u.title as unit_title FROM lessons l JOIN units u ON l.unit_id = u.id ORDER BY u.order_index ASC, l.order_index ASC, l.number ASC")
        lessons = []
        for r in cursor.fetchall():
            ld = dict(r)
            ld["isPublished"] = bool(ld.get("is_published", 1) or ld.get("published", 1))
            if ld.get("exercise_title"):
                ld["exercise"] = {
                    "title": ld["exercise_title"],
                    "description": ld.get("exercise_description", ""),
                    "starterCode": ld.get("exercise_starter_code", ""),
                    "solutionCode": ld.get("exercise_solution_code", ""),
                    "testCases": json.loads(ld["exercise_test_cases"]) if ld.get("exercise_test_cases") else []
                }
            lessons.append(ld)
        return {"success": True, "lessons": lessons}

@router.post("/lessons")
def admin_create_lesson(req: LessonCreateRequest, staff: dict = Depends(get_current_staff)):
    from .curriculum import create_lesson
    return create_lesson(req, staff)

@router.get("/lessons/{lesson_id}")
def admin_get_lesson(lesson_id: str, staff: dict = Depends(get_current_staff)):
    from .curriculum import get_lesson_detail
    return get_lesson_detail(lesson_id, staff)

@router.put("/lessons/{lesson_id}")
def admin_update_lesson(lesson_id: str, req: LessonUpdateRequest, staff: dict = Depends(get_current_staff)):
    from .curriculum import update_lesson
    return update_lesson(lesson_id, req, staff)

@router.patch("/lessons/{lesson_id}/publish")
def admin_toggle_lesson_publish(lesson_id: str, data: Dict[str, Any], admin: dict = Depends(get_current_super_admin)):
    is_pub = 1 if data.get("is_published", data.get("published", True)) else 0
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE lessons SET is_published = ?, published = ?, updated_at = ? WHERE id = ?", (is_pub, is_pub, now, lesson_id))
        return {"success": True, "is_published": bool(is_pub), "message": "تم تحديث حالة نشر الدرس"}

@router.patch("/lessons/reorder")
def admin_reorder_lessons(data: Dict[str, Any], admin: dict = Depends(get_current_admin)):
    orders = data.get("orders", [])
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        for item in orders:
            cursor.execute("UPDATE lessons SET order_index = ?, updated_at = ? WHERE id = ?", (item.get("order_index", 0), now, item.get("id")))
        return {"success": True, "message": "تم إعادة ترتيب الدروس بنجاح"}

@router.delete("/lessons/{lesson_id}")
def admin_delete_lesson(lesson_id: str, staff: dict = Depends(get_current_staff)):
    from .curriculum import delete_lesson
    return delete_lesson(lesson_id, staff)

# ==================== 5. QUESTIONS MANAGEMENT ====================

@router.get("/questions")
def admin_get_questions(
    unit_id: Optional[str] = None,
    lesson_id: Optional[str] = None,
    q_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    staff: dict = Depends(get_current_staff)
):
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT q.*, u.title as unit_title, l.title as lesson_title FROM questions q LEFT JOIN units u ON q.unit_id = u.id LEFT JOIN lessons l ON q.lesson_id = l.id"
        params = []
        conds = []

        if unit_id:
            conds.append("q.unit_id = ?")
            params.append(unit_id)
        if lesson_id:
            conds.append("q.lesson_id = ?")
            params.append(lesson_id)
        if q_type:
            conds.append("q.type = ?")
            params.append(q_type)
        if difficulty:
            conds.append("q.difficulty = ?")
            params.append(difficulty)
        if search:
            conds.append("(q.question LIKE ? OR q.explanation LIKE ?)")
            p = f"%{search.strip()}%";
            params.extend([p, p])

        if conds:
            query += " WHERE " + " AND ".join(conds)
        query += " ORDER BY q.created_at DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        result = []
        for r in rows:
            q_dict = dict(r)
            q_id = q_dict["id"]
            cursor.execute("SELECT option_key as key, option_text as text, is_correct as isCorrect FROM question_options WHERE question_id = ? ORDER BY id ASC", (q_id,))
            options_rows = [dict(opt) for opt in cursor.fetchall()]
            q_dict["options"] = [opt["text"] for opt in options_rows]
            q_dict["optionsDetailed"] = options_rows
            if q_dict.get("correct_answer") is not None:
                try:
                    q_dict["correctAnswer"] = int(q_dict["correct_answer"])
                except ValueError:
                    q_dict["correctAnswer"] = q_dict["correct_answer"]
            q_dict["isPublished"] = bool(q_dict.get("is_published", 1))
            result.append(q_dict)

        return {"success": True, "questions": result}

@router.post("/questions")
def admin_create_question(req: QuestionCreateRequest, staff: dict = Depends(get_current_staff)):
    from .questions import create_question
    return create_question(req, staff)

@router.get("/questions/{question_id}")
def admin_get_question(question_id: str, staff: dict = Depends(get_current_staff)):
    from .questions import get_question_detail
    return get_question_detail(question_id, staff)

@router.put("/questions/{question_id}")
def admin_update_question(question_id: str, req: QuestionUpdateRequest, staff: dict = Depends(get_current_staff)):
    from .questions import update_question
    return update_question(question_id, req, staff)

@router.patch("/questions/{question_id}/publish")
def admin_toggle_question_publish(question_id: str, data: Dict[str, Any], staff: dict = Depends(get_current_staff)):
    is_pub = 1 if data.get("is_published", True) else 0
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE questions SET is_published = ? WHERE id = ?", (is_pub, question_id))
        return {"success": True, "is_published": bool(is_pub), "message": "تم تحديث حالة نشر السؤال"}

@router.delete("/questions/{question_id}")
def admin_delete_question(question_id: str, staff: dict = Depends(get_current_staff)):
    from .questions import delete_question
    return delete_question(question_id, staff)

# ==================== 6. EXAMS MANAGEMENT & EXAM BUILDER ====================

@router.get("/exams")
def admin_get_exams(unit_id: Optional[str] = None, staff: dict = Depends(get_current_staff)):
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
        SELECT e.*, u.title as unit_title,
               (SELECT COUNT(*) FROM exam_questions WHERE exam_id = e.id) as question_count,
               (SELECT COUNT(*) FROM exam_attempts WHERE exam_id = e.id) as attempts_count,
               (SELECT AVG(percentage) FROM exam_attempts WHERE exam_id = e.id) as avg_score
        FROM exams e
        LEFT JOIN units u ON e.unit_id = u.id
        """
        params = []
        if unit_id:
            query += " WHERE e.unit_id = ?"
            params.append(unit_id)
        query += " ORDER BY e.created_at DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        exams = []
        for r in rows:
            ed = dict(r)
            ed["totalQuestions"] = ed["question_count"] if ed["question_count"] > 0 else ed.get("total_questions", 10)
            ed["attemptsCount"] = ed["attempts_count"] or 0
            ed["avgScore"] = round(ed["avg_score"]) if ed["avg_score"] is not None else 0
            ed["isPublished"] = bool(ed.get("is_published", 1))
            
            # Fetch assigned question IDs
            cursor.execute("SELECT question_id FROM exam_questions WHERE exam_id = ? ORDER BY order_index ASC", (ed["id"],))
            ed["questionIds"] = [q["question_id"] for q in cursor.fetchall()]
            exams.append(ed)
        return {"success": True, "exams": exams}

@router.post("/exams")
def admin_create_exam(req: ExamCreateRequest, staff: dict = Depends(get_current_staff)):
    from .exams import create_exam
    return create_exam(req, staff)

@router.get("/exams/{exam_id}")
def admin_get_exam(exam_id: str, staff: dict = Depends(get_current_staff)):
    from .exams import get_exam_detail
    return get_exam_detail(exam_id, staff)

@router.put("/exams/{exam_id}")
def admin_update_exam(exam_id: str, req: ExamUpdateRequest, staff: dict = Depends(get_current_staff)):
    from .exams import update_exam
    return update_exam(exam_id, req, staff)

@router.patch("/exams/{exam_id}/publish")
def admin_toggle_exam_publish(exam_id: str, data: Dict[str, Any], staff: dict = Depends(get_current_staff)):
    is_pub = 1 if data.get("is_published", True) else 0
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE exams SET is_published = ?, updated_at = ? WHERE id = ?", (is_pub, now, exam_id))
        return {"success": True, "is_published": bool(is_pub), "message": "تم تحديث حالة نشر الاختبار"}

@router.delete("/exams/{exam_id}")
def admin_delete_exam(exam_id: str, staff: dict = Depends(get_current_staff)):
    from .exams import delete_exam
    return delete_exam(exam_id, staff)

# ==================== 7. ANNOUNCEMENTS MANAGEMENT ====================

@router.get("/announcements")
def admin_get_announcements(admin: dict = Depends(get_current_admin)):
    from .announcements import get_announcements
    return get_announcements(current_user=admin)

@router.post("/announcements")
def admin_create_announcement(req: AnnouncementCreateRequest, admin: dict = Depends(get_current_admin)):
    from .announcements import create_announcement
    return create_announcement(req, admin)

@router.put("/announcements/{ann_id}")
def admin_update_announcement(ann_id: str, req: AnnouncementUpdateRequest, admin: dict = Depends(get_current_admin)):
    from .announcements import update_announcement
    return update_announcement(ann_id, req, admin)

@router.patch("/announcements/{ann_id}/publish")
def admin_toggle_announcement_publish(ann_id: str, data: Dict[str, Any], admin: dict = Depends(get_current_admin)):
    is_pub = 1 if data.get("is_published", True) else 0
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE announcements SET is_published = ? WHERE id = ?", (is_pub, ann_id))
        return {"success": True, "is_published": bool(is_pub), "message": "تم تحديث حالة نشر الإعلان"}

@router.delete("/announcements/{ann_id}")
def admin_delete_announcement(ann_id: str, admin: dict = Depends(get_current_admin)):
    from .announcements import delete_announcement
    return delete_announcement(ann_id, admin)

# ==================== 8. SUPPORT TICKETS MANAGEMENT ====================

@router.get("/support/tickets")
def admin_get_support_tickets(status_filter: Optional[str] = None, staff: dict = Depends(get_current_staff)):
    with get_db() as conn:
        cursor = conn.cursor()
        if status_filter:
            cursor.execute("SELECT * FROM support_tickets WHERE status = ? ORDER BY created_at DESC", (status_filter,))
        else:
            cursor.execute("SELECT * FROM support_tickets ORDER BY created_at DESC")
        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            r["date"] = r["created_at"]
            r["studentName"] = r.get("student_name") or "طالب"
        return {"success": True, "tickets": rows}

@router.post("/support/tickets/{ticket_id}/reply")
def admin_reply_support_ticket(ticket_id: str, data: Dict[str, Any], staff: dict = Depends(get_current_staff)):
    reply_text = data.get("reply", "").strip()
    if not reply_text:
        raise HTTPException(status_code=400, detail="نص الرد مطلوب")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,))
        ticket = cursor.fetchone()
        if not ticket:
            raise HTTPException(status_code=404, detail="التذكرة غير موجودة")

        cursor.execute("UPDATE support_tickets SET reply = ?, status = \x27answered\x27, updated_at = ? WHERE id = ?", (reply_text, now, ticket_id))

        now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
        n_id = f"notif_{now_ts}"
        cursor.execute("""
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
        VALUES (?, ?, \x27💬 تم الرد على استفسارك الأكاديمي\x27, ?, \x27info\x27, 0, \x27#support\x27, ?)
        """, (n_id, ticket["user_id"], f"رد المعلم على تذكرة: {ticket['subject']}", now))

        return {"success": True, "message": "تم إرسال الرد للطالب بنجاح"}

@router.put("/support/tickets/{ticket_id}/status")
def admin_change_support_status(ticket_id: str, data: Dict[str, Any], staff: dict = Depends(get_current_staff)):
    new_status = data.get("status", "closed")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?", (new_status, now, ticket_id))
        return {"success": True, "message": "تم تحديث حالة التذكرة بنجاح"}

# ==================== 9. PLATFORM SETTINGS ====================

@router.get("/settings")
def admin_get_settings(admin: dict = Depends(get_current_super_admin)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM system_settings")
        rows = cursor.fetchall()
        settings = {r["key"]: r["value"] for r in rows}
        default_settings = {
            "platform_name": "Code Spark",
            "academic_year": "2025/2026",
            "curriculum_subject": "مادة البرمجة — المرحلة الثانوية",
            "allow_registration": "true",
            "default_passing_score": "60",
            "max_exam_attempts": "3",
            "contact_whatsapp": "01000000000",
            "maintenance_mode": "false"
        }
        for k, v in default_settings.items():
            if k not in settings:
                settings[k] = v
        return {"success": True, "settings": settings}

@router.put("/settings")
def admin_update_settings(data: Dict[str, Any], admin: dict = Depends(get_current_super_admin)):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        for k, v in data.items():
            cursor.execute("""
            INSERT INTO system_settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            """, (k, str(v), now))
        return {"success": True, "message": "تم حفظ إعدادات النظام بنجاح"}
