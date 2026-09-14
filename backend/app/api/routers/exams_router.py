from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
import uuid, json
from app.schemas.all_schemas import ExamCreateRequest, ExamAutosaveRequest, ExamSubmitRequest
from app.services.core_services import AssessmentService
from app.repositories.all_repositories import AssessmentRepository
from app.api.deps import get_optional_user, get_current_user, require_role, require_permission
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/exams", tags=["Exams"])

@router.get("")
def list_exams(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    exams, total = AssessmentRepository.list_exams(is_admin=is_admin)
    return exams

@router.get("/{exam_id}")
def get_exam(exam_id: str, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    exam = AssessmentRepository.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="الامتحان غير موجود")
    questions = AssessmentRepository.get_exam_questions(exam_id)
    # If student, do not reveal correct answers in question bank
    if not user or user.get("role") == "student":
        for q in questions:
            q.pop("correct_answer", None)
            q.pop("explanation", None)
    exam["questions"] = questions
    return exam

@router.post("")
def create_exam(req: ExamCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "exams.create" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية إنشاء امتحانات")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")

    with db_engine.transaction():
        exam_id = uuid.uuid4().hex
        rec = {
            "id": exam_id,
            "title": req.title,
            "description": req.description,
            "duration_minutes": req.duration_minutes,
            "passing_score": req.passing_score,
            "max_attempts": req.max_attempts,
            "is_randomized": 1 if req.is_randomized else 0,
            "access_type": req.access_type,
            "is_published": 1 if req.is_published else 0,
            "created_by": user["id"],
            "created_at": now_iso(),
            "updated_at": now_iso()
        }
        db_engine.insert("exams", rec)
        if req.questions:
            for idx, q_info in enumerate(req.questions):
                db_engine.insert("exam_questions", {
                    "id": uuid.uuid4().hex,
                    "exam_id": exam_id,
                    "question_id": q_info["question_id"],
                    "points": float(q_info.get("points", 1.0)),
                    "order_index": idx
                })
        return rec

@router.put("/{exam_id}")
def update_exam(exam_id: str, req: ExamCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "exams.edit" not in perms and "exams.manage" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية تعديل الامتحانات")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")

    with db_engine.transaction():
        up = {
            "title": req.title,
            "description": req.description,
            "duration_minutes": req.duration_minutes,
            "passing_score": req.passing_score,
            "max_attempts": req.max_attempts,
            "is_randomized": 1 if req.is_randomized else 0,
            "access_type": req.access_type,
            "is_published": 1 if req.is_published else 0,
            "updated_at": now_iso()
        }
        res = db_engine.update("exams", exam_id, up)
        if not res:
            raise HTTPException(status_code=404, detail="الامتحان غير موجود")

        if req.questions is not None:
            db_engine.execute("DELETE FROM exam_questions WHERE exam_id = ?", (exam_id,))
            for idx, q_info in enumerate(req.questions):
                db_engine.insert("exam_questions", {
                    "id": uuid.uuid4().hex,
                    "exam_id": exam_id,
                    "question_id": q_info["question_id"],
                    "points": float(q_info.get("points", 1.0)),
                    "order_index": idx
                })
        return res

@router.delete("/{exam_id}")
def delete_exam(exam_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ("admin", "assistant"):
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")

    res = db_engine.delete("exams", exam_id)
    if not res:
        raise HTTPException(status_code=404, detail="الامتحان غير موجود")
    return {"success": True, "message": "تم حذف الامتحان بنجاح"}

@router.post("/{exam_id}/start")
def start_exam_attempt(exam_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        return AssessmentService.start_exam(user["id"], exam_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/attempts/{attempt_id}/autosave")
def autosave_exam_attempt(attempt_id: str, req: ExamAutosaveRequest, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        return AssessmentService.autosave_exam(attempt_id, user["id"], req.answers)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/attempts/{attempt_id}/submit")
def submit_exam_attempt(attempt_id: str, req: ExamSubmitRequest, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        return AssessmentService.submit_exam(attempt_id, user["id"], req.answers)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/attempts/{attempt_id}/result")
def get_attempt_result(attempt_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    att = db_engine.fetch_one("SELECT * FROM exam_attempts WHERE id = ?", (attempt_id,))
    if not att:
        raise HTTPException(status_code=404, detail="المحاولة غير موجودة")
    if att["user_id"] != user["id"] and user.get("role") not in ("admin", "assistant"):
        raise HTTPException(status_code=403, detail="غير مصرح بعرض نتائج طالب آخر")
    return att

@router.get("/{exam_id}/results")
def get_exam_all_results(exam_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ("admin", "assistant"):
        raise HTTPException(status_code=403, detail="مخصص للإدارة فقط")
    attempts = db_engine.fetch_all(
        "SELECT ea.*, u.full_name as student_name, u.username as student_username FROM exam_attempts ea JOIN users u ON ea.user_id = u.id WHERE ea.exam_id = ? ORDER BY ea.completed_at DESC",
        (exam_id,)
    )
    return attempts
