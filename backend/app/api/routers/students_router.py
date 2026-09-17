"""
Code Spark - Students Management Router
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from app.api.deps import require_role
from app.db.engine import db_engine
from app.repositories.all_repositories import UserRepository, SubscriptionRepository

router = APIRouter(prefix="/students", tags=["Students Management"], dependencies=[Depends(require_role("admin", "assistant"))])

@router.get("")
def list_students(search: Optional[str] = None, offset: int = 0, limit: int = 50):
    users, total = UserRepository.list_users(role="student", search=search, offset=offset, limit=limit)
    for u in users:
        sub = SubscriptionRepository.get_active_subscription(u["id"])
        u["is_subscribed"] = sub is not None
        u["subscription"] = sub
    return {"students": users, "total": total}

@router.get("/{student_id}")
def get_student_details(student_id: str):
    u = UserRepository.get_by_id(student_id)
    if not u or u.get("role") != "student":
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    sub = SubscriptionRepository.get_active_subscription(student_id)
    stats = db_engine.fetch_one("SELECT * FROM student_stats WHERE user_id = ?", (student_id,))
    progress = db_engine.fetch_all("SELECT lp.*, l.title as lesson_title FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id WHERE lp.user_id = ?", (student_id,))
    return {
        "student": u,
        "subscription": sub,
        "stats": stats or {},
        "progress": progress
    }
