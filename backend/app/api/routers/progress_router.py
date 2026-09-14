from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.db.engine import db_engine
from app.api.deps import get_current_user

router = APIRouter(prefix="/progress", tags=["Progress"])

@router.get("/summary")
def get_student_progress_summary(user: Dict[str, Any] = Depends(get_current_user)):
    user_id = user["id"]
    
    # Total lessons
    total_lessons = db_engine.fetch_val("SELECT COUNT(*) FROM lessons WHERE is_published = 1") or 1
    completed_lessons = db_engine.fetch_val("SELECT COUNT(*) FROM lesson_progress WHERE user_id = ? AND is_completed = 1", (user_id,)) or 0
    
    overall_pct = round((completed_lessons / total_lessons * 100.0), 1)

    # Stats
    stats = db_engine.fetch_one("SELECT * FROM student_stats WHERE user_id = ?", (user_id,))
    
    # Exams taken
    exam_attempts = db_engine.fetch_val("SELECT COUNT(*) FROM exam_attempts WHERE user_id = ? AND status IN ('SUBMITTED', 'GRADED')", (user_id,)) or 0
    exam_avg = db_engine.fetch_val("SELECT AVG(percentage) FROM exam_attempts WHERE user_id = ? AND status IN ('SUBMITTED', 'GRADED')", (user_id,)) or 0.0

    # Last accessed lesson
    last_prog = db_engine.fetch_one(
        "SELECT lp.*, l.title as lesson_title, l.unit_id FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id WHERE lp.user_id = ? ORDER BY lp.updated_at DESC LIMIT 1",
        (user_id,)
    )

    return {
        "overall_percentage": overall_pct,
        "completed_lessons": completed_lessons,
        "total_lessons": total_lessons,
        "xp": stats.get("xp", 50) if stats else 50,
        "streak_days": stats.get("streak_days", 1) if stats else 1,
        "study_time_minutes": stats.get("study_time_minutes", 0.0) if stats else 0.0,
        "exam_attempts": exam_attempts,
        "exam_average": round(exam_avg, 1),
        "last_accessed_lesson": last_prog
    }
