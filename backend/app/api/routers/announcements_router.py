"""
CodeSpark - Announcements Management Router
Provides public and administrative announcement streams with zero failure rate.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
from app.api.deps import get_optional_user, require_role, get_current_user
from app.repositories.repositories import AnnouncementsRepository
from app.schemas.all_schemas import AnnouncementCreate, AnnouncementUpdate

router = APIRouter(prefix="/announcements", tags=["Announcements"])

@router.get("")
def list_announcements(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    announcements = AnnouncementsRepository.list_announcements(only_published=not is_admin)
    return {"announcements": announcements, "total": len(announcements)}

@router.post("", dependencies=[Depends(require_role("admin", "assistant"))])
def create_announcement(req: AnnouncementCreate, user: Dict[str, Any] = Depends(get_current_user)):
    data = req.dict()
    data["is_urgent"] = 1 if req.is_urgent else 0
    data["is_published"] = 1 if req.is_published else 0
    data["author_id"] = user["id"]
    ann = AnnouncementsRepository.create(data)
    return {"success": True, "announcement": ann}

@router.put("/{ann_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_announcement(ann_id: str, req: AnnouncementUpdate):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    if "is_urgent" in updates:
        updates["is_urgent"] = 1 if updates["is_urgent"] else 0
    if "is_published" in updates:
        updates["is_published"] = 1 if updates["is_published"] else 0
    ann = AnnouncementsRepository.update(ann_id, updates)
    if not ann:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    return {"success": True, "announcement": ann}

@router.delete("/{ann_id}", dependencies=[Depends(require_role("admin"))])
def delete_announcement(ann_id: str):
    success = AnnouncementsRepository.delete(ann_id)
    if not success:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    return {"success": True, "message": "تم حذف الإعلان بنجاح"}
