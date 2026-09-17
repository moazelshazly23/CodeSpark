"""
Code Spark - Educational Resources Router
"""
from fastapi import APIRouter, Depends
from typing import Optional
from app.db.engine import db_engine

router = APIRouter(prefix="/resources", tags=["Educational Resources"])

@router.get("")
def list_resources(lesson_id: Optional[str] = None):
    query = "SELECT * FROM educational_resources"
    params = []
    if lesson_id:
        query += " WHERE lesson_id = ?"
        params.append(lesson_id)
    query += " ORDER BY created_at DESC"
    rows = db_engine.fetch_all(query, tuple(params))
    return {"resources": rows, "total": len(rows)}
