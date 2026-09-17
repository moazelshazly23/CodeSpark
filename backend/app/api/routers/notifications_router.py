"""
CodeSpark - Notifications Router
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from app.api.deps import get_current_user
from app.repositories.repositories import NotificationsRepository
from app.schemas.all_schemas import NotificationCreate

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
def list_my_notifications(user: Dict[str, Any] = Depends(get_current_user)):
    notifications = NotificationsRepository.list_user_notifications(user["id"])
    return {"notifications": notifications, "total": len(notifications)}

@router.post("/{notif_id}/read")
def mark_read(notif_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    NotificationsRepository.mark_as_read(notif_id)
    return {"success": True, "message": "تم تحديد الإشعار كمقروء"}
