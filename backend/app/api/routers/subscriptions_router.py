"""
CodeSpark - Subscriptions, Plans, Codes & Payment Requests Router
Includes strict assistant limitations (monthly code generation only) and full payment verification.
"""
import json
import uuid
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional, List
from app.api.deps import get_current_user, get_optional_user, require_role
from app.repositories.repositories import SubscriptionRepository, SettingsRepository
from app.core.security import hash_code
from app.schemas.all_schemas import (
    SubscriptionPlanCreate, SubscriptionPlanUpdate, SubscriptionCodeGenerate,
    CodeRedeemRequest, SubscriptionRequestCreate, SubscriptionRequestReview
)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

# -----------------------------------------------------------------------------
# Plans
# -----------------------------------------------------------------------------
@router.get("/plans")
def list_plans(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") == "admin")
    plans = SubscriptionRepository.list_plans(only_active=not is_admin)
    for p in plans:
        if p.get("features_json"):
            try:
                p["features"] = json.loads(p["features_json"])
            except Exception:
                p["features"] = []
    return {"plans": plans}

@router.post("/plans", dependencies=[Depends(require_role("admin"))])
def create_plan(req: SubscriptionPlanCreate):
    data = req.dict()
    data["features_json"] = json.dumps(data.pop("features", []), ensure_ascii=False)
    data["is_active"] = 1 if req.is_active else 0
    plan = SubscriptionRepository.create_plan(data)
    return {"success": True, "plan": plan}

@router.put("/plans/{plan_id}", dependencies=[Depends(require_role("admin"))])
def update_plan(plan_id: str, req: SubscriptionPlanUpdate):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    if "features" in updates:
        updates["features_json"] = json.dumps(updates.pop("features"), ensure_ascii=False)
    if "is_active" in updates:
        updates["is_active"] = 1 if updates["is_active"] else 0
    plan = SubscriptionRepository.update_plan(plan_id, updates)
    if not plan:
        raise HTTPException(status_code=404, detail="الباقة غير موجودة")
    return {"success": True, "plan": plan}

@router.delete("/plans/{plan_id}", dependencies=[Depends(require_role("admin"))])
def delete_plan(plan_id: str):
    success = SubscriptionRepository.delete_plan(plan_id)
    if not success:
        raise HTTPException(status_code=404, detail="الباقة غير موجودة")
    return {"success": True, "message": "تم حذف الباقة بنجاح"}

# -----------------------------------------------------------------------------
# Subscription Status & Activation
# -----------------------------------------------------------------------------
@router.get("/my-status")
def get_my_status(user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") in ("admin", "assistant"):
        return {
            "is_subscribed": True,
            "role": user.get("role"),
            "plan_name": "وصول إداري كامل (غير محدود)",
            "expires_at": None,
            "is_lifetime": True
        }

    sub = SubscriptionRepository.get_active_subscription(user["id"])
    if sub:
        return {
            "is_subscribed": True,
            "role": "student",
            "plan_name": sub.get("plan_name", "اشتراك مفعل"),
            "starts_at": sub.get("starts_at"),
            "expires_at": sub.get("expires_at"),
            "is_lifetime": bool(sub.get("is_lifetime", 0))
        }
    return {
        "is_subscribed": False,
        "role": "student",
        "plan_name": "حساب مجاني (غير مشترك)",
        "expires_at": None,
        "is_lifetime": False
    }

@router.post("/activate")
def activate_subscription_code(req: CodeRedeemRequest, user: Dict[str, Any] = Depends(get_current_user)):
    success, message, sub = SubscriptionRepository.redeem_code(user["id"], req.code)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message, "subscription": sub}

# -----------------------------------------------------------------------------
# Subscription Codes Generation (Admin & Assistant)
# -----------------------------------------------------------------------------
@router.get("/codes", dependencies=[Depends(require_role("admin", "assistant"))])
def list_codes(limit: int = 100, offset: int = 0):
    codes = SubscriptionRepository.list_codes(limit=limit, offset=offset)
    return {"codes": codes, "total": len(codes)}

@router.post("/codes/generate")
def generate_codes(req: SubscriptionCodeGenerate, user: Dict[str, Any] = Depends(get_current_user)):
    # Assistant restriction: Assistants may ONLY generate monthly codes (1_MONTH or 30 days)
    if user["role"] == "assistant":
        if req.duration_type != "1_MONTH" or (req.duration_days and req.duration_days > 30):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="المساعد مصرح له فقط بتوليد أكواد اشتراك شهرية (30 يوماً). لا يمكنك توليد مدد أخرى."
            )

    count = min(max(req.count or 1, 1), 50)
    created_codes = []
    
    duration_map = {
        "1_MONTH": 30,
        "3_MONTHS": 90,
        "6_MONTHS": 180,
        "12_MONTHS": 365,
        "LIFETIME": 3650
    }
    days = req.duration_days or duration_map.get(req.duration_type, 30)

    for _ in range(count):
        token_str = f"CS-{secrets.token_hex(4).upper()}"
        code_rec = {
            "code": token_str,
            "code_hash": hash_code(token_str),
            "duration_days": days,
            "duration_type": req.duration_type,
            "status": "ACTIVE",
            "batch_name": req.batch_name or "توليد تلقائي",
            "created_by": user["id"]
        }
        res = SubscriptionRepository.create_code(code_rec)
        created_codes.append(res)

    return {
        "success": True,
        "count": len(created_codes),
        "codes": created_codes,
        "message": f"تم توليد {len(created_codes)} كود اشتراك بنجاح! 🚀"
    }

# -----------------------------------------------------------------------------
# Payment Requests
# -----------------------------------------------------------------------------
@router.post("/requests")
def submit_payment_request(req: SubscriptionRequestCreate, user: Dict[str, Any] = Depends(get_current_user)):
    plan = SubscriptionRepository.get_plan(req.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="الباقة المطلوبة غير موجودة")

    data = {
        "user_id": user["id"],
        "plan_id": req.plan_id,
        "payment_method": req.payment_method,
        "payment_number": req.payment_number,
        "payment_reference": req.payment_reference or "",
        "screenshot_url": req.screenshot_url or "",
        "notes": req.notes or "",
        "status": "pending"
    }
    request_rec = SubscriptionRepository.create_request(data)
    return {
        "success": True,
        "message": "تم إرسال طلب الاشتراك بنجاح! سيتم مراجعة التحويل وتفعيل حسابك خلال دقائق ⚡",
        "request": request_rec
    }

@router.get("/requests")
def list_payment_requests(status: Optional[str] = None, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "student":
        # Return student's own requests
        sql = """
            SELECT pr.*, sp.name as plan_name, sp.price as plan_price
            FROM payment_requests pr
            LEFT JOIN subscription_plans sp ON pr.plan_id = sp.id
            WHERE pr.user_id = ?
            ORDER BY pr.created_at DESC
        """
        from app.db.engine import db_engine
        return {"requests": db_engine.fetch_all(sql, (user["id"],))}
    else:
        # Admin can view all requests
        requests = SubscriptionRepository.list_requests(status=status)
        return {"requests": requests}

@router.post("/requests/{req_id}/review", dependencies=[Depends(require_role("admin"))])
def review_payment_request(req_id: str, req: SubscriptionRequestReview, admin: Dict[str, Any] = Depends(get_current_user)):
    if req.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="حالة المراجعة غير صالحة. يجب أن تكون approved أو rejected")
    
    res = SubscriptionRepository.review_request(
        req_id=req_id,
        new_status=req.status,
        admin_notes=req.admin_notes or "",
        reviewer_id=admin["id"]
    )
    if not res:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    action_ar = "الموافقة على الطلب وتفعيل الاشتراك" if req.status == "approved" else "رفض الطلب"
    return {"success": True, "message": f"تم {action_ar} بنجاح", "request": res}
