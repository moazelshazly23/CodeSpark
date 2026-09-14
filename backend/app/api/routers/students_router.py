from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
from app.repositories.all_repositories import UserRepository, SubscriptionRepository
from app.api.deps import get_current_user
from app.db.engine import db_engine

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("")
def list_students(search: Optional[str] = None, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "students.read" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية عرض بيانات الطلاب")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")

    students, total = UserRepository.list_users(role="student", search=search)
    for s in students:
        s.pop("hashed_password", None)
        sub = SubscriptionRepository.get_active_subscription(s["id"])
        s["is_subscribed"] = sub is not None
        s["subscription"] = sub
        stats = db_engine.fetch_one("SELECT xp, streak_days, study_time_minutes FROM student_stats WHERE user_id = ?", (s["id"],))
        s["stats"] = stats or {"xp": 0, "streak_days": 1, "study_time_minutes": 0}
    return {"students": students, "total": total}

@router.get("/{student_id}")
def get_student(student_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "students.read" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية عرض بيانات الطلاب")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")

    s = UserRepository.get_by_id(student_id)
    if not s or s["role"] != "student":
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    s.pop("hashed_password", None)
    sub = SubscriptionRepository.get_active_subscription(s["id"])
    s["is_subscribed"] = sub is not None
    s["subscription"] = sub
    stats = db_engine.fetch_one("SELECT * FROM student_stats WHERE user_id = ?", (s["id"],))
    s["stats"] = stats
    return s

@router.put("/{student_id}/toggle-active")
def toggle_student_active(student_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "students.manage" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية إدارة حسابات الطلاب")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة فقط")

    s = UserRepository.get_by_id(student_id)
    if not s:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    new_state = 0 if s.get("is_active", 1) == 1 else 1
    db_engine.execute("UPDATE users SET is_active = ? WHERE id = ?", (new_state, student_id))
    return {"success": True, "is_active": bool(new_state)}
