"""
CodeSpark - Student Progress & Gamification Router
Computes real progress percentages, completed lessons, exam scores, XP, and streak.
"""
import json
from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.api.deps import get_current_user
from app.db.engine import db_engine

router = APIRouter(prefix="/progress", tags=["Student Progress & Gamification"])

@router.get("/summary")
def get_progress_summary(user: Dict[str, Any] = Depends(get_current_user)):
    user_id = user["id"]

    # Student stats
    stats = db_engine.fetch_one("SELECT * FROM student_stats WHERE user_id = ?", (user_id,))
    if not stats:
        stats = {
            "xp": 50,
            "streak_days": 1,
            "study_time_minutes": 0.0,
            "achievements_json": '["بداية الرحلة 🚀"]'
        }

    achievements = []
    try:
        achievements = json.loads(stats.get("achievements_json", "[]"))
    except Exception:
        achievements = ["بداية الرحلة 🚀"]

    # Total published lessons
    total_lessons = db_engine.fetch_val("SELECT COUNT(*) FROM lessons WHERE is_published = 1") or 0

    # Completed lessons by user
    completed_lessons = db_engine.fetch_val("""
        SELECT COUNT(*) FROM lesson_progress 
        WHERE user_id = ? AND is_completed = 1
    """, (user_id,)) or 0

    completion_percentage = round((completed_lessons / total_lessons * 100.0) if total_lessons > 0 else 0.0, 1)

    # Last accessed lesson
    last_prog = db_engine.fetch_one("""
        SELECT lp.*, l.title as lesson_title, l.unit_id 
        FROM lesson_progress lp
        JOIN lessons l ON lp.lesson_id = l.id
        WHERE lp.user_id = ?
        ORDER BY lp.updated_at DESC LIMIT 1
    """, (user_id,))

    # Total exams attempted
    exams_passed = db_engine.fetch_val("""
        SELECT COUNT(*) FROM exam_attempts 
        WHERE user_id = ? AND is_passed = 1
    """, (user_id,)) or 0

    return {
        "xp": stats.get("xp", 50),
        "streak_days": stats.get("streak_days", 1),
        "study_time_minutes": stats.get("study_time_minutes", 0.0),
        "total_lessons": total_lessons,
        "completed_lessons": completed_lessons,
        "completion_percentage": completion_percentage,
        "last_accessed_lesson": last_prog,
        "exams_passed": exams_passed,
        "achievements": achievements
    }

@router.get("/leaderboard")
def get_leaderboard():
    rows = db_engine.fetch_all("""
        SELECT u.id, u.full_name, u.username, u.avatar_url, ss.xp, ss.streak_days
        FROM student_stats ss
        JOIN users u ON ss.user_id = u.id
        WHERE u.role = 'student' AND u.is_active = 1
        ORDER BY ss.xp DESC LIMIT 10
    """)
    return {"leaderboard": rows}
