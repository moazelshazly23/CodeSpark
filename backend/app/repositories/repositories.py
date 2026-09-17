"""
CodeSpark - Domain Repositories
Clean data access layer with strict parameter binding, transaction isolation,
and data consistency across all platform entities.
"""
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple
from app.db.engine import db_engine, now_iso
from app.core.security import hash_code

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
    def get_by_identifier(identifier: str) -> Optional[Dict[str, Any]]:
        ident = identifier.strip().lower()
        return db_engine.fetch_one("SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?", (ident, ident))

    @staticmethod
    def create(data: Dict[str, Any]) -> Dict[str, Any]:
        with db_engine.transaction():
            user = db_engine.insert("users", data)
            if user.get("role") == "student":
                db_engine.insert("student_stats", {
                    "user_id": user["id"],
                    "xp": 50,
                    "streak_days": 1,
                    "last_active_date": now_iso()[:10],
                    "study_time_minutes": 0.0,
                    "achievements_json": json.dumps(["بداية الرحلة 🚀"], ensure_ascii=False)
                })
            return user

    @staticmethod
    def update(user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return db_engine.update("users", user_id, updates)

    @staticmethod
    def delete(user_id: str) -> bool:
        return db_engine.delete("users", user_id)

    @staticmethod
    def list_users(role: Optional[str] = None, search: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        sql = "SELECT id, username, email, full_name, phone, role, is_active, avatar_url, created_at, updated_at FROM users"
        clauses = []
        params = []
        if role:
            clauses.append("role = ?")
            params.append(role)
        if search:
            clauses.append("(LOWER(full_name) LIKE ? OR LOWER(username) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ?)")
            s = f"%{search.lower()}%"
            params.extend([s, s, s, f"%{search}%"])
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        return db_engine.fetch_all(sql, tuple(params))

    @staticmethod
    def get_assistant_permissions(user_id: str) -> List[str]:
        rows = db_engine.fetch_all("SELECT permission FROM assistant_permissions WHERE user_id = ?", (user_id,))
        return [r["permission"] for r in rows]

    @staticmethod
    def set_assistant_permissions(user_id: str, permissions: List[str]):
        with db_engine.transaction():
            db_engine.execute("DELETE FROM assistant_permissions WHERE user_id = ?", (user_id,))
            for p in set(permissions):
                db_engine.insert("assistant_permissions", {
                    "user_id": user_id,
                    "permission": p
                })

class CourseRepository:
    @staticmethod
    def get_by_id(course_id: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one("SELECT * FROM courses WHERE id = ?", (course_id,))

    @staticmethod
    def list_courses(only_published: bool = True) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM courses"
        if only_published:
            sql += " WHERE is_published = 1"
        sql += " ORDER BY order_index ASC, created_at ASC"
        return db_engine.fetch_all(sql)

    @staticmethod
    def create(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("courses", data)

    @staticmethod
    def update(course_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return db_engine.update("courses", course_id, updates)

    @staticmethod
    def delete(course_id: str) -> bool:
        return db_engine.delete("courses", course_id)

class UnitRepository:
    @staticmethod
    def get_by_id(unit_id: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one("SELECT * FROM units WHERE id = ?", (unit_id,))

    @staticmethod
    def list_by_course(course_id: str, only_published: bool = True) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM units WHERE course_id = ?"
        params = [course_id]
        if only_published:
            sql += " AND is_published = 1"
        sql += " ORDER BY order_index ASC, created_at ASC"
        return db_engine.fetch_all(sql, tuple(params))

    @staticmethod
    def create(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("units", data)

    @staticmethod
    def update(unit_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return db_engine.update("units", unit_id, updates)

    @staticmethod
    def delete(unit_id: str) -> bool:
        return db_engine.delete("units", unit_id)

class LessonRepository:
    @staticmethod
    def get_by_id(lesson_id: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one("SELECT * FROM lessons WHERE id = ?", (lesson_id,))

    @staticmethod
    def list_by_unit(unit_id: str, only_published: bool = True) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM lessons WHERE unit_id = ?"
        params = [unit_id]
        if only_published:
            sql += " AND is_published = 1"
        sql += " ORDER BY order_index ASC, created_at ASC"
        return db_engine.fetch_all(sql, tuple(params))

    @staticmethod
    def list_all(only_published: bool = False) -> List[Dict[str, Any]]:
        sql = """
        SELECT l.*, u.title as unit_title, c.title as course_title 
        FROM lessons l
        LEFT JOIN units u ON l.unit_id = u.id
        LEFT JOIN courses c ON u.course_id = c.id
        """
        if only_published:
            sql += " WHERE l.is_published = 1"
        sql += " ORDER BY l.order_index ASC, l.created_at ASC"
        return db_engine.fetch_all(sql)

    @staticmethod
    def create(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("lessons", data)

    @staticmethod
    def update(lesson_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return db_engine.update("lessons", lesson_id, updates)

    @staticmethod
    def delete(lesson_id: str) -> bool:
        return db_engine.delete("lessons", lesson_id)

    @staticmethod
    def get_progress(user_id: str, lesson_id: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one("SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?", (user_id, lesson_id))

    @staticmethod
    def update_progress(user_id: str, lesson_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        with db_engine.transaction():
            existing = LessonRepository.get_progress(user_id, lesson_id)
            if existing:
                up = updates.copy()
                if up.get("is_completed") and not existing.get("is_completed"):
                    up["completed_at"] = now_iso()
                    # Award XP if newly completed
                    db_engine.execute("UPDATE student_stats SET xp = xp + 20 WHERE user_id = ?", (user_id,))
                db_engine.update("lesson_progress", existing["id"], up)
                return LessonRepository.get_progress(user_id, lesson_id)
            else:
                data = {
                    "user_id": user_id,
                    "lesson_id": lesson_id,
                    "is_completed": 1 if updates.get("is_completed") else 0,
                    "last_position_seconds": updates.get("last_position_seconds", 0.0),
                    "watch_percentage": updates.get("watch_percentage", 0.0),
                    "completed_at": now_iso() if updates.get("is_completed") else None
                }
                if data["is_completed"]:
                    db_engine.execute("UPDATE student_stats SET xp = xp + 20 WHERE user_id = ?", (user_id,))
                return db_engine.insert("lesson_progress", data)

class StudyFileRepository:
    @staticmethod
    def get_by_id(file_id: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one("SELECT * FROM study_files WHERE id = ?", (file_id,))

    @staticmethod
    def list_files(course_id: Optional[str] = None, unit_id: Optional[str] = None, lesson_id: Optional[str] = None, only_published: bool = True) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM study_files"
        clauses = []
        params = []
        if only_published:
            clauses.append("is_published = 1")
        if course_id:
            clauses.append("course_id = ?")
            params.append(course_id)
        if unit_id:
            clauses.append("unit_id = ?")
            params.append(unit_id)
        if lesson_id:
            clauses.append("lesson_id = ?")
            params.append(lesson_id)
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY created_at DESC"
        return db_engine.fetch_all(sql, tuple(params))

    @staticmethod
    def create(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("study_files", data)

    @staticmethod
    def update(file_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return db_engine.update("study_files", file_id, updates)

    @staticmethod
    def delete(file_id: str) -> bool:
        return db_engine.delete("study_files", file_id)

class SubscriptionRepository:
    @staticmethod
    def get_active_subscription(user_id: str) -> Optional[Dict[str, Any]]:
        now_str = now_iso()
        return db_engine.fetch_one("""
            SELECT * FROM subscriptions 
            WHERE user_id = ? AND is_active = 1 
            AND (is_lifetime = 1 OR expires_at IS NULL OR expires_at > ?)
            ORDER BY expires_at DESC LIMIT 1
        """, (user_id, now_str))

    @staticmethod
    def get_plan(plan_id: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one("SELECT * FROM subscription_plans WHERE id = ?", (plan_id,))

    @staticmethod
    def list_plans(only_active: bool = True) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM subscription_plans"
        if only_active:
            sql += " WHERE is_active = 1"
        sql += " ORDER BY order_index ASC, price ASC"
        return db_engine.fetch_all(sql)

    @staticmethod
    def create_plan(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("subscription_plans", data)

    @staticmethod
    def update_plan(plan_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return db_engine.update("subscription_plans", plan_id, updates)

    @staticmethod
    def delete_plan(plan_id: str) -> bool:
        return db_engine.delete("subscription_plans", plan_id)

    @staticmethod
    def create_code(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("subscription_codes", data)

    @staticmethod
    def get_code_by_str(code_str: str) -> Optional[Dict[str, Any]]:
        clean = code_str.strip().upper().replace(" ", "").replace("-", "")
        h = hash_code(clean)
        return db_engine.fetch_one("SELECT * FROM subscription_codes WHERE code_hash = ? OR UPPER(code) = ?", (h, code_str.strip().upper()))

    @staticmethod
    def redeem_code(user_id: str, code_str: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        with db_engine.transaction():
            code_rec = SubscriptionRepository.get_code_by_str(code_str)
            if not code_rec:
                return False, "كود الاشتراك غير صحيح أو غير مسجل في النظام", None
            if code_rec["status"] != "ACTIVE":
                if code_rec["status"] == "USED":
                    return False, "تم استخدام هذا الكود من قبل مسبقاً", None
                return False, f"كود الاشتراك غير صالح (الحالة: {code_rec['status']})", None
            
            now = datetime.now(timezone.utc)
            duration_days = code_rec.get("duration_days", 30)
            is_lifetime = (code_rec.get("duration_type") == "LIFETIME")
            expires_at = None if is_lifetime else (now + timedelta(days=duration_days)).isoformat()

            # Mark code used
            db_engine.update("subscription_codes", code_rec["id"], {
                "status": "USED",
                "used_by": user_id,
                "used_at": now.isoformat()
            })

            # Create or update subscription
            sub_data = {
                "user_id": user_id,
                "code": code_rec["code"],
                "plan_name": f"اشتراك تفعيل كود ({code_rec.get('duration_type', 'مخصص')})",
                "starts_at": now.isoformat(),
                "expires_at": expires_at,
                "is_active": 1,
                "is_lifetime": 1 if is_lifetime else 0
            }
            sub = db_engine.insert("subscriptions", sub_data)

            # Award gamification XP
            db_engine.execute("UPDATE student_stats SET xp = xp + 50 WHERE user_id = ?", (user_id,))
            
            # Add notification
            db_engine.insert("notifications", {
                "user_id": user_id,
                "title": "تم تفعيل الاشتراك بنجاح! 🚀",
                "message": f"تم تفعيل اشتراكك باستخدام الكود {code_rec['code']}. استمتع بجميع مميزات المنصة.",
                "type": "success",
                "action_url": "/student/courses"
            })

            return True, "تم تفعيل الاشتراك بنجاح! مرحباً بك في CodeSpark", sub

    @staticmethod
    def list_codes(limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        return db_engine.fetch_all("""
            SELECT sc.*, u.full_name as creator_name, uu.full_name as user_name 
            FROM subscription_codes sc
            LEFT JOIN users u ON sc.created_by = u.id
            LEFT JOIN users uu ON sc.used_by = uu.id
            ORDER BY sc.created_at DESC LIMIT ? OFFSET ?
        """, (limit, offset))

    @staticmethod
    def create_request(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("payment_requests", data)

    @staticmethod
    def get_request(req_id: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one("SELECT * FROM payment_requests WHERE id = ?", (req_id,))

    @staticmethod
    def list_requests(status: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        sql = """
            SELECT pr.*, u.full_name as student_name, u.email as student_email, u.phone as student_phone,
                   sp.name as plan_name, sp.price as plan_price, sp.duration_months
            FROM payment_requests pr
            LEFT JOIN users u ON pr.user_id = u.id
            LEFT JOIN subscription_plans sp ON pr.plan_id = sp.id
        """
        params = []
        if status:
            sql += " WHERE pr.status = ?"
            params.append(status)
        sql += " ORDER BY pr.created_at DESC LIMIT ?"
        params.append(limit)
        return db_engine.fetch_all(sql, tuple(params))

    @staticmethod
    def review_request(req_id: str, new_status: str, admin_notes: str, reviewer_id: str) -> Optional[Dict[str, Any]]:
        with db_engine.transaction():
            req = SubscriptionRepository.get_request(req_id)
            if not req:
                return None
            
            now = datetime.now(timezone.utc)
            db_engine.update("payment_requests", req_id, {
                "status": new_status,
                "admin_notes": admin_notes,
                "reviewed_by": reviewer_id,
                "reviewed_at": now.isoformat()
            })

            if new_status == "approved":
                plan = SubscriptionRepository.get_plan(req["plan_id"])
                duration_months = plan["duration_months"] if plan else 1
                days = duration_months * 30
                expires_at = (now + timedelta(days=days)).isoformat()
                
                db_engine.insert("subscriptions", {
                    "user_id": req["user_id"],
                    "plan_id": req["plan_id"],
                    "plan_name": plan["name"] if plan else "اشتراك باقة",
                    "starts_at": now.isoformat(),
                    "expires_at": expires_at,
                    "is_active": 1,
                    "is_lifetime": 0
                })

                db_engine.insert("notifications", {
                    "user_id": req["user_id"],
                    "title": "تمت الموافقة على طلب اشتراكك! 🎉",
                    "message": f"تم اعتماد عملية الدفع وتفعيل اشتراكك بنجاح في {plan['name'] if plan else 'الباقة'}.",
                    "type": "success",
                    "action_url": "/student/dashboard"
                })
            elif new_status == "rejected":
                db_engine.insert("notifications", {
                    "user_id": req["user_id"],
                    "title": "ملاحظة بخصوص طلب الاشتراك",
                    "message": f"تم رفض طلب الاشتراك: {admin_notes or 'يرجى مراجعة تفاصيل التحويل والتواصل مع الدعم'}",
                    "type": "warning",
                    "action_url": "/student/subscription"
                })

            return SubscriptionRepository.get_request(req_id)

class SettingsRepository:
    @staticmethod
    def get_settings() -> Dict[str, Any]:
        row = db_engine.fetch_one("SELECT value_json FROM platform_settings WHERE key = 'general'")
        if row and row.get("value_json"):
            try:
                return json.loads(row["value_json"])
            except Exception:
                pass
        return {
            "platform_name": "CodeSpark",
            "vodafone_cash": "+20159159038",
            "payment_phone": "+20159159038",
            "instapay_phone": "+20159159038",
            "instapay_link": "https://ipn.eg/S/moazasem/instapay/27DsGj",
            "contact_phone": "+20159159038",
            "offers_visible": True,
            "offer_banner_text": "خصومات الفصل الدراسي الجديد! خصم 20% لفترة محدودة ⚡",
            "special_offers": "احصل على اشتراك الفصل الدراسي بالكامل مع مذكرات المنهج وبنك الأسئلة."
        }

    @staticmethod
    def update_settings(updates: Dict[str, Any]) -> Dict[str, Any]:
        with db_engine.transaction():
            curr = SettingsRepository.get_settings()
            for k, v in updates.items():
                if v is not None:
                    curr[k] = v
            # Keep vodafone_cash and payment_phone in sync
            if "vodafone_cash" in updates and updates["vodafone_cash"]:
                curr["payment_phone"] = updates["vodafone_cash"]
            elif "payment_phone" in updates and updates["payment_phone"]:
                curr["vodafone_cash"] = updates["payment_phone"]

            new_json = json.dumps(curr, ensure_ascii=False)
            now_str = now_iso()
            row = db_engine.fetch_one("SELECT key FROM platform_settings WHERE key = 'general'")
            if row:
                db_engine.execute("UPDATE platform_settings SET value_json = ?, updated_at = ? WHERE key = 'general'", (new_json, now_str))
            else:
                db_engine.execute("INSERT INTO platform_settings (key, value_json, description, updated_at) VALUES ('general', ?, 'إعدادات المنصة', ?)", (new_json, now_str))
            return curr

class AnnouncementsRepository:
    @staticmethod
    def list_announcements(only_published: bool = True) -> List[Dict[str, Any]]:
        sql = "SELECT a.*, u.full_name as author_name FROM announcements a LEFT JOIN users u ON a.author_id = u.id"
        if only_published:
            sql += " WHERE a.is_published = 1"
        sql += " ORDER BY a.is_urgent DESC, a.created_at DESC"
        return db_engine.fetch_all(sql)

    @staticmethod
    def get_by_id(ann_id: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one("SELECT * FROM announcements WHERE id = ?", (ann_id,))

    @staticmethod
    def create(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("announcements", data)

    @staticmethod
    def update(ann_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return db_engine.update("announcements", ann_id, updates)

    @staticmethod
    def delete(ann_id: str) -> bool:
        return db_engine.delete("announcements", ann_id)

class NotificationsRepository:
    @staticmethod
    def list_user_notifications(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        return db_engine.fetch_all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", (user_id, limit))

    @staticmethod
    def create(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("notifications", data)

    @staticmethod
    def mark_as_read(notif_id: str) -> bool:
        res = db_engine.update("notifications", notif_id, {"is_read": 1})
        return res is not None

class ExamsRepository:
    @staticmethod
    def get_question(q_id: str) -> Optional[Dict[str, Any]]:
        q = db_engine.fetch_one("SELECT * FROM question_bank WHERE id = ?", (q_id,))
        if q and q.get("options_json"):
            try:
                q["options"] = json.loads(q["options_json"])
            except Exception:
                q["options"] = []
        return q

    @staticmethod
    def list_questions(lesson_id: Optional[str] = None, unit_id: Optional[str] = None) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM question_bank WHERE is_active = 1"
        params = []
        if lesson_id:
            sql += " AND lesson_id = ?"
            params.append(lesson_id)
        if unit_id:
            sql += " AND unit_id = ?"
            params.append(unit_id)
        sql += " ORDER BY created_at DESC"
        rows = db_engine.fetch_all(sql, tuple(params))
        for r in rows:
            if r.get("options_json"):
                try:
                    r["options"] = json.loads(r["options_json"])
                except Exception:
                    r["options"] = []
        return rows

    @staticmethod
    def create_question(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("question_bank", data)

    @staticmethod
    def update_question(q_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return db_engine.update("question_bank", q_id, updates)

    @staticmethod
    def delete_question(q_id: str) -> bool:
        return db_engine.delete("question_bank", q_id)

    @staticmethod
    def get_exam(exam_id: str) -> Optional[Dict[str, Any]]:
        exam = db_engine.fetch_one("SELECT * FROM exams WHERE id = ?", (exam_id,))
        if not exam:
            return None
        questions = db_engine.fetch_all("""
            SELECT qb.*, eq.points as assigned_points, eq.order_index as q_order
            FROM exam_questions eq
            JOIN question_bank qb ON eq.question_id = qb.id
            WHERE eq.exam_id = ?
            ORDER BY eq.order_index ASC
        """, (exam_id,))
        for q in questions:
            if q.get("options_json"):
                try:
                    q["options"] = json.loads(q["options_json"])
                except Exception:
                    q["options"] = []
        exam["questions"] = questions
        return exam

    @staticmethod
    def list_exams(only_published: bool = True) -> List[Dict[str, Any]]:
        sql = "SELECT e.*, c.title as course_title, u.title as unit_title FROM exams e LEFT JOIN courses c ON e.course_id = c.id LEFT JOIN units u ON e.unit_id = u.id"
        if only_published:
            sql += " WHERE e.is_published = 1"
        sql += " ORDER BY e.created_at DESC"
        return db_engine.fetch_all(sql)

    @staticmethod
    def create_exam(data: Dict[str, Any], question_ids: List[str]) -> Dict[str, Any]:
        with db_engine.transaction():
            exam = db_engine.insert("exams", data)
            for idx, q_id in enumerate(question_ids):
                db_engine.insert("exam_questions", {
                    "exam_id": exam["id"],
                    "question_id": q_id,
                    "points": 5.0,
                    "order_index": idx + 1
                })
            return ExamsRepository.get_exam(exam["id"])

    @staticmethod
    def update_exam(exam_id: str, updates: Dict[str, Any], question_ids: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
        with db_engine.transaction():
            exam = db_engine.update("exams", exam_id, updates)
            if not exam:
                return None
            if question_ids is not None:
                db_engine.execute("DELETE FROM exam_questions WHERE exam_id = ?", (exam_id,))
                for idx, q_id in enumerate(question_ids):
                    db_engine.insert("exam_questions", {
                        "exam_id": exam_id,
                        "question_id": q_id,
                        "points": 5.0,
                        "order_index": idx + 1
                    })
            return ExamsRepository.get_exam(exam_id)

    @staticmethod
    def delete_exam(exam_id: str) -> bool:
        return db_engine.delete("exams", exam_id)

    @staticmethod
    def submit_attempt(user_id: str, exam_id: str, answers: Dict[str, str]) -> Dict[str, Any]:
        with db_engine.transaction():
            exam = ExamsRepository.get_exam(exam_id)
            if not exam:
                raise ValueError("الامتحان غير موجود")
            
            questions = exam.get("questions", [])
            total_possible = 0.0
            score = 0.0
            results = []

            for q in questions:
                pts = float(q.get("assigned_points", 5.0))
                total_possible += pts
                user_ans = str(answers.get(q["id"], "")).strip()
                correct_ans = str(q.get("correct_answer", "")).strip()
                is_correct = (user_ans.lower() == correct_ans.lower())
                if is_correct:
                    score += pts
                results.append({
                    "question_id": q["id"],
                    "user_answer": user_ans,
                    "correct_answer": correct_ans,
                    "is_correct": is_correct,
                    "points": pts if is_correct else 0.0,
                    "explanation": q.get("explanation", "")
                })

            percentage = round((score / total_possible * 100.0) if total_possible > 0 else 100.0, 1)
            is_passed = percentage >= exam.get("passing_score", 70.0)

            attempt = db_engine.insert("exam_attempts", {
                "exam_id": exam_id,
                "user_id": user_id,
                "answers_json": json.dumps({"answers": answers, "results": results}, ensure_ascii=False),
                "score": score,
                "total_possible": total_possible,
                "percentage": percentage,
                "is_passed": 1 if is_passed else 0,
                "status": "COMPLETED",
                "started_at": now_iso(),
                "completed_at": now_iso()
            })

            # Award XP for exam completion
            xp_reward = int(percentage / 2)
            db_engine.execute("UPDATE student_stats SET xp = xp + ? WHERE user_id = ?", (xp_reward, user_id))

            attempt["results"] = results
            return attempt

    @staticmethod
    def list_attempts(user_id: Optional[str] = None, exam_id: Optional[str] = None) -> List[Dict[str, Any]]:
        sql = """
            SELECT ea.*, e.title as exam_title, u.full_name as student_name
            FROM exam_attempts ea
            JOIN exams e ON ea.exam_id = e.id
            JOIN users u ON ea.user_id = u.id
        """
        clauses = []
        params = []
        if user_id:
            clauses.append("ea.user_id = ?")
            params.append(user_id)
        if exam_id:
            clauses.append("ea.exam_id = ?")
            params.append(exam_id)
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY ea.completed_at DESC"
        return db_engine.fetch_all(sql, tuple(params))

class ExercisesRepository:
    @staticmethod
    def get_exercise(ex_id: str) -> Optional[Dict[str, Any]]:
        ex = db_engine.fetch_one("SELECT * FROM exercises WHERE id = ?", (ex_id,))
        if ex and ex.get("test_cases_json"):
            try:
                ex["test_cases"] = json.loads(ex["test_cases_json"])
            except Exception:
                ex["test_cases"] = []
        return ex

    @staticmethod
    def list_by_lesson(lesson_id: str) -> List[Dict[str, Any]]:
        rows = db_engine.fetch_all("SELECT * FROM exercises WHERE lesson_id = ? AND is_published = 1 ORDER BY order_index ASC", (lesson_id,))
        for r in rows:
            if r.get("test_cases_json"):
                try:
                    r["test_cases"] = json.loads(r["test_cases_json"])
                except Exception:
                    r["test_cases"] = []
        return rows

    @staticmethod
    def create(data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert("exercises", data)

    @staticmethod
    def update(ex_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return db_engine.update("exercises", ex_id, updates)

    @staticmethod
    def delete(ex_id: str) -> bool:
        return db_engine.delete("exercises", ex_id)

    @staticmethod
    def record_submission(user_id: str, exercise_id: str, submitted_code: str, status: str, output: str, tests_passed: int, tests_total: int) -> Dict[str, Any]:
        with db_engine.transaction():
            sub = db_engine.insert("exercise_submissions", {
                "user_id": user_id,
                "exercise_id": exercise_id,
                "submitted_code": submitted_code,
                "status": status,
                "output": output,
                "tests_passed": tests_passed,
                "tests_total": tests_total
            })
            if status == "PASSED":
                db_engine.execute("UPDATE student_stats SET xp = xp + 15 WHERE user_id = ?", (user_id,))
            return sub
