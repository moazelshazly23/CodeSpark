"""
Code Spark - Announcements Router
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from app.api.deps import require_role, get_optional_user, get_current_user
from app.db.engine import db_engine
from app.schemas.all_schemas import AnnouncementCreate

router = APIRouter(prefix="/announcements", tags=["Announcements"])

@router.get("")
def list_announcements(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    clauses = "" if is_admin else "WHERE is_published = 1"
    rows = db_engine.fetch_all(f"SELECT * FROM announcements {clauses} ORDER BY created_at DESC")
    return {"announcements": rows, "total": len(rows)}

@router.post("", dependencies=[Depends(require_role("admin", "assistant"))])
def create_announcement(req: AnnouncementCreate, user: Dict[str, Any] = Depends(get_current_user)):
    rec = db_engine.insert("announcements", {
        "title": req.title,
        "content": req.content,
        "is_urgent": 1 if req.is_urgent else 0,
        "is_published": 1 if req.is_published else 0,
        "author_id": user["id"]
    })
    return {"success": True, "announcement": rec}

@router.delete("/{ann_id}", dependencies=[Depends(require_role("admin"))])
def delete_announcement(ann_id: str):
    db_engine.delete("announcements", ann_id)
    return {"success": True, "message": "تم حذف الإعلان بنجاح"}
