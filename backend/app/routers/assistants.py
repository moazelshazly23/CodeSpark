import re
import datetime
import os
from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import Optional, List, Dict, Any

from ..database import get_db, log_activity
from ..dependencies import get_current_super_admin, get_current_staff
from ..security import hash_password
from ..models import (
    AssistantCreateRequest,
    AssistantUpdateRequest,
    AssistantStatusUpdateRequest,
    AssistantResetPasswordRequest,
    Role
)

router = APIRouter(prefix="/api/admin/assistants", tags=["Admin Assistant Management"])

def _get_client_ip(request: Optional[Request] = None) -> str:
    if not request:
        return "127.0.0.1"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

@router.get("")
def list_assistants(
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: List all teaching assistants with filtering and search."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
        SELECT id, name, email, phone, role, avatar, status, is_active,
               is_deleted, created_by, created_at, updated_at
        FROM users
        WHERE role IN ('ASSISTANT', 'assistant') AND (is_deleted = 0 OR is_deleted IS NULL)
        """
        params = []

        if status_filter:
            if status_filter.lower() in ("active", "نشط"):
                query += " AND (status = 'active' OR status = 'ACTIVE' OR is_active = 1)"
            elif status_filter.lower() in ("inactive", "معطل", "suspended", "disabled"):
                query += " AND (status = 'inactive' OR status = 'INACTIVE' OR status = 'disabled' OR is_active = 0)"

        if search:
            s = f"%{search.strip().lower()}%"
            query += " AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ?)"
            params.extend([s, s, s])

        query += " ORDER BY created_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        assistants = [dict(r) for r in rows]
        return {
            "success": True,
            "count": len(assistants),
            "assistants": assistants
        }

@router.post("")
def create_assistant(
    req: AssistantCreateRequest,
    request: Request,
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: Create a new Assistant account with securely hashed password."""
    client_ip = _get_client_ip(request)
    name = req.name.strip()
    email = req.email.strip().lower()
    phone = req.phone.strip() if req.phone else None
    raw_password = req.password.strip()

    if not name or not email or not raw_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="الاسم والبريد الإلكتروني وكلمة المرور حقول مطلوبة"
        )

    EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if not re.match(EMAIL_REGEX, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="صيغة البريد الإلكتروني غير صحيحة"
        )

    if len(raw_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="يجب أن تتكون كلمة المرور من 6 أحرف على الأقل"
        )

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    rand_hex = os.urandom(2).hex()
    assistant_id = f"assistant_{now_ts}_{rand_hex}"
    pw_hash = hash_password(raw_password)
    initials = "".join([w[0] for w in name.split()[:2]]) or "مس"
    status_raw = (req.status or "ACTIVE").strip().upper()
    status_val = "ACTIVE" if status_raw in ("ACTIVE", "نشط", "1", "TRUE") else "INACTIVE"
    is_act = 1 if status_val == "ACTIVE" else 0

    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check email duplication
        cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="البريد الإلكتروني مسجل بالفعل بحساب آخر"
            )

        # Check phone duplication if provided
        if phone:
            cursor.execute("SELECT id FROM users WHERE phone = ?", (phone,))
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="رقم الهاتف مسجل بالفعل بحساب آخر"
                )

        cursor.execute("""
        INSERT INTO users (
            id, name, email, phone, password_hash, role, avatar,
            is_active, status, is_deleted, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'ASSISTANT', ?, ?, ?, 0, ?, ?, ?)
        """, (
            assistant_id, name, email, phone, pw_hash, initials,
            is_act, status_val, admin["id"], now, now
        ))

        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="CREATE_ASSISTANT",
            target_type="ASSISTANT",
            target_id=assistant_id,
            target_name=name,
            details={"email": email, "phone": phone, "status": status_val},
            ip_address=client_ip,
            conn=conn
        )

        return {
            "success": True,
            "assistant": {
                "id": assistant_id,
                "name": name,
                "email": email,
                "phone": phone,
                "role": "ASSISTANT",
                "status": status_val,
                "is_active": is_act,
                "avatar": initials,
                "created_at": now,
                "updated_at": now
            },
            "message": "تم إنشاء حساب المساعد بنجاح"
        }

@router.get("/{assistant_id}")
def get_assistant(
    assistant_id: str,
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: Retrieve single assistant details."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, name, email, phone, role, avatar, status, is_active,
               is_deleted, created_by, created_at, updated_at
        FROM users
        WHERE id = ? AND role IN ('ASSISTANT', 'assistant')
        """, (assistant_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="حساب المساعد غير موجود"
            )
        return {"success": True, "assistant": dict(row)}

@router.put("/{assistant_id}")
def update_assistant(
    assistant_id: str,
    req: AssistantUpdateRequest,
    request: Request = None,
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: Update assistant profile details."""
    client_ip = _get_client_ip(request)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ? AND role IN ('ASSISTANT', 'assistant')", (assistant_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="حساب المساعد غير موجود")

        updates = []
        params = []

        if req.name is not None:
            name_val = req.name.strip()
            initials = "".join([w[0] for w in name_val.split()[:2]]) or "مس"
            updates.append("name = ?")
            params.append(name_val)
            updates.append("avatar = ?")
            params.append(initials)

        if req.email is not None:
            email_val = req.email.strip().lower()
            cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?", (email_val, assistant_id))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل بحساب آخر")
            updates.append("email = ?")
            params.append(email_val)

        if req.phone is not None:
            phone_val = req.phone.strip() or None
            if phone_val:
                cursor.execute("SELECT id FROM users WHERE phone = ? AND id != ?", (phone_val, assistant_id))
                if cursor.fetchone():
                    raise HTTPException(status_code=400, detail="رقم الهاتف مسجل بحساب آخر")
            updates.append("phone = ?")
            params.append(phone_val)

        if req.status is not None:
            st = req.status.upper()
            updates.append("status = ?")
            params.append(st)
            updates.append("is_active = ?")
            params.append(1 if st == "ACTIVE" else 0)

        if not updates:
            return {"success": True, "message": "لا توجد تعديلات لتحديثها"}

        updates.append("updated_at = ?")
        params.append(now)
        params.append(assistant_id)

        sql = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(sql, params)

        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="UPDATE_ASSISTANT",
            target_type="ASSISTANT",
            target_id=assistant_id,
            target_name=req.name or existing["name"],
            details={"updates": updates},
            ip_address=client_ip,
            conn=conn
        )

        cursor.execute("SELECT id, name, email, phone, role, avatar, status, is_active, created_at, updated_at FROM users WHERE id = ?", (assistant_id,))
        updated_row = cursor.fetchone()

        return {
            "success": True,
            "assistant": dict(updated_row),
            "message": "تم تحديث بيانات المساعد بنجاح"
        }

@router.patch("/{assistant_id}/status")
def toggle_assistant_status(
    assistant_id: str,
    req: AssistantStatusUpdateRequest,
    request: Request = None,
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: Enable or disable assistant account."""
    client_ip = _get_client_ip(request)
    new_status = req.status.strip().upper()
    is_act = 1 if new_status == "ACTIVE" else 0
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ? AND role IN ('ASSISTANT', 'assistant')", (assistant_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="حساب المساعد غير موجود")

        cursor.execute("""
        UPDATE users
        SET status = ?, is_active = ?, updated_at = ?
        WHERE id = ?
        """, (new_status, is_act, now, assistant_id))

        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="STATUS_CHANGE_ASSISTANT",
            target_type="ASSISTANT",
            target_id=assistant_id,
            target_name=existing["name"],
            details={"status": new_status, "is_active": is_act},
            ip_address=client_ip,
            conn=conn
        )

        action_label = "تفعيل" if is_act == 1 else "تعطيل"
        return {
            "success": True,
            "status": new_status,
            "is_active": is_act,
            "message": f"تم {action_label} حساب المساعد بنجاح"
        }

@router.post("/{assistant_id}/reset-password")
def reset_assistant_password(
    assistant_id: str,
    req: AssistantResetPasswordRequest,
    request: Request = None,
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: Reset password for an assistant."""
    client_ip = _get_client_ip(request)
    raw_password = req.password.strip()
    if len(raw_password) < 6:
        raise HTTPException(status_code=400, detail="يجب أن تتكون كلمة المرور من 6 أحرف على الأقل")

    pw_hash = hash_password(raw_password)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ? AND role IN ('ASSISTANT', 'assistant')", (assistant_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="حساب المساعد غير موجود")

        cursor.execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", (pw_hash, now, assistant_id))

        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="RESET_PASSWORD_ASSISTANT",
            target_type="ASSISTANT",
            target_id=assistant_id,
            target_name=existing["name"],
            details={"message": "Password reset by Super Admin"},
            ip_address=client_ip,
            conn=conn
        )

        return {
            "success": True,
            "message": "تمت إعادة تعيين كلمة مرور المساعد بنجاح"
        }

@router.delete("/{assistant_id}")
def delete_assistant(
    assistant_id: str,
    request: Request = None,
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: Safely delete assistant account without breaking database relations."""
    client_ip = _get_client_ip(request)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (assistant_id,))
        target_user = cursor.fetchone()
        if not target_user:
            raise HTTPException(status_code=404, detail="الحساب غير موجود")

        if target_user["role"] in ("SUPER_ADMIN", "super_admin", "admin", "ADMIN"):
            raise HTTPException(status_code=400, detail="لا يمكن حذف حساب المشرف العام")

        user_name = target_user["name"]
        
        # Soft delete / safe purge
        cursor.execute("""
        UPDATE users
        SET is_deleted = 1, status = 'deleted', is_active = 0, deleted_at = ?, updated_at = ?
        WHERE id = ?
        """, (now, now, assistant_id))

        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="DELETE_ASSISTANT",
            target_type="ASSISTANT",
            target_id=assistant_id,
            target_name=user_name,
            details={"deleted_at": now},
            ip_address=client_ip,
            conn=conn
        )

        return {
            "success": True,
            "message": f"تم حذف حساب المساعد ({user_name}) بنجاح وبأمان"
        }
