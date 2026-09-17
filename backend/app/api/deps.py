"""
Code Spark - FastAPI Authentication & Authorization Dependencies
Role-Based Access Control (RBAC) and Granular Permission Checking
"""
from typing import Optional, List, Dict, Any, Callable
from fastapi import Header, HTTPException, status, Depends
from app.core.security import decode_access_token
from app.db.engine import db_engine
from app.repositories.all_repositories import UserRepository, SubscriptionRepository

def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    parts = authorization.split(" ")
    if len(parts) != 2:
        return None
    token = parts[1].strip()
    if not token or token.lower() in ("undefined", "null", "none"):
        return None
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = UserRepository.get_by_id(user_id)
        if not user or not user.get("is_active", 1):
            return None
        return user
    except Exception:
        return None

def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="رمز الدخول مفقود أو غير صالح. يرجى تسجيل الدخول",
            headers={"WWW-Authenticate": "Bearer"}
        )
    parts = authorization.split(" ")
    if len(parts) != 2:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="رمز الدخول غير صالح",
            headers={"WWW-Authenticate": "Bearer"}
        )
    token = parts[1].strip()
    if not token or token.lower() in ("undefined", "null", "none"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="رمز الدخول غير صالح أو غير معرف",
            headers={"WWW-Authenticate": "Bearer"}
        )
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="رمز الدخول غير صالح")
        user = UserRepository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="المستخدم غير موجود")
        if not user.get("is_active", 1):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="الحساب معطل حالياً")
        if user.get("role") == "assistant":
            user["permissions"] = UserRepository.get_assistant_permissions(user["id"])
        elif user.get("role") == "admin":
            user["permissions"] = ["all"]
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="فشل التحقق من الجلسة")

def require_role(*allowed_roles: str) -> Callable:
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"غير مصرح لك بالوصول. يتطلب صلاحية: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

def require_permission(perm_code: str) -> Callable:
    def permission_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")
        if user_role == "admin":
            return current_user
        if user_role == "assistant":
            perms = UserRepository.get_assistant_permissions(current_user["id"])
            if perm_code in perms:
                return current_user
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"ليس لديك الصلاحية المطلوبة لتنفيذ هذا الإجراء: ({perm_code})"
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="صلاحية الوصول مخصصة للمساعدين والإدارة فقط"
        )
    return permission_checker

def require_subscription(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current_user.get("role") in ("admin", "assistant"):
        return current_user
    sub = SubscriptionRepository.get_active_subscription(current_user["id"])
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="هذا المحتوى متاح للمشتركين فقط. يرجى تفعيل كود الاشتراك للمتابعة"
        )
    return current_user
