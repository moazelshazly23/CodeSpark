"""
Code Spark - Assignments Router
"""
from fastapi import APIRouter, Depends
from typing import Optional
from app.api.deps import get_current_user

router = APIRouter(prefix="/assignments", tags=["Assignments"])

@router.get("")
def list_assignments(lesson_id: Optional[str] = None):
    return {"assignments": [], "total": 0}
