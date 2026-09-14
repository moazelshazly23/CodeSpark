from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
from app.schemas.all_schemas import CodeGenerateRequest, CodeValidateRequest, CodeActivateRequest
from app.services.core_services import SubscriptionService
from app.api.deps import get_current_user, require_role, require_permission
from app.repositories.all_repositories import SubscriptionRepository

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

@router.post("/codes/generate")
def generate_code(req: CodeGenerateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    # Admin or assistant with subscriptions.generate
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
    return {"is_subscribed": sub is not None, "subscription": sub}
