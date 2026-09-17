"""
Code Spark - Notifications Router
"""
from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.api.deps import get_current_user
from app.db.engine import db_engine

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
def list_notifications(user: Dict[str, Any] = Depends(get_current_user)):
    notes = db_engine.fetch_all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30", (user["id"],))
    return {"notifications": notes}

@router.put("/{note_id}/read")
def mark_read(note_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    db_engine.execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", (note_id, user["id"]))
    return {"success": True}
