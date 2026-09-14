from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
import uuid
from app.schemas.all_schemas import CourseCreateRequest
from app.services.core_services import CurriculumService
from app.repositories.all_repositories import CurriculumRepository
from app.api.deps import get_optional_user, get_current_user, require_role
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/courses", tags=["Courses"])

@router.get("")
def list_courses(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    courses, total = CurriculumRepository.list_courses(is_admin=is_admin)
    return {"courses": courses, "total": total}

@router.get("/{course_id}")
def get_course(course_id: str, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    course = CurriculumService.get_course_details(course_id, user=user)
    if not course:
        raise HTTPException(status_code=404, detail="الكورس غير موجود")
    return course

@router.post("", dependencies=[Depends(require_role("admin", "assistant"))])
def create_course(req: CourseCreateRequest):
    rec = {
        "id": uuid.uuid4().hex,
        "title": req.title,
        "slug": req.slug,
        "description": req.description,
        "thumbnail_url": req.thumbnail_url,
        "order_index": req.order_index,
        "is_published": 1 if req.is_published else 0,
        "access_type": req.access_type,
        "created_at": now_iso(),
        "updated_at": now_iso()
    }
    return db_engine.insert("courses", rec)

@router.put("/{course_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_course(course_id: str, req: CourseCreateRequest):
    up = {
        "title": req.title,
        "slug": req.slug,
        "description": req.description,
        "thumbnail_url": req.thumbnail_url,
        "order_index": req.order_index,
        "is_published": 1 if req.is_published else 0,
        "access_type": req.access_type,
        "updated_at": now_iso()
    }
    res = db_engine.update("courses", course_id, up)
    if not res:
        raise HTTPException(status_code=404, detail="الكورس غير موجود")
    return res

@router.delete("/{course_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def delete_course(course_id: str):
    res = db_engine.delete("courses", course_id)
    if not res:
        raise HTTPException(status_code=404, detail="الكورس غير موجود")
    return {"success": True, "message": "تم حذف الكورس"}
