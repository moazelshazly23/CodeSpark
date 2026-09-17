"""
CodeSpark - Assistant Management & Assistant Operations Router
Enforces strict role limitations: assistants can only generate monthly codes,
cannot change prices, cannot change payment settings, and cannot escalate permissions.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from app.api.deps import require_role, get_current_user
from app.repositories.repositories import UserRepository
from app.services.auth_service import AuthService
from app.core.security import get_password_hash
from app.schemas.all_schemas import AssistantCreate, AssistantUpdatePermissions

router = APIRouter(prefix="/assistants", tags=["Assistants Management"])

@router.get("", dependencies=[Depends(require_role("admin"))])
def list_assistants():
    assistants = UserRepository.list_users(role="assistant")
    for a in assistants:
        a["permissions"] = UserRepository.get_assistant_permissions(a["id"])
    return {"assistants": assistants}

@router.post("", dependencies=[Depends(require_role("admin"))])
def create_assistant(req: AssistantCreate):
    if UserRepository.get_by_username(req.username):
        raise HTTPException(status_code=400, detail="اسم المستخدم مسجل بالفعل")
    if UserRepository.get_by_email(req.email):
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل بالفعل")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب أن تكون 6 أحرف على الأقل")

    data = {
        "username": req.username.strip(),
        "email": req.email.strip().lower(),
        "hashed_password": get_password_hash(req.password),
        "full_name": req.full_name.strip(),
        "role": "assistant",
        "phone": req.phone.strip() if req.phone else None,
        "is_active": 1
    }
    assistant = UserRepository.create(data)
    if req.permissions:
        UserRepository.set_assistant_permissions(assistant["id"], req.permissions)
    
    assistant.pop("hashed_password", None)
    assistant["permissions"] = UserRepository.get_assistant_permissions(assistant["id"])
    return {"success": True, "assistant": assistant}

@router.put("/{assistant_id}/permissions", dependencies=[Depends(require_role("admin"))])
def update_assistant_permissions(assistant_id: str, req: AssistantUpdatePermissions):
    u = UserRepository.get_by_id(assistant_id)
    if not u or u["role"] != "assistant":
        raise HTTPException(status_code=404, detail="المساعد غير موجود")
    UserRepository.set_assistant_permissions(assistant_id, req.permissions)
    return {"success": True, "permissions": req.permissions, "message": "تم تحديث صلاحيات المساعد بنجاح"}
