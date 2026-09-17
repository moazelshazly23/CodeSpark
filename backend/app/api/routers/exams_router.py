"""
Code Spark - Exams Router
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from app.api.deps import get_optional_user, get_current_user
from app.db.engine import db_engine, now_iso
from app.repositories.all_repositories import AssessmentRepository

router = APIRouter(prefix="/exams", tags=["Exams"])

@router.get("")
def list_exams(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    exams, total = AssessmentRepository.list_exams(is_admin=is_admin)
    return {"exams": exams, "total": total}

@router.get("/{exam_id}")
def get_exam(exam_id: str):
    exm = AssessmentRepository.get_exam(exam_id)
    if not exm:
        raise HTTPException(status_code=404, detail="الامتحان غير موجود")
    questions = AssessmentRepository.get_exam_questions(exam_id)
    for q in questions:
        try:
            q["options"] = json.loads(q.get("options_json") or "[]")
        except Exception:
            q["options"] = []
    return {"exam": exm, "questions": questions}

@router.post("/{exam_id}/submit")
def submit_exam(exam_id: str, answers: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    questions = AssessmentRepository.get_exam_questions(exam_id)
    total_points = sum(q.get("points", 1) for q in questions)
    score = 0
    ans_map = answers.get("answers", {})
    for q in questions:
        user_ans = str(ans_map.get(q["id"], "")).strip().lower()
        correct_ans = str(q.get("correct_answer", "")).strip().lower()
        if user_ans == correct_ans:
            score += q.get("points", 1)
    passed = 1 if (total_points > 0 and (score / total_points * 100) >= 60) else 0
    attempt = db_engine.insert("exam_attempts", {
        "exam_id": exam_id,
        "user_id": user["id"],
        "score": score,
        "total_points": total_points,
        "passed": passed,
        "answers_json": json.dumps(ans_map, ensure_ascii=False),
        "started_at": now_iso(),
        "submitted_at": now_iso()
    })
    return {"success": True, "score": score, "total": total_points, "passed": bool(passed)}
