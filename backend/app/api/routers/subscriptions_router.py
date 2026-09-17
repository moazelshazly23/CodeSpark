"""
Code Spark - Dynamic Subscriptions, Plans & Requests Router
"""
import json
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Dict, Any
from app.api.deps import require_role, get_current_user
from app.db.engine import db_engine, now_iso
from app.repositories.all_repositories import SubscriptionRepository, AuditRepository
from app.services.core_services import SubscriptionService
from app.schemas.all_schemas import (
    SubscriptionCodeCreateRequest, SubscriptionActivateRequest,
    SubscriptionPlanCreate, SubscriptionPlanUpdate,
    SubscriptionRequestCreate, SubscriptionRequestReview
)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions & Plans"])

# Plans Endpoints
@router.get("/plans")
@router.get("/admin/plans")
def list_subscription_plans(active_only: bool = False):
    """Dynamic listing of all plans configured in the database"""
    plans, count = SubscriptionRepository.list_plans(active_only=active_only)
    for p in plans:
        if isinstance(p.get("features_json"), str):
            try:
                p["features"] = json.loads(p["features_json"])
            except Exception:
                p["features"] = []
        else:
            p["features"] = p.get("features_json") or []
    return {"plans": plans, "total": count}

@router.post("/plans", dependencies=[Depends(require_role("admin"))])
def create_subscription_plan(req: SubscriptionPlanCreate):
    plan_id = req.id or f"plan_{req.duration_months}m"
    existing = SubscriptionRepository.get_plan(plan_id)
    if existing:
        raise HTTPException(status_code=400, detail="معرف الخطة موجود بالفعل")
    data = {
        "id": plan_id,
        "name": req.name,
        "duration_months": req.duration_months,
        "price": req.price,
        "is_active": 1 if req.is_active else 0,
        "order_index": req.order_index,
        "features_json": json.dumps(req.features, ensure_ascii=False)
    }
    rec = SubscriptionRepository.create_plan(data)
    return {"success": True, "plan": rec}

@router.put("/plans/{plan_id}", dependencies=[Depends(require_role("admin"))])
def update_subscription_plan(plan_id: str, req: SubscriptionPlanUpdate):
    plan = SubscriptionRepository.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="الخطة غير موجودة")
    up = {}
    if req.name is not None:
        up["name"] = req.name
    if req.duration_months is not None:
        up["duration_months"] = req.duration_months
    if req.price is not None:
        up["price"] = req.price
    if req.is_active is not None:
        up["is_active"] = 1 if req.is_active else 0
    if req.order_index is not None:
        up["order_index"] = req.order_index
    if req.features is not None:
        up["features_json"] = json.dumps(req.features, ensure_ascii=False)
    updated = SubscriptionRepository.update_plan(plan_id, up)
    return {"success": True, "plan": updated}

@router.delete("/plans/{plan_id}", dependencies=[Depends(require_role("admin"))])
def delete_subscription_plan(plan_id: str):
    plan = SubscriptionRepository.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="الخطة غير موجودة")
    SubscriptionRepository.delete_plan(plan_id)
    return {"success": True, "message": "تم حذف الخطة بنجاح"}

# Subscription Requests Endpoints
@router.post("/requests")
def submit_subscription_request(req: SubscriptionRequestCreate, user: Dict[str, Any] = Depends(get_current_user)):
    package_name = req.package_name
    duration_months = req.duration_months or 1
    amount = req.amount or 0.0
    if req.plan_id:
        plan = SubscriptionRepository.get_plan(req.plan_id)
        if plan:
            package_name = plan["name"]
            duration_months = plan["duration_months"]
            amount = plan["price"]
    data = {
        "user_id": user["id"],
        "student_name": user.get("full_name") or user.get("username"),
        "student_email": user.get("email"),
        "phone": req.phone,
        "plan_id": req.plan_id,
        "package_name": package_name or "اشتراك دراسي",
        "duration_months": duration_months,
        "amount": amount,
        "payment_method": req.payment_method,
        "payment_number": req.payment_number,
        "payment_reference": req.payment_reference,
        "transfer_date": req.transfer_date or now_iso()[:10],
        "proof_file_url": req.proof_file_url,
        "status": "PENDING"
    }
    rec = SubscriptionRepository.create_request(data)
    AuditRepository.log(user_id=user["id"], action="subscription_request_created", entity_type="subscription_request", entity_id=rec["id"], details={"package": package_name})
    return {"success": True, "message": "تم إرسال طلب الاشتراك بنجاح! سيتم مراجعته وتفعيله من الإدارة.", "request": rec}

@router.get("/requests")
def list_subscription_requests(
    status: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_role("admin", "assistant"))
):
    reqs, count = SubscriptionRepository.list_requests(status=status)
    return {"requests": reqs, "total": count}

@router.get("/my-requests")
def list_my_subscription_requests(user: Dict[str, Any] = Depends(get_current_user)):
    reqs, count = SubscriptionRepository.list_requests(user_id=user["id"])
    return {"requests": reqs, "total": count}

@router.post("/requests/{req_id}/review", dependencies=[Depends(require_role("admin"))])
def review_subscription_request(req_id: str, review: SubscriptionRequestReview, admin: Dict[str, Any] = Depends(get_current_user)):
    if review.action.lower() == "approve":
        res = SubscriptionRepository.approve_request(req_id, admin["id"], review.admin_notes)
        if not res:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")
        return {"success": True, "message": "تمت الموافقة وتفعيل اشتراك الطالب بنجاح", "request": res}
    elif review.action.lower() == "reject":
        res = SubscriptionRepository.reject_request(req_id, admin["id"], review.admin_notes or "تم رفض الطلب")
        if not res:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")
        return {"success": True, "message": "تم رفض طلب الاشتراك", "request": res}
    else:
        raise HTTPException(status_code=400, detail="إجراء المراجعة غير صالح (approve أو reject فقط)")

# Codes & Activation
@router.post("/activate")
def activate_code(req: SubscriptionActivateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        res = SubscriptionService.activate_code(user["id"], req.code)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/codes", dependencies=[Depends(require_role("admin", "assistant"))])
def list_codes(status: Optional[str] = None):
    codes, count = SubscriptionRepository.list_codes(status=status)
    return {"codes": codes, "total": count}

@router.post("/codes")
def create_code(req: SubscriptionCodeCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    # Assistant permission restriction
    if user.get("role") == "assistant":
        if req.duration_type not in ("1_MONTH", "CUSTOM") or (req.duration_days and req.duration_days > 31):
            raise HTTPException(status_code=403, detail="المساعد مصرح له بتوليد أكواد شهرية فقط (30 يومًا كحد أقصى)")
    elif user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح")

    try:
        rec = SubscriptionService.create_code(
            duration_type=req.duration_type,
            duration_days=req.duration_days,
            created_by=user["id"],
            custom_code=req.custom_code,
            batch_name=req.batch_name
        )
        return {"success": True, "code": rec}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/my-status")
def my_subscription_status(user: Dict[str, Any] = Depends(get_current_user)):
    sub = SubscriptionRepository.get_active_subscription(user["id"])
    return {
        "is_subscribed": sub is not None,
        "subscription": sub
    }

@router.get("/payment-info")
def get_payment_info():
    row = db_engine.fetch_one("SELECT value_json FROM platform_settings WHERE key = 'general'")
    val = json.loads(row["value_json"]) if row else {}
    vodafone = val.get("vodafone_cash") or val.get("payment_phone") or "+20159159038"
    return {
        "vodafone_cash": vodafone,
        "payment_phone": vodafone,
        "instapay_phone": val.get("instapay_phone", "+20159159038"),
        "instapay_link": val.get("instapay_link", "https://ipn.eg/S/moazasem/instapay/27DsGj"),
        "contact_phone": val.get("contact_phone", "+201559159038"),
        "special_offers": val.get("special_offers", "خصم إضافي للمشتركين الجدد 🌟"),
        "offers_visible": val.get("offers_visible", True),
        "offer_banner_text": val.get("offer_banner_text", "عروض الاشتراك للفصل الدراسي الجديد - احجز مقعدك الآن")
    }

@router.post("/requests/{req_id}/approve", dependencies=[Depends(require_role("admin", "assistant"))])
def approve_subscription_request_alias(req_id: str, admin: Dict[str, Any] = Depends(get_current_user)):
    res = SubscriptionRepository.approve_request(req_id, admin["id"], "تم اعتماد الطلب وتفعيل الحساب")
    if not res:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    return {"success": True, "message": "تم اعتماد وتفعيل الاشتراك بنجاح 🚀", "subscription": res}

@router.post("/requests/{req_id}/reject", dependencies=[Depends(require_role("admin", "assistant"))])
def reject_subscription_request_alias(req_id: str, payload: Optional[Dict[str, Any]] = None, admin: Dict[str, Any] = Depends(get_current_user)):
    reason = (payload or {}).get("rejection_reason", "بيانات التحويل غير مطابقة")
    res = SubscriptionRepository.reject_request(req_id, admin["id"], reason)
    if not res:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    return {"success": True, "message": "تم رفض طلب الاشتراك وإخطار الطالب"}
