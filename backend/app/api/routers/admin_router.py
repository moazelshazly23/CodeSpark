"""
Code Spark - Admin Dashboard Statistics Router
"""
from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.api.deps import require_role
from app.db.engine import db_engine

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"], dependencies=[Depends(require_role("admin", "assistant"))])

def _compute_stats():
    students_count = db_engine.fetch_val("SELECT COUNT(*) FROM users WHERE role = 'student'") or 0
    subscribed_count = db_engine.fetch_val("SELECT COUNT(DISTINCT user_id) FROM subscriptions WHERE is_active = 1") or 0
    courses_count = db_engine.fetch_val("SELECT COUNT(*) FROM courses") or 0
    lessons_count = db_engine.fetch_val("SELECT COUNT(*) FROM lessons") or 0
    pending_requests = db_engine.fetch_val("SELECT COUNT(*) FROM subscription_requests WHERE status = 'PENDING'") or 0
    open_tickets = db_engine.fetch_val("SELECT COUNT(*) FROM support_tickets WHERE status = 'OPEN'") or 0
    return {
        "students_count": students_count,
        "subscribed_count": subscribed_count,
        "courses_count": courses_count,
        "lessons_count": lessons_count,
        "pending_subscription_requests": pending_requests,
        "open_tickets": open_tickets
    }

@router.get("/stats")
def get_admin_stats():
    return _compute_stats()

@router.get("/dashboard")
def get_admin_dashboard():
    return _compute_stats()
