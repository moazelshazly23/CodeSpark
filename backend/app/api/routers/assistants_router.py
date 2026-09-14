from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
import uuid
from app.schemas.all_schemas import AssistantCreateRequest, PermissionsUpdateRequest
from app.repositories.all_repositories import UserRepository
from app.api.deps import require_role
from app.core.security import get_password_hash
from app.core.permissions import ALL_PERMISSION_KEYS, ASSISTANT_PERMISSIONS
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/assistants", tags=["Assistants"], dependencies=[Depends(require_role("admin"))])

@router.get("")
def list_assistants():
    assistants = db_engine.fetch_all("SELECT id, username, email, full_name, is_active, created_at FROM users WHERE role = 'assistant' ORDER BY created_at DESC")
    for a in assistants:
        a["permissions"] = UserRepository.get_assistant_permissions(a["id"])
    return {"assistants": assistants, "available_permissions": ASSISTANT_PERMISSIONS}

@router.post("")
def create_assistant(req: AssistantCreateRequest):
    if UserRepository.get_by_username(req.username):
        raise HTTPException(status_code=400, detail="اسم المستخدم مسجل بالفعل")
    if UserRepository.get_by_email(req.email):
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل بالفعل")

    with db_engine.transaction():
        user_id = uuid.uuid4().hex
        rec = {
            "id": user_id,
            "username": req.username.strip(),
            "email": req.email.strip().lower(),
            "hashed_password": get_password_hash(req.password),
            "full_name": req.full_name.strip(),
            "role": "assistant",
            "is_active": 1,
            "is_verified": 1,
            "phone": None,
            "avatar_url": None,
            "created_at": now_iso(),
            "updated_at": now_iso()
        }
        db_engine.insert("users", rec)
        UserRepository.set_assistant_permissions(user_id, req.permissions)
        rec["permissions"] = req.permissions
        return rec

@router.put("/{assistant_id}/permissions")
def update_assistant_permissions(assistant_id: str, req: PermissionsUpdateRequest):
    u = UserRepository.get_by_id(assistant_id)
    if not u or u["role"] != "assistant":
        raise HTTPException(status_code=404, detail="المساعد غير موجود")
    UserRepository.set_assistant_permissions(assistant_id, req.permissions)
    return {"success": True, "permissions": req.permissions}

@router.delete("/{assistant_id}")
def delete_assistant(assistant_id: str):
    res = db_engine.delete("users", assistant_id)
    if not res:
        raise HTTPException(status_code=404, detail="المساعد غير موجود")
    return {"success": True, "message": "تم حذف حساب المساعد"}
