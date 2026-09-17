"""
CodeSpark - Question Bank, Assessments & Exams Router
Supports automated grading, multiple choice questions, timer bounds, and student score persistence.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional, List
from app.api.deps import get_current_user, get_optional_user, require_role, require_permission
from app.repositories.repositories import ExamsRepository
from app.schemas.all_schemas import (
    QuestionCreate, QuestionUpdate, ExamCreate, ExamUpdate, ExamSubmitRequest
)

router = APIRouter(tags=["Question Bank & Exams"])

# -----------------------------------------------------------------------------
# Question Bank
# -----------------------------------------------------------------------------
@router.get("/questions", dependencies=[Depends(require_role("admin", "assistant"))])
def list_questions(lesson_id: Optional[str] = None, unit_id: Optional[str] = None):
    questions = ExamsRepository.list_questions(lesson_id=lesson_id, unit_id=unit_id)
    return {"questions": questions}

@router.post("/questions", dependencies=[Depends(require_role("admin", "assistant"))])
def create_question(req: QuestionCreate):
    data = req.dict()
    data["options_json"] = json.dumps(data.pop("options", []), ensure_ascii=False)
    data["is_active"] = 1 if req.is_active else 0
    q = ExamsRepository.create_question(data)
    return {"success": True, "question": q}

@router.put("/questions/{q_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_question(q_id: str, req: QuestionUpdate):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    if "options" in updates:
        updates["options_json"] = json.dumps(updates.pop("options"), ensure_ascii=False)
    if "is_active" in updates:
        updates["is_active"] = 1 if updates["is_active"] else 0
    q = ExamsRepository.update_question(q_id, updates)
    if not q:
        raise HTTPException(status_code=404, detail="السؤال غير موجود")
    return {"success": True, "question": q}

@router.delete("/questions/{q_id}", dependencies=[Depends(require_role("admin"))])
def delete_question(q_id: str):
    success = ExamsRepository.delete_question(q_id)
    if not success:
        raise HTTPException(status_code=404, detail="السؤال غير موجود")
    return {"success": True, "message": "تم حذف السؤال بنجاح"}

# -----------------------------------------------------------------------------
# Exams
# -----------------------------------------------------------------------------
@router.get("/exams")
def list_exams(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_staff = bool(user and user.get("role") in ("admin", "assistant"))
    exams = ExamsRepository.list_exams(only_published=not is_staff)
    return {"exams": exams}

@router.get("/exams/{exam_id}")
def get_exam(exam_id: str, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    exam = ExamsRepository.get_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="الامتحان غير موجود")
    
    # Hide correct answers for students during exam attempt
    is_staff = bool(user and user.get("role") in ("admin", "assistant"))
    exam_copy = dict(exam)
    questions = []
    for q in exam.get("questions", []):
        qc = dict(q)
        if not is_staff:
            qc.pop("correct_answer", None)
            qc.pop("explanation", None)
        questions.append(qc)
    exam_copy["questions"] = questions
    return exam_copy

@router.post("/exams", dependencies=[Depends(require_role("admin", "assistant"))])
def create_exam(req: ExamCreate, user: Dict[str, Any] = Depends(require_role("admin", "assistant"))):
    data = req.dict()
    q_ids = data.pop("question_ids", [])
    data["is_published"] = 1 if req.is_published else 0
    data["created_by"] = user["id"]
    exam = ExamsRepository.create_exam(data, q_ids)
    return {"success": True, "exam": exam}

@router.put("/exams/{exam_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_exam(exam_id: str, req: ExamUpdate):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    q_ids = updates.pop("question_ids", None)
    if "is_published" in updates:
        updates["is_published"] = 1 if updates["is_published"] else 0
    exam = ExamsRepository.update_exam(exam_id, updates, question_ids=q_ids)
    if not exam:
        raise HTTPException(status_code=404, detail="الامتحان غير موجود")
    return {"success": True, "exam": exam}

@router.delete("/exams/{exam_id}", dependencies=[Depends(require_role("admin"))])
def delete_exam(exam_id: str):
    success = ExamsRepository.delete_exam(exam_id)
    if not success:
        raise HTTPException(status_code=404, detail="الامتحان غير موجود")
    return {"success": True, "message": "تم حذف الامتحان بنجاح"}

@router.post("/exams/{exam_id}/submit")
def submit_exam(exam_id: str, req: ExamSubmitRequest, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        attempt = ExamsRepository.submit_attempt(user["id"], exam_id, req.answers)
        return {"success": True, "attempt": attempt}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/exams/attempts/my")
def get_my_exam_attempts(user: Dict[str, Any] = Depends(get_current_user)):
    attempts = ExamsRepository.list_attempts(user_id=user["id"])
    return {"attempts": attempts}

@router.get("/exams/attempts/all", dependencies=[Depends(require_role("admin", "assistant"))])
def get_all_exam_attempts(exam_id: Optional[str] = None):
    attempts = ExamsRepository.list_attempts(exam_id=exam_id)
    return {"attempts": attempts}
