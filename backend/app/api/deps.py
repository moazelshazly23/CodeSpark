"""
CodeSpark - FastAPI Authentication & Role-Based Authorization Dependencies
Provides clean dependency injection, RBAC validation, and subscription gating.
"""
from typing import Optional, List, Dict, Any, Callable
from fastapi import Header, HTTPException, status, Depends
from app.core.security import decode_access_token
from app.repositories.repositories import UserRepository, SubscriptionRepository

def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1].strip()
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
        if user.get("role") == "admin":
            user["permissions"] = ["all"]
        elif user.get("role") == "assistant":
            user["permissions"] = UserRepository.get_assistant_permissions(user["id"])
        else:
            user["permissions"] = []
        return user
    except Exception:
        return None

def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="رمز الدخول مفقود أو غير صالح. يرجى تسجيل الدخول مجددًا",
            headers={"WWW-Authenticate": "Bearer"}
        )
    token = authorization.split(" ")[1].strip()
    if not token or token.lower() in ("undefined", "null", "none"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="رمز الدخول غير صالح",
            headers={"WWW-Authenticate": "Bearer"}
        )
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="رمز الجلسة غير صالح")
        user = UserRepository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="المستخدم غير مسجل بالنظام")
        if not user.get("is_active", 1):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="تم تعطيل هذا الحساب من قبل الإدارة")
        
        if user.get("role") == "admin":
            user["permissions"] = ["all"]
        elif user.get("role") == "assistant":
            user["permissions"] = UserRepository.get_assistant_permissions(user["id"])
        else:
            user["permissions"] = []
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً")

def require_role(*allowed_roles: str) -> Callable:
    def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"غير مصرح لك بتنفيذ هذه العملية. تتطلب صلاحية: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

def require_permission(perm_code: str) -> Callable:
    def permission_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")
        if user_role == "admin":
            return current_user
        if user_role == "assistant":
            perms = current_user.get("permissions", [])
            if perm_code in perms:
                return current_user
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"ليس لديك الصلاحية المطلوبة لتنفيذ هذا الإجراء ({perm_code})"
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
            detail="هذا المحتوى متاح للمشتركين فقط. يرجى تفعيل اشتراكك للوصول للدرس."
        )
    return current_user
