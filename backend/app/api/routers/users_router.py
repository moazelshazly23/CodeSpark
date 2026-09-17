"""
CodeSpark - User Profile & Account Settings Router
Includes strictly verified, persistent password change workflow and student management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional, List
from app.api.deps import get_current_user, require_role
from app.services.auth_service import AuthService
from app.repositories.repositories import UserRepository
from app.schemas.all_schemas import ChangePasswordRequest, UpdateProfileRequest, AdminResetPasswordRequest

router = APIRouter(prefix="/users", tags=["Users & Security"])

@router.get("/profile")
def get_profile(user: Dict[str, Any] = Depends(get_current_user)):
    user_copy = user.copy()
    user_copy.pop("hashed_password", None)
    return user_copy

@router.put("/profile")
def update_profile(req: UpdateProfileRequest, user: Dict[str, Any] = Depends(get_current_user)):
    updates = {}
    if req.full_name is not None:
        updates["full_name"] = req.full_name.strip()
    if req.email is not None:
        new_email = req.email.strip().lower()
        existing = UserRepository.get_by_email(new_email)
        if existing and existing["id"] != user["id"]:
            raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل بالفعل بحساب آخر")
        updates["email"] = new_email
    if req.phone is not None:
        updates["phone"] = req.phone.strip()

    updated = UserRepository.update(user["id"], updates)
    if not updated:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    updated.pop("hashed_password", None)
    return {"success": True, "message": "تم تحديث البيانات بنجاح", "user": updated}

@router.post("/change-password")
def change_password(req: ChangePasswordRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Validates current password, validates new password, securely hashes it,
    and updates the persistent database.
    """
    try:
        res = AuthService.change_password(
            user_id=user["id"],
            current_password=req.current_password,
            new_password=req.new_password,
            confirm_password=req.confirm_password
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/all", dependencies=[Depends(require_role("admin", "assistant"))])
def list_users(role: Optional[str] = None, search: Optional[str] = None, limit: int = 100, offset: int = 0):
    return UserRepository.list_users(role=role, search=search, limit=limit, offset=offset)

@router.get("/{user_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def get_user_details(user_id: str):
    u = UserRepository.get_by_id(user_id)
    if not u:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    u.pop("hashed_password", None)
    return u

@router.post("/{user_id}/toggle-active", dependencies=[Depends(require_role("admin"))])
def toggle_user_active(user_id: str):
    u = UserRepository.get_by_id(user_id)
    if not u:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if u["role"] == "admin":
        raise HTTPException(status_code=400, detail="لا يمكن تعطيل حساب المشرف العام")
    new_status = 0 if u.get("is_active", 1) else 1
    UserRepository.update(user_id, {"is_active": new_status})
    return {"success": True, "is_active": bool(new_status), "message": "تم تحديث حالة الحساب بنجاح"}

@router.post("/{user_id}/reset-password", dependencies=[Depends(require_role("admin"))])
def admin_reset_password(user_id: str, req: AdminResetPasswordRequest):
    try:
        return AuthService.admin_reset_password(user_id, req.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{user_id}", dependencies=[Depends(require_role("admin"))])
def delete_user(user_id: str):
    u = UserRepository.get_by_id(user_id)
    if not u:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if u["role"] == "admin":
        raise HTTPException(status_code=400, detail="لا يمكن حذف حساب المشرف العام")
    UserRepository.delete(user_id)
    return {"success": True, "message": "تم حذف الحساب بنجاح"}
