"""
Code Spark - Curriculum Units Router
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from app.api.deps import require_role, get_optional_user
from app.repositories.all_repositories import CurriculumRepository
from app.schemas.all_schemas import UnitCreate, UnitUpdate

router = APIRouter(prefix="/units", tags=["Units"])

@router.get("")
def list_units(course_id: Optional[str] = None, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    units, total = CurriculumRepository.list_units(course_id=course_id, is_admin=is_admin)
    return {"units": units, "total": total}

@router.get("/{unit_id}")
def get_unit(unit_id: str):
    u = CurriculumRepository.get_unit(unit_id)
    if not u:
        raise HTTPException(status_code=404, detail="الوحدة غير موجودة")
    return u

@router.post("", dependencies=[Depends(require_role("admin", "assistant"))])
def create_unit(req: UnitCreate):
    rec = CurriculumRepository.create_unit(req.dict())
    return {"success": True, "unit": rec}

@router.put("/{unit_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_unit(unit_id: str, req: UnitUpdate):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    u = CurriculumRepository.update_unit(unit_id, updates)
    if not u:
        raise HTTPException(status_code=404, detail="الوحدة غير موجودة")
    return {"success": True, "unit": u}

@router.delete("/{unit_id}", dependencies=[Depends(require_role("admin"))])
def delete_unit(unit_id: str):
    CurriculumRepository.delete_unit(unit_id)
    return {"success": True, "message": "تم حذف الوحدة بنجاح"}
