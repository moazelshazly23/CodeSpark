from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
import uuid, json
from app.schemas.all_schemas import QuizCreateRequest, QuizSubmitRequest
from app.repositories.all_repositories import AssessmentRepository
from app.api.deps import get_optional_user, get_current_user, require_role
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])

@router.get("")
def list_quizzes(lesson_id: Optional[str] = None, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    quizzes, total = AssessmentRepository.list_quizzes(lesson_id=lesson_id, is_admin=is_admin)
    return quizzes

@router.get("/{quiz_id}")
def get_quiz(quiz_id: str):
    quiz = db_engine.fetch_one("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))
    if not quiz:
        raise HTTPException(status_code=404, detail="الاختبار القصير غير موجود")
    questions = AssessmentRepository.get_quiz_questions(quiz_id)
    quiz["questions"] = questions
    return quiz

@router.post("", dependencies=[Depends(require_role("admin", "assistant"))])
def create_quiz(req: QuizCreateRequest):
    with db_engine.transaction():
        quiz_id = uuid.uuid4().hex
        rec = {
            "id": quiz_id,
            "lesson_id": req.lesson_id,
            "unit_id": req.unit_id,
            "title": req.title,
            "description": req.description,
            "passing_score": req.passing_score,
            "time_limit_minutes": req.time_limit_minutes,
            "access_type": req.access_type,
            "is_published": 1 if req.is_published else 0,
            "created_at": now_iso(),
            "updated_at": now_iso()
        }
        db_engine.insert("quizzes", rec)
        if req.questions:
            for idx, q_info in enumerate(req.questions):
                db_engine.insert("quiz_questions", {
                    "id": uuid.uuid4().hex,
                    "quiz_id": quiz_id,
                    "question_id": q_info["question_id"],
                    "points": float(q_info.get("points", 1.0)),
                    "order_index": idx
                })
        return rec

@router.post("/{quiz_id}/submit")
def submit_quiz(quiz_id: str, req: QuizSubmitRequest, user: Dict[str, Any] = Depends(get_current_user)):
    quiz = db_engine.fetch_one("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))
    if not quiz:
        raise HTTPException(status_code=404, detail="الاختبار القصير غير موجود")

    questions = AssessmentRepository.get_quiz_questions(quiz_id)
    total_pts = 0.0
    earned_pts = 0.0
    feedback = {}

    for q in questions:
        pts = float(q.get("points", 1.0))
        total_pts += pts
        q_id = q["id"]
        user_ans = str(req.answers.get(q_id, "")).strip().lower()
        correct_ans = str(q.get("correct_answer", "")).strip().lower()
        is_corr = (user_ans == correct_ans)
        if is_corr:
            earned_pts += pts
        feedback[q_id] = {
            "correct": is_corr,
            "correct_answer": q.get("correct_answer"),
            "explanation": q.get("explanation")
        }

    pct = round((earned_pts / total_pts * 100.0), 1) if total_pts > 0 else 0.0
    passed = (pct >= float(quiz.get("passing_score", 70.0)))

    attempt_rec = {
        "id": uuid.uuid4().hex,
        "user_id": user["id"],
        "quiz_id": quiz_id,
        "answers_json": json.dumps(req.answers, ensure_ascii=False),
        "score": earned_pts,
        "total_possible": total_pts,
        "percentage": pct,
        "is_passed": 1 if passed else 0,
        "started_at": now_iso(),
        "completed_at": now_iso()
    }
    db_engine.insert("quiz_attempts", attempt_rec)

    if passed:
        db_engine.execute("UPDATE student_stats SET xp = xp + 40 WHERE user_id = ?", (user["id"],))

    return {
        "score": earned_pts,
        "total_possible": total_pts,
        "percentage": pct,
        "passed": passed,
        "feedback": feedback
    }
