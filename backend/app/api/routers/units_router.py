from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
import uuid
from app.schemas.all_schemas import UnitCreateRequest
from app.repositories.all_repositories import CurriculumRepository
from app.api.deps import get_optional_user, require_role
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/units", tags=["Units"])

@router.get("")
def list_units(course_id: str, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    units = CurriculumRepository.list_units(course_id, is_admin=is_admin)
    return {"units": units}

@router.get("/{unit_id}")
def get_unit(unit_id: str):
    unit = CurriculumRepository.get_unit(unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="الوحدة غير موجودة")
    return unit

@router.post("", dependencies=[Depends(require_role("admin", "assistant"))])
def create_unit(req: UnitCreateRequest):
    rec = {
        "id": uuid.uuid4().hex,
        "course_id": req.course_id,
        "title": req.title,
        "description": req.description,
        "order_index": req.order_index,
        "is_published": 1 if req.is_published else 0,
        "access_type": req.access_type,
        "created_at": now_iso(),
        "updated_at": now_iso()
    }
    return db_engine.insert("units", rec)

@router.put("/{unit_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_unit(unit_id: str, req: UnitCreateRequest):
    up = {
        "title": req.title,
        "description": req.description,
        "order_index": req.order_index,
        "is_published": 1 if req.is_published else 0,
        "access_type": req.access_type,
        "updated_at": now_iso()
    }
    res = db_engine.update("units", unit_id, up)
    if not res:
        raise HTTPException(status_code=404, detail="الوحدة غير موجودة")
    return res

@router.delete("/{unit_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def delete_unit(unit_id: str):
    res = db_engine.delete("units", unit_id)
    if not res:
        raise HTTPException(status_code=404, detail="الوحدة غير موجودة")
    return {"success": True, "message": "تم حذف الوحدة"}
