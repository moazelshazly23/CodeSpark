"""
Code Spark - Questions Bank Router
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from app.api.deps import require_role
from app.repositories.all_repositories import AssessmentRepository
from app.schemas.all_schemas import QuestionCreate, QuestionUpdate

router = APIRouter(prefix="/questions", tags=["Question Bank"])

@router.get("")
def list_questions(lesson_id: Optional[str] = None, qtype: Optional[str] = None, difficulty: Optional[str] = None, search: Optional[str] = None, offset: int = 0, limit: int = 50):
    qs, total = AssessmentRepository.list_questions(lesson_id=lesson_id, qtype=qtype, difficulty=difficulty, search=search, offset=offset, limit=limit)
    for q in qs:
        try:
            q["options"] = json.loads(q.get("options_json") or "[]")
        except Exception:
            q["options"] = []
    return {"questions": qs, "total": total}

@router.get("/{qid}")
def get_question(qid: str):
    q = AssessmentRepository.get_question(qid)
    if not q:
        raise HTTPException(status_code=404, detail="السؤال غير موجود")
    try:
        q["options"] = json.loads(q.get("options_json") or "[]")
    except Exception:
        q["options"] = []
    return q

@router.post("", dependencies=[Depends(require_role("admin", "assistant"))])
def create_question(req: QuestionCreate):
    opts = [o.dict() for o in req.options] if req.options else []
    data = {
        "lesson_id": req.lesson_id,
        "question_type": req.question_type,
        "question_text": req.question_text,
        "options_json": json.dumps(opts, ensure_ascii=False),
        "correct_answer": req.correct_answer,
        "explanation": req.explanation,
        "points": req.points,
        "difficulty": req.difficulty,
        "is_active": 1 if req.is_active else 0
    }
    rec = AssessmentRepository.create_question(data)
    return {"success": True, "question": rec}

@router.put("/{qid}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_question(qid: str, req: QuestionUpdate):
    updates = {}
    for k, v in req.dict().items():
        if v is not None:
            if k == "options":
                updates["options_json"] = json.dumps([o.dict() for o in v], ensure_ascii=False)
            elif k == "is_active":
                updates[k] = 1 if v else 0
            else:
                updates[k] = v
    q = AssessmentRepository.update_question(qid, updates)
    if not q:
        raise HTTPException(status_code=404, detail="السؤال غير موجود")
    return {"success": True, "question": q}

@router.delete("/{qid}", dependencies=[Depends(require_role("admin", "assistant"))])
def delete_question(qid: str):
    AssessmentRepository.delete_question(qid)
    return {"success": True, "message": "تم حذف السؤال بنجاح"}
