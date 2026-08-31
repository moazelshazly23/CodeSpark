import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, List, Dict, Any
from ..database import get_db
from ..dependencies import get_current_admin, get_optional_user
from ..models import AnnouncementCreateRequest, AnnouncementUpdateRequest

router = APIRouter(prefix="/api/announcements", tags=["Announcements"])

@router.get("")
def get_announcements(current_user: Optional[dict] = Depends(get_optional_user)):
    """Get active broadcast announcements."""
    is_admin = current_user and current_user.get("role") == "admin"
    with get_db() as conn:
        cursor = conn.cursor()
        if is_admin:
            cursor.execute("SELECT * FROM announcements ORDER BY created_at DESC")
        else:
            cursor.execute("SELECT * FROM announcements WHERE is_published = 1 ORDER BY created_at DESC")
        
        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            r["isPublished"] = bool(r["is_published"])
            r["date"] = r.get("date_str") or r.get("created_at")
        return {"success": True, "announcements": rows}

@router.post("")
def create_announcement(req: AnnouncementCreateRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Publish global announcement and notify students."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    ann_id = f"ann_{now_ts}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO announcements (id, title, content, badge, date_str, is_published, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (ann_id, req.title, req.content, req.badge or "جديد", now, 1 if req.is_published else 0, now))

        # Broadcast to students
        cursor.execute("SELECT id FROM users WHERE role = 'student'")
        students = cursor.fetchall()
        for s in students:
            now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
            s_id_val = s["id"]
            n_id = f"notif_{now_ts}_{s_id_val}"
            cursor.execute("""
            INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
            VALUES (?, ?, ?, ?, 'info', 0, '#dashboard', ?)
            """, (n_id, s["id"], f"📢 إعلان جديد: {req.title}", req.content[:120] + "...", now))

        return {"success": True, "announcement_id": ann_id, "message": "تم نشر الإعلان وإرسال إشعار للطلاب بنجاح"}

@router.put("/{ann_id}")
def update_announcement(ann_id: str, req: AnnouncementUpdateRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Update announcement."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM announcements WHERE id = ?", (ann_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="الإعلان غير موجود")

        updates = []
        params = []
        if req.title is not None:
            updates.append("title = ?")
            params.append(req.title)
        if req.content is not None:
            updates.append("content = ?")
            params.append(req.content)
        if req.badge is not None:
            updates.append("badge = ?")
            params.append(req.badge)
        if req.is_published is not None:
            updates.append("is_published = ?")
            params.append(1 if req.is_published else 0)

        if updates:
            params.append(ann_id)
            cursor.execute(f"UPDATE announcements SET {', '.join(updates)} WHERE id = ?", params)

        return {"success": True, "message": "تم تحديث الإعلان بنجاح"}

@router.delete("/{ann_id}")
def delete_announcement(ann_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Delete announcement."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM announcements WHERE id = ?", (ann_id,))
        return {"success": True, "message": "تم حذف الإعلان بنجاح"}
