"""
CodeSpark - Payment Methods & Subscription Configuration Router ("طرق الدفع والاشتراك")
Dedicated administrator configuration for Vodafone Cash, InstaPay, and promotional banners.
Stored persistently in the database.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from app.api.deps import get_optional_user, require_role
from app.repositories.repositories import SettingsRepository
from app.schemas.all_schemas import PaymentSettingsUpdate

router = APIRouter(tags=["Payment Methods & Settings"])

@router.get("/payment-settings")
def get_payment_settings():
    """Publicly accessible or student-accessible payment details."""
    settings = SettingsRepository.get_settings()
    return {
        "vodafone_cash": settings.get("vodafone_cash") or settings.get("payment_phone") or "+20159159038",
        "payment_phone": settings.get("vodafone_cash") or settings.get("payment_phone") or "+20159159038",
        "instapay_phone": settings.get("instapay_phone", "+20159159038"),
        "instapay_link": settings.get("instapay_link", "https://ipn.eg/S/moazasem/instapay/27DsGj"),
        "contact_phone": settings.get("contact_phone", "+20159159038"),
        "offer_banner_text": settings.get("offer_banner_text", "عروض اشتراك الفصل الدراسي الجديد متاحة الآن!"),
        "offers_visible": settings.get("offers_visible", True),
        "special_offers": settings.get("special_offers", "خصم خاص للمشتركين الجدد ⚡")
    }

@router.put("/payment-settings", dependencies=[Depends(require_role("admin"))])
def update_payment_settings(req: PaymentSettingsUpdate):
    """Admin-only update to persistently change Vodafone Cash and InstaPay numbers."""
    updates = {k: v for k, v in req.dict().items() if v is not None}
    saved = SettingsRepository.update_settings(updates)
    return {
        "success": True,
        "message": "تم حفظ وتحديث إعدادات طرق الدفع بنجاح في قاعدة البيانات 🚀",
        "settings": saved
    }

# Backward-compatibility aliases for /settings and /subscriptions/payment-info
@router.get("/settings")
def get_settings_alias():
    return SettingsRepository.get_settings()

@router.put("/settings", dependencies=[Depends(require_role("admin"))])
def update_settings_alias(req: PaymentSettingsUpdate):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    saved = SettingsRepository.update_settings(updates)
    return {"success": True, "settings": saved}

@router.get("/subscriptions/payment-info")
def get_payment_info_alias():
    return get_payment_settings()
