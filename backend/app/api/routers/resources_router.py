from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Dict, Any, Optional
import os, uuid, shutil
from app.schemas.all_schemas import ResourceCreateRequest
from app.repositories.all_repositories import CurriculumRepository
from app.api.deps import get_optional_user, get_current_user, require_role, require_permission
from app.core.config import settings
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/resources", tags=["Resources"])

@router.get("")
def list_resources(lesson_id: Optional[str] = None, unit_id: Optional[str] = None, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    resources, total = CurriculumRepository.list_resources(lesson_id=lesson_id, unit_id=unit_id, is_admin=is_admin)
    return resources

@router.post("")
def create_resource(req: ResourceCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "resources.manage" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية إدارة المذكرات والملفات")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")

    rec = {
        "id": uuid.uuid4().hex,
        "unit_id": req.unit_id,
        "lesson_id": req.lesson_id,
        "title": req.title,
        "description": req.description,
        "resource_type": req.resource_type,
        "file_url": req.file_url,
        "file_size_bytes": req.file_size_bytes or 0,
        "file_format": req.file_format or "pdf",
        "access_type": req.access_type,
        "is_published": 1 if req.is_published else 0,
        "created_by": user["id"],
        "created_at": now_iso()
    }
    return db_engine.insert("educational_resources", rec)

@router.delete("/{res_id}")
def delete_resource(res_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "resources.manage" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية إدارة المذكرات والملفات")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")

    res = db_engine.delete("educational_resources", res_id)
    if not res:
        raise HTTPException(status_code=404, detail="الملف التعليمي غير موجود")
    return {"success": True, "message": "تم حذف الملف التعليمي"}

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: Dict[str, Any] = Depends(get_current_user)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"نوع الملف غير مسموح به ({ext})")

    safe_name = f"{uuid.uuid4().hex[:12]}_{os.path.basename(file.filename)}"
    target_path = os.path.join(settings.STORAGE_DIR, "files", safe_name)
    
    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(target_path)
    file_url = f"/storage/files/{safe_name}"
    return {"success": True, "file_url": file_url, "file_size_bytes": file_size, "file_format": ext}
