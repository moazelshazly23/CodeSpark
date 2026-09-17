"""
Code Spark - Audit Activity Logs Router
"""
from fastapi import APIRouter, Depends
from typing import Optional
from app.api.deps import require_role
from app.repositories.all_repositories import AuditRepository

router = APIRouter(prefix="/activity", tags=["Activity Logs"], dependencies=[Depends(require_role("admin"))])

@router.get("")
def list_activities(action: Optional[str] = None):
    logs, total = AuditRepository.list_logs(action=action, limit=50)
    return {"logs": logs, "total": total}
