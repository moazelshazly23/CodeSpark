from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
import uuid
from app.schemas.all_schemas import LessonCreateRequest, LessonProgressRequest
from app.services.core_services import CurriculumService, AccessControlService
from app.repositories.all_repositories import CurriculumRepository
from app.api.deps import get_optional_user, get_current_user, require_role
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/lessons", tags=["Lessons"])

@router.get("")
def list_lessons(unit_id: Optional[str] = None, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    lessons, total = CurriculumRepository.list_lessons(unit_id=unit_id, is_admin=is_admin)
    # Check access for each lesson
    for l in lessons:
        has_acc, _ = AccessControlService.has_access(user, l["access_type"])
        l["is_unlocked"] = has_acc
    return lessons

@router.get("/{lesson_id}")
def get_lesson(lesson_id: str, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    lesson = CurriculumService.get_lesson_view(lesson_id, user=user)
    if not lesson:
        raise HTTPException(status_code=404, detail="الدرس غير موجود")
    return lesson

@router.post("", dependencies=[Depends(require_role("admin", "assistant"))])
def create_lesson(req: LessonCreateRequest):
    rec = {
        "id": uuid.uuid4().hex,
        "unit_id": req.unit_id,
        "title": req.title,
        "slug": req.slug,
        "description": req.description,
        "content_markdown": req.content_markdown,
        "video_type": req.video_type,
        "video_url": req.video_url,
        "video_id": req.video_id,
        "duration_seconds": req.duration_seconds,
        "order_index": req.order_index,
        "is_published": 1 if req.is_published else 0,
        "access_type": req.access_type,
        "created_at": now_iso(),
        "updated_at": now_iso()
    }
    return db_engine.insert("lessons", rec)

@router.put("/{lesson_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_lesson(lesson_id: str, req: LessonCreateRequest):
    up = {
        "unit_id": req.unit_id,
        "title": req.title,
        "slug": req.slug,
        "description": req.description,
        "content_markdown": req.content_markdown,
        "video_type": req.video_type,
        "video_url": req.video_url,
        "video_id": req.video_id,
        "duration_seconds": req.duration_seconds,
        "order_index": req.order_index,
        "is_published": 1 if req.is_published else 0,
        "access_type": req.access_type,
        "updated_at": now_iso()
    }
    res = db_engine.update("lessons", lesson_id, up)
    if not res:
        raise HTTPException(status_code=404, detail="الدرس غير موجود")
    return res

@router.delete("/{lesson_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def delete_lesson(lesson_id: str):
    res = db_engine.delete("lessons", lesson_id)
    if not res:
        raise HTTPException(status_code=404, detail="الدرس غير موجود")
    return {"success": True, "message": "تم حذف الدرس"}

@router.put("/{lesson_id}/progress")
def update_progress(lesson_id: str, req: LessonProgressRequest, user: Dict[str, Any] = Depends(get_current_user)):
    res = CurriculumRepository.save_lesson_progress(
        user_id=user["id"],
        lesson_id=lesson_id,
        pos_sec=req.last_video_position_seconds,
        watch_pct=req.watch_percentage,
        is_completed=req.is_completed
    )
    if req.is_completed:
        # Award completion XP if first time
        db_engine.execute("UPDATE student_stats SET xp = xp + 20 WHERE user_id = ?", (user["id"],))
    return res
