from fastapi import APIRouter, Depends
from typing import Dict, Any, Optional
import uuid
from app.schemas.all_schemas import AnnouncementCreateRequest
from app.api.deps import get_optional_user, get_current_user, require_role
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/announcements", tags=["Announcements"])

@router.get("")
def list_announcements(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    target_roles = ["ALL"]
    if user:
        if user["role"] == "student":
            target_roles.append("STUDENTS")
            # Check subscription
            sub = db_engine.fetch_one("SELECT id FROM subscriptions WHERE user_id = ? AND status = 'ACTIVE'", (user["id"],))
            if sub:
                target_roles.append("SUBSCRIBERS")
        elif user["role"] == "assistant":
            target_roles.append("ASSISTANTS")
        elif user["role"] == "admin":
            target_roles.extend(["STUDENTS", "SUBSCRIBERS", "ASSISTANTS"])
    
    placeholders = ", ".join(["?"] * len(target_roles))
    announcements = db_engine.fetch_all(
        f"SELECT * FROM announcements WHERE is_published = 1 AND target_audience IN ({placeholders}) ORDER BY publish_date DESC LIMIT 20",
        tuple(target_roles)
    )
    return announcements

@router.post("", dependencies=[Depends(require_role("admin", "assistant"))])
def create_announcement(req: AnnouncementCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    rec = {
        "id": uuid.uuid4().hex,
        "title": req.title,
        "content": req.content,
        "target_audience": req.target_audience,
        "is_published": 1,
        "publish_date": now_iso(),
        "expiration_date": req.expiration_date,
        "created_by": user["id"],
        "created_at": now_iso()
    }
    return db_engine.insert("announcements", rec)

@router.delete("/{ann_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def delete_announcement(ann_id: str):
    res = db_engine.delete("announcements", ann_id)
    if not res:
        return {"success": False, "detail": "الإعلان غير موجود"}
    return {"success": True, "message": "تم حذف الإعلان بنجاح"}
