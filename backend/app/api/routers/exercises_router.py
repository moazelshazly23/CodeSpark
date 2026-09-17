"""
Code Spark - Coding Exercises Router
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from pydantic import BaseModel
from app.api.deps import get_optional_user, get_current_user
from app.repositories.all_repositories import ExerciseRepository
from app.services.code_runner import CodeExecutionService

router = APIRouter(prefix="/exercises", tags=["Exercises"])

class SubmissionRequest(BaseModel):
    submitted_code: str

@router.get("")
def list_exercises(lesson_id: Optional[str] = None):
    exs, total = ExerciseRepository.list_exercises(lesson_id=lesson_id)
    return {"exercises": exs, "total": total}

@router.get("/{exercise_id}")
def get_exercise(exercise_id: str):
    ex = ExerciseRepository.get_exercise(exercise_id)
    if not ex:
        raise HTTPException(status_code=404, detail="التمرين غير موجود")
    return ex

@router.post("/{exercise_id}/submit")
def submit_exercise(exercise_id: str, req: SubmissionRequest, user: Dict[str, Any] = Depends(get_current_user)):
    ex = ExerciseRepository.get_exercise(exercise_id)
    if not ex:
        raise HTTPException(status_code=404, detail="التمرين غير موجود")
    run_res = CodeExecutionService.execute_code(ex.get("language", "python"), req.submitted_code)
    expected = (ex.get("expected_output") or "").strip()
    actual = (run_res.get("stdout") or "").strip()
    passed = 1 if (expected and expected in actual) else 0
    status_str = "PASSED" if passed else "FAILED"
    sub = ExerciseRepository.record_submission({
        "exercise_id": exercise_id,
        "user_id": user["id"],
        "submitted_code": req.submitted_code,
        "status": status_str,
        "passed_tests": 1 if passed else 0,
        "total_tests": 1,
        "output": run_res.get("output")
    })
    return {
        "success": bool(passed),
        "status": status_str,
        "output": run_res.get("output"),
        "submission_id": sub["id"]
    }
