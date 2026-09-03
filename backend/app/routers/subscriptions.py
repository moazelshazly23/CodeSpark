"""
Code Spark - Complete Subscription Codes & Offers Management API Router
Handles:
1. Subscription Codes Generation (Single & Bulk) with strict RBAC:
   - Super Admin: All durations (1 Month, 3 Months, 6 Months, 1 Year, Lifetime, Custom).
   - Assistant: Strictly 1-Month (30 Days) ONLY.
2. Subscription Codes Listing, Search, Filter & Pagination
3. Subscription Code Details, Activation Status, Enable, Disable, Delete
4. Hashed Code Storage, Prefix Extraction, Masking & Duration Calculation
5. Dynamic Subscription Offers / Packages Management (CRUD & Public Listing)
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
    get_current_user, get_optional_user, get_current_student
)
from ..models import (
    SubscriptionGenerateRequest, SubscriptionStatusUpdateRequest,
    SubscriptionOfferCreateRequest, SubscriptionOfferUpdateRequest, SubscriptionRedeemRequest
)
from ..subscription_utils import (
    generate_random_code, hash_code, mask_code, get_code_prefix,
    resolve_duration_days, compute_expiration_date, TYPE_LABELS
)

router = APIRouter(tags=["Subscription Codes & Offers"])


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
# PUBLIC & STUDENT: SUBSCRIPTION OFFERS / PACKAGES
# ==============================================================================

@router.get("/api/subscriptions/offers")
@router.get("/api/subscriptions/packages")
def get_public_subscription_offers():
    """Public / Student: Retrieve all active subscription offers."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, name, title, duration_type, duration_days, price, currency,
               description, badge, features_json, image_url, is_active, status, display_order, created_at, updated_at
        FROM subscription_offers
        WHERE is_active = 1 AND (status = 'active' OR status = 'ACTIVE')
        ORDER BY display_order ASC, price ASC
        """)
        rows = cursor.fetchall()
        offers = []
        for r in rows:
            d = dict(r)
            if d.get("features_json"):
                try:
                    d["features"] = json.loads(d["features_json"])
                except Exception:
                    d["features"] = []
            else:
                d["features"] = []
            offers.append(d)
        
        return {
            "success": True,
            "count": len(offers),
            "offers": offers,
            "packages": offers  # Alias for backward compatibility
        }


# ==============================================================================
# ADMIN: SUBSCRIPTION OFFERS / PACKAGES CRUD
# ==============================================================================

@router.get("/api/admin/subscriptions/offers")
@router.get("/api/admin/subscriptions/packages")
def list_admin_subscription_offers(
    admin: dict = Depends(get_current_staff)
):
    """Staff / Admin: List all subscription offers (including inactive)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, name, title, duration_type, duration_days, price, currency,
               description, badge, features_json, image_url, is_active, status, display_order, created_at, updated_at
        FROM subscription_offers
        ORDER BY display_order ASC, created_at DESC
        """)
        rows = cursor.fetchall()
        offers = []
        for r in rows:
            d = dict(r)
            if d.get("features_json"):
                try:
                    d["features"] = json.loads(d["features_json"])
                except Exception:
                    d["features"] = []
            else:
                d["features"] = []
            offers.append(d)
        
        return {
            "success": True,
            "count": len(offers),
            "offers": offers,
            "packages": offers
        }


@router.post("/api/admin/subscriptions/offers")
@router.post("/api/admin/subscriptions/packages")
def create_subscription_offer(
    req: SubscriptionOfferCreateRequest,
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: Create a new subscription offer / package."""
    title = (req.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="عنوان باقة الاشتراك مطلوب")
    
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ms = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    rand_hex = secrets.token_hex(3)
    offer_id = f"pack_{req.duration_type}_{rand_hex}"
    
    name = req.name or title
    duration_type = req.duration_type or "1_month"
    duration_days = resolve_duration_days(duration_type, req.duration_days)
    price = float(req.price or 99.0)
    currency = req.currency or "EGP"
    description = req.description or ""
    badge = req.badge or None
    is_active = 1 if req.is_active is not False else 0
    status_val = "active" if is_active == 1 else "inactive"
    display_order = int(req.display_order or 0)
    
    features_json = req.features_json
    if not features_json and req.features:
        features_json = json.dumps(req.features, ensure_ascii=False)
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO subscription_offers (
            id, name, title, duration_type, duration_days, price, currency,
            description, badge, features_json, image_url, is_active, status, display_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            offer_id, name, title, duration_type, duration_days, price, currency,
            description, badge, features_json, req.image_url, is_active, status_val, display_order, now, now
        ))
        
        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="CREATE_SUBSCRIPTION_OFFER",
            target_type="SUBSCRIPTION_OFFER",
            target_id=offer_id,
            target_name=title,
            details={"price": price, "duration_type": duration_type},
            conn=conn
        )
        
        return {
            "success": True,
            "offer_id": offer_id,
            "package_id": offer_id,
            "message": "تم إنشاء باقة الاشتراك بنجاح"
        }


@router.get("/api/admin/subscriptions/offers/{offer_id}")
@router.get("/api/admin/subscriptions/packages/{offer_id}")
def get_subscription_offer(
    offer_id: str,
    admin: dict = Depends(get_current_staff)
):
    """Staff / Admin: Get single subscription offer details."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, name, title, duration_type, duration_days, price, currency,
               description, badge, features_json, image_url, is_active, status, display_order, created_at, updated_at
        FROM subscription_offers
        WHERE id = ?
        """, (offer_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="باقة الاشتراك غير موجودة")
        
        d = dict(row)
        if d.get("features_json"):
            try:
                d["features"] = json.loads(d["features_json"])
            except Exception:
                d["features"] = []
        else:
            d["features"] = []
            
        return {"success": True, "offer": d, "package": d}


@router.put("/api/admin/subscriptions/offers/{offer_id}")
@router.put("/api/admin/subscriptions/packages/{offer_id}")
def update_subscription_offer(
    offer_id: str,
    req: SubscriptionOfferUpdateRequest,
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: Update subscription offer details."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM subscription_offers WHERE id = ?", (offer_id,))
        existing = cursor.fetchone()
        if not existing:
            # If pack_pro or standard package doesn't exist yet, insert it gracefully
            cursor.execute("""
            INSERT INTO subscription_offers (
                id, name, title, duration_type, duration_days, price, currency,
                description, badge, features_json, is_active, status, display_order, created_at, updated_at
            ) VALUES (?, ?, ?, '1_month', 30, 99.0, 'EGP', '', NULL, NULL, 1, 'active', 0, ?, ?)
            """, (offer_id, req.name or req.title or offer_id, req.title or req.name or offer_id, now, now))
            existing = {"id": offer_id, "title": req.title or offer_id}

        updates = []
        params = []
        
        if req.title is not None:
            updates.append("title = ?")
            params.append(req.title.strip())
        if req.name is not None:
            updates.append("name = ?")
            params.append(req.name.strip())
        if req.duration_type is not None:
            updates.append("duration_type = ?")
            params.append(req.duration_type)
            updates.append("duration_days = ?")
            params.append(resolve_duration_days(req.duration_type, req.duration_days))
        elif req.duration_days is not None:
            updates.append("duration_days = ?")
            params.append(req.duration_days)
        if req.price is not None:
            updates.append("price = ?")
            params.append(float(req.price))
        if req.currency is not None:
            updates.append("currency = ?")
            params.append(req.currency)
        if req.description is not None:
            updates.append("description = ?")
            params.append(req.description)
        if req.badge is not None:
            updates.append("badge = ?")
            params.append(req.badge)
        if req.features_json is not None:
            updates.append("features_json = ?")
            params.append(req.features_json)
        elif req.features is not None:
            updates.append("features_json = ?")
            params.append(json.dumps(req.features, ensure_ascii=False))
        if req.image_url is not None:
            updates.append("image_url = ?")
            params.append(req.image_url)
        if req.is_active is not None:
            act = 1 if req.is_active else 0
            updates.append("is_active = ?")
            params.append(act)
            updates.append("status = ?")
            params.append("active" if act == 1 else "inactive")
        if req.display_order is not None:
            updates.append("display_order = ?")
            params.append(int(req.display_order))

        if updates:
            updates.append("updated_at = ?")
            params.append(now)
            params.append(offer_id)
            sql = f"UPDATE subscription_offers SET {', '.join(updates)} WHERE id = ?"
            cursor.execute(sql, params)

        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="UPDATE_SUBSCRIPTION_OFFER",
            target_type="SUBSCRIPTION_OFFER",
            target_id=offer_id,
            target_name=req.title or existing["title"],
            conn=conn
        )

        cursor.execute("SELECT * FROM subscription_offers WHERE id = ?", (offer_id,))
        updated_row = dict(cursor.fetchone())
        return {
            "success": True,
            "offer": updated_row,
            "package": updated_row,
            "message": "تم تحديث باقة الاشتراك بنجاح"
        }


@router.patch("/api/admin/subscriptions/offers/{offer_id}/status")
@router.patch("/api/admin/subscriptions/packages/{offer_id}/status")
def toggle_subscription_offer_status(
    offer_id: str,
    req: SubscriptionStatusUpdateRequest,
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: Enable or disable subscription offer."""
    st = req.status.strip().lower()
    is_act = 1 if st in ("active", "1", "true") else 0
    status_val = "active" if is_act == 1 else "inactive"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT title FROM subscription_offers WHERE id = ?", (offer_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="باقة الاشتراك غير موجودة")

        cursor.execute("""
        UPDATE subscription_offers
        SET is_active = ?, status = ?, updated_at = ?
        WHERE id = ?
        """, (is_act, status_val, now, offer_id))

        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="STATUS_SUBSCRIPTION_OFFER",
            target_type="SUBSCRIPTION_OFFER",
            target_id=offer_id,
            target_name=row["title"],
            details={"status": status_val, "is_active": is_act},
            conn=conn
        )

        return {
            "success": True,
            "is_active": is_act,
            "status": status_val,
            "message": f"تم {'تفعيل' if is_act == 1 else 'تعطيل'} باقة الاشتراك بنجاح"
        }


@router.delete("/api/admin/subscriptions/offers/{offer_id}")
@router.delete("/api/admin/subscriptions/packages/{offer_id}")
def delete_subscription_offer(
    offer_id: str,
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: Delete subscription offer."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT title FROM subscription_offers WHERE id = ?", (offer_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="باقة الاشتراك غير موجودة")

        cursor.execute("DELETE FROM subscription_offers WHERE id = ?", (offer_id,))
        
        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="DELETE_SUBSCRIPTION_OFFER",
            target_type="SUBSCRIPTION_OFFER",
            target_id=offer_id,
            target_name=row["title"],
            conn=conn
        )

        return {"success": True, "message": "تم حذف باقة الاشتراك بنجاح"}


# ==============================================================================
# STAFF & ADMIN: SUBSCRIPTION CODES MANAGEMENT
# ==============================================================================

@router.post("/api/admin/subscriptions/generate")
def generate_subscription_codes(
    req: SubscriptionGenerateRequest,
    admin: dict = Depends(get_current_staff)
):
    """
    Generate subscription codes.
    - Super Admin: Can create any duration.
    - Assistant: Restricted strictly to 1-Month (30 Days) ONLY.
    """
    sub_type = req.type or "1_month"
    duration_days = resolve_duration_days(sub_type, req.duration_days)
    
    # Strict RBAC enforcement for Assistant
    if admin.get("is_assistant") and not admin.get("is_super_admin"):
        if sub_type != "1_month" or (duration_days is not None and duration_days != 30):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="المساعد التعليمي مصرح له بإنشاء أكواد اشتراك شهرية فقط (1 Month)"
            )

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

        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="GENERATE_SUBSCRIPTION_CODES",
            target_type="SUBSCRIPTION_CODE",
            target_id=generated_output[0]["id"] if generated_output else None,
            target_name=f"{count} codes ({sub_type})",
            details={"count": count, "type": sub_type, "duration_days": duration_days},
            conn=conn
        )

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
    admin: dict = Depends(get_current_staff)
):
    """Staff / Admin: List subscription codes with search, filter, and pagination."""
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
                where_clauses.append("(sc.status = 'active' AND (sc.disabled_at IS NULL) AND (sc.uses_count < sc.max_uses) AND (sc.expires_at IS NULL OR sc.expires_at > ?))")
                params.append(now_str)

        if search and search.strip():
            s = f"%{search.strip()}%"
            where_clauses.append("(sc.code_prefix LIKE ? OR sc.masked_code LIKE ? OR sc.id LIKE ? OR u.name LIKE ? OR u.phone LIKE ? OR sc.notes LIKE ?)")
            params.extend([s, s, s, s, s, s])

        where_str = ""
        if where_clauses:
            where_str = " WHERE " + " AND ".join(where_clauses)

        # Count total matching
        count_sql = f"SELECT COUNT(*) as cnt FROM subscription_codes sc LEFT JOIN users u ON sc.assigned_user_id = u.id {where_str}"
        cursor.execute(count_sql, params)
        filtered_count = cursor.fetchone()["cnt"]

        # Fetch page items
        fetch_sql = f"{base_query} {where_str} ORDER BY sc.created_at DESC LIMIT ? OFFSET ?"
        page_params = list(params) + [limit, offset]
        cursor.execute(fetch_sql, page_params)
        rows = cursor.fetchall()

        items = []
        for r in rows:
            item = dict(r)
            eff_status = _compute_code_status(item, now_str)
            item["status"] = eff_status
            item["type_label"] = TYPE_LABELS.get(item["subscription_type"], "اشتراك")
            items.append(item)

        total_pages = math.ceil(filtered_count / limit) if filtered_count > 0 else 1

        return {
            "success": True,
            "summary": summary,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_items": filtered_count,
                "total_pages": total_pages
            },
            "codes": items
        }


@router.get("/api/admin/subscriptions/{code_id}")
def get_subscription_code_details(
    code_id: str,
    admin: dict = Depends(get_current_staff)
):
    """Staff / Admin: Retrieve single subscription code details."""
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
        WHERE sc.id = ? OR sc.code_prefix = ?
        """, (code_id, code_id))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="كود الاشتراك غير موجود")

        data = dict(row)
        data["status"] = _compute_code_status(data, now_str)
        data["type_label"] = TYPE_LABELS.get(data["subscription_type"], "اشتراك")
        return {"success": True, "code": data}


@router.post("/api/admin/subscriptions/{code_id}/disable")
def disable_subscription_code(
    code_id: str,
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: Disable an active subscription code."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, status, masked_code FROM subscription_codes WHERE id = ?", (code_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="كود الاشتراك غير موجود")

        cursor.execute("""
        UPDATE subscription_codes
        SET status = 'disabled', disabled_at = ?
        WHERE id = ?
        """, (now, code_id))

        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="DISABLE_SUBSCRIPTION_CODE",
            target_type="SUBSCRIPTION_CODE",
            target_id=code_id,
            target_name=row["masked_code"],
            conn=conn
        )

        return {"success": True, "message": "تم تعطيل كود الاشتراك بنجاح"}


@router.post("/api/admin/subscriptions/{code_id}/enable")
def enable_subscription_code(
    code_id: str,
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: Re-enable a disabled subscription code."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, status, masked_code, uses_count, max_uses FROM subscription_codes WHERE id = ?", (code_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="كود الاشتراك غير موجود")

        new_status = "used" if row["uses_count"] >= row["max_uses"] else "active"
        cursor.execute("""
        UPDATE subscription_codes
        SET status = ?, disabled_at = NULL
        WHERE id = ?
        """, (new_status, code_id))

        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="ENABLE_SUBSCRIPTION_CODE",
            target_type="SUBSCRIPTION_CODE",
            target_id=code_id,
            target_name=row["masked_code"],
            conn=conn
        )

        return {"success": True, "status": new_status, "message": "تم إعادة تفعيل كود الاشتراك بنجاح"}


@router.delete("/api/admin/subscriptions/{code_id}")
def delete_subscription_code(
    code_id: str,
    admin: dict = Depends(get_current_super_admin)
):
    """Super Admin: Safely delete a subscription code record."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, masked_code, status, uses_count FROM subscription_codes WHERE id = ?", (code_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="كود الاشتراك غير موجود")

        if row["uses_count"] > 0 or row["status"] == "used":
            raise HTTPException(status_code=400, detail="لا يمكن حذف كود اشتراك تم استخدامه وتفعيله بالفعل")

        cursor.execute("DELETE FROM subscription_codes WHERE id = ?", (code_id,))

        log_activity(
            user_id=admin["id"],
            user_name=admin["name"],
            user_role=admin["role"],
            action="DELETE_SUBSCRIPTION_CODE",
            target_type="SUBSCRIPTION_CODE",
            target_id=code_id,
            target_name=row["masked_code"],
            conn=conn
        )

        return {"success": True, "message": "تم حذف سجل كود الاشتراك بنجاح"}


# ==================== STUDENT CODE REDEMPTION & ACTIVATION ====================

@router.post("/redeem")
@router.post("/activate")
@router.post("/api/subscriptions/redeem")
@router.post("/api/subscriptions/activate")
@router.post("/api/student/redeem")
def redeem_subscription_code(req: SubscriptionRedeemRequest, student: dict = Depends(get_current_student)):
    """
    Student activates their subscription using a code post-login.
    Validates code existence, active status, expiration, and prevents double-use.
    Atomically binds code to student and activates subscription.
    """
    raw_code = (req.code or "").strip().upper()
    if not raw_code:
        raise HTTPException(status_code=400, detail="يرجى إدخال كود الاشتراك للتفعيل")

    c_hash = hash_code(raw_code)
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    now_str = now_dt.isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
        SELECT id, code_prefix, masked_code, status, subscription_type,
               duration_days, max_uses, uses_count, expires_at, disabled_at
        FROM subscription_codes
        WHERE code_hash = ?
        """, (c_hash,))
        code_row = cursor.fetchone()

        if not code_row:
            raise HTTPException(status_code=400, detail="كود الاشتراك غير صحيح أو غير موجود")

        code_data = dict(code_row)
        if code_data.get("status") == "disabled" or code_data.get("disabled_at"):
            raise HTTPException(status_code=400, detail="كود الاشتراك معطل، يرجى التواصل مع الإدارة")

        max_uses = code_data.get("max_uses") or 1
        uses_count = code_data.get("uses_count") or 0
        if uses_count >= max_uses or code_data.get("status") == "used":
            raise HTTPException(status_code=400, detail="تم استخدام كود الاشتراك هذا من قبل")

        if code_data.get("expires_at") and code_data["expires_at"] <= now_str:
            raise HTTPException(status_code=400, detail="انتهت صلاحية كود الاشتراك المدخل")

        sub_duration_days = code_data.get("duration_days") or 30
        sub_type = code_data.get("subscription_type") or "1_month"
        computed_expires_at = compute_expiration_date(now_dt, sub_duration_days)
        masked_val = code_data.get("masked_code") or mask_code(raw_code)

        # Atomically claim code
        cursor.execute("""
        UPDATE subscription_codes
        SET uses_count = uses_count + 1,
            status = CASE WHEN (uses_count + 1) >= max_uses THEN 'used' ELSE 'active' END,
            assigned_user_id = ?,
            activated_at = ?,
            expires_at = COALESCE(expires_at, ?)
        WHERE id = ? AND uses_count < max_uses AND (status = 'active' OR status IS NULL) AND disabled_at IS NULL
        """, (student["id"], now_str, computed_expires_at, code_data["id"]))

        if cursor.rowcount == 0:
            raise HTTPException(status_code=400, detail="تم استخدام كود الاشتراك في هذه اللحظة من قِبل مستخدم آخر")

        # Update student_profiles
        cursor.execute("""
        UPDATE student_profiles
        SET subscription_code = ?,
            subscription_status = 'active',
            subscription_start = ?,
            subscription_expires_at = ?,
            subscription_duration_days = ?,
            subscription_type = ?,
            subscription_code_id = ?,
            updated_at = ?
        WHERE user_id = ?
        """, (
            masked_val, now_str, computed_expires_at, sub_duration_days, sub_type,
            code_data["id"], now_str, student["id"]
        ))

        # Insert Notification
        notif_id = f"notif_{secrets.token_hex(4)}"
        sub_label = TYPE_LABELS.get(sub_type, sub_type)
        cursor.execute("""
        INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
        VALUES (?, ?, '🎉 تم تفعيل اشتراكك بنجاح!', ?, 'system', 0, ?)
        """, (
            notif_id, student["id"],
            f"تم تفعيل اشتراكك في باقة ({sub_label}) بنجاح! ينتهي في: {computed_expires_at[:10]}.",
            now_str
        ))

        log_activity(
            user_id=student["id"],
            user_name=student["name"],
            user_role="STUDENT",
            action="STUDENT_ACTIVATED_SUBSCRIPTION",
            target_type="SUBSCRIPTION_CODE",
            target_name=masked_val,
            details={"duration_days": sub_duration_days, "expires_at": computed_expires_at, "type": sub_type}
        )

        return {
            "success": True,
            "message": "تم تفعيل الاشتراك بنجاح 🎉",
            "subscription": {
                "status": "active",
                "type": sub_type,
                "label": sub_label,
                "duration_days": sub_duration_days,
                "starts_at": now_str,
                "expires_at": computed_expires_at
            }
        }
