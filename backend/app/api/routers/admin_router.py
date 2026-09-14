from fastapi import APIRouter, Depends
from typing import Dict, Any
import json
from app.api.deps import require_role
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/admin", tags=["Admin Console"], dependencies=[Depends(require_role("admin"))])

@router.get("/dashboard")
def get_admin_dashboard_kpis():
    now = now_iso()
    total_students = db_engine.fetch_val("SELECT COUNT(*) FROM users WHERE role = 'student'") or 0
    active_subscribers = db_engine.fetch_val(
        "SELECT COUNT(DISTINCT user_id) FROM subscriptions WHERE status = 'ACTIVE' AND (is_lifetime = 1 OR expires_at > ?)",
        (now,)
    ) or 0
    expired_subscribers = db_engine.fetch_val(
        "SELECT COUNT(DISTINCT user_id) FROM subscriptions WHERE status != 'ACTIVE' OR (is_lifetime = 0 AND expires_at <= ?)",
        (now,)
    ) or 0
    total_courses = db_engine.fetch_val("SELECT COUNT(*) FROM courses") or 0
    total_lessons = db_engine.fetch_val("SELECT COUNT(*) FROM lessons WHERE is_published = 1") or 0
    total_exams = db_engine.fetch_val("SELECT COUNT(*) FROM exams") or 0
    exam_attempts = db_engine.fetch_val("SELECT COUNT(*) FROM exam_attempts WHERE status IN ('SUBMITTED', 'GRADED')") or 0
    avg_score = db_engine.fetch_val("SELECT AVG(percentage) FROM exam_attempts WHERE status IN ('SUBMITTED', 'GRADED')") or 0.0
    open_tickets = db_engine.fetch_val("SELECT COUNT(*) FROM support_tickets WHERE status IN ('OPEN', 'IN_PROGRESS')") or 0
    recent_activity = db_engine.fetch_all("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10")

    return {
        "total_students": total_students,
        "active_subscribers": active_subscribers,
        "expired_subscribers": expired_subscribers,
        "total_courses": total_courses,
        "total_lessons": total_lessons,
        "total_exams": total_exams,
        "exam_attempts": exam_attempts,
        "average_score": round(avg_score, 1),
        "open_tickets": open_tickets,
        "recent_activity": recent_activity
    }

@router.get("/settings")
def get_settings():
    row = db_engine.fetch_one("SELECT * FROM platform_settings WHERE key = 'general'")
    if row:
        return json.loads(row["value_json"])
    return {}

@router.put("/settings")
def update_settings(updates: Dict[str, Any]):
    row = db_engine.fetch_one("SELECT * FROM platform_settings WHERE key = 'general'")
    curr = json.loads(row["value_json"]) if row else {}
    curr.update(updates)
    db_engine.execute("UPDATE platform_settings SET value_json = ?, updated_at = ? WHERE key = 'general'", (json.dumps(curr, ensure_ascii=False), now_iso()))
    return curr
