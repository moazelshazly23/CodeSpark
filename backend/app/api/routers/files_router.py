import json
"""
Code Spark - Educational Files & Materials Router (الملفات والمذكرات الدراسية)
Comprehensive API for Direct File Uploads, Google Drive Integration, and Role-Based Access Control.
"""
import os
import re
import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.api.deps import get_current_user, get_optional_user, require_role
from app.db.engine import db_engine, now_iso
from app.services.core_services import AccessControlService
from app.core.config import settings

router = APIRouter(tags=["Educational Files (الملفات الدراسية)"])

# Storage directory configuration
STORAGE_DIR = os.path.abspath(getattr(settings, "STORAGE_DIR", "/tmp/codespark_storage"))
STUDY_FILES_DIR = os.path.join(STORAGE_DIR, "study_files")
try:
    os.makedirs(STUDY_FILES_DIR, exist_ok=True)
except Exception:
    STORAGE_DIR = "/tmp/codespark_storage"
    STUDY_FILES_DIR = os.path.join(STORAGE_DIR, "study_files")
    os.makedirs(STUDY_FILES_DIR, exist_ok=True)

# Security Constants for Direct File Uploads
ALLOWED_EXTENSIONS = {
    "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx",
    "zip", "png", "jpg", "jpeg", "webp", "txt", "py"
}

FORBIDDEN_EXTENSIONS = {
    "exe", "sh", "bat", "cmd", "msi", "scr", "com", "pif",
    "php", "js", "vbs", "jar", "bin", "elf", "app", "dll", "so"
}

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


def sanitize_filename(filename: str) -> str:
    """Strip path traversal characters and unsafe symbols from filename."""
    base = os.path.basename(filename)
    cleaned = re.sub(r"[\x00/\\?%*:|\"<>]", "_", base).strip()
    return cleaned or "document"


def normalize_drive_url(url: str) -> str:
    """Validate and normalize Google Drive links to ensure clean viewing."""
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=400,
            detail="رابط غير صالح. يجب أن يبدأ الرابط بـ http:// أو https://"
        )

    match = re.search(r"drive\.google\.com/file/d/([a-zA-Z0-9_-]+)", url)
    if match:
        file_id = match.group(1)
        return f"https://drive.google.com/file/d/{file_id}/view"

    return url


class StudyFileLinkCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    external_url: str
    course_id: Optional[str] = None
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    visibility: str = "PUBLIC"


class StudyFileUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    course_id: Optional[str] = None
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    visibility: Optional[str] = None
    status: Optional[str] = None
    is_published: Optional[bool] = None


@router.get("")
@router.get("/")
def list_study_files(
    course_id: Optional[str] = None,
    unit_id: Optional[str] = None,
    lesson_id: Optional[str] = None,
    search: Optional[str] = None,
    visibility: Optional[str] = None,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """
    List educational files tailored to the caller's role.
    Students see active files with subscriber-locked files redacted if unsubscribed.
    Admins and Assistants see all files with full administrative properties.
    """
    is_staff = bool(user and user.get("role") in ("admin", "assistant"))

    query = (
        "SELECT sf.*, c.title as course_title, u.title as unit_title, l.title as lesson_title "
        "FROM study_files sf "
        "LEFT JOIN courses c ON sf.course_id = c.id "
        "LEFT JOIN units u ON sf.unit_id = u.id "
        "LEFT JOIN lessons l ON sf.lesson_id = l.id WHERE 1=1 "
    )
    params = []

    if not is_staff:
        query += "AND sf.is_published = 1 AND sf.status = 'active' "

    if course_id:
        query += "AND sf.course_id = ? "
        params.append(course_id)
    if unit_id:
        query += "AND sf.unit_id = ? "
        params.append(unit_id)
    if lesson_id:
        query += "AND sf.lesson_id = ? "
        params.append(lesson_id)
    if visibility:
        query += "AND sf.visibility = ? "
        params.append(visibility)
    if search:
        query += "AND (sf.title LIKE ? OR sf.description LIKE ? OR sf.file_name LIKE ?) "
        term = f"%{search.strip()}%"
        params.extend([term, term, term])

    query += "ORDER BY sf.created_at DESC"
    files = db_engine.fetch_all(query, tuple(params))

    # Evaluate access permission for each file
    for f in files:
        has_acc, reason = AccessControlService.has_access(user, f.get("visibility", "PUBLIC"))
        f["is_unlocked"] = has_acc
        f["access_reason"] = reason

        # Redact private URLs if unauthorized student attempts to read listing
        if not has_acc:
            f["download_url"] = None
            if f.get("source_type") == "google_drive":
                f["external_url"] = None
        else:
            if f.get("source_type") == "upload":
                f["download_url"] = f"/api/study-files/download/{f['id']}"
            else:
                f["download_url"] = f.get("external_url")

    return {"files": files, "count": len(files)}


@router.get("/detail/{file_id}")
@router.get("/{file_id}")
def get_study_file(file_id: str, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """Fetch details of a single educational file."""
    f = db_engine.fetch_one(
        "SELECT sf.*, c.title as course_title, u.title as unit_title, l.title as lesson_title FROM study_files sf "
        "LEFT JOIN courses c ON sf.course_id = c.id "
        "LEFT JOIN units u ON sf.unit_id = u.id "
        "LEFT JOIN lessons l ON sf.lesson_id = l.id WHERE sf.id = ?",
        (file_id,)
    )
    if not f:
        raise HTTPException(status_code=404, detail="الملف الدراسي غير موجود")

    has_acc, reason = AccessControlService.has_access(user, f.get("visibility", "PUBLIC"))
    f["is_unlocked"] = has_acc
    f["access_reason"] = reason

    if not has_acc:
        f["download_url"] = None
        if f.get("source_type") == "google_drive":
            f["external_url"] = None
    else:
        if f.get("source_type") == "upload":
            f["download_url"] = f"/api/study-files/download/{f['id']}"
        else:
            f["download_url"] = f.get("external_url")

    return f


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_study_file(
    title: str = Form(...),
    description: Optional[str] = Form(""),
    course_id: Optional[str] = Form(None),
    unit_id: Optional[str] = Form(None),
    lesson_id: Optional[str] = Form(None),
    visibility: str = Form("PUBLIC"),
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(require_role("admin", "assistant"))
):
    """
    Direct file upload for educational documents (PDF, Word, PPT, Excel, ZIP, etc.).
    Enforces extension validation, size limits, and path traversal defenses.
    """
    orig_name = file.filename or "file"
    safe_name = sanitize_filename(orig_name)
    ext = safe_name.split(".")[-1].lower() if "." in safe_name else ""

    if ext in FORBIDDEN_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"نوع الملف (. {ext}) غير مسموح به لأسباب أمنية."
        )

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"نوع الملف (. {ext}) غير مدعوم. الصيغ المدعومة تشمل: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP, والصور."
        )

    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"حجم الملف يتجاوز الحد الأقصى المسموح به (50 ميجابايت). الحجم الحالي: {round(file_size / (1024*1024), 2)} ميجابايت"
        )

    unique_name = f"study_{uuid.uuid4().hex[:12]}_{safe_name}"
    target_path = os.path.join(STUDY_FILES_DIR, unique_name)

    try:
        with open(target_path, "wb") as f_out:
            f_out.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل حفظ الملف على القرص: {str(e)}")

    clean_vis = "SUBSCRIBERS_ONLY" if visibility == "SUBSCRIBERS_ONLY" else "PUBLIC"
    file_id = uuid.uuid4().hex
    now = now_iso()

    record = {
        "id": file_id,
        "title": title.strip(),
        "description": description.strip() if description else "",
        "source_type": "upload",
        "file_path": target_path,
        "external_url": f"/api/study-files/download/{file_id}",
        "file_name": safe_name,
        "mime_type": file.content_type or f"application/{ext}",
        "file_size": file_size,
        "course_id": course_id.strip() if course_id else None,
        "unit_id": unit_id.strip() if unit_id else None,
        "lesson_id": lesson_id.strip() if lesson_id else None,
        "visibility": clean_vis,
        "status": "active",
        "is_published": 1,
        "uploaded_by": user["id"],
        "created_at": now,
        "updated_at": now
    }

    saved = db_engine.insert("study_files", record)
    try:
        db_engine.insert("activity_logs", {
            "id": uuid.uuid4().hex,
            "user_id": user["id"],
            "action": "study_file_upload",
            "entity_type": "study_file",
            "entity_id": file_id,
            "details_json": json.dumps({"title": title, "size": file_size}),
            "created_at": now
        })
    except Exception:
        pass
    return saved


@router.post("/link", status_code=status.HTTP_201_CREATED)
def add_google_drive_link(
    req: StudyFileLinkCreate,
    user: Dict[str, Any] = Depends(require_role("admin", "assistant"))
):
    """
    Attach an educational file via Google Drive link.
    Validates, normalizes, and stores the Drive URL.
    """
    norm_url = normalize_drive_url(req.external_url)
    clean_vis = "SUBSCRIBERS_ONLY" if req.visibility == "SUBSCRIBERS_ONLY" else "PUBLIC"
    file_id = uuid.uuid4().hex
    now = now_iso()

    record = {
        "id": file_id,
        "title": req.title.strip(),
        "description": req.description.strip() if req.description else "",
        "source_type": "google_drive",
        "file_path": None,
        "external_url": norm_url,
        "file_name": "Google Drive Document",
        "mime_type": "application/vnd.google-apps.drive",
        "file_size": 0,
        "course_id": req.course_id.strip() if req.course_id else None,
        "unit_id": req.unit_id.strip() if req.unit_id else None,
        "lesson_id": req.lesson_id.strip() if req.lesson_id else None,
        "visibility": clean_vis,
        "status": "active",
        "is_published": 1,
        "uploaded_by": user["id"],
        "created_at": now,
        "updated_at": now
    }

    saved = db_engine.insert("study_files", record)
    try:
        db_engine.insert("activity_logs", {
            "id": uuid.uuid4().hex,
            "user_id": user["id"],
            "action": "study_file_drive_link",
            "entity_type": "study_file",
            "entity_id": file_id,
            "details_json": json.dumps({"title": req.title, "url": norm_url}),
            "created_at": now
        })
    except Exception:
        pass
    return saved


@router.get("/download/{file_id}")
def download_study_file(file_id: str, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """
    Secure direct file download endpoint.
    Strictly verifies user authorization and subscription status before streaming file bytes.
    """
    file_rec = db_engine.fetch_one("SELECT * FROM study_files WHERE id = ?", (file_id,))
    if not file_rec:
        raise HTTPException(status_code=404, detail="الملف الدراسي غير موجود")

    has_acc, reason = AccessControlService.has_access(user, file_rec.get("visibility", "PUBLIC"))
    if not has_acc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="عذراً، هذا الملف مخصص للمشتركين فقط. يرجى تفعيل اشتراكك لتتمكن من التحميل."
        )

    if file_rec.get("source_type") != "upload":
        if file_rec.get("external_url"):
            return {"download_url": file_rec["external_url"]}
        raise HTTPException(status_code=400, detail="هذا الملف مرتبط برابط خارجي")

    file_path = file_rec.get("file_path")
    if not file_path or not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="الملف الفعلي غير متوفر على الخادم")

    real_path = os.path.realpath(file_path)
    if not real_path.startswith(os.path.realpath(STORAGE_DIR)):
        raise HTTPException(status_code=403, detail="مسار غير مصرح به")

    return FileResponse(
        real_path,
        filename=file_rec.get("file_name", "study_file"),
        media_type=file_rec.get("mime_type", "application/octet-stream")
    )


@router.put("/{file_id}")
def update_study_file(
    file_id: str,
    req: StudyFileUpdate,
    user: Dict[str, Any] = Depends(require_role("admin", "assistant"))
):
    """Update metadata of an educational file."""
    file_rec = db_engine.fetch_one("SELECT * FROM study_files WHERE id = ?", (file_id,))
    if not file_rec:
        raise HTTPException(status_code=404, detail="الملف غير موجود")

    updates = {}
    if req.title is not None:
        updates["title"] = req.title.strip()
    if req.description is not None:
        updates["description"] = req.description.strip()
    if req.course_id is not None:
        updates["course_id"] = req.course_id.strip() if req.course_id else None
    if req.unit_id is not None:
        updates["unit_id"] = req.unit_id.strip() if req.unit_id else None
    if req.lesson_id is not None:
        updates["lesson_id"] = req.lesson_id.strip() if req.lesson_id else None
    if req.visibility is not None:
        updates["visibility"] = "SUBSCRIBERS_ONLY" if req.visibility == "SUBSCRIBERS_ONLY" else "PUBLIC"
    if req.status is not None:
        updates["status"] = req.status
    if req.is_published is not None:
        updates["is_published"] = 1 if req.is_published else 0

    updates["updated_at"] = now_iso()
    updated = db_engine.update("study_files", file_id, updates)
    try:
        db_engine.insert("activity_logs", {
            "id": uuid.uuid4().hex,
            "user_id": user["id"],
            "action": "study_file_update",
            "entity_type": "study_file",
            "entity_id": file_id,
            "created_at": now_iso()
        })
    except Exception:
        pass
    return updated


@router.delete("/{file_id}")
def delete_study_file(
    file_id: str,
    user: Dict[str, Any] = Depends(require_role("admin", "assistant"))
):
    """Delete an educational file and remove physical file from disk."""
    file_rec = db_engine.fetch_one("SELECT * FROM study_files WHERE id = ?", (file_id,))
    if not file_rec:
        raise HTTPException(status_code=404, detail="الملف غير موجود")

    f_path = file_rec.get("file_path")
    if f_path and os.path.isfile(f_path):
        try:
            os.remove(f_path)
        except Exception:
            pass

    db_engine.delete("study_files", file_id)
    try:
        db_engine.insert("activity_logs", {
            "id": uuid.uuid4().hex,
            "user_id": user["id"],
            "action": "study_file_delete",
            "entity_type": "study_file",
            "entity_id": file_id,
            "created_at": now_iso()
        })
    except Exception:
        pass
    return {"success": True, "message": "تم حذف الملف بنجاح"}
