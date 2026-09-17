"""
Code Spark - Centralized Domain Repositories
"""
import uuid
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple
from app.db.engine import db_engine, now_iso

class UserRepository:
    @staticmethod
    def get_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))

    @staticmethod
    def get_by_username(username: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", (username.strip(),))

    @staticmethod
    def get_by_email(email: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))

    @staticmethod
    def create(data: Dict[str, Any]) -> Dict[str, Any]:
        user = db_engine.insert("users", data)
        if user["role"] == "student":
            db_engine.insert("student_stats", {
                "user_id": user["id"],
                "xp": 50,
                "streak_days": 1,
                "last_active_date": now_iso()[:10],
                "study_time_minutes": 0.0
            })
        return user

    @staticmethod
    def update(user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return db_engine.update("users", user_id, updates)

    @staticmethod
    def delete(user_id: str) -> bool:
        return db_engine.delete("users", user_id)

    @staticmethod
    def list_users(role: Optional[str] = None, search: Optional[str] = None, offset: int = 0, limit: int = 50):
        filters = {"role": role} if role else None
        return db_engine.query("users", filters=filters, search_field="full_name", search_query=search, order_by="created_at", descending=True, offset=offset, limit=limit)

    @staticmethod
    def get_assistant_permissions(user_id: str) -> List[str]:
        rows = db_engine.fetch_all("SELECT permission FROM assistant_permissions WHERE user_id = ?", (user_id,))
        return [r["permission"] for r in rows]

    @staticmethod
    def set_assistant_permissions(user_id: str, permissions: List[str]):
        with db_engine.transaction():
            db_engine.execute("DELETE FROM assistant_permissions WHERE user_id = ?", (user_id,))
            for perm in set(permissions):
                db_engine.insert("assistant_permissions", {
                    "id": uuid.uuid4().hex,
                    "user_id": user_id,
                    "permission": perm,
                    "created_at": now_iso()
                })


class SubscriptionRepository:
    @staticmethod
    def get_code_by_string(code_str: str) -> Optional[Dict[str, Any]]:
        clean = code_str.strip().upper()
        return db_engine.fetch_one("SELECT * FROM subscription_codes WHERE code = ?", (clean,))

    @staticmethod
    def get_code_by_id(code_id: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one("SELECT * FROM subscription_codes WHERE id = ?", (code_id,))

    @staticmethod
    def create_code(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("subscription_codes", data)

    @staticmethod
    def update_code(code_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return db_engine.update("subscription_codes", code_id, updates)

    @staticmethod
    def list_codes(status: Optional[str] = None, offset: int = 0, limit: int = 50):
        filters = {"status": status} if status else None
        return db_engine.query("subscription_codes", filters=filters, order_by="created_at", descending=True, offset=offset, limit=limit)

    @staticmethod
    def get_active_subscription(user_id: str) -> Optional[Dict[str, Any]]:
        now = now_iso()
        return db_engine.fetch_one(
            "SELECT * FROM subscriptions WHERE user_id = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > ?) ORDER BY created_at DESC LIMIT 1",
            (user_id, now)
        )

    @staticmethod
    def create_subscription(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("subscriptions", data)

    @staticmethod
    def list_subscriptions(user_id: Optional[str] = None):
        filters = {"user_id": user_id} if user_id else None
        return db_engine.query("subscriptions", filters=filters, order_by="created_at", descending=True)

    # Dynamic Plans
    @staticmethod
    def list_plans(active_only: bool = False):
        filters = {"is_active": 1} if active_only else None
        return db_engine.query("subscription_plans", filters=filters, order_by="order_index", descending=False)

    @staticmethod
    def get_plan(plan_id: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one("SELECT * FROM subscription_plans WHERE id = ?", (plan_id,))

    @staticmethod
    def create_plan(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("subscription_plans", data)

    @staticmethod
    def update_plan(plan_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return db_engine.update("subscription_plans", plan_id, updates)

    @staticmethod
    def delete_plan(plan_id: str) -> bool:
        return db_engine.delete("subscription_plans", plan_id)

    # Requests
    @staticmethod
    def create_request(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("subscription_requests", data)

    @staticmethod
    def get_request(req_id: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one("SELECT * FROM subscription_requests WHERE id = ?", (req_id,))

    @staticmethod
    def list_requests(user_id: Optional[str] = None, status: Optional[str] = None, offset: int = 0, limit: int = 50):
        filters = {}
        if user_id:
            filters["user_id"] = user_id
        if status:
            filters["status"] = status
        return db_engine.query("subscription_requests", filters=filters if filters else None, order_by="created_at", descending=True, offset=offset, limit=limit)

    @staticmethod
    def approve_request(req_id: str, admin_id: str, admin_notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
        req = db_engine.fetch_one("SELECT * FROM subscription_requests WHERE id = ?", (req_id,))
        if not req:
            return None
        if req.get("status") == "APPROVED":
            return req
        now = datetime.now(timezone.utc)
        duration_months = req.get("duration_months") or 1
        expires_at = (now + timedelta(days=duration_months * 30)).isoformat()
        
        with db_engine.transaction():
            db_engine.insert("subscriptions", {
                "user_id": req["user_id"],
                "code": "REQUEST_APPROVAL",
                "plan_id": req.get("plan_id"),
                "plan_name": req.get("package_name") or "اشتراك مفعل",
                "starts_at": now.isoformat(),
                "expires_at": expires_at,
                "is_active": 1,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            })
            db_engine.update("subscription_requests", req_id, {
                "status": "APPROVED",
                "reviewed_by": admin_id,
                "reviewed_at": now.isoformat(),
                "admin_notes": admin_notes or "تمت الموافقة وتفعيل الاشتراك بنجاح"
            })
            db_engine.insert("notifications", {
                "user_id": req["user_id"],
                "title": "تم تفعيل اشتراكك بنجاح! 🎉",
                "message": f"تمت الموافقة على طلب اشتراكك ({req.get('package_name')}) وتفعيل الحساب حتى {expires_at[:10]}.",
                "type": "success",
                "is_read": 0
            })
        return db_engine.fetch_one("SELECT * FROM subscription_requests WHERE id = ?", (req_id,))

    @staticmethod
    def reject_request(req_id: str, admin_id: str, reason: str) -> Optional[Dict[str, Any]]:
        now = now_iso()
        db_engine.update("subscription_requests", req_id, {
            "status": "REJECTED",
            "reviewed_by": admin_id,
            "reviewed_at": now,
            "admin_notes": reason
        })
        req = db_engine.fetch_one("SELECT * FROM subscription_requests WHERE id = ?", (req_id,))
        if req:
            db_engine.insert("notifications", {
                "user_id": req["user_id"],
                "title": "تم رفض طلب الاشتراك",
                "message": f"سبب الرفض: {reason}",
                "type": "error",
                "is_read": 0
            })
        return req


class CurriculumRepository:
    @staticmethod
    def list_courses(is_admin: bool = False):
        filters = None if is_admin else {"is_published": 1}
        return db_engine.query("courses", filters=filters, order_by="order_index", descending=False)

    @staticmethod
    def get_course(course_id: str):
        return db_engine.fetch_one("SELECT * FROM courses WHERE id = ?", (course_id,))

    @staticmethod
    def create_course(data: Dict[str, Any]):
        return db_engine.insert("courses", data)

    @staticmethod
    def update_course(course_id: str, updates: Dict[str, Any]):
        return db_engine.update("courses", course_id, updates)

    @staticmethod
    def delete_course(course_id: str):
        return db_engine.delete("courses", course_id)

    @staticmethod
    def list_units(course_id: Optional[str] = None, is_admin: bool = False):
        filters = {}
        if course_id:
            filters["course_id"] = course_id
        if not is_admin:
            filters["is_published"] = 1
        return db_engine.query("units", filters=filters if filters else None, order_by="order_index", descending=False)

    @staticmethod
    def get_unit(unit_id: str):
        return db_engine.fetch_one("SELECT * FROM units WHERE id = ?", (unit_id,))

    @staticmethod
    def create_unit(data: Dict[str, Any]):
        return db_engine.insert("units", data)

    @staticmethod
    def update_unit(unit_id: str, updates: Dict[str, Any]):
        return db_engine.update("units", unit_id, updates)

    @staticmethod
    def delete_unit(unit_id: str):
        return db_engine.delete("units", unit_id)

    @staticmethod
    def list_lessons(unit_id: Optional[str] = None, course_id: Optional[str] = None, is_admin: bool = False):
        if course_id and not unit_id:
            units = db_engine.fetch_all("SELECT id FROM units WHERE course_id = ?", (course_id,))
            uids = [u["id"] for u in units]
            if not uids:
                return [], 0
            placeholders = ", ".join(["?"] * len(uids))
            pub_clause = "" if is_admin else "AND is_published = 1"
            rows = db_engine.fetch_all(f"SELECT * FROM lessons WHERE unit_id IN ({placeholders}) {pub_clause} ORDER BY order_index ASC", tuple(uids))
            return rows, len(rows)
        filters = {}
        if unit_id:
            filters["unit_id"] = unit_id
        if not is_admin:
            filters["is_published"] = 1
        return db_engine.query("lessons", filters=filters if filters else None, order_by="order_index", descending=False)

    @staticmethod
    def get_lesson(lesson_id: str):
        return db_engine.fetch_one("SELECT * FROM lessons WHERE id = ?", (lesson_id,))

    @staticmethod
    def create_lesson(data: Dict[str, Any]):
        return db_engine.insert("lessons", data)

    @staticmethod
    def update_lesson(lesson_id: str, updates: Dict[str, Any]):
        return db_engine.update("lessons", lesson_id, updates)

    @staticmethod
    def delete_lesson(lesson_id: str):
        return db_engine.delete("lessons", lesson_id)

    @staticmethod
    def get_lesson_progress(user_id: str, lesson_id: str):
        return db_engine.fetch_one("SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?", (user_id, lesson_id))

    @staticmethod
    def save_lesson_progress(user_id: str, lesson_id: str, watch_time_seconds: int = 0, is_completed: bool = False):
        existing = CurriculumRepository.get_lesson_progress(user_id, lesson_id)
        now = now_iso()
        if existing:
            updates = {
                "watch_time_seconds": max(existing.get("watch_time_seconds", 0), watch_time_seconds),
                "is_completed": 1 if (is_completed or existing.get("is_completed")) else 0,
                "updated_at": now
            }
            if is_completed and not existing.get("is_completed"):
                updates["completed_at"] = now
            return db_engine.update("lesson_progress", existing["id"], updates)
        else:
            rec = {
                "user_id": user_id,
                "lesson_id": lesson_id,
                "watch_time_seconds": watch_time_seconds,
                "is_completed": 1 if is_completed else 0,
                "completed_at": now if is_completed else None,
                "updated_at": now
            }
            return db_engine.insert("lesson_progress", rec)


class StudyFilesRepository:
    @staticmethod
    def list_files(course_id: Optional[str] = None, unit_id: Optional[str] = None, lesson_id: Optional[str] = None, is_admin: bool = False):
        filters = {}
        if course_id:
            filters["course_id"] = course_id
        if unit_id:
            filters["unit_id"] = unit_id
        if lesson_id:
            filters["lesson_id"] = lesson_id
        if not is_admin:
            filters["is_published"] = 1
        return db_engine.query("study_files", filters=filters if filters else None, order_by="created_at", descending=True)

    @staticmethod
    def get_file(file_id: str):
        return db_engine.fetch_one("SELECT * FROM study_files WHERE id = ?", (file_id,))

    @staticmethod
    def create_file(data: Dict[str, Any]):
        return db_engine.insert("study_files", data)

    @staticmethod
    def update_file(file_id: str, updates: Dict[str, Any]):
        return db_engine.update("study_files", file_id, updates)

    @staticmethod
    def delete_file(file_id: str):
        return db_engine.delete("study_files", file_id)


class AssessmentRepository:
    @staticmethod
    def list_questions(lesson_id: Optional[str] = None, qtype: Optional[str] = None, difficulty: Optional[str] = None, search: Optional[str] = None, offset: int = 0, limit: int = 50):
        filters = {}
        if lesson_id:
            filters["lesson_id"] = lesson_id
        if qtype:
            filters["question_type"] = qtype
        if difficulty:
            filters["difficulty"] = difficulty
        return db_engine.query("question_bank", filters=filters if filters else None, search_field="question_text", search_query=search, order_by="created_at", descending=True, offset=offset, limit=limit)

    @staticmethod
    def get_question(qid: str):
        return db_engine.fetch_one("SELECT * FROM question_bank WHERE id = ?", (qid,))

    @staticmethod
    def create_question(data: Dict[str, Any]):
        return db_engine.insert("question_bank", data)

    @staticmethod
    def update_question(qid: str, updates: Dict[str, Any]):
        return db_engine.update("question_bank", qid, updates)

    @staticmethod
    def delete_question(qid: str):
        return db_engine.delete("question_bank", qid)

    @staticmethod
    def list_quizzes(lesson_id: Optional[str] = None, is_admin: bool = False):
        filters = {}
        if lesson_id:
            filters["lesson_id"] = lesson_id
        if not is_admin:
            filters["is_published"] = 1
        return db_engine.query("quizzes", filters=filters if filters else None, order_by="created_at", descending=True)

    @staticmethod
    def get_quiz(quiz_id: str):
        return db_engine.fetch_one("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))

    @staticmethod
    def get_quiz_questions(quiz_id: str):
        return db_engine.fetch_all("SELECT q.*, qq.order_index FROM quiz_questions qq JOIN question_bank q ON qq.question_id = q.id WHERE qq.quiz_id = ? ORDER BY qq.order_index ASC", (quiz_id,))

    @staticmethod
    def list_exams(is_admin: bool = False):
        filters = None if is_admin else {"is_published": 1}
        return db_engine.query("exams", filters=filters, order_by="created_at", descending=True)

    @staticmethod
    def get_exam(exam_id: str):
        return db_engine.fetch_one("SELECT * FROM exams WHERE id = ?", (exam_id,))

    @staticmethod
    def get_exam_questions(exam_id: str):
        return db_engine.fetch_all("SELECT q.*, eq.order_index FROM exam_questions eq JOIN question_bank q ON eq.question_id = q.id WHERE eq.exam_id = ? ORDER BY eq.order_index ASC", (exam_id,))


class ExerciseRepository:
    @staticmethod
    def list_exercises(lesson_id: Optional[str] = None, is_admin: bool = False):
        filters = {}
        if lesson_id:
            filters["lesson_id"] = lesson_id
        return db_engine.query("exercises", filters=filters if filters else None, order_by="order_index", descending=False)

    @staticmethod
    def get_exercise(exercise_id: str):
        return db_engine.fetch_one("SELECT * FROM exercises WHERE id = ?", (exercise_id,))

    @staticmethod
    def record_submission(data: Dict[str, Any]):
        return db_engine.insert("exercise_submissions", data)


class SupportRepository:
    @staticmethod
    def list_tickets(user_id: Optional[str] = None, status: Optional[str] = None):
        filters = {}
        if user_id:
            filters["user_id"] = user_id
        if status:
            filters["status"] = status
        return db_engine.query("support_tickets", filters=filters if filters else None, order_by="updated_at", descending=True)

    @staticmethod
    def get_ticket(ticket_id: str):
        return db_engine.fetch_one("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,))

    @staticmethod
    def create_ticket(data: Dict[str, Any]):
        return db_engine.insert("support_tickets", data)

    @staticmethod
    def get_messages(ticket_id: str):
        return db_engine.fetch_all("SELECT sm.*, u.full_name as sender_name, u.role as sender_role FROM support_messages sm JOIN users u ON sm.sender_id = u.id WHERE sm.ticket_id = ? ORDER BY sm.created_at ASC", (ticket_id,))

    @staticmethod
    def add_message(data: Dict[str, Any]):
        msg = db_engine.insert("support_messages", data)
        db_engine.update("support_tickets", data["ticket_id"], {"updated_at": now_iso()})
        return msg


class AuditRepository:
    @staticmethod
    def log(user_id: Optional[str], action: str, entity_type: str, entity_id: Optional[str] = None, details: Optional[Dict] = None, ip_address: Optional[str] = None):
        rec = {
            "user_id": user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "details_json": json.dumps(details or {}, ensure_ascii=False),
            "ip_address": ip_address,
            "created_at": now_iso()
        }
        return db_engine.insert("activity_logs", rec)

    @staticmethod
    def list_logs(user_id: Optional[str] = None, action: Optional[str] = None, offset: int = 0, limit: int = 50):
        filters = {}
        if user_id:
            filters["user_id"] = user_id
        if action:
            filters["action"] = action
        return db_engine.query("activity_logs", filters=filters if filters else None, order_by="created_at", descending=True, offset=offset, limit=limit)
