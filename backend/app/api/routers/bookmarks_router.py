"""
Code Spark - Bookmarks Router
"""
from fastapi import APIRouter, Depends
from typing import Dict, Any
from pydantic import BaseModel
from app.api.deps import get_current_user
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/bookmarks", tags=["Bookmarks"])

class BookmarkCreate(BaseModel):
    lesson_id: str

@router.get("")
def list_bookmarks(user: Dict[str, Any] = Depends(get_current_user)):
    rows = db_engine.fetch_all("SELECT b.*, l.title as lesson_title FROM bookmarks b JOIN lessons l ON b.lesson_id = l.id WHERE b.user_id = ?", (user["id"],))
    return {"bookmarks": rows}

@router.post("")
def add_bookmark(req: BookmarkCreate, user: Dict[str, Any] = Depends(get_current_user)):
    exist = db_engine.fetch_one("SELECT id FROM bookmarks WHERE user_id = ? AND lesson_id = ?", (user["id"], req.lesson_id))
    if not exist:
        db_engine.insert("bookmarks", {
            "user_id": user["id"],
            "lesson_id": req.lesson_id
        })
    return {"success": True}

@router.delete("/{lesson_id}")
def remove_bookmark(lesson_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    db_engine.execute("DELETE FROM bookmarks WHERE user_id = ? AND lesson_id = ?", (user["id"], lesson_id))
    return {"success": True}
