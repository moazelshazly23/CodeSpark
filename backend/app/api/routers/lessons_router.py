"""
Code Spark - Lessons Router
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from app.api.deps import require_role, get_optional_user, get_current_user
from app.repositories.all_repositories import CurriculumRepository, SubscriptionRepository
from app.schemas.all_schemas import LessonCreate, LessonUpdate, LessonProgressUpdate

router = APIRouter(prefix="/lessons", tags=["Lessons"])

@router.get("")
def list_lessons(unit_id: Optional[str] = None, course_id: Optional[str] = None, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    lessons, total = CurriculumRepository.list_lessons(unit_id=unit_id, course_id=course_id, is_admin=is_admin)
    return {"lessons": lessons, "total": total}

@router.get("/{lesson_id}")
def get_lesson(lesson_id: str, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    les = CurriculumRepository.get_lesson(lesson_id)
    if not les:
        raise HTTPException(status_code=404, detail="الدرس غير موجود")
    
    # Check access permission
    is_free = bool(les.get("is_free", 0))
    if not is_free:
        if not user:
            raise HTTPException(status_code=403, detail="هذا الدرس متاح للمشتركين فقط. يرجى تسجيل الدخول أو الاشتراك للمتابعة.")
        if user.get("role") not in ("admin", "assistant"):
            sub = SubscriptionRepository.get_active_subscription(user["id"])
            if not sub:
                raise HTTPException(status_code=403, detail="هذا الدرس مخصص للمشتركين فقط. يرجى تفعيل كود الاشتراك.")
    
    # Progress
    progress = None
    if user:
        progress = CurriculumRepository.get_lesson_progress(user["id"], lesson_id)
    return {"lesson": les, "progress": progress}

@router.post("", dependencies=[Depends(require_role("admin", "assistant"))])
def create_lesson(req: LessonCreate):
    data = req.dict()
    data["is_free"] = 1 if req.is_free else 0
    data["is_published"] = 1 if req.is_published else 0
    rec = CurriculumRepository.create_lesson(data)
    return {"success": True, "lesson": rec}

@router.put("/{lesson_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_lesson(lesson_id: str, req: LessonUpdate):
    updates = {}
    for k, v in req.dict().items():
        if v is not None:
            if k in ("is_free", "is_published"):
                updates[k] = 1 if v else 0
            else:
                updates[k] = v
    les = CurriculumRepository.update_lesson(lesson_id, updates)
    if not les:
        raise HTTPException(status_code=404, detail="الدرس غير موجود")
    return {"success": True, "lesson": les}

@router.delete("/{lesson_id}", dependencies=[Depends(require_role("admin"))])
def delete_lesson(lesson_id: str):
    CurriculumRepository.delete_lesson(lesson_id)
    return {"success": True, "message": "تم حذف الدرس بنجاح"}

@router.post("/{lesson_id}/progress")
def save_progress(lesson_id: str, req: LessonProgressUpdate, user: Dict[str, Any] = Depends(get_current_user)):
    res = CurriculumRepository.save_lesson_progress(
        user_id=user["id"],
        lesson_id=lesson_id,
        watch_time_seconds=req.watch_time_seconds,
        is_completed=req.is_completed
    )
    return {"success": True, "progress": res}
