"""
CodeSpark - Study Files & Google Drive Resources Router ("الملفات الدراسية")
Handles educational PDF/file uploads, Google Drive resource links, and access rules.
"""
import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Dict, Any, Optional, List
from app.api.deps import get_optional_user, require_role, require_permission
from app.repositories.repositories import StudyFileRepository, SubscriptionRepository
from app.schemas.all_schemas import StudyFileCreate, StudyFileUpdate
from app.core.config import settings

router = APIRouter(prefix="/study-files", tags=["Study Files"])

@router.get("")
def list_study_files(
    course_id: Optional[str] = None,
    unit_id: Optional[str] = None,
    lesson_id: Optional[str] = None,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    is_staff = bool(user and user.get("role") in ("admin", "assistant"))
    files = StudyFileRepository.list_files(
        course_id=course_id,
        unit_id=unit_id,
        lesson_id=lesson_id,
        only_published=not is_staff
    )

    is_subscribed = False
    if user and user.get("id"):
        sub = SubscriptionRepository.get_active_subscription(user["id"])
        is_subscribed = bool(sub)

    # Process files to add accessible flag and drive link notice
    result = []
    for f in files:
        item = dict(f)
        is_public = (item.get("visibility") == "PUBLIC")
        can_open = is_staff or is_public or is_subscribed
        item["can_open"] = can_open
        item["is_subscribed"] = is_subscribed
        
        # Check Google Drive link
        ext_url = item.get("external_url") or ""
        if "drive.google.com" in ext_url:
            item["is_drive"] = True
            item["drive_notice"] = "ملف مستضاف على Google Drive. إذا تطلب الملف إذناً، يرجى التأكد من تسجيل الدخول بحساب Google المصرح له."
        else:
            item["is_drive"] = False
            item["drive_notice"] = None

        if not can_open:
            # Mask URL if locked
            item["external_url"] = None
            item["file_url"] = None

        result.append(item)
    return {"files": result, "total": len(result)}

@router.get("/{file_id}")
def get_study_file(file_id: str, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    f = StudyFileRepository.get_by_id(file_id)
    if not f:
        raise HTTPException(status_code=404, detail="الملف الدراسي غير موجود")
    
    is_staff = bool(user and user.get("role") in ("admin", "assistant"))
    is_public = (f.get("visibility") == "PUBLIC")
    is_subscribed = False
    if user and user.get("id"):
        sub = SubscriptionRepository.get_active_subscription(user["id"])
        is_subscribed = bool(sub)

    can_open = is_staff or is_public or is_subscribed
    item = dict(f)
    item["can_open"] = can_open
    if not can_open:
        item["external_url"] = None
        item["file_url"] = None
    return item

@router.post("", dependencies=[Depends(require_role("admin", "assistant"))])
def create_study_file(req: StudyFileCreate, user: Dict[str, Any] = Depends(require_role("admin", "assistant"))):
    data = req.dict()
    data["is_published"] = 1 if req.is_published else 0
    data["uploaded_by"] = user["id"]
    
    # URL validation for Drive links
    if data.get("source_type") == "google_drive":
        url = data.get("external_url", "").strip()
        if not url or not (url.startswith("http://") or url.startswith("https://")):
            raise HTTPException(status_code=400, detail="يرجى إدخال رابط Google Drive صالح يبدأ بـ https://")
        data["external_url"] = url

    sf = StudyFileRepository.create(data)
    return {"success": True, "study_file": sf}

@router.post("/upload", dependencies=[Depends(require_role("admin", "assistant"))])
async def upload_study_file(
    title: str = Form(...),
    description: Optional[str] = Form(""),
    course_id: Optional[str] = Form(None),
    unit_id: Optional[str] = Form(None),
    lesson_id: Optional[str] = Form(None),
    visibility: Optional[str] = Form("PUBLIC"),
    uploaded_file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(require_role("admin", "assistant"))
):
    # Validate file size and type
    allowed_extensions = {".pdf", ".docx", ".doc", ".zip", ".png", ".jpg", ".jpeg", ".py", ".txt"}
    ext = os.path.splitext(uploaded_file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"نوع الملف غير مدعوم ({ext}). الأنواع المسموحة: PDF, Word, ZIP, الصور")

    file_id = uuid.uuid4().hex
    safe_filename = f"{file_id}_{uploaded_file.filename.replace(' ', '_')}"
    target_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(uploaded_file.file, buffer)

    file_size = os.path.getsize(target_path)
    file_url = f"/api/storage/uploads/{safe_filename}"

    data = {
        "id": file_id,
        "title": title.strip(),
        "description": description.strip() if description else "",
        "source_type": "upload",
        "external_url": None,
        "file_url": file_url,
        "file_name": uploaded_file.filename,
        "mime_type": uploaded_file.content_type or "application/octet-stream",
        "file_size": file_size,
        "course_id": course_id,
        "unit_id": unit_id,
        "lesson_id": lesson_id,
        "visibility": visibility or "PUBLIC",
        "is_published": 1,
        "uploaded_by": user["id"]
    }
    sf = StudyFileRepository.create(data)
    return {"success": True, "study_file": sf}

@router.put("/{file_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_study_file(file_id: str, req: StudyFileUpdate):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    if "is_published" in updates:
        updates["is_published"] = 1 if updates["is_published"] else 0
    sf = StudyFileRepository.update(file_id, updates)
    if not sf:
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    return {"success": True, "study_file": sf}

@router.delete("/{file_id}", dependencies=[Depends(require_role("admin"))])
def delete_study_file(file_id: str):
    success = StudyFileRepository.delete(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    return {"success": True, "message": "تم حذف الملف بنجاح"}
