from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
import uuid
from app.schemas.all_schemas import CodeGenerateRequest, CodeValidateRequest, CodeActivateRequest
from app.services.core_services import SubscriptionService
from app.api.deps import get_current_user, require_role, require_permission
from app.repositories.all_repositories import SubscriptionRepository
from app.core.config import settings
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions & Activation Requests"])

class SubscriptionRequestCreate(BaseModel):
    phone: str
    package_name: Optional[str] = "اشتراك فصلي (3 أشهر)"
    amount: Optional[float] = 0.0
    payment_method: Optional[str] = "InstaPay"
    payment_reference: str
    transfer_date: Optional[str] = None
    proof_file_url: Optional[str] = None
    admin_notes: Optional[str] = None

class SubscriptionRequestReject(BaseModel):
    rejection_reason: str

@router.get("/payment-info")
def get_payment_info():
    """Return official contact, InstaPay transfer details and link"""
    return {
        "contact_phone": settings.OFFICIAL_CONTACT_PHONE,
        "instapay_phone": settings.INSTAPAY_PHONE,
        "instapay_link": settings.INSTAPAY_LINK
    }

@router.post("/requests")
def submit_subscription_request(req: SubscriptionRequestCreate, user: Dict[str, Any] = Depends(get_current_user)):
    """Student submits an activation request after InstaPay transfer"""
    # Check if there is already a pending request
    existing = db_engine.fetch_one(
        "SELECT id FROM subscription_requests WHERE user_id = ? AND status = 'PENDING'",
        (user["id"],)
    )
    if existing:
        raise HTTPException(status_code=400, detail="لديك طلب اشتراك قيد المراجعة بالفعل، يرجى الانتظار حتى اعتماده.")

    req_id = uuid.uuid4().hex
    now = now_iso()
    rec = {
        "id": req_id,
        "user_id": user["id"],
        "student_name": user.get("full_name") or user.get("username"),
        "student_email": user.get("email"),
        "phone": req.phone.strip(),
        "package_name": req.package_name,
        "amount": req.amount,
        "payment_method": req.payment_method,
        "payment_reference": req.payment_reference.strip(),
        "transfer_date": req.transfer_date or now[:10],
        "proof_file_url": req.proof_file_url,
        "status": "PENDING",
        "rejection_reason": None,
        "admin_notes": req.admin_notes,
        "reviewed_by": None,
        "reviewed_at": None,
        "created_at": now,
        "updated_at": now
    }
    db_engine.insert("subscription_requests", rec)
    return {"success": True, "message": "تم إرسال طلب الاشتراك بنجاح وهو قيد المراجعة والاعتماد", "request": rec}

@router.get("/requests/my")
def get_my_subscription_requests(user: Dict[str, Any] = Depends(get_current_user)):
    """Student checks their submitted requests and status"""
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
    """Admin or Assistant views all subscription requests"""
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "subscriptions.view" not in perms and "subscriptions.manage" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية مراجعة طلبات الاشتراكات")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")

    if status_filter:
        requests = db_engine.fetch_all(
            "SELECT * FROM subscription_requests WHERE status = ? ORDER BY created_at DESC",
            (status_filter,)
        )
    else:
        requests = db_engine.fetch_all(
            "SELECT * FROM subscription_requests ORDER BY created_at DESC"
        )
    return requests

@router.post("/requests/{req_id}/approve")
def approve_subscription_request(req_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Admin approves request and actually activates student subscription in DB"""
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "subscriptions.manage" not in perms and "subscriptions.generate" not in perms:
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
        now_str = now.isoformat()
        # Default duration 90 days for quarterly, 365 for annual
        days = 365 if "سنوي" in (sub_req.get("package_name") or "") else 90
        expires_at = (now + timedelta(days=days)).isoformat()

        # 1. Update request status
        db_engine.update("subscription_requests", req_id, {
            "status": "APPROVED",
            "reviewed_by": user["id"],
            "reviewed_at": now_str,
            "updated_at": now_str
        })

        # 2. Deactivate any prior subscriptions
        db_engine.execute(
            "UPDATE subscriptions SET status = 'EXPIRED' WHERE user_id = ? AND status = 'ACTIVE'",
            (sub_req["user_id"],)
        )

        # 3. Create active subscription in database
        sub_id = uuid.uuid4().hex
        db_engine.insert("subscriptions", {
            "id": sub_id,
            "user_id": sub_req["user_id"],
            "code_id": None,
            "status": "ACTIVE",
            "started_at": now_str,
            "expires_at": expires_at,
            "is_lifetime": 0,
            "created_at": now_str
        })

        # 4. Notify student
        db_engine.insert("notifications", {
            "id": uuid.uuid4().hex,
            "user_id": sub_req["user_id"],
            "title": "تم تفعيل اشتراكك بنجاح! 🎉",
            "notification_type": "subscription",
            "message": f"تمت مراجعة واعتماد طلب الاشتراك الخاص بك عبر InstaPay ({sub_req.get('package_name')}). يمكنك الآن الوصول لكافة الدروس والامتحانات المدفوعة.",
            "link": "#/student/courses",
            "is_read": 0,
            "created_at": now_str
        })

    return {"success": True, "message": "تمت الموافقة وتفعيل اشتراك الطالب في قاعدة البيانات بنجاح"}

@router.post("/requests/{req_id}/reject")
def reject_subscription_request(
    req_id: str,
    req: SubscriptionRequestReject,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Admin rejects subscription request with a reason"""
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "subscriptions.manage" not in perms and "subscriptions.generate" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية رفض طلبات الاشتراكات")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة فقط")

    sub_req = db_engine.fetch_one("SELECT * FROM subscription_requests WHERE id = ?", (req_id,))
    if not sub_req:
        raise HTTPException(status_code=404, detail="طلب الاشتراك غير موجود")

    now_str = now_iso()
    db_engine.update("subscription_requests", req_id, {
        "status": "REJECTED",
        "rejection_reason": req.rejection_reason.strip() or "بيانات التحويل غير مطابقة أو العملية غير مكتملة",
        "reviewed_by": user["id"],
        "reviewed_at": now_str,
        "updated_at": now_str
    })

    # Notify student
    db_engine.insert("notifications", {
        "id": uuid.uuid4().hex,
        "user_id": sub_req["user_id"],
        "title": "تحديث بخصوص طلب الاشتراك ❌",
        "notification_type": "subscription",
        "message": f"عذراً، تعذر اعتماد طلب الاشتراك للسبب التالي: {req.rejection_reason}. يرجى التحقق وإعادة الإرسال أو التواصل مع الدعم الفني.",
        "link": "#/student/subscription",
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
        "SELECT id, package_name, created_at, status FROM subscription_requests WHERE user_id = ? AND status = 'PENDING'",
        (user["id"],)
    )
    return {
        "is_subscribed": sub is not None,
        "subscription": sub,
        "pending_request": pending
    }
