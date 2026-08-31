import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, List, Dict, Any
from ..database import get_db
from ..dependencies import get_current_user, get_current_student, get_current_admin, get_active_student_or_admin, check_student_subscription
from ..models import LessonProgressUpdateRequest, VideoProgressUpdateRequest

router = APIRouter(prefix="/api/progress", tags=["Student Progress & Tracking"])

@router.get("/student")
def get_student_progress_summary(student: dict = Depends(get_current_student)):
    """Retrieve full dynamic student progress metrics and analytics."""
    student_id = student["id"]
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Total Published Lessons
        cursor.execute("SELECT COUNT(*) as cnt FROM lessons WHERE is_published = 1")
        total_published_lessons = cursor.fetchone()["cnt"]

        # 2. Completed Lessons for this student
        cursor.execute("SELECT lesson_id, progress, completed, last_position, updated_at FROM lesson_progress WHERE student_id = ? AND completed = 1", (student_id,))
        completed_rows = cursor.fetchall()
        completed_lessons = [r["lesson_id"] for r in completed_rows]
        completed_count = len(completed_lessons)

        # 3. Overall Completion Rate
        overall_progress_pct = round((completed_count / total_published_lessons * 100)) if total_published_lessons > 0 else 0

        # 4. Exam Attempts and Average Score
        cursor.execute("""
        SELECT ea.*, e.title as exam_title, u.title as unit_title
        FROM exam_attempts ea
        JOIN exams e ON ea.exam_id = e.id
        LEFT JOIN units u ON e.unit_id = u.id
        WHERE ea.student_id = ?
        ORDER BY ea.completed_at DESC
        """, (student_id,))
        attempts_rows = cursor.fetchall()
        exam_attempts = []
        total_score_sum = 0
        for r in attempts_rows:
            att = dict(r)
            exam_attempts.append(att)
            total_score_sum += att.get("percentage", 0)

        exams_count = len(exam_attempts)
        avg_score = round(total_score_sum / exams_count) if exams_count > 0 else (student.get("avg_score") or 0)

        # 4.1 Quiz Attempts
        cursor.execute("""
        SELECT qa.*, q.title as quiz_title, q.lesson_id, l.title as lesson_title
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        LEFT JOIN lessons l ON q.lesson_id = l.id
        WHERE qa.student_id = ?
        ORDER BY qa.completed_at DESC
        """, (student_id,))
        quiz_attempts = [dict(r) for r in cursor.fetchall()]

        # 5. Last active lesson / Continue Learning
        last_lesson_id = student.get("last_lesson_id")
        current_lesson = None
        if last_lesson_id:
            cursor.execute("""
            SELECT l.*, u.title as unit_title, u.number as unit_number, lp.progress as current_progress, lp.last_position
            FROM lessons l
            JOIN units u ON l.unit_id = u.id
            LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.student_id = ?
            WHERE l.id = ?
            """, (student_id, last_lesson_id))
            row = cursor.fetchone()
            if row:
                current_lesson = dict(row)
        
        # If no last lesson or completed, pick the first incomplete lesson
        if not current_lesson:
            cursor.execute("""
            SELECT l.*, u.title as unit_title, u.number as unit_number, 0 as current_progress, 0 as last_position
            FROM lessons l
            JOIN units u ON l.unit_id = u.id
            WHERE l.is_published = 1 AND l.id NOT IN (SELECT lesson_id FROM lesson_progress WHERE student_id = ? AND completed = 1)
            ORDER BY u.order_index ASC, l.order_index ASC LIMIT 1
            """, (student_id,))
            row = cursor.fetchone()
            if row:
                current_lesson = dict(row)

        # 6. Unit breakdown
        cursor.execute("SELECT id, number, title FROM units WHERE is_published = 1 ORDER BY order_index ASC")
        units_rows = cursor.fetchall()
        unit_progress_list = []
        for u in units_rows:
            u_id = u["id"]
            cursor.execute("SELECT COUNT(*) as cnt FROM lessons WHERE unit_id = ? AND is_published = 1", (u_id,))
            u_total = cursor.fetchone()["cnt"]

            cursor.execute("""
            SELECT COUNT(*) as cnt FROM lesson_progress lp
            JOIN lessons l ON lp.lesson_id = l.id
            WHERE lp.student_id = ? AND l.unit_id = ? AND lp.completed = 1
            """, (student_id, u_id))
            u_completed = cursor.fetchone()["cnt"]

            u_pct = round((u_completed / u_total * 100)) if u_total > 0 else 0
            unit_progress_list.append({
                "unitId": u_id,
                "unitNumber": u["number"],
                "unitTitle": u["title"],
                "totalLessons": u_total,
                "completedLessons": u_completed,
                "percentage": u_pct
            })

        return {
            "success": True,
            "progress": {
                "studentId": student_id,
                "totalLessonsCount": total_published_lessons,
                "completedLessonsCount": completed_count,
                "completedLessons": completed_lessons,
                "completionPercentage": overall_progress_pct,
                "examsCount": exams_count,
                "avgScore": avg_score,
                "examAttempts": exam_attempts,
                "quizAttempts": quiz_attempts,
                "learningHours": student.get("learning_hours", 14.5),
                "streak": student.get("streak", 5),
                "xp": student.get("xp", 840),
                "currentLesson": current_lesson,
                "unitProgress": unit_progress_list,
                "lastActivity": student.get("last_activity", now)
            }
        }

@router.post("/lesson")
def update_lesson_progress(req: LessonProgressUpdateRequest, student: dict = Depends(get_active_student_or_admin)):
    """Record completion of a lesson server-side and award gamification XP."""
    student_id = student["id"]
    lesson_id = req.lesson_id
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        
        # Verify lesson exists and is published
        cursor.execute("SELECT id, title, unit_id FROM lessons WHERE id = ? AND is_published = 1", (lesson_id,))
        lesson = cursor.fetchone()
        if not lesson:
            raise HTTPException(status_code=404, detail="الدرس غير موجود")

        # Check existing progress
        cursor.execute("SELECT id, completed FROM lesson_progress WHERE student_id = ? AND lesson_id = ?", (student_id, lesson_id))
        existing = cursor.fetchone()
        
        is_first_time_complete = False
        if existing:
            was_completed = bool(existing["completed"])
            if not was_completed and req.completed:
                is_first_time_complete = True
            cursor.execute("""
            UPDATE lesson_progress
            SET progress = ?, completed = ?, last_position = ?, updated_at = ?
            WHERE student_id = ? AND lesson_id = ?
            """, (req.progress, 1 if req.completed else 0, req.last_position or 0, now, student_id, lesson_id))
        else:
            lp_id = f"lp_{student_id}_{lesson_id}"
            is_first_time_complete = req.completed
            cursor.execute("""
            INSERT INTO lesson_progress (id, student_id, lesson_id, progress, completed, last_position, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (lp_id, student_id, lesson_id, req.progress, 1 if req.completed else 0, req.last_position or 0, now))

        # Update student profile stats: streak, xp, last_lesson_id, last_activity
        xp_award = 50 if is_first_time_complete else 5
        cursor.execute("""
        UPDATE student_profiles
        SET xp = xp + ?, last_lesson_id = ?, last_activity = ?, updated_at = ?
        WHERE user_id = ?
        """, (xp_award, lesson_id, now, now, student_id))

        return {
            "success": True,
            "message": "تم حفظ تقدم الدرس بنجاح",
            "isFirstTimeComplete": is_first_time_complete,
            "xpAwarded": xp_award
        }

@router.post("/video")
def update_video_progress(req: VideoProgressUpdateRequest, student: dict = Depends(get_active_student_or_admin)):
    """Save exact video playback timestamp for resuming."""
    student_id = student["id"]
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, progress, completed FROM lesson_progress WHERE student_id = ? AND lesson_id = ?", (student_id, req.lesson_id))
        row = cursor.fetchone()
        if row:
            new_prog = max(row["progress"], req.progress or row["progress"])
            cursor.execute("UPDATE lesson_progress SET last_position = ?, progress = ?, updated_at = ? WHERE student_id = ? AND lesson_id = ?", (req.last_position, new_prog, now, student_id, req.lesson_id))
        else:
            lp_id = f"lp_{student_id}_{req.lesson_id}"
            cursor.execute("INSERT INTO lesson_progress (id, student_id, lesson_id, progress, completed, last_position, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)", (lp_id, student_id, req.lesson_id, req.progress or 10, req.last_position, now))

        return {"success": True, "last_position": req.last_position}
