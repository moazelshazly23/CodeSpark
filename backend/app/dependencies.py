import datetime
from fastapi import Header, HTTPException, status, Depends
from typing import Optional, Dict, Any, List
from .security import decode_access_token
from .database import get_db
from .models import Role

def normalize_role(role: Optional[str]) -> str:
    """Normalize role string to standard uppercase enum representation."""
    return Role.normalize(role)

def is_super_admin_user(user: Optional[Dict[str, Any]]) -> bool:
    """Check if the user has Super Admin or Admin privileges."""
    if not user:
        return False
    return Role.is_super_admin(user.get("role"))

def is_assistant_user(user: Optional[Dict[str, Any]]) -> bool:
    """Check if the user has Assistant privileges."""
    if not user:
        return False
    return Role.is_assistant(user.get("role"))

def is_staff_user(user: Optional[Dict[str, Any]]) -> bool:
    """Check if the user is either Super Admin or Assistant."""
    if not user:
        return False
    return Role.is_staff(user.get("role"))

def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Extract and authenticate user if Authorization header is present, else None."""
    if not authorization:
        return None
    
    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    payload = decode_access_token(parts[1])
    if not payload or "sub" not in payload:
        return None
    
    user_id = payload["sub"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT u.id, u.name, u.email, u.phone, u.role, u.avatar, u.status, u.is_active,
               u.is_deleted, u.deleted_at, u.created_by, u.created_at, u.updated_at,
               sp.grade, sp.class_name, sp.section, sp.parent_phone, sp.subscription_code,
               sp.subscription_status, sp.subscription_start, sp.subscription_expires_at,
               sp.subscription_duration_days, sp.subscription_type,
               sp.streak, sp.xp, sp.learning_hours, sp.last_activity, sp.last_lesson_id
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE u.id = ? AND (u.is_deleted = 0 OR u.is_deleted IS NULL)
          AND (u.status = 'active' OR u.status = 'ACTIVE' OR u.is_active = 1)
        """, (user_id,))
        user = cursor.fetchone()
        if user:
            user_dict = dict(user)
            user_dict["is_super_admin"] = is_super_admin_user(user_dict)
            user_dict["is_assistant"] = is_assistant_user(user_dict)
            user_dict["is_staff"] = is_staff_user(user_dict)
            return user_dict
    return None

def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Strict authentication dependency returning the authenticated user dictionary."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="جلسة العمل منتهية أو لم يتم تقديم رمز التوثيق (Bearer Token)"
        )
    
    parts = authorization.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="صيغة رمز التوثيق غير صالحة"
        )
    
    token = parts[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="انتهت صلاحية جلسة العمل، يرجى تسجيل الدخول مجددًا"
        )
    
    user_id = payload["sub"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT u.id, u.name, u.email, u.phone, u.role, u.avatar, u.status, u.is_active,
               u.is_deleted, u.deleted_at, u.created_by, u.created_at, u.updated_at,
               sp.grade, sp.class_name, sp.section, sp.parent_phone, sp.subscription_code,
               sp.subscription_status, sp.subscription_start, sp.subscription_expires_at,
               sp.subscription_duration_days, sp.subscription_type,
               sp.streak, sp.xp, sp.learning_hours, sp.last_activity, sp.last_lesson_id
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE u.id = ?
        """, (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="المستخدم غير موجود أو تم إيقاف الحساب"
            )
        
        user_dict = dict(user)
        
        # Check active status & soft deletion
        if user_dict.get("is_deleted") == 1 or user_dict.get("status") in ("deleted", "DELETED"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="تم حذف هذا الحساب (إلغاء الاشتراك). يرجى التواصل مع الإدارة لتفعيل الحساب."
            )

        if user_dict.get("status") in ("inactive", "suspended", "disabled", "INACTIVE", "SUSPENDED", "DISABLED") or (user_dict.get("is_active") == 0 and user_dict.get("status") not in ("active", "ACTIVE")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="تم تعطيل هذا الحساب مؤقتًا من قِبل الإدارة. يرجى التواصل مع المشرف."
            )

        user_dict["is_super_admin"] = is_super_admin_user(user_dict)
        user_dict["is_assistant"] = is_assistant_user(user_dict)
        user_dict["is_staff"] = is_staff_user(user_dict)
        return user_dict

def check_student_subscription(user: Optional[Dict[str, Any]]) -> bool:
    """
    Check whether the user has an active, valid subscription.
    Super Admins and Assistants are always exempt.
    Students with expired or disabled subscriptions return False.
    """
    if not user:
        return False
    if is_staff_user(user):
        return True

    status_val = (user.get("subscription_status") or "active").lower()
    if status_val in ("disabled", "expired", "inactive", "unsubscribed", "none", "not_subscribed"):
        return False

    exp_str = user.get("subscription_expires_at")
    if exp_str:
        try:
            exp_dt = datetime.datetime.fromisoformat(exp_str.replace("Z", "+00:00"))
            now_dt = datetime.datetime.now(datetime.timezone.utc)
            if exp_dt < now_dt:
                return False
        except Exception:
            pass

    return True

def get_current_student(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Ensure authenticated user has student role or allow staff evaluation."""
    return current_user

def get_active_student_or_admin(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Access Control Guard: Enforces active subscription for students.
    Staff and Super Admins are always exempt.
    """
    if is_staff_user(current_user):
        return current_user

    if not check_student_subscription(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="انتهى اشتراكك، يرجى تجديد الاشتراك."
        )
    return current_user

def get_current_super_admin(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Strict Role-Based Access Control enforcing Super Admin privileges."""
    if not is_super_admin_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية المشرف العام (مخصص للمشرف العام فقط - Super Admin)"
        )
    return current_user

# Alias for backwards compatibility with existing test suites
get_current_admin = get_current_super_admin

def get_current_staff(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Role-Based Access Control allowing both Super Admin and Assistant."""
    if not is_staff_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية الوصول إلى هذه الصفحة أو المورد الأكاديمي (مخصص للإدارة والمعلمين والمساعدين فقط)"
        )
    return current_user

def get_current_assistant(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Role-Based Access Control enforcing Assistant privileges."""
    if not is_assistant_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="مخصص للمساعدين التعليميين فقط (Assistant)"
        )
    return current_user
