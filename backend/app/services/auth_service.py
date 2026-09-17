"""
CodeSpark - User Authentication & Account Management Service
Production-ready authentication, role assignment, profile management,
and strictly verified password change workflow.
"""
from typing import Dict, Any, Optional, Tuple, List
from app.core.security import get_password_hash, verify_password, create_access_token
from app.repositories.repositories import UserRepository
from app.db.engine import now_iso, db_engine

class AuthService:
    @staticmethod
    def register(data: Dict[str, Any]) -> Dict[str, Any]:
        username = data.get("username", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        full_name = data.get("full_name", "").strip()
        phone = data.get("phone", "").strip() if data.get("phone") else None

        if not username or len(username) < 3:
            raise ValueError("اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل")
        if not email or "@" not in email:
            raise ValueError("البريد الإلكتروني غير صالح")
        if not password or len(password) < 6:
            raise ValueError("كلمة المرور يجب أن تتكون من 6 خانات على الأقل")
        if not full_name:
            raise ValueError("الاسم بالكامل مطلوب")

        if UserRepository.get_by_username(username):
            raise ValueError("اسم المستخدم مسجل بالفعل، يرجى اختيار اسم آخر")
        if UserRepository.get_by_email(email):
            raise ValueError("البريد الإلكتروني مسجل بالفعل بحساب آخر")

        user_data = {
            "username": username,
            "email": email,
            "hashed_password": get_password_hash(password),
            "full_name": full_name,
            "role": "student",
            "is_active": 1,
            "phone": phone,
            "avatar_url": None
        }
        user = UserRepository.create(user_data)
        return user

    @staticmethod
    def login(username_or_email: str, plain_password: str) -> Optional[Tuple[Dict[str, Any], str]]:
        ident = username_or_email.strip()
        user = UserRepository.get_by_identifier(ident)
        if not user:
            return None
        if not user.get("is_active", 1):
            raise ValueError("تم تعطيل هذا الحساب من قبل الإدارة. يرجى مراجعة الدعم الفني")
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
            "email": user["email"]
        }
        access_token = create_access_token(token_payload)
        user["permissions"] = permissions
        return user, access_token

    @staticmethod
    def change_password(user_id: str, current_password: str, new_password: str, confirm_password: str) -> Dict[str, Any]:
        """
        Validates the current password, validates the new password, hashes it securely,
        and saves it to the persistent database.
        """
        if not current_password:
            raise ValueError("كلمة المرور الحالية مطلوبة")
        if not new_password or len(new_password) < 6:
            raise ValueError("كلمة المرور الجديدة يجب أن تكون 6 خانات على الأقل")
        if new_password != confirm_password:
            raise ValueError("كلمة المرور الجديدة وتأكيدها غير متطابقين")

        user = UserRepository.get_by_id(user_id)
        if not user:
            raise ValueError("المستخدم غير موجود")

        if not verify_password(current_password, user["hashed_password"]):
            raise ValueError("كلمة المرور الحالية غير صحيحة")

        new_hash = get_password_hash(new_password)
        UserRepository.update(user_id, {
            "hashed_password": new_hash,
            "updated_at": now_iso()
        })

        return {
            "success": True,
            "message": "تم تغيير كلمة المرور بنجاح وحفظها في قاعدة البيانات 🔒"
        }

    @staticmethod
    def admin_reset_password(user_id: str, new_password: str) -> Dict[str, Any]:
        if not new_password or len(new_password) < 6:
            raise ValueError("كلمة المرور يجب أن تكون 6 خانات على الأقل")
        new_hash = get_password_hash(new_password)
        res = UserRepository.update(user_id, {"hashed_password": new_hash})
        if not res:
            raise ValueError("المستخدم غير موجود")
        return {"success": True, "message": "تم تعيين كلمة المرور الجديدة بنجاح"}
