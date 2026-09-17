"""
Code Spark - Quizzes Router
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from app.api.deps import get_optional_user, get_current_user
from app.db.engine import db_engine, now_iso
from app.repositories.all_repositories import AssessmentRepository

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])

@router.get("")
def list_quizzes(lesson_id: Optional[str] = None, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    quizzes, total = AssessmentRepository.list_quizzes(lesson_id=lesson_id, is_admin=is_admin)
    return {"quizzes": quizzes, "total": total}

@router.get("/{quiz_id}")
def get_quiz(quiz_id: str):
    qz = AssessmentRepository.get_quiz(quiz_id)
    if not qz:
        raise HTTPException(status_code=404, detail="الاختبار غير موجود")
    questions = AssessmentRepository.get_quiz_questions(quiz_id)
    for q in questions:
        try:
            q["options"] = json.loads(q.get("options_json") or "[]")
        except Exception:
            q["options"] = []
    return {"quiz": qz, "questions": questions}

@router.post("/{quiz_id}/submit")
def submit_quiz(quiz_id: str, answers: Dict[str, Any], user: Dict[str, Any] = Depends(get_current_user)):
    questions = AssessmentRepository.get_quiz_questions(quiz_id)
    total_points = sum(q.get("points", 1) for q in questions)
    score = 0
    ans_map = answers.get("answers", {})
    for q in questions:
        user_ans = str(ans_map.get(q["id"], "")).strip().lower()
        correct_ans = str(q.get("correct_answer", "")).strip().lower()
        if user_ans == correct_ans:
            score += q.get("points", 1)
    passed = 1 if (total_points > 0 and (score / total_points * 100) >= 60) else 0
    attempt = db_engine.insert("quiz_attempts", {
        "quiz_id": quiz_id,
        "user_id": user["id"],
        "score": score,
        "total_points": total_points,
        "passed": passed,
        "answers_json": json.dumps(ans_map, ensure_ascii=False),
        "submitted_at": now_iso()
    })
    return {"success": True, "score": score, "total": total_points, "passed": bool(passed)}
