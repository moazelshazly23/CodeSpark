"""
CodeSpark - Administrative Analytics & Dashboard Router
"""
from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.api.deps import require_role
from app.db.engine import db_engine

router = APIRouter(prefix="/admin", tags=["Administrative Overview"])

@router.get("/stats", dependencies=[Depends(require_role("admin", "assistant"))])
def get_admin_dashboard_stats():
    now_str = db_engine.fetch_val("SELECT datetime('now')")
    
    total_students = db_engine.fetch_val("SELECT COUNT(*) FROM users WHERE role = 'student'") or 0
    total_assistants = db_engine.fetch_val("SELECT COUNT(*) FROM users WHERE role = 'assistant'") or 0
    active_subscriptions = db_engine.fetch_val("""
        SELECT COUNT(*) FROM subscriptions 
        WHERE is_active = 1 AND (is_lifetime = 1 OR expires_at IS NULL OR expires_at > ?)
    """, (now_str,)) or 0
    pending_requests = db_engine.fetch_val("SELECT COUNT(*) FROM payment_requests WHERE status = 'pending'") or 0
    total_courses = db_engine.fetch_val("SELECT COUNT(*) FROM courses") or 0
    total_lessons = db_engine.fetch_val("SELECT COUNT(*) FROM lessons") or 0
    total_files = db_engine.fetch_val("SELECT COUNT(*) FROM study_files") or 0
    total_exams = db_engine.fetch_val("SELECT COUNT(*) FROM exams") or 0
    total_exam_attempts = db_engine.fetch_val("SELECT COUNT(*) FROM exam_attempts") or 0

    return {
        "total_students": total_students,
        "total_assistants": total_assistants,
        "active_subscriptions": active_subscriptions,
        "pending_payment_requests": pending_requests,
        "total_courses": total_courses,
        "total_lessons": total_lessons,
        "total_files": total_files,
        "total_exams": total_exams,
        "total_exam_attempts": total_exam_attempts
    }
