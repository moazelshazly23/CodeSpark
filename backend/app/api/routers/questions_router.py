from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
import uuid, json
from app.schemas.all_schemas import QuestionCreateRequest
from app.repositories.all_repositories import AssessmentRepository
from app.api.deps import get_current_user
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/questions", tags=["Question Bank"])

@router.get("")
def list_questions(topic: Optional[str] = None, difficulty: Optional[str] = None, qtype: Optional[str] = None, search: Optional[str] = None, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "questions.read" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية تصفح بنك الأسئلة")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")

    questions, total = AssessmentRepository.list_questions(topic=topic, difficulty=difficulty, qtype=qtype, search=search)
    return {"questions": questions, "total": total}

@router.get("/{question_id}")
def get_question(question_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    q = AssessmentRepository.get_question(question_id)
    if not q:
        raise HTTPException(status_code=404, detail="السؤال غير موجود")
    return q

@router.post("")
def create_question(req: QuestionCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "questions.create" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية إضافة أسئلة جديدة")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")

    rec = {
        "id": uuid.uuid4().hex,
        "question_text": req.question_text,
        "question_type": req.question_type,
        "options_json": req.options_json or "[]",
        "correct_answer": req.correct_answer,
        "explanation": req.explanation,
        "difficulty": req.difficulty,
        "topic": req.topic,
        "unit_id": req.unit_id,
        "lesson_id": req.lesson_id,
        "tags_json": req.tags_json or "[]",
        "status": "active",
        "created_by": user["id"],
        "created_at": now_iso(),
        "updated_at": now_iso()
    }
    return db_engine.insert("question_bank", rec)

@router.put("/{question_id}")
def update_question(question_id: str, req: QuestionCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "questions.edit" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية تعديل الأسئلة")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")

    up = {
        "question_text": req.question_text,
        "question_type": req.question_type,
        "options_json": req.options_json,
        "correct_answer": req.correct_answer,
        "explanation": req.explanation,
        "difficulty": req.difficulty,
        "topic": req.topic,
        "unit_id": req.unit_id,
        "lesson_id": req.lesson_id,
        "tags_json": req.tags_json,
        "updated_at": now_iso()
    }
    res = db_engine.update("question_bank", question_id, up)
    if not res:
        raise HTTPException(status_code=404, detail="السؤال غير موجود")
    return res

@router.delete("/{question_id}")
def delete_question(question_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if user["role"] == "assistant":
        perms = user.get("permissions", [])
        if "questions.delete" not in perms:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية حذف الأسئلة")
    elif user["role"] != "admin":
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")

    res = db_engine.delete("question_bank", question_id)
    if not res:
        raise HTTPException(status_code=404, detail="السؤال غير موجود")
    return {"success": True, "message": "تم حذف السؤال"}
