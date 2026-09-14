from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from app.api.deps import require_admin, get_current_user
from app.db.engine import db_engine
from app.services.core_services import ActivityService

router = APIRouter(prefix="/settings", tags=["Settings & Roles"])

@router.get("")
def get_settings(user: dict = Depends(get_current_user)):
    rec = db_engine.get_by_id("platform_settings", "settings_default")
    return rec.get("setting_value", {}) if rec else {}

@router.put("")
def update_settings(updates: Dict[str, Any], user: dict = Depends(require_admin)):
    rec = db_engine.get_by_id("platform_settings", "settings_default")
    if not rec:
        rec = db_engine.insert("platform_settings", {
            "id": "settings_default",
            "setting_key": "general",
            "setting_value": updates
        })
    else:
        current_val = rec.get("setting_value", {})
        current_val.update(updates)
        db_engine.update("platform_settings", "settings_default", {"setting_value": current_val})
    ActivityService.log(user["id"], "settings_update", {"updated_keys": list(updates.keys())})
    return db_engine.get_by_id("platform_settings", "settings_default")["setting_value"]

@router.get("/roles")
def list_roles(user: dict = Depends(get_current_user)):
    roles, _ = db_engine.query("roles")
    return roles
