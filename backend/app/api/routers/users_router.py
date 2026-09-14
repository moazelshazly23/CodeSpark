from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from app.api.deps import require_admin, require_staff, get_current_user
from app.db.engine import db_engine
from app.services.core_services import AuthService, ActivityService
from app.schemas.auth import RegisterRequest, UserUpdateRequest

router = APIRouter(prefix="/users", tags=["Users & Students"])

@router.get("/students")
def list_students(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    user: dict = Depends(require_staff)
):
    offset = (page - 1) * page_size
    filters = {"role": "student"}
    if is_active is not None:
        filters["is_active"] = is_active
    
    records, total = db_engine.query(
        "users", 
        filters=filters, 
        search_field="full_name", 
        search_query=search,
        order_by="created_at",
        descending=True,
        offset=offset,
        limit=page_size
    )

    # Attach computed metrics per student
    student_list = []
    for s in records:
        progress_recs, _ = db_engine.query("lesson_progress", filters={"student_id": s["id"]})
        completed_lessons = sum(1 for p in progress_recs if p.get("is_completed"))
        attempts, _ = db_engine.query("exam_attempts", filters={"student_id": s["id"], "status": "graded"})
        avg_score = round(sum(a.get("percentage", 0.0) for a in attempts) / len(attempts), 1) if attempts else 0.0
        
        student_list.append({
            "id": s["id"],
            "username": s["username"],
            "email": s["email"],
            "full_name": s["full_name"],
            "role": s["role"],
            "is_active": s.get("is_active", True),
            "phone": s.get("phone"),
            "created_at": s.get("created_at", ""),
            "completed_lessons": completed_lessons,
            "average_score": avg_score,
            "exams_count": len(attempts)
        })

    return {
        "items": student_list,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.post("/students")
def create_student(req: RegisterRequest, admin: dict = Depends(require_admin)):
    try:
        data = req.dict()
        data["role"] = "student"
        student = AuthService.register(data)
        return {
            "id": student["id"],
            "username": student["username"],
            "email": student["email"],
            "full_name": student["full_name"],
            "role": student["role"],
            "is_active": student.get("is_active", True),
            "phone": student.get("phone"),
            "created_at": student.get("created_at", "")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/students/{student_id}")
def get_student_detail(student_id: str, staff: dict = Depends(require_staff)):
    student = db_engine.get_by_id("users", student_id)
    if not student or student.get("role") != "student":
        raise HTTPException(status_code=404, detail="الطالب غير موجود")

    # Real academic data
    progress, _ = db_engine.query("lesson_progress", filters={"student_id": student_id})
    attempts, _ = db_engine.query("exam_attempts", filters={"student_id": student_id}, order_by="started_at", descending=True)
    submissions, _ = db_engine.query("assignment_submissions", filters={"student_id": student_id}, order_by="submitted_at", descending=True)
    activities, _ = db_engine.query("activities", filters={"user_id": student_id}, order_by="created_at", descending=True, limit=20)

    # Attach exam details to attempts
    for att in attempts:
        ex = db_engine.get_by_id("exams", att["exam_id"])
        att["exam_title"] = ex["title"] if ex else "امتحان"

    # Attach assignment details to submissions
    for sub in submissions:
        assign = db_engine.get_by_id("assignments", sub["assignment_id"])
        sub["assignment_title"] = assign["title"] if assign else "واجب"

    return {
        "student": {
            "id": student["id"],
            "username": student["username"],
            "email": student["email"],
            "full_name": student["full_name"],
            "phone": student.get("phone"),
            "is_active": student.get("is_active", True),
            "created_at": student.get("created_at", "")
        },
        "academic_summary": {
            "completed_lessons": sum(1 for p in progress if p.get("is_completed")),
            "exams_taken": len(attempts),
            "assignments_submitted": len(submissions)
        },
        "progress": progress,
        "attempts": attempts,
        "submissions": submissions,
        "activities": activities
    }

@router.put("/students/{student_id}")
def update_student(student_id: str, req: UserUpdateRequest, admin: dict = Depends(require_admin)):
    student = db_engine.get_by_id("users", student_id)
    if not student:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    
    updates = req.dict(exclude_unset=True)
    if "password" in updates and updates["password"]:
        from app.core.security import get_password_hash
        updates["hashed_password"] = get_password_hash(updates.pop("password"))
    else:
        updates.pop("password", None)

    updated = db_engine.update("users", student_id, updates)
    ActivityService.log(admin["id"], "student_updated", {"student_id": student_id, "updated_fields": list(updates.keys())})
    return updated

@router.delete("/students/{student_id}")
def delete_student(student_id: str, admin: dict = Depends(require_admin)):
    student = db_engine.get_by_id("users", student_id)
    if not student:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    db_engine.delete("users", student_id)
    ActivityService.log(admin["id"], "student_deleted", {"student_id": student_id, "username": student["username"]})
    return {"success": True, "message": "تم حذف الطالب وجميع سجلاته بنجاح"}
