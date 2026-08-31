import datetime
import json
import logging
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, Query, Request, Response
from typing import Optional, List, Dict, Any

from ..database import get_db, log_activity
from ..dependencies import get_current_user, get_current_admin, get_current_super_admin, get_current_staff, get_optional_user, check_student_subscription, get_active_student_or_admin, is_super_admin_user, is_assistant_user
from ..models import (
    UnitCreateRequest, UnitUpdateRequest,
    LessonCreateRequest, LessonUpdateRequest
)
from ..youtube_utils import extract_youtube_id, get_youtube_embed_url, get_youtube_thumbnail_url
from ..storage_service import storage_service, MAX_VIDEO_UPLOAD_SIZE_MB

logger = logging.getLogger("codespark.curriculum")
router = APIRouter(prefix="/api", tags=["Curriculum & Lessons"])

# ==============================================================================
# 1. CURRICULUM UNITS
# ==============================================================================

@router.get("/units")
def get_units(current_user: Optional[dict] = Depends(get_optional_user)):
    """Fetch units list with completion status and progress metrics."""
    user_id = current_user["id"] if current_user else None
    is_admin = current_user and current_user.get("role") == "admin"

    with get_db() as conn:
        cursor = conn.cursor()
        
        # Admin sees all units; students/guests see only published units
        if is_admin:
            cursor.execute("SELECT * FROM units ORDER BY order_index ASC, number ASC")
        else:
            cursor.execute("SELECT * FROM units WHERE is_published = 1 OR published = 1 ORDER BY order_index ASC, number ASC")
        
        units_rows = cursor.fetchall()
        result = []

        for idx, u in enumerate(units_rows):
            u_dict = dict(u)
            unit_id = u_dict["id"]
            
            # Count published lessons in this unit
            cursor.execute("SELECT COUNT(*) as cnt FROM lessons WHERE unit_id = ? AND (is_published = 1 OR published = 1 OR ? = 1)", (unit_id, 1 if is_admin else 0))
            total_lessons = cursor.fetchone()["cnt"]
            u_dict["totalLessons"] = total_lessons

            # Count exams in this unit
            cursor.execute("SELECT COUNT(*) as cnt FROM exams WHERE unit_id = ? AND (is_published = 1 OR published = 1 OR ? = 1)", (unit_id, 1 if is_admin else 0))
            total_exams = cursor.fetchone()["cnt"]
            u_dict["totalExams"] = total_exams

            # Student progress for this unit
            completed_count = 0
            if user_id:
                cursor.execute("""
                SELECT COUNT(*) as cnt
                FROM lesson_progress lp
                JOIN lessons l ON lp.lesson_id = l.id
                WHERE lp.student_id = ? AND l.unit_id = ? AND lp.completed = 1
                """, (user_id, unit_id))
                completed_count = cursor.fetchone()["cnt"]

            progress_pct = round((completed_count / total_lessons * 100)) if total_lessons > 0 else 0
            u_dict["completedLessonsCount"] = completed_count
            u_dict["progressPercentage"] = progress_pct

            # Determine visual status: completed, in-progress, locked, not-started
            if progress_pct == 100 and total_lessons > 0:
                u_dict["status"] = "completed"
            elif progress_pct > 0:
                u_dict["status"] = "in-progress"
            else:
                if idx == 0:
                    u_dict["status"] = "in-progress"
                else:
                    prev_unit = result[idx - 1] if idx > 0 else None
                    if prev_unit and prev_unit.get("status") == "completed":
                        u_dict["status"] = "not-started"
                    else:
                        u_dict["status"] = "locked"

            u_dict["isPublished"] = bool(u_dict.get("is_published", 1))
            result.append(u_dict)

        return {"success": True, "units": result}

@router.get("/units/{unit_id}")
def get_unit_detail(unit_id: str, current_user: Optional[dict] = Depends(get_optional_user)):
    """Fetch single unit details along with its child lessons and exams."""
    user_id = current_user["id"] if current_user else None
    is_admin = current_user and current_user.get("role") == "admin"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM units WHERE id = ?", (unit_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الوحدة غير موجودة")

        unit = dict(row)
        if not (unit.get("is_published") or unit.get("published")) and not is_admin:
            raise HTTPException(status_code=403, detail="هذه الوحدة غير منشورة حاليًا")

        # Fetch child lessons
        if is_admin:
            cursor.execute("SELECT * FROM lessons WHERE unit_id = ? ORDER BY order_index ASC, number ASC", (unit_id,))
        else:
            cursor.execute("SELECT * FROM lessons WHERE unit_id = ? AND (is_published = 1 OR published = 1) ORDER BY order_index ASC, number ASC", (unit_id,))
        
        lessons_rows = cursor.fetchall()
        lessons = []
        for l_row in lessons_rows:
            ld = dict(l_row)
            l_id = ld["id"]

            ld["isCompleted"] = False
            ld["progress"] = 0
            ld["lastPosition"] = 0

            if user_id:
                cursor.execute("SELECT progress, completed, last_position FROM lesson_progress WHERE student_id = ? AND lesson_id = ?", (user_id, l_id))
                prog = cursor.fetchone()
                if prog:
                    ld["progress"] = prog["progress"]
                    ld["isCompleted"] = bool(prog["completed"])
                    ld["lastPosition"] = prog["last_position"]

            # Structure exercise object for frontend
            if ld.get("exercise_title"):
                ld["exercise"] = {
                    "title": ld["exercise_title"],
                    "description": ld.get("exercise_description", ""),
                    "starterCode": ld.get("exercise_starter_code", ""),
                    "solutionCode": ld.get("exercise_solution_code", ""),
                    "testCases": json.loads(ld["exercise_test_cases"]) if ld.get("exercise_test_cases") else []
                }

            ld["isPublished"] = bool(ld.get("is_published", 1))
            lessons.append(ld)

        # Fetch exams for this unit
        if is_admin:
            cursor.execute("SELECT * FROM exams WHERE unit_id = ? ORDER BY created_at ASC", (unit_id,))
        else:
            cursor.execute("SELECT * FROM exams WHERE unit_id = ? AND (is_published = 1 OR published = 1) ORDER BY created_at ASC", (unit_id,))
        exams = [dict(r) for r in cursor.fetchall()]

        completed_count = sum(1 for l in lessons if l["isCompleted"])
        total_lessons = len(lessons)
        progress_pct = round((completed_count / total_lessons * 100)) if total_lessons > 0 else 0

        unit["totalLessons"] = total_lessons
        unit["completedLessonsCount"] = completed_count
        unit["progressPercentage"] = progress_pct
        unit["lessons"] = lessons
        unit["exams"] = exams
        unit["isPublished"] = bool(unit.get("is_published", 1))

        return {"success": True, "unit": unit}

@router.post("/units")
def create_unit(req: UnitCreateRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Create new curriculum unit."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    u_id = f"unit_{now_ts}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM units")
        next_num = req.number or (cursor.fetchone()["count"] + 1)
        order_idx = req.order_index if req.order_index is not None else next_num
        is_pub = 1 if (req.is_published if req.is_published is not None else req.published) else 0

        cursor.execute("""
        INSERT INTO units (id, number, title, description, icon, total_lessons, total_exams, status, is_published, published, order_index, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?)
        """, (u_id, next_num, req.title, req.description, req.icon, req.status, is_pub, is_pub, order_idx, now, now))

        return {"success": True, "unit_id": u_id, "message": "تم إنشاء الوحدة بنجاح"}

@router.put("/units/{unit_id}")
def update_unit(unit_id: str, req: UnitUpdateRequest, admin: dict = Depends(get_current_admin)):
    """Admin: Update unit details and publish state."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM units WHERE id = ?", (unit_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="الوحدة غير موجودة")

        updates = []
        params = []
        for field, val in req.dict(exclude_unset=True).items():
            if field in ("is_published", "published"):
                updates.append("is_published = ?")
                params.append(1 if val else 0)
                updates.append("published = ?")
                params.append(1 if val else 0)
            elif val is not None:
                updates.append(f"{field} = ?")
                params.append(val)

        if updates:
            updates.append("updated_at = ?")
            params.append(now)
            params.append(unit_id)
            cursor.execute(f"UPDATE units SET {', '.join(updates)} WHERE id = ?", params)

        return {"success": True, "message": "تم تحديث الوحدة بنجاح"}

@router.delete("/units/{unit_id}")
def delete_unit(unit_id: str, admin: dict = Depends(get_current_admin)):
    """Admin: Delete unit and cascade associated lessons/questions."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM units WHERE id = ?", (unit_id,))
        return {"success": True, "message": "تم حذف الوحدة ومحتوياتها بنجاح"}

# ==============================================================================
# 2. LESSONS (FLEXIBLE VIDEO: YOUTUBE + DIRECT UPLOAD)
# ==============================================================================

@router.get("/lessons")
def get_lessons(unit_id: Optional[str] = None, current_user: Optional[dict] = Depends(get_optional_user)):
    """Fetch list of lessons (optionally filtered by unit)."""
    user_id = current_user["id"] if current_user else None
    is_admin = current_user and current_user.get("role") == "admin"

    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT l.*, u.title as unit_title, u.number as unit_number FROM lessons l JOIN units u ON l.unit_id = u.id"
        params = []
        conds = []

        if not is_admin:
            conds.append("(l.is_published = 1 OR l.published = 1)")
        if unit_id:
            conds.append("l.unit_id = ?")
            params.append(unit_id)

        if conds:
            query += " WHERE " + " AND ".join(conds)
        query += " ORDER BY u.order_index ASC, l.order_index ASC, l.number ASC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        result = []
        for r in rows:
            ld = dict(r)
            l_id = ld["id"]

            ld["isCompleted"] = False
            ld["progress"] = 0
            ld["lastPosition"] = 0

            if user_id:
                cursor.execute("SELECT progress, completed, last_position FROM lesson_progress WHERE student_id = ? AND lesson_id = ?", (user_id, l_id))
                prog = cursor.fetchone()
                if prog:
                    ld["progress"] = prog["progress"]
                    ld["isCompleted"] = bool(prog["completed"])
                    ld["lastPosition"] = prog["last_position"]

            if ld.get("exercise_title"):
                ld["exercise"] = {
                    "title": ld["exercise_title"],
                    "description": ld.get("exercise_description", ""),
                    "starterCode": ld.get("exercise_starter_code", ""),
                    "solutionCode": ld.get("exercise_solution_code", ""),
                    "testCases": json.loads(ld["exercise_test_cases"]) if ld.get("exercise_test_cases") else []
                }

            # Map camelCase helpers
            ld["videoSource"] = ld.get("video_source")
            ld["videoUrl"] = ld.get("video_url")
            ld["videoId"] = ld.get("video_id")
            ld["storagePath"] = ld.get("storage_path")
            ld["thumbnailUrl"] = ld.get("thumbnail_url")
            ld["fileSize"] = ld.get("file_size")
            ld["mimeType"] = ld.get("mime_type")

            ld["isPublished"] = bool(ld.get("is_published", 1))
            result.append(ld)

        return {"success": True, "lessons": result}

@router.get("/lessons/{lesson_id}")
def get_lesson_detail(lesson_id: str, current_user: Optional[dict] = Depends(get_optional_user)):
    """Fetch complete lesson content with video player metadata and code playground."""
    user_id = current_user["id"] if current_user else None
    is_admin = current_user and current_user.get("role") == "admin"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT l.*, u.title as unit_title, u.number as unit_number
        FROM lessons l
        JOIN units u ON l.unit_id = u.id
        WHERE l.id = ?
        """, (lesson_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الدرس غير موجود")

        lesson = dict(row)
        if current_user and current_user.get("role") != "admin":
            if not check_student_subscription(current_user):
                raise HTTPException(status_code=403, detail="انتهى اشتراكك، يرجى تجديد الاشتراك.")

        if not (lesson.get("is_published") or lesson.get("published")) and not is_admin:
            raise HTTPException(status_code=403, detail="هذا الدرس غير منشور حاليًا")

        lesson["isCompleted"] = False
        lesson["progress"] = 0
        lesson["lastPosition"] = 0

        if user_id:
            cursor.execute("SELECT progress, completed, last_position FROM lesson_progress WHERE student_id = ? AND lesson_id = ?", (user_id, lesson_id))
            prog = cursor.fetchone()
            if prog:
                lesson["progress"] = prog["progress"]
                lesson["isCompleted"] = bool(prog["completed"])
                lesson["lastPosition"] = prog["last_position"]

            # Update student profile last active lesson
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            cursor.execute("UPDATE student_profiles SET last_lesson_id = ?, last_activity = ?, updated_at = ? WHERE user_id = ?", (lesson_id, now, now, user_id))

        if lesson.get("exercise_title"):
            lesson["exercise"] = {
                "title": lesson["exercise_title"],
                "description": lesson.get("exercise_description", ""),
                "starterCode": lesson.get("exercise_starter_code", ""),
                "solutionCode": lesson.get("exercise_solution_code", ""),
                "testCases": json.loads(lesson["exercise_test_cases"]) if lesson.get("exercise_test_cases") else []
            }

        # Map camelCase helpers
        lesson["videoSource"] = lesson.get("video_source")
        lesson["videoUrl"] = lesson.get("video_url")
        lesson["videoId"] = lesson.get("video_id")
        lesson["storagePath"] = lesson.get("storage_path")
        lesson["thumbnailUrl"] = lesson.get("thumbnail_url")
        lesson["fileSize"] = lesson.get("file_size")
        lesson["mimeType"] = lesson.get("mime_type")

        lesson["isPublished"] = bool(lesson.get("is_published", 1))

        # Fetch sibling lessons in the same unit for seamless navigation
        cursor.execute("SELECT id, number, title, duration FROM lessons WHERE unit_id = ? AND (is_published = 1 OR published = 1 OR ? = 1) ORDER BY order_index ASC, number ASC", (lesson["unit_id"], 1 if is_admin else 0))
        unit_lessons = [dict(r) for r in cursor.fetchall()]

        return {
            "success": True,
            "lesson": lesson,
            "unitLessons": unit_lessons
        }

@router.post("/lessons")
def create_lesson(req: LessonCreateRequest, staff_user: dict = Depends(get_current_staff)):
    """Create a lesson. Super Admin can publish immediately; Assistant can only save drafts."""
    is_assistant = is_assistant_user(staff_user)
    requested_publish = req.is_published if req.is_published is not None else req.published

    if is_assistant and requested_publish:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية نشر الدروس (صلاحية PUBLISH_LESSONS مخصصة للمشرف العام فقط)"
        )

    admin = staff_user
    """Admin: Add new lesson with rich HTML explanations, flexible video, and code exercises."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    l_id = f"lesson_{now_ts}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM units WHERE id = ?", (req.unit_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="الوحدة المحددة غير موجودة")

        cursor.execute("SELECT COUNT(*) as count FROM lessons WHERE unit_id = ?", (req.unit_id,))
        next_num = req.number or (cursor.fetchone()["count"] + 1)
        order_idx = req.order_index if req.order_index is not None else next_num
        tc_json = json.dumps(req.exercise_test_cases) if req.exercise_test_cases else None
        is_pub = 1 if (req.is_published if req.is_published is not None else req.published) else 0

        # Video metadata formatting
        v_source = req.video_source
        v_provider = req.video_provider
        v_id = req.video_id
        v_url = req.video_url or ""
        v_storage_path = req.storage_path
        v_thumb = req.thumbnail_url
        v_size = req.file_size
        v_mime = req.mime_type

        # If YouTube source: extract ID and embed URL automatically
        if v_source == "youtube" or (not v_source and v_url and ("youtube" in v_url or "youtu.be" in v_url)):
            v_source = "youtube"
            v_provider = "youtube"
            extracted_id = extract_youtube_id(v_url) or v_id
            if extracted_id:
                v_id = extracted_id
                v_url = get_youtube_embed_url(extracted_id) or v_url
                v_thumb = v_thumb or get_youtube_thumbnail_url(extracted_id)

        elif v_source == "upload":
            v_provider = v_provider or "local"
            v_mime = v_mime or "video/mp4"

        elif v_source == "none" or (not v_url and not v_storage_path):
            v_source = None
            v_provider = None
            v_url = ""

        cursor.execute("""
        INSERT INTO lessons (
            id, unit_id, number, title, description, duration, type,
            video_source, video_provider, video_id, video_url, storage_path, thumbnail_url, file_size, mime_type,
            content, content_html, code_example, code_solution,
            exercise_title, exercise_description, exercise_starter_code, exercise_solution_code, exercise_test_cases,
            is_published, published, order_index, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            l_id, req.unit_id, next_num, req.title, req.description, req.duration or "20 دقيقة", req.type or "video",
            v_source, v_provider, v_id, v_url, v_storage_path, v_thumb, v_size, v_mime,
            req.content or req.content_html or "", req.content_html or req.content or "",
            req.code_example or "", req.code_solution or "",
            req.exercise_title or "", req.exercise_description or "", req.exercise_starter_code or "",
            req.exercise_solution_code or "", tc_json, is_pub, is_pub, order_idx, now, now
        ))

        # Recalculate unit total lessons count
        cursor.execute("SELECT COUNT(*) as cnt FROM lessons WHERE unit_id = ?", (req.unit_id,))
        cnt = cursor.fetchone()["cnt"]
        cursor.execute("UPDATE units SET total_lessons = ?, updated_at = ? WHERE id = ?", (cnt, now, req.unit_id))

        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="CREATE_LESSON",
            target_type="LESSON",
            target_id=l_id,
            target_name=req.title,
            details={"unit_id": req.unit_id, "is_published": is_pub},
            conn=conn
        )

        return {
            "success": True,
            "lesson_id": l_id,
            "message": "تم إنشاء الدرس بنجاح",
            "video": {
                "source": v_source,
                "url": v_url,
                "video_id": v_id,
                "storage_path": v_storage_path
            }
        }

@router.put("/lessons/{lesson_id}")
def update_lesson(lesson_id: str, req: LessonUpdateRequest, staff_user: dict = Depends(get_current_staff)):
    """Update lesson. Super Admin can edit all; Assistant cannot edit published lessons or publish."""
    admin = staff_user
    is_assistant = is_assistant_user(staff_user)
    """Admin: Update lesson content, video source/url, and code exercise with automatic cleanup."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM lessons WHERE id = ?", (lesson_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الدرس غير موجود")
        current_lesson = dict(row)

        if is_assistant:
            if current_lesson.get("is_published") == 1 or current_lesson.get("published") == 1:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="لا يمكن للمساعد تعديل أو تغيير الدروس المنشورة. يرجى التواصل مع المشرف العام."
                )
            if req.is_published is True or req.published is True:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="ليس لديك صلاحية نشر الدروس (صلاحية PUBLISH_LESSONS مخصصة للمشرف العام فقط)"
                )

        updates = []
        params = []
        old_storage_path = current_lesson.get("storage_path")

        # Handle YouTube vs Upload parsing
        req_dict = req.dict(exclude_unset=True)

        if "video_url" in req_dict or "video_source" in req_dict:
            v_source = req_dict.get("video_source", current_lesson.get("video_source"))
            v_url = req_dict.get("video_url", current_lesson.get("video_url") or "")
            
            if v_source == "youtube" or (v_url and ("youtube" in v_url or "youtu.be" in v_url)):
                extracted_id = extract_youtube_id(v_url) or req_dict.get("video_id")
                if extracted_id:
                    req_dict["video_source"] = "youtube"
                    req_dict["video_provider"] = "youtube"
                    req_dict["video_id"] = extracted_id
                    req_dict["video_url"] = get_youtube_embed_url(extracted_id) or v_url
                    req_dict["thumbnail_url"] = req_dict.get("thumbnail_url") or get_youtube_thumbnail_url(extracted_id)
                    req_dict["storage_path"] = None # Clear old storage path
                    
                    # Clean up old uploaded file if replaced by YouTube
                    if old_storage_path:
                        storage_service.delete_video(old_storage_path)

            elif v_source == "upload":
                req_dict["video_source"] = "upload"
                new_storage_path = req_dict.get("storage_path")
                # If replacing uploaded file with a new uploaded file
                if old_storage_path and new_storage_path and old_storage_path != new_storage_path:
                    storage_service.delete_video(old_storage_path)

            elif v_source == "none":
                req_dict["video_source"] = None
                req_dict["video_provider"] = None
                req_dict["video_url"] = ""
                req_dict["video_id"] = None
                req_dict["storage_path"] = None
                if old_storage_path:
                    storage_service.delete_video(old_storage_path)

        for field, val in req_dict.items():
            if field == "exercise_test_cases":
                updates.append("exercise_test_cases = ?")
                params.append(json.dumps(val) if val else None)
            elif field in ("is_published", "published"):
                updates.append("is_published = ?")
                params.append(1 if val else 0)
                updates.append("published = ?")
                params.append(1 if val else 0)
            elif field == "content":
                updates.append("content = ?")
                params.append(val)
                updates.append("content_html = ?")
                params.append(val)
            elif field == "content_html":
                updates.append("content_html = ?")
                params.append(val)
                updates.append("content = ?")
                params.append(val)
            elif val is not None:
                updates.append(f"{field} = ?")
                params.append(val)
            else:
                updates.append(f"{field} = ?")
                params.append(None)

        if updates:
            updates.append("updated_at = ?")
            params.append(now)
            params.append(lesson_id)
            cursor.execute(f"UPDATE lessons SET {', '.join(updates)} WHERE id = ?", params)

        return {"success": True, "message": "تم تحديث بيانات الدرس بنجاح"}

@router.delete("/lessons/{lesson_id}")
def delete_lesson(lesson_id: str, staff_user: dict = Depends(get_current_staff)):
    """Delete lesson. Assistant cannot delete published lessons."""
    admin = staff_user
    is_assistant = is_assistant_user(staff_user)
    """Admin: Delete lesson and clean up associated storage file."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, unit_id, title, storage_path, is_published, published FROM lessons WHERE id = ?", (lesson_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الدرس غير موجود")
        
        if is_assistant and (row.get("is_published") == 1 or row.get("published") == 1):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="لا يمكن للمساعد حذف الدروس المنشورة (صلاحية DELETE_PUBLISHED_LESSONS مخصصة للمشرف العام فقط)"
            )

        unit_id = row["unit_id"]
        lesson_title = row.get("title", "")
        storage_path = row.get("storage_path")

        # Clean up storage object if present
        if storage_path:
            storage_service.delete_video(storage_path)

        cursor.execute("DELETE FROM lessons WHERE id = ?", (lesson_id,))
        
        # Update unit total count
        cursor.execute("SELECT COUNT(*) as cnt FROM lessons WHERE unit_id = ?", (unit_id,))
        cnt = cursor.fetchone()["cnt"]
        cursor.execute("UPDATE units SET total_lessons = ?, updated_at = ? WHERE id = ?", (cnt, now, unit_id))

        return {"success": True, "message": "تم حذف الدرس بنجاح"}

# ==============================================================================
# 3. DIRECT VIDEO UPLOAD & STORAGE APIs
# ==============================================================================

@router.post("/admin/videos/upload")
@router.post("/curriculum/lessons/upload-video")
async def upload_lesson_video(
    file: UploadFile = File(...),
    lesson_id: Optional[str] = Form(None),
    old_storage_path: Optional[str] = Form(None),
    admin: dict = Depends(get_current_admin)
):
    """
    Admin Only: Upload video file for a lesson.
    Validates MIME type, extension, and enforces free-tier size limits.
    Cleans up old video file if old_storage_path is provided.
    """
    try:
        if old_storage_path:
            result = await storage_service.replace_video(old_storage_path, file, lesson_id)
        else:
            result = await storage_service.upload_video(file, lesson_id)

        return {
            "success": True,
            "message": "تم رفع ملف الفيديو بنجاح",
            "video": result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading video: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"فشل رفع الفيديو: {str(e)}"
        )

@router.delete("/admin/videos")
@router.delete("/curriculum/lessons/delete-video")
def delete_lesson_video(
    storage_path: str = Query(..., description="Storage path of the video to delete"),
    admin: dict = Depends(get_current_admin)
):
    """Admin Only: Delete an uploaded video from storage."""
    deleted = storage_service.delete_video(storage_path)
    return {
        "success": True,
        "deleted": deleted,
        "message": "تم حذف ملف الفيديو من وحدة التخزين" if deleted else "الملف غير موجود أو تم حذفه مسبقًا"
    }

@router.get("/storage/videos/{file_path:path}")
def stream_video(file_path: str, request: Request):
    """
    Stream video file supporting HTTP 206 Partial Content Range Requests.
    Allows smooth seeking, low bandwidth consumption, and instant playback.
    """
    range_header = request.headers.get("range")
    return storage_service.stream_local_video(file_path, range_header)

@router.post("/lessons/{lesson_id}/publish")
@router.post("/admin/lessons/{lesson_id}/publish")
@router.patch("/admin/lessons/{lesson_id}/publish")
def publish_lesson_endpoint(lesson_id: str, admin: dict = Depends(get_current_super_admin)):
    """Strictly Super Admin only: Publish a lesson."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM lessons WHERE id = ?", (lesson_id,))
        lesson = cursor.fetchone()
        if not lesson:
            raise HTTPException(status_code=404, detail="الدرس غير موجود")

        cursor.execute("UPDATE lessons SET is_published = 1, published = 1, updated_at = ? WHERE id = ?", (now, lesson_id))
        
        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="PUBLISH_LESSON",
            target_type="LESSON",
            target_id=lesson_id,
            target_name=lesson["title"],
            details={"status": "published"},
            conn=conn
        )

        return {"success": True, "is_published": 1, "message": f"تم نشر الدرس ({lesson['title']}) بنجاح"}

@router.post("/lessons/{lesson_id}/unpublish")
@router.post("/admin/lessons/{lesson_id}/unpublish")
def unpublish_lesson_endpoint(lesson_id: str, admin: dict = Depends(get_current_super_admin)):
    """Strictly Super Admin only: Unpublish a lesson."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM lessons WHERE id = ?", (lesson_id,))
        lesson = cursor.fetchone()
        if not lesson:
            raise HTTPException(status_code=404, detail="الدرس غير موجود")

        cursor.execute("UPDATE lessons SET is_published = 0, published = 0, updated_at = ? WHERE id = ?", (now, lesson_id))

        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="UNPUBLISH_LESSON",
            target_type="LESSON",
            target_id=lesson_id,
            target_name=lesson["title"],
            details={"status": "unpublished"},
            conn=conn
        )

        return {"success": True, "is_published": 0, "message": f"تم إلغاء نشر الدرس ({lesson['title']}) بنجاح"}
