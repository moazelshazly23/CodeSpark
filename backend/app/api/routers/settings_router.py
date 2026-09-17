"""
Code Spark - Platform Settings Router
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from app.api.deps import require_role
from app.db.engine import db_engine, now_iso
from app.schemas.all_schemas import PlatformSettingsUpdate

router = APIRouter(prefix="/settings", tags=["Platform Settings"])

@router.get("")
def get_settings():
    row = db_engine.fetch_one("SELECT value_json FROM platform_settings WHERE key = 'general'")
    if row:
        return json.loads(row["value_json"])
    return {}

@router.put("", dependencies=[Depends(require_role("admin"))])
def update_settings(req: PlatformSettingsUpdate):
    row = db_engine.fetch_one("SELECT value_json FROM platform_settings WHERE key = 'general'")
    curr = json.loads(row["value_json"]) if row else {}
    for k, v in req.dict().items():
        if v is not None:
            curr[k] = v
    new_json = json.dumps(curr, ensure_ascii=False)
    updated_at = now_iso()
    if row:
        db_engine.execute(
            "UPDATE platform_settings SET value_json = ?, updated_at = ? WHERE key = 'general'",
            (new_json, updated_at)
        )
    else:
        db_engine.execute(
            "INSERT INTO platform_settings (key, value_json, description, updated_at) VALUES ('general', ?, 'الإعدادات العامة للمنصة', ?)",
            (new_json, updated_at)
        )
    return {"success": True, "settings": curr}
