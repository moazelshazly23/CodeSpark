from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Dict, Any
from app.api.deps import get_current_user, require_staff
from app.db.engine import db_engine

router = APIRouter(tags=["Reports & Analytics"])

@router.get("/reports/student/performance")
def get_student_performance(user: dict = Depends(get_current_user)):
    student_id = user["id"]
    
    # Lesson completion stats
    lessons, total_lessons = db_engine.query("lessons", filters={"is_published": True})
    progress, _ = db_engine.query("lesson_progress", filters={"student_id": student_id})
    completed_lessons = [p for p in progress if p.get("is_completed")]

    # Exam attempts stats
    attempts, _ = db_engine.query("exam_attempts", filters={"student_id": student_id, "status": "graded"}, order_by="started_at")
    exam_history = []
    for a in attempts:
        ex = db_engine.get_by_id("exams", a["exam_id"])
        exam_history.append({
            "exam_id": a["exam_id"],
            "exam_title": ex["title"] if ex else "امتحان",
            "score": a.get("score", 0.0),
            "total_possible": a.get("total_possible", 100.0),
            "percentage": a.get("percentage", 0.0),
            "attempt_number": a.get("attempt_number", 1),
            "date": a.get("submitted_at") or a.get("started_at")
        })

    # Assignment submissions stats
    subs, _ = db_engine.query("assignment_submissions", filters={"student_id": student_id, "status": "graded"})
    assign_history = []
    for s in subs:
        asg = db_engine.get_by_id("assignments", s["assignment_id"])
        assign_history.append({
            "assignment_id": s["assignment_id"],
            "title": asg["title"] if asg else "واجب",
            "score": s.get("score", 0.0),
            "total_possible": s.get("total_possible", 10.0),
            "date": s.get("submitted_at")
        })

    # Strengths and Weaknesses calculated from questions in attempts
    lesson_perf: Dict[str, Dict[str, float]] = {}
    for a in attempts:
        answers = a.get("answers", {})
        eq_links, _ = db_engine.query("exam_questions", filters={"exam_id": a["exam_id"]})
        for link in eq_links:
            q = db_engine.get_by_id("question_bank", link["question_id"])
            if not q or not q.get("lesson_id"):
                continue
            lid = q["lesson_id"]
            les = db_engine.get_by_id("lessons", lid)
            les_title = les["title"] if les else "وحدة دراسية"
            if les_title not in lesson_perf:
                lesson_perf[les_title] = {"correct": 0, "total": 0}
            
            lesson_perf[les_title]["total"] += 1
            user_ans = answers.get(q["id"])
            # Determine if correct
            if q.get("question_type") == "multiple_choice":
                for opt in q.get("options", []):
                    if (opt.get("id") == user_ans or opt.get("text") == user_ans) and opt.get("is_correct"):
                        lesson_perf[les_title]["correct"] += 1
            elif q.get("question_type") == "true_false":
                if str(user_ans).strip().lower() == str(q.get("correct_answer", "")).strip().lower():
                    lesson_perf[les_title]["correct"] += 1

    strong_areas = []
    weak_areas = []
    for topic, stats in lesson_perf.items():
        if stats["total"] > 0:
            rate = round(stats["correct"] / stats["total"] * 100, 1)
            item = {"topic": topic, "success_rate": rate, "questions_count": stats["total"]}
            if rate >= 70:
                strong_areas.append(item)
            else:
                weak_areas.append(item)

    strong_areas.sort(key=lambda x: x["success_rate"], reverse=True)
    weak_areas.sort(key=lambda x: x["success_rate"])

    overall_exam_avg = round(sum(a["percentage"] for a in exam_history) / len(exam_history), 1) if exam_history else 0.0
    progress_pct = round(len(completed_lessons) / total_lessons * 100, 1) if total_lessons > 0 else 0.0

    return {
        "overall_progress": progress_pct,
        "completed_lessons_count": len(completed_lessons),
        "total_lessons_count": total_lessons,
        "exam_average": overall_exam_avg,
        "exams_history": exam_history,
        "assignments_history": assign_history,
        "strong_areas": strong_areas,
        "weak_areas": weak_areas
    }

@router.get("/activities")
def list_activities(limit: int = 30, user: dict = Depends(get_current_user)):
    is_staff = user.get("role") in ["admin", "teacher"]
    filters = {} if is_staff else {"user_id": user["id"]}
    acts, _ = db_engine.query("activities", filters=filters, order_by="created_at", descending=True, limit=limit)
    
    # Attach actor username
    for a in acts:
        u = db_engine.get_by_id("users", a["user_id"])
        a["username"] = u["username"] if u else "مستخدم"
        a["full_name"] = u["full_name"] if u else "مستخدم"
    return acts
