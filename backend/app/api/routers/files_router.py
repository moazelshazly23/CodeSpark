"""
Code Spark - Study Files (الملفات الدراسية) Router
Supports direct uploads and Google Drive attachments
"""
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional, Dict, Any
from app.api.deps import require_role, get_optional_user, get_current_user
from app.repositories.all_repositories import StudyFilesRepository, SubscriptionRepository
from app.services.storage_service import StorageService
from app.schemas.all_schemas import StudyFileCreate, StudyFileUpdate

router = APIRouter(prefix="/files", tags=["Study Files"])

@router.get("")
def list_study_files(
    course_id: Optional[str] = None,
    unit_id: Optional[str] = None,
    lesson_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    files, count = StudyFilesRepository.list_files(course_id=course_id, unit_id=unit_id, lesson_id=lesson_id, is_admin=is_admin)
    return {"files": files, "total": count}

@router.get("/{file_id}")
def get_study_file(file_id: str, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    rec = StudyFilesRepository.get_file(file_id)
    if not rec:
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    if rec.get("visibility") == "SUBSCRIBERS_ONLY":
        if not user:
            raise HTTPException(status_code=403, detail="هذا الملف مخصص للمشتركين فقط")
        if user.get("role") not in ("admin", "assistant"):
            sub = SubscriptionRepository.get_active_subscription(user["id"])
            if not sub:
                raise HTTPException(status_code=403, detail="هذا الملف مخصص للمشتركين فقط. يرجى تفعيل الاشتراك.")
    return rec

@router.post("", dependencies=[Depends(require_role("admin", "assistant"))])
def create_study_file_link(req: StudyFileCreate, user: Dict[str, Any] = Depends(get_current_user)):
    data = req.dict()
    data["is_published"] = 1 if req.is_published else 0
    data["uploaded_by"] = user["id"]
    rec = StudyFilesRepository.create_file(data)
    return {"success": True, "file": rec}

@router.post("/upload", dependencies=[Depends(require_role("admin", "assistant"))])
async def upload_study_file(
    title: str = Form(...),
    description: Optional[str] = Form(""),
    course_id: Optional[str] = Form(None),
    unit_id: Optional[str] = Form(None),
    lesson_id: Optional[str] = Form(None),
    visibility: Optional[str] = Form("PUBLIC"),
    is_published: Optional[bool] = Form(True),
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        content = await file.read()
        rel_path, abs_path, size, mime = StorageService.save_upload(file.filename, content, "files")
        data = {
            "title": title,
            "description": description,
            "source_type": "upload",
            "file_path": rel_path,
            "file_name": file.filename,
            "mime_type": mime,
            "file_size": size,
            "course_id": course_id or None,
            "unit_id": unit_id or None,
            "lesson_id": lesson_id or None,
            "visibility": visibility or "PUBLIC",
            "status": "active",
            "is_published": 1 if is_published else 0,
            "uploaded_by": user["id"]
        }
        rec = StudyFilesRepository.create_file(data)
        return {"success": True, "file": rec}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{file_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_study_file(file_id: str, req: StudyFileUpdate):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    if "is_published" in updates:
        updates["is_published"] = 1 if updates["is_published"] else 0
    f = StudyFilesRepository.update_file(file_id, updates)
    if not f:
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    return {"success": True, "file": f}

@router.delete("/{file_id}", dependencies=[Depends(require_role("admin"))])
def delete_study_file(file_id: str):
    f = StudyFilesRepository.get_file(file_id)
    if not f:
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    StudyFilesRepository.delete_file(file_id)
    return {"success": True, "message": "تم حذف الملف بنجاح"}
