"""
Code Spark - Complete Subscription Codes Management API Router
Handles:
1. Subscription Codes Generation (Single & Bulk)
2. Subscription Codes Listing, Search, Filter & Pagination
3. Subscription Code Details, Activation Status, Enable, Disable, Delete
4. Hashed Code Storage, Prefix Extraction, Masking & Duration Calculation
"""

import datetime
import json
import math
import secrets
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request

from ..database import get_db, log_activity
from ..dependencies import (
    get_current_admin, get_current_super_admin, get_current_staff,
    get_current_user, get_optional_user
)
from ..models import (
    SubscriptionGenerateRequest, SubscriptionStatusUpdateRequest
)
from ..subscription_utils import (
    generate_random_code, hash_code, mask_code, get_code_prefix,
    resolve_duration_days, compute_expiration_date, TYPE_LABELS
)

router = APIRouter(tags=["Subscription Codes"])


def _compute_code_status(code_dict: Dict[str, Any], now_str: str) -> str:
    """Compute effective code status considering disabled_at, usage, and expiration."""
    if code_dict.get("status") == "disabled" or code_dict.get("disabled_at"):
        return "disabled"
    
    max_uses = code_dict.get("max_uses") or 1
    uses_count = code_dict.get("uses_count") or 0
    if uses_count >= max_uses or code_dict.get("status") == "used":
        return "used"
    
    expires_at = code_dict.get("expires_at")
    if expires_at and expires_at <= now_str:
        return "expired"
    
    return "active"


# ==============================================================================
# ADMIN: SUBSCRIPTION CODES MANAGEMENT
# ==============================================================================

@router.post("/api/admin/subscriptions/generate")
def generate_subscription_codes(
    req: SubscriptionGenerateRequest,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Generate one or multiple subscription codes."""
    sub_type = req.type or "1_month"
    duration_days = resolve_duration_days(sub_type, req.duration_days)
    count = max(1, min(int(req.count or 1), 100))
    max_uses = max(1, int(req.max_uses or 1))
    notes = (req.notes or "").strip()

    now_dt = datetime.datetime.now(datetime.timezone.utc)
    now_str = now_dt.isoformat()

    generated_output = []

    with get_db() as conn:
        cursor = conn.cursor()
        
        for _ in range(count):
            attempts = 0
            raw_code = ""
            c_hash = ""
            while attempts < 20:
                raw_code = generate_random_code()
                c_hash = hash_code(raw_code)
                cursor.execute("SELECT id FROM subscription_codes WHERE code_hash = ?", (c_hash,))
                if not cursor.fetchone():
                    break
                attempts += 1

            now_ms = int(now_dt.timestamp() * 1000)
            rand_suffix = secrets.token_hex(4)
            code_id = f"sub_{now_ms}_{rand_suffix}"
            code_prefix = get_code_prefix(raw_code)
            masked = mask_code(raw_code)

            cursor.execute("""
            INSERT INTO subscription_codes (
                id, code_hash, code_prefix, masked_code, status,
                subscription_type, duration_days, max_uses, uses_count,
                assigned_user_id, notes, created_at, activated_at, expires_at, disabled_at
            )
            VALUES (?, ?, ?, ?, 'active', ?, ?, ?, 0, NULL, ?, ?, NULL, NULL, NULL)
            """, (
                code_id, c_hash, code_prefix, masked,
                sub_type, duration_days, max_uses, notes, now_str
            ))

            generated_output.append({
                "id": code_id,
                "code": raw_code,
                "masked_code": masked,
                "prefix": code_prefix,
                "status": "active",
                "subscription_type": sub_type,
                "type_label": TYPE_LABELS.get(sub_type, "اشتراك"),
                "duration_days": duration_days,
                "max_uses": max_uses,
                "created_at": now_str
            })

    msg = f"تم إنشاء كود الاشتراك بنجاح" if count == 1 else f"تم إنشاء {count} أكواد اشتراك بنجاح"
    return {
        "success": True,
        "count": count,
        "subscription_type": sub_type,
        "duration_days": duration_days,
        "generated_codes": generated_output,
        "message": f"{msg}. يرجى حفظ أو نسخ الأكواد الآن لأنها لن تظهر مجددًا بالنص الصريح لأسباب أمنية."
    }


@router.get("/api/admin/subscriptions")
def list_subscription_codes(
    status_filter: Optional[str] = Query(None, alias="status"),
    type_filter: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    admin: dict = Depends(get_current_admin)
):
    """Admin: List subscription codes with search, filter, and pagination."""
    page = max(1, page)
    limit = max(1, min(limit, 100))
    offset = (page - 1) * limit
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT id, status, max_uses, uses_count, expires_at, disabled_at FROM subscription_codes")
        all_codes = cursor.fetchall()
        
        total_count = len(all_codes)
        available_count = 0
        used_count = 0
        expired_count = 0
        disabled_count = 0

        for c in all_codes:
            c_dict = dict(c)
            eff_status = _compute_code_status(c_dict, now_str)
            if eff_status == "active":
                available_count += 1
            elif eff_status == "used":
                used_count += 1
            elif eff_status == "expired":
                expired_count += 1
            elif eff_status == "disabled":
                disabled_count += 1

        summary = {
            "total": total_count,
            "available": available_count,
            "used": used_count,
            "expired": expired_count,
            "disabled": disabled_count
        }

        base_query = """
        SELECT sc.id, sc.code_prefix, sc.masked_code, sc.status, sc.subscription_type,
               sc.duration_days, sc.max_uses, sc.uses_count, sc.assigned_user_id,
               sc.notes, sc.created_at, sc.activated_at, sc.expires_at, sc.disabled_at,
               u.name as assigned_user_name, u.phone as assigned_user_phone, u.email as assigned_user_email,
               sp.grade as assigned_user_grade
        FROM subscription_codes sc
        LEFT JOIN users u ON sc.assigned_user_id = u.id
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        """
        where_clauses = []
        params = []

        if type_filter and type_filter != "all":
            where_clauses.append("sc.subscription_type = ?")
            params.append(type_filter)

        if status_filter and status_filter != "all":
            if status_filter == "disabled":
                where_clauses.append("(sc.status = 'disabled' OR sc.disabled_at IS NOT NULL)")
            elif status_filter == "used":
                where_clauses.append("(sc.uses_count >= sc.max_uses OR sc.status = 'used')")
            elif status_filter == "expired":
                where_clauses.append("(sc.expires_at IS NOT NULL AND sc.expires_at <= ? AND sc.uses_count < sc.max_uses AND sc.status != 'disabled')")
                params.append(now_str)
            elif status_filter == "active" or status_filter == "available":
                where_clauses.append("(sc.status = 'active' AND (sc.disabled_at IS NULL) AND sc.uses_count < sc.max_uses AND (sc.expires_at IS NULL OR sc.expires_at > ?))")
                params.append(now_str)

        if search and search.strip():
            s = f"%{search.strip()}%"
            where_clauses.append("(sc.code_prefix LIKE ? OR sc.masked_code LIKE ? OR u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR sc.notes LIKE ?)")
            params.extend([s, s, s, s, s, s])

        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)

        count_sql = f"SELECT COUNT(*) as cnt FROM ({base_query}) subq"
        cursor.execute(count_sql, params)
        filtered_count = cursor.fetchone()["cnt"]

        page_sql = base_query + " ORDER BY sc.created_at DESC LIMIT ? OFFSET ?"
        page_params = list(params) + [limit, offset]
        cursor.execute(page_sql, page_params)
        rows = cursor.fetchall()

        results = []
        for r in rows:
            row_dict = dict(r)
            eff_status = _compute_code_status(row_dict, now_str)
            row_dict["status"] = eff_status
            row_dict["type_label"] = TYPE_LABELS.get(row_dict.get("subscription_type"), "اشتراك")
            results.append(row_dict)

        total_pages = max(1, math.ceil(filtered_count / limit)) if filtered_count > 0 else 1

        return {
            "success": True,
            "summary": summary,
            "codes": results,
            "pagination": {
                "page": page,
                "page_size": limit,
                "total_count": filtered_count,
                "total_pages": total_pages
            }
        }


@router.get("/api/admin/subscriptions/{code_id}")
def get_subscription_code_detail(
    code_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Retrieve single subscription code details."""
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT sc.id, sc.code_prefix, sc.masked_code, sc.status, sc.subscription_type,
               sc.duration_days, sc.max_uses, sc.uses_count, sc.assigned_user_id,
               sc.notes, sc.created_at, sc.activated_at, sc.expires_at, sc.disabled_at,
               u.name as assigned_user_name, u.phone as assigned_user_phone, u.email as assigned_user_email,
               sp.grade as assigned_user_grade
        FROM subscription_codes sc
        LEFT JOIN users u ON sc.assigned_user_id = u.id
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE sc.id = ?
        """, (code_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="كود الاشتراك غير موجود")

        data = dict(row)
        data["status"] = _compute_code_status(data, now_str)
        data["type_label"] = TYPE_LABELS.get(data.get("subscription_type"), "اشتراك")
        return {"success": True, "code": data}


@router.post("/api/admin/subscriptions/{code_id}/disable")
def disable_subscription_code(
    code_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Disable subscription code."""
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM subscription_codes WHERE id = ?", (code_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="كود الاشتراك غير موجود")

        cursor.execute("""
        UPDATE subscription_codes
        SET status = 'disabled', disabled_at = ?
        WHERE id = ?
        """, (now_str, code_id))

        return {"success": True, "message": "تم تعطيل كود الاشتراك بنجاح"}


@router.post("/api/admin/subscriptions/{code_id}/enable")
def enable_subscription_code(
    code_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Re-enable subscription code."""
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, status, uses_count, max_uses, expires_at FROM subscription_codes WHERE id = ?", (code_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="كود الاشتراك غير موجود")

        row_dict = dict(row)
        if row_dict.get("uses_count", 0) >= row_dict.get("max_uses", 1):
            raise HTTPException(status_code=400, detail="لا يمكن إعادة تفعيل كود تم استخدامه بالكامل بالفعل")

        if row_dict.get("expires_at") and row_dict["expires_at"] <= now_str:
            raise HTTPException(status_code=400, detail="لا يمكن تفعيل كود منتهي الصلاحية")

        cursor.execute("""
        UPDATE subscription_codes
        SET status = 'active', disabled_at = NULL
        WHERE id = ?
        """, (code_id,))

        return {"success": True, "message": "تم إعادة تفعيل كود الاشتراك بنجاح"}


@router.delete("/api/admin/subscriptions/{code_id}")
def delete_subscription_code(
    code_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Delete unused subscription code."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, status, uses_count, assigned_user_id FROM subscription_codes WHERE id = ?", (code_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="كود الاشتراك غير موجود")

        row_dict = dict(row)
        if row_dict.get("uses_count", 0) > 0 or row_dict.get("assigned_user_id") or row_dict.get("status") == "used":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="لا يمكن حذف كود اشتراك تم استخدامه وتفعيله لطالب بالفعل"
            )

        cursor.execute("DELETE FROM subscription_codes WHERE id = ?", (code_id,))
        return {"success": True, "message": "تم حذف كود الاشتراك بنجاح"}
