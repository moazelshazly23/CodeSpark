from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List, Dict, Any
from app.api.deps import require_teacher_or_admin, require_staff, get_current_user
from app.db.engine import db_engine
from app.services.core_services import AssignmentService, ActivityService, NotificationService
from app.schemas.assignments import AssignmentCreate, AssignmentUpdate, AssignmentAutosave, AssignmentSubmit, AssignmentGradeRequest

router = APIRouter(prefix="/assignments", tags=["Assignments"])

@router.get("")
def list_assignments(lesson_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    is_staff = user.get("role") in ["admin", "teacher", "assistant"]
    filters = {}
    if not is_staff:
        filters["is_published"] = True
    if lesson_id:
        filters["lesson_id"] = lesson_id

    assigns, _ = db_engine.query("assignments", filters=filters, order_by="created_at", descending=True)
    
    # Attach submission status if student
    if user.get("role") == "student":
        for a in assigns:
            subs, _ = db_engine.query("assignment_submissions", filters={"assignment_id": a["id"], "student_id": user["id"]})
            a["submission"] = subs[0] if subs else None
            lesson = db_engine.get_by_id("lessons", a["lesson_id"])
            a["lesson_title"] = lesson["title"] if lesson else "درس"
    return assigns

@router.post("")
def create_assignment(req: AssignmentCreate, user: dict = Depends(require_teacher_or_admin)):
    data = req.dict()
    q_items = data.pop("questions", [])
    data["created_by"] = user["id"]
    
    assign = db_engine.insert("assignments", data)
    for idx, q in enumerate(q_items):
        db_engine.insert("assignment_questions", {
            "assignment_id": assign["id"],
            "question_id": q["question_id"],
            "order_index": q.get("order_index", idx),
            "marks": q.get("marks", 1.0)
        })

    ActivityService.log(user["id"], "assignment_create", {"assignment_id": assign["id"], "title": assign["title"]})
    if assign.get("is_published"):
        NotificationService.broadcast("student", "assignment", "واجب جديد متاح", f"تمت إضافة واجب جديد: {assign['title']}", f"/assignments/{assign['id']}")
    return assign

@router.get("/{assignment_id}")
def get_assignment(assignment_id: str, user: dict = Depends(get_current_user)):
    assign = db_engine.get_by_id("assignments", assignment_id)
    if not assign:
        raise HTTPException(status_code=404, detail="الواجب غير موجود")
    
    # Fetch questions
    aq_links, _ = db_engine.query("assignment_questions", filters={"assignment_id": assignment_id}, order_by="order_index")
    questions = []
    for link in aq_links:
        q = db_engine.get_by_id("question_bank", link["question_id"])
        if q:
            q_copy = dict(q)
            q_copy["marks"] = link.get("marks", 1.0)
            if user.get("role") == "student":
                q_copy.pop("correct_answer", None)
                q_copy.pop("explanation", None)
            questions.append(q_copy)

    assign_detail = dict(assign)
    assign_detail["questions"] = questions

    if user.get("role") == "student":
        subs, _ = db_engine.query("assignment_submissions", filters={"assignment_id": assignment_id, "student_id": user["id"]})
        assign_detail["submission"] = subs[0] if subs else None
    
    return assign_detail

@router.put("/{assignment_id}")
def update_assignment(assignment_id: str, req: AssignmentUpdate, user: dict = Depends(require_teacher_or_admin)):
    existing = db_engine.get_by_id("assignments", assignment_id)
    if not existing:
        raise HTTPException(status_code=404, detail="الواجب غير موجود")
    data = req.dict(exclude_unset=True)
    q_items = data.pop("questions", None)

    if q_items is not None:
        links, _ = db_engine.query("assignment_questions", filters={"assignment_id": assignment_id})
        for l in links:
            db_engine.delete("assignment_questions", l["id"])
        for idx, q in enumerate(q_items):
            db_engine.insert("assignment_questions", {
                "assignment_id": assignment_id,
                "question_id": q["question_id"],
                "order_index": q.get("order_index", idx),
                "marks": q.get("marks", 1.0)
            })

    updated = db_engine.update("assignments", assignment_id, data)
    return updated

@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: str, user: dict = Depends(require_teacher_or_admin)):
    existing = db_engine.get_by_id("assignments", assignment_id)
    if not existing:
        raise HTTPException(status_code=404, detail="الواجب غير موجود")
    db_engine.delete("assignments", assignment_id)
    return {"success": True, "message": "تم حذف الواجب بنجاح"}

@router.put("/{assignment_id}/autosave")
def autosave_assignment(assignment_id: str, req: AssignmentAutosave, user: dict = Depends(get_current_user)):
    if user.get("role") != "student":
        raise HTTPException(status_code=400, detail="مخصص للطلاب فقط")
    try:
        res = AssignmentService.autosave(student_id=user["id"], assignment_id=assignment_id, answers=req.answers)
        return {"success": True, "last_saved_at": res.get("last_saved_at")}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{assignment_id}/submit")
def submit_assignment(assignment_id: str, req: AssignmentSubmit, user: dict = Depends(get_current_user)):
    if user.get("role") != "student":
        raise HTTPException(status_code=400, detail="مخصص للطلاب فقط")
    try:
        sub = AssignmentService.submit(student_id=user["id"], assignment_id=assignment_id, answers=req.answers)
        return sub
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{assignment_id}/submissions")
def list_submissions(assignment_id: str, user: dict = Depends(require_staff)):
    subs, _ = db_engine.query("assignment_submissions", filters={"assignment_id": assignment_id}, order_by="submitted_at", descending=True)
    for s in subs:
        st = db_engine.get_by_id("users", s["student_id"])
        s["student_name"] = st["full_name"] if st else "طالب"
        s["student_email"] = st["email"] if st else ""
    return subs

@router.post("/submissions/{submission_id}/grade")
def grade_submission(submission_id: str, req: AssignmentGradeRequest, user: dict = Depends(require_staff)):
    sub = db_engine.get_by_id("assignment_submissions", submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="التسليم غير موجود")
    
    updated = db_engine.update("assignment_submissions", submission_id, {
        "score": req.score,
        "feedback": req.feedback,
        "status": "graded",
        "graded_by": user["id"],
        "graded_at": db_engine._now_iso()
    })

    NotificationService.create(
        sub["student_id"],
        "grade",
        "تم تصحيح الواجب",
        f"تم تصحيح واجبك بنتيجة: {req.score} / {sub.get('total_possible', 10.0)}",
        f"/assignments/{sub['assignment_id']}"
    )
    ActivityService.log(user["id"], "assignment_graded", {"submission_id": submission_id, "score": req.score})
    return updated
