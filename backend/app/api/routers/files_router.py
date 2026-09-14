import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional, List
from app.api.deps import require_teacher_or_admin, get_current_user
from app.db.engine import db_engine
from app.services.storage_service import StorageService
from app.services.core_services import ActivityService
from app.schemas.files import StudyFileCreate

router = APIRouter(prefix="/files", tags=["Files & Videos"])

@router.get("")
def list_study_files(lesson_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    filters = {}
    if lesson_id:
        filters["lesson_id"] = lesson_id
    files, _ = db_engine.query("study_files", filters=filters, order_by="created_at", descending=True)
    return files

@router.post("/upload")
async def upload_study_file(
    lesson_id: str = Form(...),
    name: str = Form(...),
    description: Optional[str] = Form(""),
    file: UploadFile = File(...),
    user: dict = Depends(require_teacher_or_admin)
):
    lesson = db_engine.get_by_id("lessons", lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="الدرس المحدد غير موجود")
    
    content = await file.read()
    try:
        unique_name, target_path, file_size, mime = StorageService.save_upload(
            original_filename=file.filename,
            file_bytes=content,
            subfolder="study_files"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    ext = file.filename.split(".")[-1].upper() if "." in file.filename else "FILE"
    file_record = {
        "lesson_id": lesson_id,
        "name": name or file.filename,
        "description": description or "",
        "file_type": ext,
        "file_source": "upload",
        "file_path": target_path,
        "external_url": f"/api/files/download/{unique_name}",
        "file_size_bytes": file_size,
        "is_public": True
    }
    saved = db_engine.insert("study_files", file_record)
    ActivityService.log(user["id"], "file_upload", {"file_id": saved["id"], "name": saved["name"]})
    return saved

@router.post("/link")
def add_external_file_link(req: StudyFileCreate, user: dict = Depends(require_teacher_or_admin)):
    lesson = db_engine.get_by_id("lessons", req.lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="الدرس المحدد غير موجود")
    data = req.dict()
    data["file_source"] = "google_drive"
    saved = db_engine.insert("study_files", data)
    ActivityService.log(user["id"], "file_link_add", {"file_id": saved["id"], "name": saved["name"]})
    return saved

@router.get("/download/{file_identifier}")
def download_file(file_identifier: str, user: dict = Depends(get_current_user)):
    # Look for file in study_files
    files, _ = db_engine.query("study_files")
    target = None
    for f in files:
        if file_identifier in f.get("file_path", "") or file_identifier in f.get("external_url", ""):
            target = f
            break
    
    if not target or not target.get("file_path") or not os.path.exists(target["file_path"]):
        raise HTTPException(status_code=404, detail="الملف غير موجود أو تم حذفه")

    return FileResponse(
        target["file_path"],
        filename=target.get("name", "download"),
        media_type="application/octet-stream"
    )

@router.delete("/{file_id}")
def delete_study_file(file_id: str, user: dict = Depends(require_teacher_or_admin)):
    file_rec = db_engine.get_by_id("study_files", file_id)
    if not file_rec:
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    
    # Remove from disk if uploaded
    if file_rec.get("file_path") and os.path.exists(file_rec["file_path"]):
        try:
            os.remove(file_rec["file_path"])
        except Exception:
            pass

    db_engine.delete("study_files", file_id)
    ActivityService.log(user["id"], "file_delete", {"file_id": file_id})
    return {"success": True, "message": "تم حذف الملف بنجاح"}

@router.post("/videos/upload")
async def upload_lesson_video(
    lesson_id: str = Form(...),
    title: str = Form(...),
    video: UploadFile = File(...),
    user: dict = Depends(require_teacher_or_admin)
):
    lesson = db_engine.get_by_id("lessons", lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="الدرس غير موجود")
    
    content = await video.read()
    try:
        unique_name, target_path, file_size, mime = StorageService.save_upload(
            original_filename=video.filename,
            file_bytes=content,
            subfolder="videos"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Check if video already exists for lesson, replace if so
    vids, _ = db_engine.query("videos", filters={"lesson_id": lesson_id})
    if vids:
        vid_id = vids[0]["id"]
        updated = db_engine.update("videos", vid_id, {
            "title": title,
            "video_type": "upload",
            "url": f"/api/files/download/{unique_name}",
            "storage_path": target_path,
            "file_size_bytes": file_size
        })
        return updated
    else:
        new_vid = {
            "lesson_id": lesson_id,
            "title": title,
            "video_type": "upload",
            "url": f"/api/files/download/{unique_name}",
            "storage_path": target_path,
            "file_size_bytes": file_size,
            "duration_seconds": 0
        }
        return db_engine.insert("videos", new_vid)

@router.post("/videos/youtube")
def set_youtube_video(
    lesson_id: str = Form(...),
    title: str = Form(...),
    youtube_url: str = Form(...),
    user: dict = Depends(require_teacher_or_admin)
):
    lesson = db_engine.get_by_id("lessons", lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="الدرس غير موجود")
    
    vids, _ = db_engine.query("videos", filters={"lesson_id": lesson_id})
    if vids:
        return db_engine.update("videos", vids[0]["id"], {
            "title": title,
            "video_type": "youtube",
            "url": youtube_url
        })
    else:
        return db_engine.insert("videos", {
            "lesson_id": lesson_id,
            "title": title,
            "video_type": "youtube",
            "url": youtube_url,
            "duration_seconds": 0
        })
