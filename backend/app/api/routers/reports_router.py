"""
Code Spark - Reports & Analytics Router
"""
from fastapi import APIRouter, Depends
from app.api.deps import require_role
from app.db.engine import db_engine

router = APIRouter(prefix="/reports", tags=["Reports"], dependencies=[Depends(require_role("admin"))])

@router.get("/summary")
def get_reports_summary():
    return {
        "total_users": db_engine.fetch_val("SELECT COUNT(*) FROM users") or 0,
        "total_courses": db_engine.fetch_val("SELECT COUNT(*) FROM courses") or 0,
        "total_lessons": db_engine.fetch_val("SELECT COUNT(*) FROM lessons") or 0,
        "total_attempts": db_engine.fetch_val("SELECT COUNT(*) FROM exam_attempts") or 0
    }
