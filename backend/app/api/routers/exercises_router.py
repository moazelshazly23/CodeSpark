from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
import uuid, json
from app.schemas.all_schemas import ExerciseCreateRequest, ExerciseSubmitRequest, CodeRunRequest
from app.services.core_services import CodeRunnerService
from app.repositories.all_repositories import ExerciseRepository
from app.api.deps import get_optional_user, get_current_user, require_role
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/exercises", tags=["Exercises"])

@router.get("")
def list_exercises(lesson_id: Optional[str] = None, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") in ("admin", "assistant"))
    exercises, total = ExerciseRepository.list_exercises(lesson_id=lesson_id, is_admin=is_admin)
    return exercises

@router.get("/{exercise_id}")
def get_exercise(exercise_id: str):
    ex = ExerciseRepository.get_exercise(exercise_id)
    if not ex:
        raise HTTPException(status_code=404, detail="التمرين غير موجود")
    return ex

@router.post("", dependencies=[Depends(require_role("admin", "assistant"))])
def create_exercise(req: ExerciseCreateRequest):
    rec = {
        "id": uuid.uuid4().hex,
        "unit_id": req.unit_id,
        "lesson_id": req.lesson_id,
        "title": req.title,
        "description": req.description,
        "instructions": req.instructions,
        "starter_code": req.starter_code,
        "expected_output": req.expected_output,
        "test_cases_json": req.test_cases_json or "[]",
        "language": req.language,
        "difficulty": req.difficulty,
        "solution_code": req.solution_code,
        "access_type": req.access_type,
        "is_published": 1 if req.is_published else 0,
        "created_at": now_iso(),
        "updated_at": now_iso()
    }
    return db_engine.insert("exercises", rec)

@router.post("/{exercise_id}/submit")
def submit_exercise(exercise_id: str, req: ExerciseSubmitRequest, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        return CodeRunnerService.check_exercise(exercise_id, user["id"], req.code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/playground/run")
def run_playground_code(req: CodeRunRequest, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    try:
        res = CodeRunnerService.execute_code(req.language, req.code, req.user_input or "")
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
