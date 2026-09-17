"""
Code Spark - Users and Account Profile Router
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List, Dict, Any
from app.api.deps import require_role, get_current_user
from app.db.engine import db_engine, now_iso
from app.repositories.all_repositories import AuditRepository, UserRepository
from app.core.security import verify_password, get_password_hash
from app.schemas.all_schemas import ChangePasswordRequest, UpdateProfileRequest, AdminResetPasswordRequest, AdminUpdateUserRequest

router = APIRouter(prefix="/users", tags=["Users & Account Settings"])

@router.get("/me")
def get_my_profile(user: Dict[str, Any] = Depends(get_current_user)):
    u = db_engine.fetch_one("SELECT id, username, email, full_name, phone, role, is_active, created_at FROM users WHERE id = ?", (user["id"],))
    if not u:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    return u

@router.put("/profile")
def update_profile(req: UpdateProfileRequest, user: Dict[str, Any] = Depends(get_current_user)):
    up = {}
    if req.full_name is not None and req.full_name.strip():
        up["full_name"] = req.full_name.strip()
    if req.phone is not None:
        up["phone"] = req.phone.strip()
    if req.email is not None and req.email.strip():
        new_email = req.email.strip().lower()
        if new_email != user.get("email"):
            exist = db_engine.fetch_one("SELECT id FROM users WHERE email = ? AND id != ?", (new_email, user["id"]))
            if exist:
                raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل بواسطة حساب آخر")
            up["email"] = new_email
    if up:
        up["updated_at"] = now_iso()
        db_engine.update("users", user["id"], up)
        AuditRepository.log(user_id=user["id"], action="profile_updated", entity_type="user", entity_id=user["id"], details={"fields": list(up.keys())})
    updated = db_engine.fetch_one("SELECT id, username, email, full_name, phone, role FROM users WHERE id = ?", (user["id"],))
    return {"success": True, "message": "تم تحديث البيانات بنجاح", "user": updated}

@router.post("/change-password")
def change_password(req: ChangePasswordRequest, user: Dict[str, Any] = Depends(get_current_user)):
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="كلمة المرور الجديدة وتأكيدها غير متطابقين")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="يجب أن تتكون كلمة المرور الجديدة من 6 خانات على الأقل")
    full_user = db_engine.fetch_one("SELECT hashed_password FROM users WHERE id = ?", (user["id"],))
    if not full_user or not verify_password(req.current_password, full_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة")
    new_hash = get_password_hash(req.new_password)
    db_engine.update("users", user["id"], {
        "hashed_password": new_hash,
        "updated_at": now_iso()
    })
    AuditRepository.log(user_id=user["id"], action="password_changed", entity_type="user", entity_id=user["id"], details={})
    return {"success": True, "message": "تم تغيير كلمة المرور بنجاح"}

@router.get("/all")
def list_all_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_role("admin"))
):
    query = "SELECT id, username, email, full_name, phone, role, is_active, created_at FROM users"
    params = []
    clauses = []
    if role:
        clauses.append("role = ?")
        params.append(role)
    if search:
        clauses.append("(full_name LIKE ? OR username LIKE ? OR email LIKE ?)")
        s = f"%{search}%"
        params.extend([s, s, s])
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY created_at DESC"
    return db_engine.fetch_all(query, tuple(params))

@router.post("/{user_id}/reset-password")
def admin_reset_password(
    user_id: str,
    req: AdminResetPasswordRequest,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    target = db_engine.fetch_one("SELECT id, username FROM users WHERE id = ?", (user_id,))
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="يجب أن تتكون كلمة المرور من 6 خانات على الأقل")
    new_hash = get_password_hash(req.new_password)
    db_engine.update("users", user_id, {
        "hashed_password": new_hash,
        "updated_at": now_iso()
    })
    return {"success": True, "message": f"تم إعادة تعيين كلمة المرور للمستخدم {target['username']} بنجاح"}

@router.put("/{user_id}/toggle-active")
def toggle_user_active(user_id: str, admin: Dict[str, Any] = Depends(require_role("admin"))):
    target = db_engine.fetch_one("SELECT id, is_active, role FROM users WHERE id = ?", (user_id,))
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if target["role"] == "admin" and target["id"] == admin["id"]:
        raise HTTPException(status_code=400, detail="لا يمكنك تعطيل حسابك الإداري الحالي")
    new_state = 0 if target["is_active"] else 1
    db_engine.update("users", user_id, {"is_active": new_state, "updated_at": now_iso()})
    return {"success": True, "is_active": bool(new_state)}

@router.put("/{user_id}")
def admin_update_user(
    user_id: str,
    req: AdminUpdateUserRequest,
    admin: Dict[str, Any] = Depends(require_role("admin"))
):
    target = db_engine.fetch_one("SELECT id FROM users WHERE id = ?", (user_id,))
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    up = {}
    if req.full_name is not None:
        up["full_name"] = req.full_name.strip()
    if req.email is not None:
        up["email"] = req.email.strip().lower()
    if req.phone is not None:
        up["phone"] = req.phone.strip()
    if req.role is not None and req.role in ("admin", "assistant", "student"):
        up["role"] = req.role
    if req.is_active is not None:
        up["is_active"] = 1 if req.is_active else 0
    if up:
        up["updated_at"] = now_iso()
        db_engine.update("users", user_id, up)
    return {"success": True, "message": "تم تحديث بيانات المستخدم بنجاح"}
