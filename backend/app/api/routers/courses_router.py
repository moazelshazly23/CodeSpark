"""
Code Spark - Courses & Curriculum Router
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from app.api.deps import require_role, get_optional_user
from app.repositories.all_repositories import CurriculumRepository
from app.schemas.all_schemas import CourseCreate, CourseUpdate

router = APIRouter(prefix="/courses", tags=["Courses"])

@router.get("")
def list_courses(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    courses, total = CurriculumRepository.list_courses(is_admin=is_admin)
    return {"courses": courses, "total": total}

@router.get("/{course_id}")
def get_course(course_id: str):
    c = CurriculumRepository.get_course(course_id)
    if not c:
        raise HTTPException(status_code=404, detail="الكورس غير موجود")
    return c

@router.post("", dependencies=[Depends(require_role("admin", "assistant"))])
def create_course(req: CourseCreate):
    rec = CurriculumRepository.create_course(req.dict())
    return {"success": True, "course": rec}

@router.put("/{course_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_course(course_id: str, req: CourseUpdate):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    c = CurriculumRepository.update_course(course_id, updates)
    if not c:
        raise HTTPException(status_code=404, detail="الكورس غير موجود")
    return {"success": True, "course": c}

@router.delete("/{course_id}", dependencies=[Depends(require_role("admin"))])
def delete_course(course_id: str):
    CurriculumRepository.delete_course(course_id)
    return {"success": True, "message": "تم حذف الكورس بنجاح"}
