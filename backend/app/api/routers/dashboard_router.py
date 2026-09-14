from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user, require_staff
from app.services.core_services import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/student")
def get_student_dashboard(user: dict = Depends(get_current_user)):
    if user.get("role") != "student":
        # Staff can inspect student dashboard structure
        return DashboardService.get_student_dashboard(user["id"])
    return DashboardService.get_student_dashboard(user["id"])

@router.get("/admin")
def get_admin_dashboard(user: dict = Depends(require_staff)):
    return DashboardService.get_admin_dashboard()
