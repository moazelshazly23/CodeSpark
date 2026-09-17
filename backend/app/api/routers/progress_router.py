"""
Code Spark - Student Progress & Summary Router
"""
from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.api.deps import get_current_user
from app.db.engine import db_engine

router = APIRouter(prefix="/progress", tags=["Progress"])

@router.get("/summary")
def get_progress_summary(user: Dict[str, Any] = Depends(get_current_user)):
    user_id = user["id"]
    stats = db_engine.fetch_one("SELECT * FROM student_stats WHERE user_id = ?", (user_id,))
    completed_lessons = db_engine.fetch_val("SELECT COUNT(*) FROM lesson_progress WHERE user_id = ? AND is_completed = 1", (user_id,)) or 0
    total_lessons = db_engine.fetch_val("SELECT COUNT(*) FROM lessons WHERE is_published = 1") or 1
    pct = round((completed_lessons / total_lessons) * 100, 1) if total_lessons else 0
    return {
        "xp": stats.get("xp", 50) if stats else 50,
        "streak_days": stats.get("streak_days", 1) if stats else 1,
        "study_time_minutes": stats.get("study_time_minutes", 0.0) if stats else 0.0,
        "completed_lessons": completed_lessons,
        "total_lessons": total_lessons,
        "progress_percentage": pct
    }
