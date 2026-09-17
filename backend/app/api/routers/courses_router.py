"""
CodeSpark - Courses & Curriculum Router
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional, List
from app.api.deps import get_optional_user, require_role
from app.repositories.repositories import CourseRepository, UnitRepository, LessonRepository
from app.schemas.all_schemas import CourseCreate, CourseUpdate

router = APIRouter(prefix="/courses", tags=["Courses & Curriculum"])

@router.get("")
def list_courses(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_staff = bool(user and user.get("role") in ("admin", "assistant"))
    courses = CourseRepository.list_courses(only_published=not is_staff)
    # Enrich courses with unit and lesson counts
    for c in courses:
        units = UnitRepository.list_by_course(c["id"], only_published=not is_staff)
        c["units_count"] = len(units)
        total_lessons = 0
        for u in units:
            lessons = LessonRepository.list_by_unit(u["id"], only_published=not is_staff)
            total_lessons += len(lessons)
        c["lessons_count"] = total_lessons
    return {"courses": courses}

@router.get("/{course_id}")
def get_course(course_id: str, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    course = CourseRepository.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="المنهج غير موجود")
    is_staff = bool(user and user.get("role") in ("admin", "assistant"))
    units = UnitRepository.list_by_course(course_id, only_published=not is_staff)
    for u in units:
        u["lessons"] = LessonRepository.list_by_unit(u["id"], only_published=not is_staff)
    course["units"] = units
    return course

@router.post("", dependencies=[Depends(require_role("admin"))])
def create_course(req: CourseCreate):
    data = req.dict()
    data["is_published"] = 1 if req.is_published else 0
    course = CourseRepository.create(data)
    return {"success": True, "course": course}

@router.put("/{course_id}", dependencies=[Depends(require_role("admin"))])
def update_course(course_id: str, req: CourseUpdate):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    if "is_published" in updates:
        updates["is_published"] = 1 if updates["is_published"] else 0
    course = CourseRepository.update(course_id, updates)
    if not course:
        raise HTTPException(status_code=404, detail="المنهج غير موجود")
    return {"success": True, "course": course}

@router.delete("/{course_id}", dependencies=[Depends(require_role("admin"))])
def delete_course(course_id: str):
    success = CourseRepository.delete(course_id)
    if not success:
        raise HTTPException(status_code=404, detail="المنهج غير موجود")
    return {"success": True, "message": "تم حذف المنهج بنجاح"}
