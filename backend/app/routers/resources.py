import datetime
import json
import re
import secrets
from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import Optional, List, Dict, Any

from ..database import get_db, log_activity
from ..dependencies import (
    get_current_user, get_optional_user, get_current_staff,
    get_current_super_admin, is_super_admin_user, is_assistant_user
)
from ..models import (
    EducationalResourceCreateRequest,
    EducationalResourceUpdateRequest,
    EducationalResourceStatusUpdateRequest
)

router = APIRouter(tags=["Educational Resources & PDF Files"])

def _get_client_ip(request: Optional[Request] = None) -> str:
    if not request:
        return "127.0.0.1"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def parse_file_url(url: str) -> Dict[str, Any]:
    """
    Parses and transforms Google Drive and external file URLs into:
    - is_google_drive: bool
    - file_id: extracted Google Drive file ID
    - preview_url: URL for embedded iframe viewer
    - download_url: URL for direct download
    - view_url: Canonical view URL
    - sharing_guidance: Instructions for ensuring the file is shared properly
    """
    raw_url = (url or "").strip()
    result = {
        "original_url": raw_url,
        "is_google_drive": False,
        "file_id": None,
        "preview_url": raw_url,
        "download_url": raw_url,
        "view_url": raw_url,
        "sharing_guidance": "تأكد من أن الرابط صالح ومتاح للطلاب."
    }

    if not raw_url:
        return result

    # Common Google Drive URL patterns
    drive_file_match = re.search(r"drive\.google\.com/file/d/([a-zA-Z0-9_-]+)", raw_url)
    drive_open_match = re.search(r"drive\.google\.com/open\?id=([a-zA-Z0-9_-]+)", raw_url)
    drive_uc_match = re.search(r"drive\.google\.com/uc\?id=([a-zA-Z0-9_-]+)", raw_url)
    docs_match = re.search(r"docs\.google\.com/(?:document|presentation|spreadsheets)/d/([a-zA-Z0-9_-]+)", raw_url)

    file_id = None
    if drive_file_match:
        file_id = drive_file_match.group(1)
    elif drive_open_match:
        file_id = drive_open_match.group(1)
    elif drive_uc_match:
        file_id = drive_uc_match.group(1)
    elif docs_match:
        file_id = docs_match.group(1)

    if file_id:
        result["is_google_drive"] = True
        result["file_id"] = file_id
        result["preview_url"] = f"https://drive.google.com/file/d/{file_id}/preview"
        result["download_url"] = f"https://drive.google.com/uc?export=download&id={file_id}"
        result["view_url"] = f"https://drive.google.com/file/d/{file_id}/view?usp=sharing"
        result["sharing_guidance"] = "تأكد من أن إعدادات مشاركة ملف Google Drive مضبوطة على: (Anyone with the link can view / أي شخص لديه الرابط يمكنه العرض)."
    elif "drive.google.com" in raw_url or "docs.google.com" in raw_url:
        result["is_google_drive"] = True
        result["preview_url"] = raw_url
        result["download_url"] = raw_url
        result["view_url"] = raw_url
        result["sharing_guidance"] = "تأكد من ضبط صلاحية الرابط على Google Drive ليكون متاحًا للقراءة لجميع الطلاب."

    return result


# ==============================================================================
# 1. PUBLIC & STUDENT ENDPOINTS (/api/resources)
# ==============================================================================

@router.get("/api/resources")
def list_student_resources(
    search: Optional[str] = None,
    category: Optional[str] = None,
    unit_id: Optional[str] = None,
    lesson_id: Optional[str] = None,
    sort_by: Optional[str] = "order", # 'order', 'newest', 'views'
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    List active educational resources (PDF study notes, cheatsheets, worksheets).
    Open to students and authenticated users.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
        SELECT r.id, r.title, r.description, r.file_url, r.preview_url, r.download_url,
               r.file_type, r.file_size_label, r.category, r.unit_id, r.lesson_id,
               r.is_active, r.status, r.display_order, r.views_count, r.downloads_count,
               r.created_by, r.created_by_name, r.created_at, r.updated_at,
               u.title as unit_title, u.number as unit_number,
               l.title as lesson_title, l.number as lesson_number
        FROM educational_resources r
        LEFT JOIN units u ON r.unit_id = u.id
        LEFT JOIN lessons l ON r.lesson_id = l.id
        WHERE (r.is_active = 1 OR r.status = 'active')
        """
        params = []

        if search:
            s = f"%{search.strip().lower()}%"
            query += " AND (LOWER(r.title) LIKE ? OR LOWER(r.description) LIKE ? OR LOWER(r.category) LIKE ?)"
            params.extend([s, s, s])

        if category and category.strip() and category != "all" and category != "الكل":
            cat_clean = category.strip()
            if cat_clean in ("ملخصات وتفاصيل", "ملخصات وقوانين"):
                query += " AND (r.category = 'ملخصات وتفاصيل' OR r.category = 'ملخصات وقوانين')"
            else:
                query += " AND r.category = ?"
                params.append(cat_clean)

        if unit_id and unit_id.strip() and unit_id != "all":
            query += " AND r.unit_id = ?"
            params.append(unit_id.strip())

        if lesson_id and lesson_id.strip():
            query += " AND r.lesson_id = ?"
            params.append(lesson_id.strip())

        if sort_by == "newest":
            query += " ORDER BY r.created_at DESC, r.display_order ASC"
        elif sort_by == "views":
            query += " ORDER BY r.views_count DESC, r.display_order ASC"
        else:
            query += " ORDER BY r.display_order ASC, r.created_at DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        resources = []
        for r in rows:
            res_dict = dict(r)
            # Enhance with parsed Drive information
            drive_info = parse_file_url(res_dict["file_url"])
            res_dict["is_google_drive"] = drive_info["is_google_drive"]
            if not res_dict.get("preview_url"):
                res_dict["preview_url"] = drive_info["preview_url"]
            if not res_dict.get("download_url"):
                res_dict["download_url"] = drive_info["download_url"]
            resources.append(res_dict)

        # Get list of unique categories
        cursor.execute("""
        SELECT DISTINCT category FROM educational_resources
        WHERE (is_active = 1 OR status = 'active') AND category IS NOT NULL AND category != ''
        ORDER BY category ASC
        """)
        cats = [c["category"] for c in cursor.fetchall()]

        return {
            "success": True,
            "count": len(resources),
            "categories": cats,
            "resources": resources
        }


@router.get("/api/resources/categories")
def get_resource_categories():
    """Return list of distinct categories for filtering."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT DISTINCT category FROM educational_resources
        WHERE (is_active = 1 OR status = 'active') AND category IS NOT NULL AND category != ''
        ORDER BY category ASC
        """)
        cats = [c["category"] for c in cursor.fetchall()]
        standard_cats = ["تدريبات وامتحانات", "مذكرات شرح", "ملخصات وتفاصيل", "نماذج إجابة"]
        final_cats = list(standard_cats)
        for c in cats:
            c_norm = "ملخصات وتفاصيل" if c == "ملخصات وقوانين" else c
            if c_norm not in final_cats:
                final_cats.append(c_norm)
        return {"success": True, "categories": final_cats}


@router.get("/api/resources/lesson/{lesson_id}")
def get_lesson_linked_resources(lesson_id: str):
    """Fetch educational resources and PDFs linked to a specific lesson."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT r.id, r.title, r.description, r.file_url, r.preview_url, r.download_url,
               r.file_type, r.file_size_label, r.category, r.unit_id, r.lesson_id,
               r.is_active, r.status, r.display_order, r.views_count, r.downloads_count,
               r.created_at, u.title as unit_title
        FROM educational_resources r
        LEFT JOIN units u ON r.unit_id = u.id
        WHERE (r.is_active = 1 OR r.status = 'active') AND r.lesson_id = ?
        ORDER BY r.display_order ASC, r.created_at DESC
        """, (lesson_id,))
        rows = cursor.fetchall()
        resources = []
        for r in rows:
            res_dict = dict(r)
            drive_info = parse_file_url(res_dict["file_url"])
            res_dict["is_google_drive"] = drive_info["is_google_drive"]
            if not res_dict.get("preview_url"):
                res_dict["preview_url"] = drive_info["preview_url"]
            if not res_dict.get("download_url"):
                res_dict["download_url"] = drive_info["download_url"]
            resources.append(res_dict)

        return {"success": True, "count": len(resources), "resources": resources}


@router.get("/api/resources/{resource_id}")
def get_resource_detail(resource_id: str):
    """Retrieve details for a single educational resource."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT r.*, u.title as unit_title, u.number as unit_number,
               l.title as lesson_title, l.number as lesson_number
        FROM educational_resources r
        LEFT JOIN units u ON r.unit_id = u.id
        LEFT JOIN lessons l ON r.lesson_id = l.id
        WHERE r.id = ?
        """, (resource_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الملف التعليمي غير موجود")

        res_dict = dict(row)
        drive_info = parse_file_url(res_dict["file_url"])
        res_dict["is_google_drive"] = drive_info["is_google_drive"]
        res_dict["sharing_guidance"] = drive_info["sharing_guidance"]
        if not res_dict.get("preview_url"):
            res_dict["preview_url"] = drive_info["preview_url"]
        if not res_dict.get("download_url"):
            res_dict["download_url"] = drive_info["download_url"]

        return {"success": True, "resource": res_dict}


@router.post("/api/resources/{resource_id}/view")
def record_resource_view(resource_id: str):
    """Increment views count for a resource."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE educational_resources
        SET views_count = views_count + 1, updated_at = ?
        WHERE id = ?
        """, (datetime.datetime.now(datetime.timezone.utc).isoformat(), resource_id))
        return {"success": True}


@router.post("/api/resources/{resource_id}/download")
def record_resource_download(resource_id: str):
    """Increment downloads count for a resource."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE educational_resources
        SET downloads_count = downloads_count + 1, updated_at = ?
        WHERE id = ?
        """, (datetime.datetime.now(datetime.timezone.utc).isoformat(), resource_id))
        return {"success": True}


# ==============================================================================
# 2. STAFF & ADMIN ENDPOINTS (/api/admin/resources)
# Accessible by SUPER_ADMIN and ASSISTANT
# ==============================================================================

@router.get("/api/admin/resources")
def admin_list_resources(
    search: Optional[str] = None,
    category: Optional[str] = None,
    unit_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    staff: dict = Depends(get_current_staff)
):
    """
    Staff / Admin: List all educational resources with filtering, search, and pagination.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        base_query = """
        SELECT r.*, u.title as unit_title, u.number as unit_number,
               l.title as lesson_title, l.number as lesson_number
        FROM educational_resources r
        LEFT JOIN units u ON r.unit_id = u.id
        LEFT JOIN lessons l ON r.lesson_id = l.id
        WHERE 1=1
        """
        params = []

        if search:
            s = f"%{search.strip().lower()}%"
            base_query += " AND (LOWER(r.title) LIKE ? OR LOWER(r.description) LIKE ? OR LOWER(r.category) LIKE ?)"
            params.extend([s, s, s])

        if category and category.strip() and category != "all" and category != "الكل":
            cat_clean = category.strip()
            if cat_clean in ("ملخصات وتفاصيل", "ملخصات وقوانين"):
                base_query += " AND (r.category = 'ملخصات وتفاصيل' OR r.category = 'ملخصات وقوانين')"
            else:
                base_query += " AND r.category = ?"
                params.append(cat_clean)

        if unit_id and unit_id.strip() and unit_id != "all":
            base_query += " AND r.unit_id = ?"
            params.append(unit_id.strip())

        if status_filter:
            if status_filter.lower() in ("active", "نشط"):
                base_query += " AND (r.status = 'active' OR r.is_active = 1)"
            elif status_filter.lower() in ("inactive", "معطل", "disabled"):
                base_query += " AND (r.status = 'inactive' OR r.is_active = 0)"

        count_query = f"SELECT COUNT(*) as total FROM ({base_query})"
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()["total"]

        offset = max(0, (page - 1) * limit)
        data_query = base_query + f" ORDER BY r.display_order ASC, r.created_at DESC LIMIT {limit} OFFSET {offset}"
        cursor.execute(data_query, params)
        rows = cursor.fetchall()

        resources = []
        for r in rows:
            res_dict = dict(r)
            drive_info = parse_file_url(res_dict["file_url"])
            res_dict["is_google_drive"] = drive_info["is_google_drive"]
            resources.append(res_dict)

        # Get units for dropdown
        cursor.execute("SELECT id, number, title FROM units ORDER BY number ASC, order_index ASC")
        units = [dict(u) for u in cursor.fetchall()]

        # Get lessons for dropdown
        cursor.execute("SELECT id, unit_id, number, title FROM lessons ORDER BY unit_id ASC, number ASC, order_index ASC")
        lessons = [dict(l) for l in cursor.fetchall()]

        return {
            "success": True,
            "count": len(resources),
            "total": total_count,
            "page": page,
            "limit": limit,
            "resources": resources,
            "units": units,
            "lessons": lessons
        }


@router.post("/api/admin/resources")
def admin_create_resource(
    req: EducationalResourceCreateRequest,
    request: Request = None,
    staff: dict = Depends(get_current_staff)
):
    """
    Staff / Admin: Add a new educational resource with Google Drive / external URL.
    - Validates URL
    - Generates preview/download links
    - Generates student notification
    - Logs staff activity
    """
    client_ip = _get_client_ip(request)
    title = (req.title or "").strip()
    file_url = (req.file_url or "").strip()

    if not title:
        raise HTTPException(status_code=400, detail="عنوان واسم الملف التعليمي حقل مطلوب")
    if not file_url:
        raise HTTPException(status_code=400, detail="رابط الملف (Google Drive URL) حقل مطلوب")

    if not (file_url.startswith("http://") or file_url.startswith("https://")):
        raise HTTPException(status_code=400, detail="صيغة الرابط غير صحيحة. يجب أن يبدأ بـ http:// أو https://")

    # Parse and enrich Google Drive URL
    drive_info = parse_file_url(file_url)

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    resource_id = f"res_{secrets.token_hex(4)}_{now_ts}"

    status_val = "active" if (req.is_active is not False and req.status != "inactive") else "inactive"
    is_active_int = 1 if status_val == "active" else 0

    with get_db() as conn:
        cursor = conn.cursor()

        # Validate unit_id if provided
        unit_title = None
        if req.unit_id:
            cursor.execute("SELECT title FROM units WHERE id = ?", (req.unit_id,))
            u_row = cursor.fetchone()
            if u_row:
                unit_title = u_row["title"]

        cursor.execute("""
        INSERT INTO educational_resources (
            id, title, description, file_url, preview_url, download_url,
            file_type, file_size_label, category, unit_id, lesson_id,
            is_active, status, display_order, views_count, downloads_count,
            created_by, created_by_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
        """, (
            resource_id, title, req.description or "", file_url,
            drive_info["preview_url"], drive_info["download_url"],
            req.file_type or "pdf", req.file_size_label or "",
            req.category or "مذكرات شرح", req.unit_id, req.lesson_id,
            is_active_int, status_val, req.display_order or 0,
            staff["id"], staff["name"], now, now
        ))

        # 2. Trigger automatic in-app notification for students
        if is_active_int == 1:
            notif_id = f"notif_res_{secrets.token_hex(4)}_{now_ts}"
            notif_content = f"تمت إضافة ملف تعليمي جديد: {title}" + (f" ({unit_title})" if unit_title else "")
            cursor.execute("""
            INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
            VALUES (?, NULL, '📚 ملف تعليمي جديد', ?, 'resource', 0, ?)
            """, (notif_id, notif_content, now))

        # 3. Log staff audit activity
        log_activity(
            user_id=staff["id"],
            user_name=staff["name"],
            user_role=staff["role"],
            action="CREATE_RESOURCE",
            target_type="RESOURCE",
            target_id=resource_id,
            target_name=title,
            details={
                "category": req.category,
                "unit_id": req.unit_id,
                "file_url": file_url,
                "is_google_drive": drive_info["is_google_drive"]
            },
            ip_address=client_ip,
            conn=conn
        )

        return {
            "success": True,
            "resource_id": resource_id,
            "message": "تمت إضافة الملف التعليمي بنجاح! 📄",
            "sharing_guidance": drive_info["sharing_guidance"],
            "resource": {
                "id": resource_id,
                "title": title,
                "file_url": file_url,
                "preview_url": drive_info["preview_url"],
                "download_url": drive_info["download_url"],
                "category": req.category,
                "status": status_val
            }
        }


@router.post("/api/admin/resources/validate-url")
def validate_resource_url(data: Dict[str, Any], staff: dict = Depends(get_current_staff)):
    """Helper for testing and validating Google Drive URLs in Admin UI."""
    url = (data.get("url") or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="الرابط مطلوب للتحقق")
    info = parse_file_url(url)
    return {"success": True, "info": info}


@router.get("/api/admin/resources/{resource_id}")
def admin_get_resource(resource_id: str, staff: dict = Depends(get_current_staff)):
    """Staff: Get single resource by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM educational_resources WHERE id = ?", (resource_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الملف التعليمي غير موجود")
        res_dict = dict(row)
        drive_info = parse_file_url(res_dict["file_url"])
        res_dict["is_google_drive"] = drive_info["is_google_drive"]
        res_dict["sharing_guidance"] = drive_info["sharing_guidance"]
        return {"success": True, "resource": res_dict}


@router.put("/api/admin/resources/{resource_id}")
def admin_update_resource(
    resource_id: str,
    req: EducationalResourceUpdateRequest,
    request: Request = None,
    staff: dict = Depends(get_current_staff)
):
    """Staff: Edit and update educational resource details."""
    client_ip = _get_client_ip(request)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM educational_resources WHERE id = ?", (resource_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="الملف التعليمي غير موجود")

        existing_dict = dict(existing)
        updates = []
        params = []

        if req.title is not None:
            updates.append("title = ?")
            params.append(req.title.strip())

        if req.description is not None:
            updates.append("description = ?")
            params.append(req.description.strip())

        if req.file_url is not None:
            f_url = req.file_url.strip()
            drive_info = parse_file_url(f_url)
            updates.append("file_url = ?")
            params.append(f_url)
            updates.append("preview_url = ?")
            params.append(drive_info["preview_url"])
            updates.append("download_url = ?")
            params.append(drive_info["download_url"])

        if req.category is not None:
            updates.append("category = ?")
            params.append(req.category.strip())

        if req.unit_id is not None:
            updates.append("unit_id = ?")
            params.append(req.unit_id if req.unit_id != "" else None)

        if req.lesson_id is not None:
            updates.append("lesson_id = ?")
            params.append(req.lesson_id if req.lesson_id != "" else None)

        if req.file_type is not None:
            updates.append("file_type = ?")
            params.append(req.file_type)

        if req.file_size_label is not None:
            updates.append("file_size_label = ?")
            params.append(req.file_size_label)

        if req.display_order is not None:
            updates.append("display_order = ?")
            params.append(req.display_order)

        if req.status is not None:
            s_val = "active" if req.status in ("active", "ACTIVE") else "inactive"
            updates.append("status = ?")
            params.append(s_val)
            updates.append("is_active = ?")
            params.append(1 if s_val == "active" else 0)
        elif req.is_active is not None:
            is_act = 1 if req.is_active else 0
            updates.append("is_active = ?")
            params.append(is_act)
            updates.append("status = ?")
            params.append("active" if is_act == 1 else "inactive")

        if not updates:
            return {"success": True, "message": "لا توجد تعديلات لتحديثها"}

        updates.append("updated_at = ?")
        params.append(now)
        params.append(resource_id)

        query = f"UPDATE educational_resources SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)

        log_activity(
            user_id=staff["id"],
            user_name=staff["name"],
            user_role=staff["role"],
            action="UPDATE_RESOURCE",
            target_type="RESOURCE",
            target_id=resource_id,
            target_name=req.title or existing_dict["title"],
            details={"updated_fields": list(req.dict(exclude_unset=True).keys())},
            ip_address=client_ip,
            conn=conn
        )

        cursor.execute("SELECT * FROM educational_resources WHERE id = ?", (resource_id,))
        updated_row = cursor.fetchone()
        res_dict = dict(updated_row) if updated_row else {}
        if res_dict.get("file_url"):
            drive_info = parse_file_url(res_dict["file_url"])
            res_dict["is_google_drive"] = drive_info["is_google_drive"]
        return {"success": True, "resource": res_dict, "message": "تم تحديث بيانات الملف التعليمي بنجاح! ✓"}


@router.patch("/api/admin/resources/{resource_id}/status")
def admin_toggle_resource_status(
    resource_id: str,
    req: EducationalResourceStatusUpdateRequest,
    request: Request = None,
    staff: dict = Depends(get_current_staff)
):
    """Staff: Toggle active / inactive status."""
    client_ip = _get_client_ip(request)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    status_val = "active" if req.status.lower() in ("active", "نشط") else "inactive"
    is_act = 1 if status_val == "active" else 0

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title FROM educational_resources WHERE id = ?", (resource_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الملف التعليمي غير موجود")

        cursor.execute("""
        UPDATE educational_resources
        SET status = ?, is_active = ?, updated_at = ?
        WHERE id = ?
        """, (status_val, is_act, now, resource_id))

        log_activity(
            user_id=staff["id"],
            user_name=staff["name"],
            user_role=staff["role"],
            action="TOGGLE_RESOURCE_STATUS",
            target_type="RESOURCE",
            target_id=resource_id,
            target_name=row["title"],
            details={"new_status": status_val},
            ip_address=client_ip,
            conn=conn
        )

        return {
            "success": True,
            "status": status_val,
            "is_active": bool(is_act),
            "message": f"تم {'تفعيل' if is_act == 1 else 'تعطيل'} الملف التعليمي بنجاح"
        }


@router.delete("/api/admin/resources/{resource_id}")
def admin_delete_resource(
    resource_id: str,
    request: Request = None,
    staff: dict = Depends(get_current_staff)
):
    """
    Staff / Admin: Delete educational resource record safely.
    Preserves all student records and lessons.
    """
    client_ip = _get_client_ip(request)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title FROM educational_resources WHERE id = ?", (resource_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الملف التعليمي غير موجود")

        res_title = row["title"]
        cursor.execute("DELETE FROM educational_resources WHERE id = ?", (resource_id,))

        log_activity(
            user_id=staff["id"],
            user_name=staff["name"],
            user_role=staff["role"],
            action="DELETE_RESOURCE",
            target_type="RESOURCE",
            target_id=resource_id,
            target_name=res_title,
            details={"message": "Resource deleted by staff"},
            ip_address=client_ip,
            conn=conn
        )

        return {"success": True, "message": f"تم حذف الملف التعليمي '{res_title}' بنجاح"}
