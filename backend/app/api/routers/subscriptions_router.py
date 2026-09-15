from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import json
import os
import re

from app.schemas.all_schemas import CodeGenerateRequest, CodeValidateRequest, CodeActivateRequest
from app.services.core_services import SubscriptionService
from app.api.deps import get_current_user, require_role, require_permission, get_optional_user
from app.repositories.all_repositories import SubscriptionRepository
from app.core.config import settings
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions & Activation Requests"])

class SubscriptionPlanCreate(BaseModel):
    name: str
    duration_months: int
    price: float
    is_active: Optional[bool] = True
    order_index: Optional[int] = 0
    features: Optional[List[str]] = []

class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    duration_months: Optional[int] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None
    order_index: Optional[int] = None
    features: Optional[List[str]] = None

class SubscriptionRequestCreate(BaseModel):
    plan_id: str
    phone: str
    payment_reference: str
    payment_method: Optional[str] = "InstaPay"
    transfer_date: Optional[str] = None
    proof_file_url: Optional[str] = None
    admin_notes: Optional[str] = None

class SubscriptionRequestReject(BaseModel):
    rejection_reason: str

class PaymentSettingsUpdate(BaseModel):
    payment_phone: str
    instapay_link: Optional[str] = None
    contact_phone: Optional[str] = None

def get_db_payment_settings() -> Dict[str, Any]:
    row = db_engine.fetch_one("SELECT value_json FROM platform_settings WHERE key = 'general'")
    data = json.loads(row["value_json"]) if row else {}
    return {
        "payment_phone": data.get("payment_phone") or getattr(settings, "INSTAPAY_PHONE", "+20159159038"),
        "instapay_phone": data.get("payment_phone") or getattr(settings, "INSTAPAY_PHONE", "+20159159038"),
        "contact_phone": data.get("contact_phone") or getattr(settings, "OFFICIAL_CONTACT_PHONE", "+201559159038"),
        "instapay_link": data.get("instapay_link") or getattr(settings, "INSTAPAY_LINK", "https://ipn.eg/S/moazasem/instapay/27DsGj")
    }

@router.get("/payment-info")
def get_payment_info():
    return get_db_payment_settings()

@router.put("/admin/payment-info")
def update_payment_info(req: PaymentSettingsUpdate, user: Dict[str, Any] = Depends(require_role("admin"))):
    clean_num = req.payment_phone.strip()
    if not clean_num or len(clean_num) < 8:
        raise HTTPException(status_code=400, detail="رقم التحويل غير صالح، يجب إدخال رقم صحيح")

    row = db_engine.fetch_one("SELECT value_json FROM platform_settings WHERE key = 'general'")
    curr = json.loads(row["value_json"]) if row else {}
    curr["payment_phone"] = clean_num
    curr["instapay_phone"] = clean_num
    if req.instapay_link:
        curr["instapay_link"] = req.instapay_link.strip()
    if req.contact_phone:
        curr["contact_phone"] = req.contact_phone.strip()

    db_engine.execute(
        "UPDATE platform_settings SET value_json = ?, updated_at = ? WHERE key = 'general'",
        (json.dumps(curr, ensure_ascii=False), now_iso())
    )
    return {"success": True, "message": "تم تحديث بيانات الدفع والتحويل بنجاح", "settings": get_db_payment_settings()}

@router.get("/plans")
def list_active_plans():
    rows = db_engine.fetch_all(
        "SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY order_index ASC, duration_months ASC"
    )
    for r in rows:
        try:
            r["features"] = json.loads(r.get("features_json") or "[]")
        except Exception:
            r["features"] = []
    return rows

@router.get("/admin/plans")
def list_all_plans_admin(user: Dict[str, Any] = Depends(require_role("admin", "assistant"))):
    rows = db_engine.fetch_all(
        "SELECT * FROM subscription_plans ORDER BY order_index ASC, duration_months ASC"
    )
    for r in rows:
        try:
            r["features"] = json.loads(r.get("features_json") or "[]")
        except Exception:
            r["features"] = []
        r["total_requests"] = db_engine.fetch_val(
            "SELECT COUNT(*) FROM subscription_requests WHERE plan_id = ?", (r["id"],)
        ) or 0
    return rows

@router.post("/admin/plans", status_code=status.HTTP_201_CREATED)
def create_plan_admin(req: SubscriptionPlanCreate, user: Dict[str, Any] = Depends(require_role("admin"))):
    if req.duration_months < 1:
        raise HTTPException(status_code=400, detail="مدة الباقة يجب أن تكون شهر واحد على الأقل")
    if req.price < 0:
        raise HTTPException(status_code=400, detail="السعر لا يمكن أن يكون سالباً")

    plan_id = f"plan_{req.duration_months}m_{uuid.uuid4().hex[:6]}"
    now = now_iso()
    rec = {
        "id": plan_id,
        "name": req.name.strip(),
        "duration_months": req.duration_months,
        "price": float(req.price),
        "is_active": 1 if req.is_active else 0,
        "order_index": req.order_index or req.duration_months,
        "features_json": json.dumps(req.features or [], ensure_ascii=False),
        "created_at": now,
        "updated_at": now
    }
    db_engine.insert("subscription_plans", rec)
    rec["features"] = req.features or []
    return {"success": True, "message": "تمت إضافة الباقة بنجاح", "plan": rec}

@router.put("/admin/plans/{plan_id}")
def update_plan_admin(plan_id: str, req: SubscriptionPlanUpdate, user: Dict[str, Any] = Depends(require_role("admin"))):
    existing = db_engine.fetch_one("SELECT * FROM subscription_plans WHERE id = ?", (plan_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="الباقة غير موجودة")

    updates = {}
    if req.name is not None:
        updates["name"] = req.name.strip()
    if req.duration_months is not None:
        if req.duration_months < 1:
            raise HTTPException(status_code=400, detail="مدة الباقة يجب أن تكون شهر واحد على الأقل")
        updates["duration_months"] = req.duration_months
    if req.price is not None:
        if req.price < 0:
            raise HTTPException(status_code=400, detail="السعر لا يمكن أن يكون سالباً")
        updates["price"] = float(req.price)
    if req.is_active is not None:
        updates["is_active"] = 1 if req.is_active else 0
    if req.order_index is not None:
        updates["order_index"] = req.order_index
    if req.features is not None:
        updates["features_json"] = json.dumps(req.features, ensure_ascii=False)

    updates["updated_at"] = now_iso()
    updated = db_engine.update("subscription_plans", plan_id, updates)
    try:
        updated["features"] = json.loads(updated.get("features_json") or "[]")
    except Exception:
        updated["features"] = []
    return {"success": True, "message": "تم تحديث بيانات الباقة بنجاح", "plan": updated}

@router.delete("/admin/plans/{plan_id}")
def delete_plan_admin(plan_id: str, user: Dict[str, Any] = Depends(require_role("admin"))):
    existing = db_engine.fetch_one("SELECT * FROM subscription_plans WHERE id = ?", (plan_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="الباقة غير موجودة")

    used_count = db_engine.fetch_val("SELECT COUNT(*) FROM subscription_requests WHERE plan_id = ?", (plan_id,)) or 0
    if used_count > 0:
        db_engine.update("subscription_plans", plan_id, {"is_active": 0, "updated_at": now_iso()})
        return {"success": True, "message": "تم تعطيل الباقة بنجاح للحفاظ على سجلات المعاملات السابقة"}
    else:
        db_engine.delete("subscription_plans", plan_id)
        return {"success": True, "message": "تم حذف الباقة بنجاح"}

@router.post("/upload-screenshot")
async def upload_transfer_screenshot(file: UploadFile = File(...), user: Dict[str, Any] = Depends(get_current_user)):
    allowed_exts = ["png", "jpg", "jpeg", "webp"]
    orig_name = file.filename or "screenshot.jpg"
    ext = orig_name.split(".")[-1].lower() if "." in orig_name else ""
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"نوع الصورة غير مدعوم (. {ext}). يرجى رفع صورة بصيغة PNG أو JPG أو WEBP")

    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="الملف المرفوع ليس صورة صالحة")

    contents = await file.read()
    max_size = 10 * 1024 * 1024
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="حجم الصورة يتجاوز الحد الأقصى المسموح (10 ميجابايت)")

    clean_base = re.sub(r'[^a-zA-Z0-9_.-]', '_', os.path.basename(orig_name))
    unique_filename = f"proof_{uuid.uuid4().hex}_{clean_base}"
    upload_dir = os.path.join(settings.STORAGE_DIR, "screenshots")
    os.makedirs(upload_dir, exist_ok=True)

    dest_path = os.path.join(upload_dir, unique_filename)
    with open(dest_path, "wb") as f:
        f.write(contents)

    rel_url = f"/storage/screenshots/{unique_filename}"
    return {
        "success": True,
        "file_url": rel_url,
        "filename": unique_filename,
        "size_bytes": len(contents)
    }

@router.post("/requests", status_code=status.HTTP_201_CREATED)
def submit_subscription_request(req: SubscriptionRequestCreate, user: Dict[str, Any] = Depends(get_current_user)):
    existing_pending = db_engine.fetch_one(
        "SELECT id FROM subscription_requests WHERE user_id = ? AND status = 'PENDING'",
        (user["id"],)
    )
    if existing_pending:
        raise HTTPException(
            status_code=400,
            detail="لديك طلب اشتراك قيد المراجعة والانتظار بالفعل. يرجى الانتظار حتى اعتماده من الإدارة."
        )

    plan = db_engine.fetch_one("SELECT * FROM subscription_plans WHERE id = ?", (req.plan_id.strip(),))
    if not plan:
        raise HTTPException(status_code=400, detail="باقة الاشتراك المحددة غير موجودة")
    if not plan.get("is_active", 1):
        raise HTTPException(status_code=400, detail="هذه الباقة غير مفعلة حالياً، يرجى اختيار باقة أخرى")

    snapshot_price = float(plan["price"])
    snapshot_duration = int(plan["duration_months"])
    snapshot_pkg_name = plan["name"]
    payment_info = get_db_payment_settings()
    snapshot_payment_num = payment_info["payment_phone"]

    req_id = uuid.uuid4().hex
    now = now_iso()
    rec = {
        "id": req_id,
        "user_id": user["id"],
        "plan_id": plan["id"],
        "student_name": user.get("full_name") or user.get("username"),
        "student_email": user.get("email"),
        "phone": req.phone.strip(),
        "package_name": snapshot_pkg_name,
        "duration_months": snapshot_duration,
        "amount": snapshot_price,
        "payment_method": req.payment_method or "InstaPay",
        "payment_number": snapshot_payment_num,
        "payment_reference": req.payment_reference.strip(),
        "transfer_date": req.transfer_date or now[:10],
        "proof_file_url": req.proof_file_url,
        "status": "PENDING",
        "rejection_reason": None,
        "admin_notes": req.admin_notes.strip() if req.admin_notes else None,
        "reviewed_by": None,
        "reviewed_at": None,
        "created_at": now,
        "updated_at": now
    }
    db_engine.insert("subscription_requests", rec)

    db_engine.insert("notifications", {
        "id": uuid.uuid4().hex,
        "user_id": "usr_admin_001",
        "title": "طلب اشتراك جديد بانتظار الاعتماد 🔔",
        "message": f"قدم الطالب {rec['student_name']} طلباً لتفعيل {snapshot_pkg_name} بمبلغ {snapshot_price} ج.م عبر {rec['payment_method']}.",
        "notification_type": "subscription",
        "link_url": "/admin/subscription-requests",
        "is_read": 0,
        "created_at": now
    })

    return {
        "success": True,
        "message": "تم إرسال طلب الاشتراك بنجاح وهو قيد المراجعة والاعتماد من الإدارة 🚀",
        "request": rec
    }

@router.get("/requests/my")
def get_my_subscription_requests(user: Dict[str, Any] = Depends(get_current_user)):
    requests = db_engine.fetch_all(
        "SELECT * FROM subscription_requests WHERE user_id = ? ORDER BY created_at DESC",
        (user["id"],)
    )
    return requests

@router.get("/requests")
def list_subscription_requests(
    status_filter: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user)
):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "subscriptions.view" not in perms and "subscriptions.manage" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية مراجعة طلبات الاشتراكات")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")

    if status_filter:
        requests = db_engine.fetch_all(
            "SELECT * FROM subscription_requests WHERE status = ? ORDER BY created_at DESC",
            (status_filter.strip().upper(),)
        )
    else:
        requests = db_engine.fetch_all(
            "SELECT * FROM subscription_requests ORDER BY created_at DESC"
        )
    return requests

@router.get("/requests/{req_id}")
def get_subscription_request_detail(req_id: str, user: Dict[str, Any] = Depends(require_role("admin", "assistant"))):
    sub_req = db_engine.fetch_one("SELECT * FROM subscription_requests WHERE id = ?", (req_id,))
    if not sub_req:
        raise HTTPException(status_code=404, detail="طلب الاشتراك غير موجود")
    return sub_req

@router.post("/requests/{req_id}/approve")
def approve_subscription_request(req_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "subscriptions.manage" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية اعتماد طلبات الاشتراكات")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة فقط")

    sub_req = db_engine.fetch_one("SELECT * FROM subscription_requests WHERE id = ?", (req_id,))
    if not sub_req:
        raise HTTPException(status_code=404, detail="طلب الاشتراك غير موجود")
    if sub_req["status"] == "APPROVED":
        return {"success": True, "message": "الطلب معتمد ومفعل مسبقاً"}

    with db_engine.transaction():
        now = datetime.now(timezone.utc)
        now_str = now_iso()

        duration_months = sub_req.get("duration_months") or 3
        duration_days = duration_months * 30

        user_id = sub_req["user_id"]
        existing_sub = SubscriptionRepository.get_active_subscription(user_id)
        if existing_sub and not existing_sub.get("is_lifetime"):
            try:
                curr_exp = datetime.fromisoformat(existing_sub["expires_at"].replace("Z", "+00:00"))
                base_start = max(now, curr_exp)
            except Exception:
                base_start = now
        else:
            base_start = now

        expires_at_iso = (base_start + timedelta(days=duration_days)).isoformat()

        db_engine.update("subscription_requests", req_id, {
            "status": "APPROVED",
            "reviewed_by": user["id"],
            "reviewed_at": now_str,
            "updated_at": now_str
        })

        db_engine.execute(
            "UPDATE subscriptions SET status = 'EXPIRED' WHERE user_id = ? AND status = 'ACTIVE'",
            (user_id,)
        )

        sub_id = uuid.uuid4().hex
        db_engine.insert("subscriptions", {
            "id": sub_id,
            "user_id": user_id,
            "code_id": None,
            "status": "ACTIVE",
            "started_at": now_str,
            "expires_at": expires_at_iso,
            "is_lifetime": 0,
            "created_at": now_str
        })

        db_engine.execute("UPDATE student_stats SET xp = xp + 150 WHERE user_id = ?", (user_id,))

        db_engine.insert("notifications", {
            "id": uuid.uuid4().hex,
            "user_id": user_id,
            "title": "تم تفعيل اشتراكك بنجاح! 🎉",
            "notification_type": "subscription",
            "message": f"تمت مراجعة واعتماد طلب الاشتراك الخاص بك ({sub_req.get('package_name')}). أصبحت جميع المناهج والامتحانات والمذكرات متاحة لك بالكامل حتى {expires_at_iso[:10]}.",
            "link_url": "/student/courses",
            "is_read": 0,
            "created_at": now_str
        })

    return {
        "success": True,
        "message": "تم اعتماد الطلب وتفعيل اشتراك الطالب بنجاح! 🎉",
        "expires_at": expires_at_iso
    }

@router.post("/requests/{req_id}/reject")
def reject_subscription_request(
    req_id: str,
    req: SubscriptionRequestReject,
    user: Dict[str, Any] = Depends(get_current_user)
):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "subscriptions.manage" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية رفض طلبات الاشتراكات")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة فقط")

    sub_req = db_engine.fetch_one("SELECT * FROM subscription_requests WHERE id = ?", (req_id,))
    if not sub_req:
        raise HTTPException(status_code=404, detail="طلب الاشتراك غير موجود")

    now_str = now_iso()
    rejection_msg = req.rejection_reason.strip() or "بيانات التحويل غير مطابقة أو العملية غير مكتملة"
    db_engine.update("subscription_requests", req_id, {
        "status": "REJECTED",
        "rejection_reason": rejection_msg,
        "reviewed_by": user["id"],
        "reviewed_at": now_str,
        "updated_at": now_str
    })

    db_engine.insert("notifications", {
        "id": uuid.uuid4().hex,
        "user_id": sub_req["user_id"],
        "title": "تحديث بخصوص طلب تفعيل الاشتراك ❌",
        "notification_type": "subscription",
        "message": f"عذراً، لم يتم اعتماد طلب الاشتراك للسبب التالي: {rejection_msg}. يرجى مراجعة بيانات التحويل أو التواصل مع الدعم الفني.",
        "link_url": "/student/subscription",
        "is_read": 0,
        "created_at": now_str
    })

    return {"success": True, "message": "تم رفض طلب الاشتراك وإخطار الطالب بالسبب"}

@router.post("/codes/generate")
def generate_code(req: CodeGenerateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "subscriptions.generate" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية توليد أكواد الاشتراكات")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")

    try:
        code_rec = SubscriptionService.create_code(
            duration_type=req.duration_type,
            duration_days=req.duration_days,
            created_by=user["id"],
            custom_code=req.custom_code,
            metadata=req.metadata
        )
        return {"success": True, "code": code_rec}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/codes")
def list_codes(status_filter: Optional[str] = None, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "subscriptions.view" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية عرض الاشتراكات")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة فقط")

    codes, count = SubscriptionRepository.list_codes(status=status_filter)
    return {"codes": codes, "total": count}

@router.post("/validate")
def validate_code(req: CodeValidateRequest):
    try:
        return SubscriptionService.validate_code(req.code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/activate")
def activate_code(req: CodeActivateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        sub = SubscriptionService.activate_code(user["id"], req.code)
        return {"success": True, "message": "تم تفعيل الاشتراك بنجاح!", "subscription": sub}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/my-status")
def my_subscription(user: Dict[str, Any] = Depends(get_current_user)):
    sub = SubscriptionRepository.get_active_subscription(user["id"])
    pending = db_engine.fetch_one(
        "SELECT id, plan_id, package_name, duration_months, amount, created_at, status FROM subscription_requests WHERE user_id = ? AND status = 'PENDING'",
        (user["id"],)
    )
    return {
        "is_subscribed": sub is not None,
        "subscription": sub,
        "pending_request": pending
    }
