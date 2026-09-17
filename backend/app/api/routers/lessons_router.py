"""
CodeSpark - Units, Lessons & Exercises Router
Handles video lessons, YouTube integration, student access gating, and progress tracking.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional, List
from app.api.deps import get_optional_user, get_current_user, require_role
from app.repositories.repositories import (
    UnitRepository, LessonRepository, CourseRepository,
    SubscriptionRepository, ExercisesRepository, StudyFileRepository
)
from app.schemas.all_schemas import (
    UnitCreate, UnitUpdate, LessonCreate, LessonUpdate,
    LessonProgressUpdate, ExerciseCreate, ExerciseUpdate, ExerciseSubmitRequest
)

router = APIRouter(tags=["Units, Lessons & Exercises"])

# -----------------------------------------------------------------------------
# Units
# -----------------------------------------------------------------------------
@router.post("/units", dependencies=[Depends(require_role("admin", "assistant"))])
def create_unit(req: UnitCreate):
    data = req.dict()
    data["is_published"] = 1 if req.is_published else 0
    unit = UnitRepository.create(data)
    return {"success": True, "unit": unit}

@router.put("/units/{unit_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_unit(unit_id: str, req: UnitUpdate):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    if "is_published" in updates:
        updates["is_published"] = 1 if updates["is_published"] else 0
    unit = UnitRepository.update(unit_id, updates)
    if not unit:
        raise HTTPException(status_code=404, detail="الوحدة الدراسية غير موجودة")
    return {"success": True, "unit": unit}

@router.delete("/units/{unit_id}", dependencies=[Depends(require_role("admin"))])
def delete_unit(unit_id: str):
    success = UnitRepository.delete(unit_id)
    if not success:
        raise HTTPException(status_code=404, detail="الوحدة الدراسية غير موجودة")
    return {"success": True, "message": "تم حذف الوحدة الدراسية بنجاح"}

# -----------------------------------------------------------------------------
# Lessons
# -----------------------------------------------------------------------------
@router.get("/lessons")
def list_all_lessons(user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    is_staff = bool(user and user.get("role") in ("admin", "assistant"))
    lessons = LessonRepository.list_all(only_published=not is_staff)
    return {"lessons": lessons}

@router.get("/lessons/{lesson_id}")
def get_lesson(lesson_id: str, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    lesson = LessonRepository.get_by_id(lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="الدرس غير موجود")
    
    # Check access permission:
    # 1. Staff (admin / assistant) always have access.
    # 2. Free lessons (is_free = 1) are open to all registered/unregistered students.
    # 3. Paid lessons require active subscription.
    is_staff = bool(user and user.get("role") in ("admin", "assistant"))
    is_free = bool(lesson.get("is_free", 0))
    is_subscribed = False

    if user and user.get("id"):
        sub = SubscriptionRepository.get_active_subscription(user["id"])
        is_subscribed = bool(sub)

    can_access = is_staff or is_free or is_subscribed

    # Attach exercises and files for this lesson
    exercises = ExercisesRepository.list_by_lesson(lesson_id)
    files = StudyFileRepository.list_files(lesson_id=lesson_id, only_published=True)

    progress = None
    if user and user.get("id"):
        progress = LessonRepository.get_progress(user["id"], lesson_id)

    response = dict(lesson)
    response["can_access"] = can_access
    response["is_subscribed"] = is_subscribed
    response["exercises"] = exercises
    response["files"] = files
    response["progress"] = progress

    if not can_access:
        # Hide video URL and full markdown content for locked lessons
        response["video_url"] = None
        response["content_markdown"] = "### 🔒 هذا الدرس متاح للمشتركين فقط\nيرجى تفعيل اشتراكك أو إدخال كود التفعيل للوصول لشرح الدرس والفيديو والتمارين."

    return response

@router.post("/lessons", dependencies=[Depends(require_role("admin", "assistant"))])
def create_lesson(req: LessonCreate):
    data = req.dict()
    data["is_free"] = 1 if req.is_free else 0
    data["is_published"] = 1 if req.is_published else 0
    lesson = LessonRepository.create(data)
    return {"success": True, "lesson": lesson}

@router.put("/lessons/{lesson_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_lesson(lesson_id: str, req: LessonUpdate):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    if "is_free" in updates:
        updates["is_free"] = 1 if updates["is_free"] else 0
    if "is_published" in updates:
        updates["is_published"] = 1 if updates["is_published"] else 0
    lesson = LessonRepository.update(lesson_id, updates)
    if not lesson:
        raise HTTPException(status_code=404, detail="الدرس غير موجود")
    return {"success": True, "lesson": lesson}

@router.delete("/lessons/{lesson_id}", dependencies=[Depends(require_role("admin"))])
def delete_lesson(lesson_id: str):
    success = LessonRepository.delete(lesson_id)
    if not success:
        raise HTTPException(status_code=404, detail="الدرس غير موجود")
    return {"success": True, "message": "تم حذف الدرس بنجاح"}

@router.post("/lessons/{lesson_id}/progress")
def update_lesson_progress(lesson_id: str, req: LessonProgressUpdate, user: Dict[str, Any] = Depends(get_current_user)):
    updates = {}
    if req.is_completed is not None:
        updates["is_completed"] = 1 if req.is_completed else 0
    if req.last_position_seconds is not None:
        updates["last_position_seconds"] = req.last_position_seconds
    if req.watch_percentage is not None:
        updates["watch_percentage"] = req.watch_percentage
    prog = LessonRepository.update_progress(user["id"], lesson_id, updates)
    return {"success": True, "progress": prog}

# -----------------------------------------------------------------------------
# Exercises
# -----------------------------------------------------------------------------
@router.post("/exercises", dependencies=[Depends(require_role("admin", "assistant"))])
def create_exercise(req: ExerciseCreate):
    data = req.dict()
    import json
    data["test_cases_json"] = json.dumps(data.pop("test_cases", []), ensure_ascii=False)
    data["is_published"] = 1 if req.is_published else 0
    ex = ExercisesRepository.create(data)
    return {"success": True, "exercise": ex}

@router.put("/exercises/{ex_id}", dependencies=[Depends(require_role("admin", "assistant"))])
def update_exercise(ex_id: str, req: ExerciseUpdate):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    if "test_cases" in updates:
        import json
        updates["test_cases_json"] = json.dumps(updates.pop("test_cases"), ensure_ascii=False)
    if "is_published" in updates:
        updates["is_published"] = 1 if updates["is_published"] else 0
    ex = ExercisesRepository.update(ex_id, updates)
    if not ex:
        raise HTTPException(status_code=404, detail="التمرين غير موجود")
    return {"success": True, "exercise": ex}

@router.delete("/exercises/{ex_id}", dependencies=[Depends(require_role("admin"))])
def delete_exercise(ex_id: str):
    success = ExercisesRepository.delete(ex_id)
    if not success:
        raise HTTPException(status_code=404, detail="التمرين غير موجود")
    return {"success": True, "message": "تم حذف التمرين بنجاح"}

@router.post("/exercises/{ex_id}/submit")
def submit_exercise(ex_id: str, req: ExerciseSubmitRequest, user: Dict[str, Any] = Depends(get_current_user)):
    from app.services.code_runner import CodeExecutionService
    ex = ExercisesRepository.get_exercise(ex_id)
    if not ex:
        raise HTTPException(status_code=404, detail="التمرين غير موجود")
    
    # Run code against test cases
    test_cases = ex.get("test_cases", [])
    if not test_cases and ex.get("expected_output"):
        test_cases = [{"input": "", "expected": ex.get("expected_output")}]

    tests_passed = 0
    tests_total = len(test_cases)
    last_output = ""

    if tests_total == 0:
        run_res = CodeExecutionService.execute_code(ex.get("language", "python"), req.submitted_code)
        last_output = run_res.get("output", "")
        status_str = "PASSED" if run_res.get("success") else "FAILED"
        tests_passed = 1 if run_res.get("success") else 0
        tests_total = 1
    else:
        all_passed = True
        for tc in test_cases:
            t_input = tc.get("input", "")
            t_expected = tc.get("expected", "").strip()
            res = CodeExecutionService.execute_code(ex.get("language", "python"), req.submitted_code, user_input=t_input)
            last_output = res.get("output", "").strip()
            if res.get("success") and (t_expected in last_output or last_output == t_expected):
                tests_passed += 1
            else:
                all_passed = False
        status_str = "PASSED" if all_passed else "FAILED"

    sub = ExercisesRepository.record_submission(
        user_id=user["id"],
        exercise_id=ex_id,
        submitted_code=req.submitted_code,
        status=status_str,
        output=last_output,
        tests_passed=tests_passed,
        tests_total=tests_total
    )
    return {
        "success": (status_str == "PASSED"),
        "status": status_str,
        "output": last_output,
        "tests_passed": tests_passed,
        "tests_total": tests_total,
        "submission_id": sub.get("id")
    }
