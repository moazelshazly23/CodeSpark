import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, List, Dict, Any
from ..database import get_db, log_activity
from ..dependencies import get_current_admin, get_current_super_admin, get_current_staff, get_optional_user
from ..models import QuestionCreateRequest, QuestionUpdateRequest

router = APIRouter(prefix="/api/questions", tags=["Questions Bank"])

opt_keys = ["A", "B", "C", "D", "E", "F"]


@router.get("")
def get_questions(unit_id: Optional[str] = None, lesson_id: Optional[str] = None, q_type: Optional[str] = None, current_user: Optional[dict] = Depends(get_optional_user)):
    """Fetch questions bank with options. Redacts correct answers and explanations for students."""
    is_admin = current_user and current_user.get("role") == "admin"

    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT q.*, u.title as unit_title, l.title as lesson_title FROM questions q LEFT JOIN units u ON q.unit_id = u.id LEFT JOIN lessons l ON q.lesson_id = l.id"
        params = []
        conds = []

        if not is_admin:
            conds.append("(q.is_published = 1 OR q.published = 1)")
        if unit_id:
            conds.append("q.unit_id = ?")
            params.append(unit_id)
        if lesson_id:
            conds.append("q.lesson_id = ?")
            params.append(lesson_id)
        if q_type:
            conds.append("q.type = ?")
            params.append(q_type)

        if conds:
            query += " WHERE " + " AND ".join(conds)
        query += " ORDER BY q.created_at DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        result = []
        for r in rows:
            q_dict = dict(r)
            q_id = q_dict["id"]
            
            # Fetch options
            cursor.execute("SELECT option_key as key, option_text as text, is_correct as isCorrect FROM question_options WHERE question_id = ? ORDER BY order_index ASC, id ASC", (q_id,))
            options_rows = [dict(opt) for opt in cursor.fetchall()]
            
            # Simple options array format for frontend consistency
            q_dict["options"] = [opt["text"] for opt in options_rows]
            
            # Anti-Cheat: Redact answers for non-admins
            if not is_admin:
                q_dict.pop("correct_answer", None)
                q_dict.pop("correctAnswer", None)
                q_dict.pop("explanation", None)
                for opt in options_rows:
                    opt["isCorrect"] = False
            else:
                if q_dict.get("correct_answer") is not None:
                    try:
                        q_dict["correctAnswer"] = int(q_dict["correct_answer"])
                    except ValueError:
                        q_dict["correctAnswer"] = q_dict["correct_answer"]

            q_dict["optionsDetailed"] = options_rows
            q_dict["isPublished"] = bool(q_dict["is_published"])
            result.append(q_dict)

        return {"success": True, "questions": result}


@router.get("/{question_id}")
def get_question_detail(question_id: str, current_user: Optional[dict] = Depends(get_optional_user)):
    """Fetch single question details. Redacts correct answers for students."""
    is_admin = current_user and current_user.get("role") == "admin"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT q.*, u.title as unit_title, l.title as lesson_title FROM questions q LEFT JOIN units u ON q.unit_id = u.id LEFT JOIN lessons l ON q.lesson_id = l.id WHERE q.id = ?", (question_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="السؤال غير موجود")
        
        q_dict = dict(row)
        cursor.execute("SELECT option_key as key, option_text as text, is_correct as isCorrect FROM question_options WHERE question_id = ? ORDER BY order_index ASC, id ASC", (question_id,))
        opts = [dict(opt) for opt in cursor.fetchall()]
        q_dict["options"] = [opt["text"] for opt in opts]

        if not is_admin:
            q_dict.pop("correct_answer", None)
            q_dict.pop("correctAnswer", None)
            q_dict.pop("explanation", None)
            for opt in opts:
                opt["isCorrect"] = False
        else:
            if q_dict.get("correct_answer") is not None:
                try:
                    q_dict["correctAnswer"] = int(q_dict["correct_answer"])
                except ValueError:
                    q_dict["correctAnswer"] = q_dict["correct_answer"]

        q_dict["optionsDetailed"] = opts
        q_dict["isPublished"] = bool(q_dict["is_published"])
        return {"success": True, "question": q_dict}


@router.post("")
def create_question(req: QuestionCreateRequest, staff: dict = Depends(get_current_staff)):
    """Admin: Add a new question to the curriculum bank."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    q_id = f"q_{now_ts}"

    with get_db() as conn:
        cursor = conn.cursor()
        q_text = req.question or req.text or ""
        q_score = req.score if req.score is not None else (req.points or 10)
        cursor.execute("""
        INSERT INTO questions (id, unit_id, lesson_id, question, type, difficulty, score, explanation, correct_answer, code_snippet, is_published, published, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            q_id, req.unit_id, req.lesson_id, q_text, req.type, req.difficulty, q_score,
            req.explanation or "", str(req.correct_answer), req.code_snippet or "",
            1 if req.is_published else 0, 1 if req.is_published else 0, now
        ))

        # Insert options
        for idx, opt in enumerate(req.options):
            if hasattr(opt, "option_text"):
                opt_key = opt.option_key or (opt_keys[idx] if idx < len(opt_keys) else str(idx))
                opt_text = opt.option_text
                is_corr = 1 if (opt.is_correct or opt_key == str(req.correct_answer) or str(idx) == str(req.correct_answer)) else 0
            elif isinstance(opt, dict):
                opt_key = opt.get("key", opt.get("option_key", opt_keys[idx] if idx < len(opt_keys) else str(idx)))
                opt_text = opt.get("text", opt.get("option_text", ""))
                is_corr = 1 if (opt.get("is_correct") or opt_key == str(req.correct_answer) or str(idx) == str(req.correct_answer)) else 0
            else:
                opt_key = opt_keys[idx] if idx < len(opt_keys) else str(idx)
                opt_text = str(opt)
                is_corr = 1 if (str(idx) == str(req.correct_answer) or opt_key == str(req.correct_answer)) else 0

            cursor.execute("""
            INSERT INTO question_options (id, question_id, option_key, option_text, is_correct, order_index)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (f"opt_{q_id}_{idx}", q_id, opt_key, opt_text, is_corr, idx))

        return {"success": True, "question_id": q_id, "message": "تم إضافة السؤال إلى بنك الأسئلة بنجاح"}


@router.put("/{question_id}")
def update_question(question_id: str, req: QuestionUpdateRequest, staff: dict = Depends(get_current_staff)):
    """Admin: Update question and its options."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM questions WHERE id = ?", (question_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="السؤال غير موجود")

        updates = []
        params = []
        for field, val in req.dict(exclude_unset=True).items():
            if field == "options":
                continue
            if field in ("is_published", "published"):
                updates.append("is_published = ?")
                updates.append("published = ?")
                params.extend([1 if val else 0, 1 if val else 0])
            elif field == "correct_answer":
                updates.append("correct_answer = ?")
                params.append(str(val))
            else:
                updates.append(f"{field} = ?")
                params.append(val)

        if updates:
            params.append(question_id)
            cursor.execute(f"UPDATE questions SET {', '.join(updates)} WHERE id = ?", params)

        if req.options is not None:
            cursor.execute("DELETE FROM question_options WHERE question_id = ?", (question_id,))
            c_ans = req.correct_answer if req.correct_answer is not None else "0"
            for idx, opt in enumerate(req.options):
                if isinstance(opt, dict):
                    opt_key = opt.get("key", opt_keys[idx] if idx < len(opt_keys) else str(idx))
                    opt_text = opt.get("text", "")
                    is_corr = 1 if (opt.get("is_correct") or opt_key == str(c_ans) or str(idx) == str(c_ans)) else 0
                else:
                    opt_key = opt_keys[idx] if idx < len(opt_keys) else str(idx)
                    opt_text = str(opt)
                    is_corr = 1 if (str(idx) == str(c_ans) or opt_key == str(c_ans)) else 0

                cursor.execute("""
                INSERT INTO question_options (id, question_id, option_key, option_text, is_correct, order_index)
                VALUES (?, ?, ?, ?, ?, ?)
                """, (f"opt_{question_id}_{idx}", question_id, opt_key, opt_text, is_corr, idx))

        return {"success": True, "message": "تم تحديث السؤال بنجاح"}


@router.delete("/{question_id}")
def delete_question(question_id: str, staff: dict = Depends(get_current_staff)):
    """Admin: Delete question from bank."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM questions WHERE id = ?", (question_id,))
        return {"success": True, "message": "تم حذف السؤال بنجاح"}
