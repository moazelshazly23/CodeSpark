from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List, Dict, Any

from ..database import get_db
from ..dependencies import get_current_super_admin

router = APIRouter(prefix="/api/admin/activity-logs", tags=["Admin Activity Logging"])

@router.get("")
def list_activity_logs(
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    target_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: List and filter audit activity logs."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM activity_logs WHERE 1=1"
        count_query = "SELECT COUNT(*) as total FROM activity_logs WHERE 1=1"
        params = []

        if action:
            query += " AND action = ?"
            count_query += " AND action = ?"
            params.append(action)

        if user_id:
            query += " AND user_id = ?"
            count_query += " AND user_id = ?"
            params.append(user_id)

        if target_type:
            query += " AND target_type = ?"
            count_query += " AND target_type = ?"
            params.append(target_type)

        if search:
            s = f"%{search.strip().lower()}%"
            query += " AND (LOWER(user_name) LIKE ? OR LOWER(action) LIKE ? OR LOWER(target_name) LIKE ? OR LOWER(details) LIKE ?)"
            count_query += " AND (LOWER(user_name) LIKE ? OR LOWER(action) LIKE ? OR LOWER(target_name) LIKE ? OR LOWER(details) LIKE ?)"
            params.extend([s, s, s, s])

        cursor.execute(count_query, params)
        total_row = cursor.fetchone()
        total = total_row["total"] if total_row else 0

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        fetch_params = list(params) + [limit, offset]
        cursor.execute(query, fetch_params)
        rows = cursor.fetchall()

        logs = [dict(r) for r in rows]
        return {
            "success": True,
            "total": total,
            "limit": limit,
            "offset": offset,
            "logs": logs
        }
