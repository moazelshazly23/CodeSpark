"""
Code Spark - Assistants Management Router
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel
from app.api.deps import require_role
from app.db.engine import db_engine
from app.core.security import get_password_hash
from app.repositories.all_repositories import UserRepository

router = APIRouter(prefix="/assistants", tags=["Assistants Management"], dependencies=[Depends(require_role("admin"))])

class AssistantCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    phone: str = None
    permissions: List[str] = []

class AssistantPermissionsUpdate(BaseModel):
    permissions: List[str]

@router.get("")
def list_assistants():
    users, total = UserRepository.list_users(role="assistant")
    for u in users:
        u["permissions"] = UserRepository.get_assistant_permissions(u["id"])
    return {"assistants": users, "total": total}

@router.post("")
def create_assistant(req: AssistantCreate):
    if UserRepository.get_by_username(req.username):
        raise HTTPException(status_code=400, detail="اسم المستخدم مسجل بالفعل")
    if UserRepository.get_by_email(req.email):
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل بالفعل")
    data = {
        "username": req.username,
        "email": req.email.lower(),
        "hashed_password": get_password_hash(req.password),
        "full_name": req.full_name,
        "role": "assistant",
        "phone": req.phone,
        "is_active": 1,
        "is_verified": 1
    }
    user = UserRepository.create(data)
    UserRepository.set_assistant_permissions(user["id"], req.permissions)
    user["permissions"] = req.permissions
    return {"success": True, "assistant": user}

@router.put("/{assistant_id}/permissions")
def update_assistant_permissions(assistant_id: str, req: AssistantPermissionsUpdate):
    user = UserRepository.get_by_id(assistant_id)
    if not user or user.get("role") != "assistant":
        raise HTTPException(status_code=404, detail="المساعد غير موجود")
    UserRepository.set_assistant_permissions(assistant_id, req.permissions)
    return {"success": True, "permissions": req.permissions}
