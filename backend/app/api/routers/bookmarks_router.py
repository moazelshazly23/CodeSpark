from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import uuid
from app.schemas.all_schemas import BookmarkRequest
from app.api.deps import get_current_user
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/bookmarks", tags=["Bookmarks"])

@router.get("")
def list_bookmarks(user: Dict[str, Any] = Depends(get_current_user)):
    user_id = user["id"]
    bookmarks = db_engine.fetch_all("SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    # Enrich with lesson or resource title
    for b in bookmarks:
        if b["item_type"] == "lesson":
            les = db_engine.fetch_one("SELECT title, description FROM lessons WHERE id = ?", (b["item_id"],))
            b["title"] = les["title"] if les else "درس"
        elif b["item_type"] == "resource":
            res = db_engine.fetch_one("SELECT title, file_url FROM educational_resources WHERE id = ?", (b["item_id"],))
            b["title"] = res["title"] if res else "مذكرة تعليمية"
        elif b["item_type"] == "exercise":
            ex = db_engine.fetch_one("SELECT title FROM exercises WHERE id = ?", (b["item_id"],))
            b["title"] = ex["title"] if ex else "تمرين برمجى"
    return bookmarks

@router.post("")
def add_bookmark(req: BookmarkRequest, user: Dict[str, Any] = Depends(get_current_user)):
    user_id = user["id"]
    existing = db_engine.fetch_one(
        "SELECT id FROM bookmarks WHERE user_id = ? AND item_type = ? AND item_id = ?",
        (user_id, req.item_type, req.item_id)
    )
    if existing:
        return {"success": True, "bookmark_id": existing["id"], "status": "already_exists"}
    rec = {
        "id": uuid.uuid4().hex,
        "user_id": user_id,
        "item_type": req.item_type,
        "item_id": req.item_id,
        "created_at": now_iso()
    }
    db_engine.insert("bookmarks", rec)
    return {"success": True, "bookmark": rec}

@router.delete("/{bookmark_id}")
def remove_bookmark(bookmark_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    res = db_engine.delete("bookmarks", bookmark_id)
    return {"success": res}
