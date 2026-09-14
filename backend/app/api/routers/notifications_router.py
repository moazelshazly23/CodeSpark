from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.api.deps import get_current_user
from app.db.engine import db_engine

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
def list_notifications(user: Dict[str, Any] = Depends(get_current_user)):
    user_id = user["id"]
    notifs = db_engine.fetch_all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30", (user_id,))
    unread_count = sum(1 for n in notifs if not n.get("is_read"))
    return {"notifications": notifs, "unread_count": unread_count}

@router.put("/{notif_id}/read")
def mark_as_read(notif_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    db_engine.execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", (notif_id, user["id"]))
    return {"success": True}

@router.put("/read-all")
def mark_all_read(user: Dict[str, Any] = Depends(get_current_user)):
    db_engine.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (user["id"],))
    return {"success": True}
