from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, List, Dict, Any
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("")
def get_notifications(current_user: dict = Depends(get_current_user)):
    """Fetch notifications for current user."""
    user_id = current_user["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC", (user_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            r["read"] = bool(r["is_read"])
            r["date"] = r["created_at"]
        return {"success": True, "notifications": rows}

@router.post("/{notif_id}/read")
def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    """Mark single notification as read."""
    user_id = current_user["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)", (notif_id, user_id))
        return {"success": True, "message": "تم تحديث الإشعار"}

@router.post("/read-all")
def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all user notifications as read."""
    user_id = current_user["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id IS NULL", (user_id,))
        return {"success": True, "message": "تم تحديد جميع الإشعارات كمقروءة"}
