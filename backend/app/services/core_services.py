"""
Code Spark - Business Logic Services
Core educational domain logic, calculations, access control, and relational operations.
"""
import uuid
import json
import random
import string
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple
from app.db.engine import db_engine, now_iso
from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, create_refresh_token, hash_code
)
from app.core.permissions import ALL_PERMISSION_KEYS
from app.repositories.all_repositories import (
    UserRepository, SubscriptionRepository, CurriculumRepository,
    AssessmentRepository, ExerciseRepository, SupportRepository, AuditRepository
)

class AuthService:
    @staticmethod
    def register(data: Dict[str, Any]) -> Dict[str, Any]:
        username = data.get("username", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        full_name = data.get("full_name", "").strip()
        phone = data.get("phone", "").strip() if data.get("phone") else None

        if not username or len(username) < 3:
            raise ValueError("اسم المستخدم يجب أن يكون 3 أحرف على الأقل")
        if not email or "@" not in email:
            raise ValueError("البريد الإلكتروني غير صالح")
        if not password or len(password) < 6:
            raise ValueError("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
        if not full_name:
            raise ValueError("الاسم بالكامل مطلوب")
        if UserRepository.get_by_username(username):
            raise ValueError("اسم المستخدم مسجل بالفعل")
        if UserRepository.get_by_email(email):
            raise ValueError("البريد الإلكتروني مسجل بالفعل")

        user_data = {
            "id": uuid.uuid4().hex,
            "username": username,
            "email": email,
            "hashed_password": get_password_hash(password),
            "full_name": full_name,
            "role": "student",
            "is_active": 1,
            "is_verified": 1,
            "phone": phone,
            "avatar_url": None,
            "created_at": now_iso(),
            "updated_at": now_iso()
        }
        user = UserRepository.create(user_data)
        db_engine.insert("notifications", {
            "user_id": user["id"],
            "title": "مرحباً بك في منصة Code Spark! 🎉",
            "message": "يسعدنا انضمامك إلى رحلة تعلم البرمجة التأسيسية. يمكنك تصفح الدروس المجانية أو إدخال كود الاشتراك لفتح المحتوى الكامل.",
            "type": "info",
            "is_read": 0,
            "action_url": "/student/dashboard"
        })
        AuditRepository.log(user["id"], "register", "user", user["id"], {"username": username, "email": email})
        return user

    @staticmethod
    def login(username_or_email: str, plain_password: str) -> Optional[Tuple[Dict[str, Any], str, str]]:
        ident = username_or_email.strip().lower()
        user = UserRepository.get_by_username(ident) or UserRepository.get_by_email(ident)
        if not user:
            return None
        if not user.get("is_active", 1):
            raise ValueError("الحساب معطل حالياً، يرجى مراجعة إدارة المنصة")
        if not verify_password(plain_password, user["hashed_password"]):
            return None

        permissions = []
        if user["role"] == "admin":
            permissions = ["all"]
        elif user["role"] == "assistant":
            permissions = UserRepository.get_assistant_permissions(user["id"])

        token_payload = {
            "sub": user["id"],
            "username": user["username"],
            "role": user["role"],
            "full_name": user["full_name"],
            "permissions": permissions
        }
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        # Update streak and last active date if student
        if user["role"] == "student":
            today = now_iso()[:10]
            stats = db_engine.fetch_one("SELECT * FROM student_stats WHERE user_id = ?", (user["id"],))
            if stats:
                last_act = stats.get("last_active_date")
                streak = stats.get("streak_days", 1)
                if last_act != today:
                    try:
                        last_d = datetime.strptime(last_act, "%Y-%m-%d").date()
                        curr_d = datetime.strptime(today, "%Y-%m-%d").date()
                        if (curr_d - last_d).days == 1:
                            streak += 1
                        elif (curr_d - last_d).days > 1:
                            streak = 1
                    except Exception:
                        streak = 1
                    db_engine.execute("UPDATE student_stats SET streak_days = ?, last_active_date = ? WHERE user_id = ?", (streak, today, user["id"]))
        AuditRepository.log(user["id"], "login", "user", user["id"], {"login_time": now_iso()})
        return user, access_token, refresh_token

    @staticmethod
    def get_me(user_id: str) -> Dict[str, Any]:
        user = UserRepository.get_by_id(user_id)
        if not user:
            raise ValueError("المستخدم غير موجود")
        result = {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "phone": user.get("phone"),
            "avatar_url": user.get("avatar_url"),
            "created_at": user["created_at"],
            "is_active": bool(user.get("is_active", 1)),
            "is_verified": bool(user.get("is_verified", 1))
        }
        if user["role"] == "assistant":
            result["permissions"] = UserRepository.get_assistant_permissions(user_id)
        elif user["role"] == "admin":
            result["permissions"] = ["all"]
        else:
            result["permissions"] = []
        if user["role"] == "student":
            sub = SubscriptionRepository.get_active_subscription(user_id)
            result["has_active_subscription"] = sub is not None
            result["subscription"] = sub
            stats = db_engine.fetch_one("SELECT * FROM student_stats WHERE user_id = ?", (user_id,))
            result["stats"] = stats or {"xp": 0, "streak_days": 1, "study_time_minutes": 0.0}
        return result


class AccessControlService:
    @staticmethod
    def has_access(user: Optional[Dict[str, Any]], is_free: bool = False) -> Tuple[bool, str]:
        if is_free:
            return True, "محتوى مجاني ومتاح للجميع"
        if not user:
            return False, "يجب تسجيل الدخول للوصول إلى هذا المحتوى المخصص للمشتركين"
        if user.get("role") in ("admin", "assistant"):
            return True, "صلاحية إدارة"
        if user.get("role") == "student":
            sub = SubscriptionRepository.get_active_subscription(user["id"])
            if sub:
                return True, "اشتراك نشط"
            return False, "هذا المحتوى متاح للمشتركين فقط. يرجى تفعيل كود الاشتراك للمتابعة"
        return False, "غير مصرح"


class SubscriptionService:
    DURATIONS_MAP = {
        "1_MONTH": 30,
        "2_MONTHS": 60,
        "3_MONTHS": 90,
        "4_MONTHS": 120,
        "5_MONTHS": 150,
        "6_MONTHS": 180,
        "7_MONTHS": 210,
        "8_MONTHS": 240,
        "9_MONTHS": 270,
        "10_MONTHS": 300,
        "11_MONTHS": 330,
        "12_MONTHS": 365,
        "LIFETIME": 36500,
        "CUSTOM": 30
    }

    @staticmethod
    def generate_random_code() -> str:
        chars = string.ascii_uppercase + "23456789"
        p1 = "".join(random.choices(chars, k=4))
        p2 = "".join(random.choices(chars, k=4))
        return f"CS-{p1}-{p2}"

    @staticmethod
    def create_code(
        duration_type: str,
        duration_days: Optional[int] = None,
        created_by: Optional[str] = None,
        custom_code: Optional[str] = None,
        batch_name: Optional[str] = None
    ) -> Dict[str, Any]:
        days = duration_days if duration_days and duration_days > 0 else SubscriptionService.DURATIONS_MAP.get(duration_type, 30)
        code_str = (custom_code.strip().upper() if custom_code else SubscriptionService.generate_random_code())
        if SubscriptionRepository.get_code_by_string(code_str):
            raise ValueError(f"كود الاشتراك '{code_str}' موجود بالفعل")
        rec = {
            "id": uuid.uuid4().hex,
            "code": code_str,
            "code_hash": hash_code(code_str),
            "duration_type": duration_type,
            "duration_days": days,
            "status": "ACTIVE",
            "batch_name": batch_name or f"كود {duration_type}",
            "created_by": created_by,
            "used_by": None,
            "used_at": None,
            "created_at": now_iso(),
            "expires_at": None
        }
        return SubscriptionRepository.create_code(rec)

    @staticmethod
    def validate_code(code_str: str) -> Dict[str, Any]:
        clean = code_str.strip().upper()
        code_rec = SubscriptionRepository.get_code_by_string(clean)
        if not code_rec:
            raise ValueError("كود الاشتراك غير صحيح أو غير موجود")
        if code_rec.get("status") == "DISABLED":
            raise ValueError("هذا الكود تم تعطيله من قبل الإدارة")
        if code_rec.get("status") == "USED":
            raise ValueError("هذا الكود تم استخدامه مسبقاً")
        return {
            "valid": True,
            "code": code_rec["code"],
            "duration_type": code_rec["duration_type"],
            "duration_days": code_rec["duration_days"],
            "status": code_rec["status"]
        }

    @staticmethod
    def activate_code(user_id: str, code_str: str) -> Dict[str, Any]:
        clean = code_str.strip().upper()
        with db_engine.transaction():
            code_rec = SubscriptionRepository.get_code_by_string(clean)
            if not code_rec:
                raise ValueError("كود الاشتراك غير صحيح أو غير موجود")
            if code_rec.get("status") == "DISABLED":
                raise ValueError("هذا الكود تم تعطيله من قبل الإدارة")
            if code_rec.get("status") == "USED":
                raise ValueError("هذا الكود تم استخدامه مسبقاً")

            now = datetime.now(timezone.utc)
            duration_days = code_rec.get("duration_days") or 30
            expires_at = (now + timedelta(days=duration_days)).isoformat()
            now_str = now.isoformat()

            db_engine.update("subscription_codes", code_rec["id"], {
                "status": "USED",
                "used_by": user_id,
                "used_at": now_str
            })

            sub_rec = {
                "user_id": user_id,
                "code": clean,
                "plan_id": None,
                "plan_name": f"كود تفعيل: {code_rec.get('duration_type')}",
                "starts_at": now_str,
                "expires_at": expires_at,
                "is_active": 1,
                "created_at": now_str,
                "updated_at": now_str
            }
            created_sub = SubscriptionRepository.create_subscription(sub_rec)

            db_engine.insert("notifications", {
                "user_id": user_id,
                "title": "تم تفعيل الاشتراك بنجاح! 🚀",
                "message": f"تم تفعيل الكود {clean} بنجاح. اشتراكك نشط حتى {expires_at[:10]}.",
                "type": "success",
                "is_read": 0,
                "action_url": "/student/courses"
            })
            AuditRepository.log(user_id, "subscription_activated", "subscription", created_sub["id"], {"code": clean, "days": duration_days})

            return {
                "success": True,
                "message": "تم تفعيل الاشتراك بنجاح! تم فتح كافة الدروس والامتحانات المتقدمة.",
                "expires_at": expires_at,
                "duration_days": duration_days
            }
