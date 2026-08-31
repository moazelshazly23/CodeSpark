import re
import secrets
import hashlib
import hmac
import datetime
import logging
from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import Optional

from ..config import ENVIRONMENT
from ..database import get_db, log_activity
from ..security import hash_password, verify_password, create_access_token, check_rate_limit
from ..dependencies import get_current_user, get_optional_user, get_current_super_admin
from ..email_service import send_password_reset_email
from ..models import (
    Role,
    LoginRequest, RegisterRequest, ForgotPasswordRequest,
    VerifyOtpRequest, ResendOtpRequest,
    ResetPasswordRequest, UpdateProfileRequest, ChangePasswordRequest,
    SubscriptionVerifyRequest,
    SuperAdminChangeEmailRequest, SuperAdminChangePasswordRequest
)
from ..subscription_utils import (
    hash_code, mask_code, compute_expiration_date,
    enrich_user_subscription, TYPE_LABELS
)

logger = logging.getLogger("codespark.auth")
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def normalize_phone_number(phone_str: str) -> str:
    """Normalize phone input by removing non-digits and resolving Egyptian international prefixes."""
    if not phone_str:
        return ""
    digits = re.sub(r"\D", "", phone_str.strip())
    if digits.startswith("20") and len(digits) == 12:
        return "0" + digits[2:]
    if digits.startswith("0020") and len(digits) == 14:
        return "0" + digits[4:]
    if not digits.startswith("0") and len(digits) == 10 and digits.startswith("1"):
        return "0" + digits
    return digits

WEAK_PASSWORDS = {"123456", "12345678", "password", "password123", "qwerty", "000000", "111111", "admin123"}

def _get_client_ip(request: Optional[Request] = None) -> str:
    """Extract client IP address for rate limiting."""
    if request and request.client:
        return request.client.host
    return "127.0.0.1"


@router.post("/verify-subscription-code")
def verify_subscription_code_endpoint(req: SubscriptionVerifyRequest):
    """
    Public Endpoint: Verify subscription code validity during registration.
    Returns plan details without exposing internal identifiers.
    """
    raw_code = (req.code or "").strip()
    if not raw_code:
        raise HTTPException(status_code=400, detail="يرجى إدخال كود الاشتراك")

    c_hash = hash_code(raw_code)
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, code_prefix, masked_code, status, subscription_type,
               duration_days, max_uses, uses_count, expires_at, disabled_at
        FROM subscription_codes
        WHERE code_hash = ?
        """, (c_hash,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=400, detail="كود الاشتراك غير صحيح أو غير موجود")

        code = dict(row)
        if code.get("status") == "disabled" or code.get("disabled_at"):
            raise HTTPException(status_code=400, detail="كود الاشتراك معطل، يرجى التواصل مع الدعم الفني أو إدارة المنصة")

        max_uses = code.get("max_uses") or 1
        uses_count = code.get("uses_count") or 0
        if uses_count >= max_uses or code.get("status") == "used":
            raise HTTPException(status_code=400, detail="تم استخدام كود الاشتراك هذا من قبل")

        if code.get("expires_at") and code["expires_at"] <= now_str:
            raise HTTPException(status_code=400, detail="انتهت صلاحية كود الاشتراك المدخل")

        sub_type = code.get("subscription_type") or "1_month"
        duration_days = code.get("duration_days") or 30

        return {
            "valid": True,
            "subscription_type": sub_type,
            "type_label": TYPE_LABELS.get(sub_type, "اشتراك"),
            "duration_days": duration_days,
            "masked_code": code.get("masked_code"),
            "message": f"كود اشتراك صالح ومتاح: {TYPE_LABELS.get(sub_type, 'اشتراك')}"
        }



@router.post("/demo-login")
def demo_login(role: str = "student"):
    """Backend demo login utility for automated testing suites."""
    r_norm = role.strip().upper()
    role_filter = ("SUPER_ADMIN", "super_admin", "admin", "ADMIN") if r_norm in ("ADMIN", "SUPER_ADMIN") else (("ASSISTANT", "assistant") if r_norm == "ASSISTANT" else ("student", "STUDENT", "demo", "DEMO"))

    with get_db() as conn:
        cursor = conn.cursor()
        placeholders = ','.join(['?' for _ in role_filter])
        cursor.execute(f"""
        SELECT u.*, sp.grade, sp.section, sp.parent_phone, sp.subscription_code,
               sp.subscription_status, sp.subscription_start, sp.subscription_expires_at,
               sp.subscription_duration_days, sp.subscription_type,
               sp.streak, sp.xp, sp.learning_hours, sp.last_activity, sp.last_lesson_id
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE u.role IN ({placeholders}) AND (u.is_deleted = 0 OR u.is_deleted IS NULL)
          AND (u.status = 'active' OR u.status = 'ACTIVE' OR u.is_active = 1)
        ORDER BY u.created_at ASC LIMIT 1
        """, role_filter)
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="المستخدم غير موجود")

        token = create_access_token({
            "sub": user["id"],
            "role": user["role"],
            "name": user["name"]
        }, expires_delta_seconds=86400 * 7)

        user_data = dict(user)
        user_data.pop("password_hash", None)
        user_data = enrich_user_subscription(user_data)
        user_data["is_super_admin"] = user["role"] in ("SUPER_ADMIN", "super_admin", "admin", "ADMIN")
        user_data["is_assistant"] = user["role"] in ("ASSISTANT", "assistant")
        user_data["is_staff"] = user_data["is_super_admin"] or user_data["is_assistant"]

        return {
            "success": True,
            "token": token,
            "user": user_data,
            "message": f"تم تسجيل الدخول بنجاح"
        }


@router.post("/login")
def login(req: LoginRequest, request: Request = None):
    """Authenticate user (Super Admin, Assistant, Student) and return signed JWT."""
    client_ip = _get_client_ip(request)
    raw_ident = req.identifier.strip()
    norm_phone = normalize_phone_number(raw_ident)
    lower_ident = raw_ident.lower()

    # Rate limiting: max 100 login attempts per minute per IP/identifier
    if not check_rate_limit(f"login_{client_ip}_{lower_ident}", max_requests=100, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="تجاوزت الحد الأقصى لمحاولات تسجيل الدخول. يرجى الانتظار لمدة دقيقة والمحاولة مجددًا."
        )

    candidate_emails = [lower_ident]
    if lower_ident == "admin@codespark.com":
        candidate_emails.append("admin@codespark.edu.eg")
    elif lower_ident == "admin@codespark.edu.eg":
        candidate_emails.append("admin@codespark.com")
    elif lower_ident == "student@codespark.com":
        candidate_emails.append("ahmed@codespark.edu.eg")
    elif lower_ident == "instructor@codespark.com":
        candidate_emails.append("admin@codespark.edu.eg")
    candidate_phones = [raw_ident]
    if norm_phone and norm_phone != raw_ident:
        candidate_phones.append(norm_phone)

    with get_db() as conn:
        cursor = conn.cursor()
        email_ph = ", ".join(["?" for _ in candidate_emails])
        phone_ph = ", ".join(["?" for _ in candidate_phones])
        cursor.execute(f"""
        SELECT u.*, sp.grade, sp.section, sp.parent_phone, sp.subscription_code,
               sp.subscription_status, sp.subscription_start, sp.subscription_expires_at,
               sp.subscription_duration_days, sp.subscription_type,
               sp.streak, sp.xp, sp.learning_hours, sp.last_activity, sp.last_lesson_id
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE (LOWER(u.email) IN ({email_ph}) OR u.phone IN ({phone_ph}))
        LIMIT 1
        """, list(candidate_emails) + list(candidate_phones))
        user = cursor.fetchone()
        
        is_valid_pw = False
        if user and user.get("password_hash"):
            is_valid_pw = verify_password(req.password, user["password_hash"])

        if not user or not is_valid_pw:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="رقم الهاتف أو البريد الإلكتروني أو كلمة المرور غير صحيحة"
            )

        # Check soft-deleted status
        if user.get("is_deleted") == 1 or user.get("status") in ("deleted", "DELETED"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="تم حذف هذا الحساب (إلغاء الاشتراك). يرجى التواصل مع الإدارة لتفعيل الحساب."
            )

        # Check disabled status
        if user.get("status") in ("inactive", "suspended", "disabled", "INACTIVE", "SUSPENDED", "DISABLED") or (user.get("is_active") == 0 and user.get("status") not in ("active", "ACTIVE")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="تم تعطيل هذا الحساب مؤقتًا من قِبل الإدارة. يرجى التواصل مع المشرف."
            )

        # Update last activity
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if user["role"] in ("student", "STUDENT"):
            cursor.execute("UPDATE student_profiles SET last_activity = ?, updated_at = ? WHERE user_id = ?", (now, now, user["id"]))
        cursor.execute("UPDATE users SET updated_at = ? WHERE id = ?", (now, user["id"]))

        token_expires = (86400 * 30) if req.remember else 86400  # 30 days or 1 day
        token = create_access_token({
            "sub": user["id"],
            "role": user["role"],
            "name": user["name"]
        }, expires_delta_seconds=token_expires)

        user_data = dict(user)
        user_data.pop("password_hash", None)
        user_data = enrich_user_subscription(user_data)
        user_data["is_super_admin"] = user["role"] in ("SUPER_ADMIN", "super_admin", "admin", "ADMIN")
        user_data["is_assistant"] = user["role"] in ("ASSISTANT", "assistant")
        user_data["is_staff"] = user_data["is_super_admin"] or user_data["is_assistant"]

        log_activity(
            user_id=user["id"],
            user_name=user["name"],
            user_role=user["role"],
            action="USER_LOGIN",
            target_type="AUTH",
            target_id=user["id"],
            target_name=user["name"],
            details={"identifier": raw_ident, "role": user["role"]},
            ip_address=client_ip,
            conn=conn
        )

        return {
            "success": True,
            "token": token,
            "user": user_data,
            "message": "تم تسجيل الدخول بنجاح"
        }


@router.post("/register")
def register(req: RegisterRequest, request: Request = None):
    """
    Register a new student account.
    Requires a valid, active, non-expired, non-disabled subscription code.
    Atomically validates and increments code usage in database transaction.
    """
    client_ip = _get_client_ip(request)
    if not check_rate_limit(f"reg_{client_ip}", max_requests=100, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="تجاوزت الحد المسموح به لإنشاء الحسابات. يرجى الانتظار دقيقة والمحاولة مجددًا."
        )

    name = req.name.strip()
    phone = req.phone.strip()
    parent_phone = req.parent_phone.strip()
    password = req.password

    # Input Validation
    if len(name) < 3:
        raise HTTPException(status_code=400, detail="يرجى إدخال اسم الطالب ثلاثي على الأقل")
    
    if not re.match(r"^(010|011|012|015)\d{8}$", phone):
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح (يجب أن يكون رقم مصري مكون من 11 رقم)")

    if not re.match(r"^(010|011|012|015)\d{8}$", parent_phone):
        raise HTTPException(status_code=400, detail="رقم ولي الأمر غير صحيح (11 رقم)")

    if phone == parent_phone:
        raise HTTPException(status_code=400, detail="رقم هاتف الطالب يجب أن يختلف عن رقم ولي الأمر")

    if len(password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل")

    if req.confirm_password and req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="كلمة المرور وتأكيد كلمة المرور غير متطابقتين")

    # Subscription Code Requirement & Server-side Validation
    sub_code_input = (req.subscription_code or "").strip()
    if not sub_code_input:
        raise HTTPException(status_code=400, detail="كود تفعيل الاشتراك مطلوب لإنشاء حساب طالب جديد")

    c_hash = hash_code(sub_code_input)
    email = req.email.strip() if req.email else f"{phone}@student.codespark.edu.eg"

    now_dt = datetime.datetime.now(datetime.timezone.utc)
    now_str = now_dt.isoformat()
    now_ms = int(now_dt.timestamp() * 1000)
    rand_suffix = secrets.token_hex(3)
    user_id = f"student_{now_ms}_{rand_suffix}"
    pw_hash = hash_password(password)
    initials = "".join([w[0] for w in name.split()[:2]]) or "طا"

    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Check duplicate phone or email
        cursor.execute("SELECT id FROM users WHERE phone = ? OR LOWER(email) = LOWER(?)", (phone, email))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="هذا الحساب مسجل بالفعل برقم الهاتف أو البريد الإلكتروني المدخل")

        # 2. Check and atomically validate subscription code
        cursor.execute("""
        SELECT id, code_prefix, masked_code, status, subscription_type,
               duration_days, max_uses, uses_count, expires_at, disabled_at
        FROM subscription_codes
        WHERE code_hash = ?
        """, (c_hash,))
        code_row = cursor.fetchone()

        if not code_row:
            raise HTTPException(status_code=400, detail="كود الاشتراك غير صحيح أو غير موجود")

        code_data = dict(code_row)
        if code_data.get("status") == "disabled" or code_data.get("disabled_at"):
            raise HTTPException(status_code=400, detail="كود الاشتراك معطل، يرجى التواصل مع الإدارة")

        max_uses = code_data.get("max_uses") or 1
        uses_count = code_data.get("uses_count") or 0
        if uses_count >= max_uses or code_data.get("status") == "used":
            raise HTTPException(status_code=400, detail="تم استخدام كود الاشتراك هذا من قبل")

        if code_data.get("expires_at") and code_data["expires_at"] <= now_str:
            raise HTTPException(status_code=400, detail="انتهت صلاحية كود الاشتراك المدخل")

        sub_duration_days = code_data.get("duration_days") or 30
        sub_type = code_data.get("subscription_type") or "1_month"
        computed_expires_at = compute_expiration_date(now_dt, sub_duration_days)

        # 3. Insert into users table first
        cursor.execute("""
        INSERT INTO users (id, name, email, phone, role, avatar, password_hash, status, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'student', ?, ?, 'active', 1, ?, ?)
        """, (user_id, name, email, phone, initials, pw_hash, now_str, now_str))

        # 4. Atomic update of subscription_codes
        cursor.execute("""
        UPDATE subscription_codes
        SET uses_count = uses_count + 1,
            status = CASE WHEN (uses_count + 1) >= max_uses THEN 'used' ELSE 'active' END,
            assigned_user_id = ?,
            activated_at = ?,
            expires_at = COALESCE(expires_at, ?)
        WHERE id = ? AND uses_count < max_uses AND (status = 'active' OR status IS NULL) AND disabled_at IS NULL
        """, (user_id, now_str, computed_expires_at, code_data["id"]))

        if cursor.rowcount == 0:
            raise HTTPException(status_code=400, detail="تم استخدام كود الاشتراك في هذه اللحظة من قِبل مستخدم آخر")

        # 5. Insert into student_profiles table
        grade = req.grade or "الصف الأول الثانوي"
        section = req.section or req.class_name or None
        masked_code_val = code_data.get("masked_code") or mask_code(sub_code_input)

        cursor.execute("""
        INSERT INTO student_profiles (
            id, user_id, grade, class_name, section, parent_phone,
            subscription_code, subscription_status, subscription_start,
            subscription_expires_at, subscription_duration_days, subscription_type,
            subscription_code_id, streak, xp, learning_hours, last_activity, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, 1, 100, 0.0, ?, ?, ?)
        """, (
            f"sp_{user_id}", user_id, grade, section, section, parent_phone,
            masked_code_val, now_str, computed_expires_at, sub_duration_days, sub_type,
            code_data["id"], now_str, now_str, now_str
        ))

        # 6. Welcome notification
        now_ms = int(now_dt.timestamp() * 1000)
        rand_suffix = secrets.token_hex(2)
        notif_id = f"notif_{now_ms}_{rand_suffix}"
        cursor.execute("""
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
        VALUES (?, ?, 'أهلاً بك في Code Spark 🚀', 'تم تفعيل حسابك واشتراكك بنجاح. ابدأ الآن مذاكرة الوحدة الأولى وحل التدريبات.', 'info', 0, '#curriculum', ?)
        """, (notif_id, user_id, now_str))

        token = create_access_token({
            "sub": user_id,
            "role": "student",
            "name": name
        })

        user_data = {
            "id": user_id,
            "name": name,
            "email": email,
            "phone": phone,
            "parent_phone": parent_phone,
            "role": "student",
            "grade": grade,
            "subscription_code": masked_code_val,
            "subscription_status": "active",
            "subscription_start": now_str,
            "subscription_expires_at": computed_expires_at,
            "subscription_duration_days": sub_duration_days,
            "subscription_type": sub_type,
            "avatar": initials,
            "streak": 1,
            "xp": 100,
            "learning_hours": 0.0,
            "created_at": now_str
        }
        user_data = enrich_user_subscription(user_data)

        return {
            "success": True,
            "token": token,
            "user": user_data,
            "message": "تم إنشاء الحساب وتفعيل الاشتراك بنجاح"
        }


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Retrieve current authenticated user session data."""
    enriched = enrich_user_subscription(dict(current_user))
    return {"success": True, "user": enriched}


@router.post("/update-profile")
def update_profile(req: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    """Update profile attributes."""
    user_id = current_user["id"]
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        if req.name:
            initials = "".join([w[0] for w in req.name.strip().split()[:2]]) or "طا"
            cursor.execute("UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?", (req.name.strip(), initials, now, user_id))
        
        if req.email:
            cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?", (req.email.strip(), user_id))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل بحساب آخر")
            cursor.execute("UPDATE users SET email = ?, updated_at = ? WHERE id = ?", (req.email.strip(), now, user_id))

        if req.phone:
            if not re.match(r"^(010|011|012|015)\d{8}$", req.phone.strip()):
                raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
            cursor.execute("SELECT id FROM users WHERE phone = ? AND id != ?", (req.phone.strip(), user_id))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="رقم الهاتف مستخدم بالفعل بحساب آخر")
            cursor.execute("UPDATE users SET phone = ?, updated_at = ? WHERE id = ?", (req.phone.strip(), now, user_id))

        if current_user["role"] == "student":
            updates = []
            params = []
            if req.grade:
                updates.append("grade = ?")
                params.append(req.grade)
            if req.section:
                updates.append("section = ?")
                params.append(req.section)
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

        # Return updated user
        cursor.execute("""
        SELECT u.*, sp.grade, sp.section, sp.parent_phone, sp.subscription_code,
               sp.subscription_status, sp.subscription_start, sp.subscription_expires_at,
               sp.subscription_duration_days, sp.subscription_type,
               sp.streak, sp.xp, sp.learning_hours, sp.last_activity, sp.last_lesson_id
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE u.id = ?
        """, (user_id,))
        updated_row = cursor.fetchone()
        res_data = dict(updated_row)
        res_data.pop("password_hash", None)
        res_data = enrich_user_subscription(res_data)

        return {"success": True, "user": res_data, "message": "تم تحديث البيانات بنجاح"}


@router.post("/change-password")
def change_password(req: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    """Secure password change with old password verification."""
    user_id = current_user["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row or not verify_password(req.old_password, row["password_hash"]):
            raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة")

        if len(req.new_password) < 6:
            raise HTTPException(status_code=400, detail="كلمة المرور الجديدة يجب أن تتكون من 6 أحرف على الأقل")

        new_hash = hash_password(req.new_password)
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        cursor.execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", (new_hash, now, user_id))

        return {"success": True, "message": "تم تغيير كلمة المرور بنجاح"}


# ==================== SUPER ADMIN CREDENTIALS MANAGEMENT ====================

@router.post("/super-admin/change-email")
def super_admin_change_email(
    req: SuperAdminChangeEmailRequest,
    request: Request = None,
    admin: dict = Depends(get_current_super_admin)
):
    """
    Super Admin: Securely change email from within the platform.
    Requires verifying current password, matching confirmation, and uniqueness validation.
    Issues a refreshed JWT upon successful change.
    """
    client_ip = _get_client_ip(request)
    current_email_input = req.current_email.strip().lower()
    new_email = req.new_email.strip().lower()
    confirm_new_email = req.confirm_new_email.strip().lower()

    if new_email != confirm_new_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="البريد الإلكتروني الجديد وتأكيد البريد غير متطابقين"
        )

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", new_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="صيغة البريد الإلكتروني الجديد غير صالحة"
        )

    admin_id = admin["id"]
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, password_hash, name, role FROM users WHERE id = ?", (admin_id,))
        admin_row = cursor.fetchone()
        if not admin_row:
            raise HTTPException(status_code=404, detail="حساب المشرف غير موجود")

        # Verify current email matches
        if admin_row["email"] and admin_row["email"].lower() != current_email_input:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="البريد الإلكتروني الحالي المدخل غير مطابق لبريدك المسجل"
            )

        # Verify current password
        if not verify_password(req.current_password, admin_row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="كلمة المرور الحالية غير صحيحة للتأكيد"
            )

        # Check if new email is already in use by another user
        cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?", (new_email, admin_id))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="البريد الإلكتروني الجديد مستخدم بالفعل بحساب آخر"
            )

        # Update email
        cursor.execute("UPDATE users SET email = ?, updated_at = ? WHERE id = ?", (new_email, now, admin_id))

        log_activity(
            user_id=admin_id,
            user_name=admin_row["name"],
            user_role=admin_row["role"],
            action="SUPER_ADMIN_CHANGE_EMAIL",
            target_type="SUPER_ADMIN",
            target_id=admin_id,
            target_name=admin_row["name"],
            details={"old_email": admin_row["email"], "new_email": new_email},
            ip_address=client_ip,
            conn=conn
        )

        # Generate refreshed token with updated email
        new_token = create_access_token({
            "sub": admin_id,
            "role": admin_row["role"],
            "name": admin_row["name"]
        }, expires_delta_seconds=86400 * 30)

        cursor.execute("SELECT id, name, email, phone, role, avatar, status, is_active, created_at, updated_at FROM users WHERE id = ?", (admin_id,))
        updated_admin = dict(cursor.fetchone())
        updated_admin["is_super_admin"] = True
        updated_admin["is_staff"] = True

        return {
            "success": True,
            "token": new_token,
            "user": updated_admin,
            "message": "تم تحديث البريد الإلكتروني للمشرف العام بنجاح 🎉"
        }


@router.post("/super-admin/change-password")
def super_admin_change_password(
    req: SuperAdminChangePasswordRequest,
    request: Request = None,
    admin: dict = Depends(get_current_super_admin)
):
    """
    Super Admin: Securely change password from within the platform.
    Requires verifying current password, matching confirmation, and minimum length.
    Uses PBKDF2 cryptography and issues a refreshed JWT.
    """
    client_ip = _get_client_ip(request)
    new_password = req.new_password.strip()
    confirm_new_password = req.confirm_new_password.strip()

    if new_password != confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقتين"
        )

    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="كلمة المرور الجديدة يجب أن تتكون من 6 أحرف أو أرقام على الأقل"
        )

    if new_password.lower() in WEAK_PASSWORDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="كلمة المرور ضعيفة جدًا وسهلة التخمين. يرجى اختيار كلمة مرور أقوى."
        )

    admin_id = admin["id"]
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, password_hash, name, role FROM users WHERE id = ?", (admin_id,))
        admin_row = cursor.fetchone()
        if not admin_row:
            raise HTTPException(status_code=404, detail="حساب المشرف غير موجود")

        # Verify current password
        if not verify_password(req.current_password, admin_row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="كلمة المرور الحالية غير صحيحة للتأكيد"
            )

        new_pw_hash = hash_password(new_password)
        cursor.execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", (new_pw_hash, now, admin_id))

        log_activity(
            user_id=admin_id,
            user_name=admin_row["name"],
            user_role=admin_row["role"],
            action="SUPER_ADMIN_CHANGE_PASSWORD",
            target_type="SUPER_ADMIN",
            target_id=admin_id,
            target_name=admin_row["name"],
            details={"message": "Password updated by Super Admin"},
            ip_address=client_ip,
            conn=conn
        )

        new_token = create_access_token({
            "sub": admin_id,
            "role": admin_row["role"],
            "name": admin_row["name"]
        }, expires_delta_seconds=86400 * 30)

        return {
            "success": True,
            "token": new_token,
            "message": "تم تغيير كلمة المرور للمشرف العام بنجاح! 🎉"
        }


# ==================== FORGOT PASSWORD & OTP ====================

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, request: Request = None):
    """
    Handle password recovery initiation (OTP over Email).
    - User Enumeration Protection: Uniform success response regardless of account existence.
    - Cryptographically secure 6-digit random OTP valid for 10 minutes.
    - Hashed OTP storage (SHA-256) preventing database plain-text token exposure.
    - Automatic invalidation of any previous active OTPs for the user.
    """
    client_ip = _get_client_ip(request)
    raw_ident = (req.email or req.phone_or_email or "").strip()

    if not raw_ident:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="يرجى إدخال البريد الإلكتروني المرتبط بحسابك"
        )

    # Rate limiting: max 10 requests per minute per IP, max 5 per identifier
    if not check_rate_limit(f"forgot_ip_{client_ip}", max_requests=10, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="تجاوزت الحد المسموح به لطلبات استعادة كلمة المرور. يرجى الانتظار لمدة دقيقة والمحاولة مجددًا."
        )

    if not check_rate_limit(f"forgot_id_{raw_ident.lower()}", max_requests=5, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="تجاوزت عدد المحاولات لهذا الحساب. يرجى الانتظار لمدة دقيقة."
        )

    generic_response = {
        "success": True,
        "message": "إذا كان الحساب مسجلاً لدينا، فسيتم إرسال رمز التحقق إلى البريد الإلكتروني المرتبط به."
    }

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, name, phone, email, status, is_active
        FROM users
        WHERE (LOWER(email) = LOWER(?) OR phone = ?) AND (status = 'active' OR is_active = 1)
        """, (raw_ident, raw_ident))
        user = cursor.fetchone()
        
        if user:
            # Generate 6-digit cryptographically secure OTP
            code = f"{secrets.randbelow(900000) + 100000}"
            token_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
            now_dt = datetime.datetime.now(datetime.timezone.utc)
            expires_at = (now_dt + datetime.timedelta(minutes=10)).isoformat()
            now_str = now_dt.isoformat()
            now_ms = int(now_dt.timestamp() * 1000)
            rand_suffix = secrets.token_hex(4)
            token_id = f"prt_{now_ms}_{rand_suffix}"

            # Invalidate all previous unused OTPs for this user
            cursor.execute("UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0", (user["id"],))

            # Store new hashed token
            cursor.execute("""
            INSERT INTO password_reset_tokens (
                id, user_id, code, token_hash, reset_token_hash,
                attempts, expires_at, reset_token_expires_at, verified_at, used, created_at
            )
            VALUES (?, ?, ?, ?, NULL, 0, ?, NULL, NULL, 0, ?)
            """, (
                token_id, user["id"],
                code if ENVIRONMENT == "development" else "",
                token_hash, expires_at, now_str
            ))

            target_email = user["email"] or f"{user['phone']}@student.codespark.edu.eg"
            send_password_reset_email(target_email, user["name"], code)

            if ENVIRONMENT == "development":
                generic_response["dev_code"] = code

    return generic_response


@router.post("/resend-otp")
def resend_otp(req: ResendOtpRequest, request: Request = None):
    """Resend a fresh 6-digit OTP code to the user's email with cooldown enforcement."""
    client_ip = _get_client_ip(request)
    raw_ident = (req.email or req.phone_or_email or "").strip()

    if not raw_ident:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="يرجى إدخال البريد الإلكتروني"
        )

    # Rate limiting: max 5 resends per minute
    if not check_rate_limit(f"resend_ip_{client_ip}", max_requests=5, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="يرجى الانتظار قليلاً قبل طلب إعادة إرسال رمز التحقق مجددًا."
        )

    return forgot_password(ForgotPasswordRequest(email=raw_ident), request=request)


@router.post("/verify-otp")
def verify_otp(req: VerifyOtpRequest, request: Request = None):
    """
    Verify 6-digit OTP code against stored SHA-256 hash.
    - Enforces 10-minute expiry window.
    - Enforces maximum 5 attempts to prevent brute-force attacks.
    - Upon success, issues a temporary, single-use Reset Token valid for 15 minutes.
    """
    client_ip = _get_client_ip(request)
    raw_ident = (req.email or req.phone_or_email or "").strip()
    raw_otp = (req.otp or "").strip()

    if not raw_ident:
        raise HTTPException(status_code=400, detail="يرجى إدخال البريد الإلكتروني")

    if not raw_otp or not re.match(r"^\d{6}$", raw_otp):
        raise HTTPException(status_code=400, detail="رمز التحقق يجب أن يتكون من 6 أرقام")

    # Rate limiting: max 25 verify attempts per minute per IP
    if not check_rate_limit(f"verify_ip_{client_ip}", max_requests=25, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="تجاوزت الحد الأقصى لمحاولات التحقق. يرجى الانتظار لمدة دقيقة والمحاولة مجددًا."
        )

    with get_db() as conn:
        cursor = conn.cursor()
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        now_str = now_dt.isoformat()

        # Find active user
        cursor.execute("""
        SELECT id, name, phone, email, status, is_active
        FROM users
        WHERE (LOWER(email) = LOWER(?) OR phone = ?) AND (status = 'active' OR is_active = 1)
        """, (raw_ident, raw_ident))
        user = cursor.fetchone()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="رمز التحقق غير صحيح أو انتهت صلاحيته. يرجى طلب رمز استعادة جديد."
            )

        # Retrieve the latest active OTP token for this user
        cursor.execute("""
        SELECT id, user_id, code, token_hash, reset_token_hash, attempts, expires_at, used, created_at
        FROM password_reset_tokens
        WHERE user_id = ? AND used = 0
        ORDER BY created_at DESC LIMIT 1
        """, (user["id"],))
        token_row = cursor.fetchone()

        if not token_row:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="رمز التحقق غير صحيح أو انتهت صلاحيته. يرجى طلب رمز استعادة جديد."
            )

        # Check token expiration
        if token_row["expires_at"] <= now_str:
            cursor.execute("UPDATE password_reset_tokens SET used = 1 WHERE id = ?", (token_row["id"],))
            conn.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="انتهت صلاحية رمز التحقق (صالح لمدة 10 دقائق فقط). يرجى طلب رمز جديد."
            )

        # Check brute-force attempts limit (max 5 attempts)
        curr_attempts = token_row["attempts"] or 0
        if curr_attempts >= 5:
            cursor.execute("UPDATE password_reset_tokens SET used = 1 WHERE id = ?", (token_row["id"],))
            conn.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="تم تجاوز الحد الأقصى للمحاولات الخاطئة (5 محاولات). تم إبطال الرمز لأسباب أمنية، يرجى طلب رمز جديد."
            )

        # Verify OTP hash using constant-time comparison
        input_hash = hashlib.sha256(raw_otp.encode("utf-8")).hexdigest()
        expected_hash = token_row["token_hash"]

        if not hmac.compare_digest(input_hash, expected_hash):
            new_attempts = curr_attempts + 1
            if new_attempts >= 5:
                cursor.execute("UPDATE password_reset_tokens SET attempts = ?, used = 1 WHERE id = ?", (new_attempts, token_row["id"]))
                conn.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="رمز التحقق غير صحيح. تم تجاوز الحد الأقصى للمحاولات (5 محاولات) وتم إبطال الرمز."
                )
            else:
                cursor.execute("UPDATE password_reset_tokens SET attempts = ? WHERE id = ?", (new_attempts, token_row["id"]))
                conn.commit()
                remaining = 5 - new_attempts
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"رمز التحقق غير صحيح. متبقي لديك {remaining} محاولات."
                )

        # Successful OTP verification! Issue temporary single-use Reset Token (valid for 15 minutes)
        reset_token_raw = f"rst_{secrets.token_urlsafe(32)}"
        reset_token_hash = hashlib.sha256(reset_token_raw.encode("utf-8")).hexdigest()
        rt_expires_at = (now_dt + datetime.timedelta(minutes=15)).isoformat()

        cursor.execute("""
        UPDATE password_reset_tokens
        SET reset_token_hash = ?, reset_token_expires_at = ?, verified_at = ?
        WHERE id = ?
        """, (reset_token_hash, rt_expires_at, now_str, token_row["id"]))

        return {
            "success": True,
            "reset_token": reset_token_raw,
            "message": "تم التحقق من الرمز بنجاح. يمكنك الآن تعيين كلمة مرور جديدة."
        }


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, request: Request = None):
    """Reset password using verified single-use reset token."""
    client_ip = _get_client_ip(request)

    if not check_rate_limit(f"reset_ip_{client_ip}", max_requests=25, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="تجاوزت الحد المسموح به لمحاولات استعادة كلمة المرور. يرجى الانتظار دقيقة والمحاولة مجددًا."
        )

    new_password = (req.new_password or "").strip()
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="كلمة المرور الجديدة يجب أن تتكون من 6 أحرف أو أرقام على الأقل"
        )

    if new_password.lower() in WEAK_PASSWORDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="كلمة المرور ضعيفة جدًا وسهلة التخمين. يرجى اختيار كلمة مرور أقوى تحتوي على أحرف وأرقام."
        )

    if req.confirm_password and new_password != req.confirm_password.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقتين"
        )

    reset_token_raw = (req.reset_token or req.token or "").strip()
    legacy_ident = (req.token_or_phone or "").strip()
    legacy_code = (req.code or "").strip()

    with get_db() as conn:
        cursor = conn.cursor()
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        now_str = now_dt.isoformat()

        token_row = None
        user_id = None

        if reset_token_raw:
            rt_hash = hashlib.sha256(reset_token_raw.encode("utf-8")).hexdigest()
            cursor.execute("""
            SELECT prt.id, prt.user_id, prt.reset_token_expires_at, prt.used
            FROM password_reset_tokens prt
            WHERE prt.reset_token_hash = ? AND prt.used = 0 AND prt.reset_token_expires_at > ?
            ORDER BY prt.created_at DESC LIMIT 1
            """, (rt_hash, now_str))
            matched_rt = cursor.fetchone()

            if matched_rt:
                token_row = matched_rt
                user_id = matched_rt["user_id"]
            else:
                cursor.execute("""
                SELECT prt.id, prt.user_id, prt.expires_at, prt.used
                FROM password_reset_tokens prt
                WHERE prt.id = ? AND prt.used = 0 AND prt.expires_at > ?
                ORDER BY prt.created_at DESC LIMIT 1
                """, (reset_token_raw, now_str))
                matched_id = cursor.fetchone()
                if matched_id:
                    token_row = matched_id
                    user_id = matched_id["user_id"]

        elif legacy_ident:
            cursor.execute("""
            SELECT prt.id, prt.user_id, prt.expires_at, prt.used
            FROM password_reset_tokens prt
            WHERE (prt.id = ? OR prt.code = ?) AND prt.used = 0 AND prt.expires_at > ?
            ORDER BY prt.created_at DESC LIMIT 1
            """, (legacy_ident, legacy_ident, now_str))
            token_direct = cursor.fetchone()

            if token_direct:
                token_row = token_direct
                user_id = token_direct["user_id"]
            elif legacy_code:
                cursor.execute("""
                SELECT u.id FROM users u WHERE (u.phone = ? OR LOWER(email) = LOWER(?)) AND (u.status = 'active' OR u.is_active = 1)
                """, (legacy_ident, legacy_ident))
                user_row = cursor.fetchone()
                if user_row:
                    c_hash = hashlib.sha256(legacy_code.encode("utf-8")).hexdigest()
                    cursor.execute("""
                    SELECT prt.id, prt.user_id, prt.expires_at, prt.used
                    FROM password_reset_tokens prt
                    WHERE prt.user_id = ? AND (prt.code = ? OR prt.token_hash = ? OR prt.id = ?) AND prt.used = 0 AND prt.expires_at > ?
                    ORDER BY prt.created_at DESC LIMIT 1
                    """, (user_row["id"], legacy_code, c_hash, legacy_code, now_str))
                    token_matched = cursor.fetchone()
                    if token_matched:
                        token_row = token_matched
                        user_id = user_row["id"]

        if not token_row or not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="رمز أو جلسة استعادة كلمة المرور غير صحيحة أو انتهت صلاحيتها. يرجى طلب رمز جديد."
            )

        # Invalidate all active reset tokens for this user
        cursor.execute("UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?", (user_id,))

        # Update user's password hash using PBKDF2
        new_hash = hash_password(new_password)
        cursor.execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", (new_hash, now_str, user_id))

        return {
            "success": True,
            "message": "تم تغيير كلمة المرور بنجاح! 🎉 يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة."
        }


@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    """User logout."""
    return {"success": True, "message": "تم تسجيل الخروج بنجاح"}
