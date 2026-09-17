"""
Code Spark - Dashboard Aggregator Router
"""
from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.api.deps import get_current_user
from app.db.engine import db_engine

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/student")
def get_student_dashboard(user: Dict[str, Any] = Depends(get_current_user)):
    user_id = user["id"]
    stats = db_engine.fetch_one("SELECT * FROM student_stats WHERE user_id = ?", (user_id,))
    recent_lessons = db_engine.fetch_all("SELECT l.*, c.title as course_title FROM lessons l JOIN units u ON l.unit_id = u.id JOIN courses c ON u.course_id = c.id WHERE l.is_published = 1 ORDER BY l.order_index ASC LIMIT 5")
    return {
        "user": user,
        "stats": stats or {"xp": 50, "streak_days": 1},
        "recent_lessons": recent_lessons
    }
