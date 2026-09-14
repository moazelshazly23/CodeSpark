"""
Code Spark - Business Logic Services
Core educational domain logic, calculations, access control, and relational operations.
"""
import uuid
import json
import subprocess
import tempfile
import os
import random
import string
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple

from app.db.engine import db_engine, now_iso
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, hash_code
from app.core.permissions import ALL_PERMISSION_KEYS
from app.repositories.all_repositories import (
    UserRepository,
    SubscriptionRepository,
    CurriculumRepository,
    AssessmentRepository,
    ExerciseRepository,
    SupportRepository,
    AuditRepository
)

# -----------------------------------------------------------------------------
# 1. Authentication Service
# -----------------------------------------------------------------------------
class AuthService:
    @staticmethod
    def register(data: Dict[str, Any]) -> Dict[str, Any]:
        username = data.get("username", "").strip().lower()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        full_name = data.get("full_name", "").strip()
        phone = data.get("phone", "").strip() if data.get("phone") else None

        if not username or len(username) < 3:
            raise ValueError("اسم المستخدم يجب أن يكون 3 أحرف على الأقل")
        if not email or "@" not in email:
            raise ValueError("البريد الإلكتروني غير صالح")
        if not password or len(password) < 6:
            raise ValueError("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
        if not full_name:
            raise ValueError("الاسم بالكامل مطلوب")

        if UserRepository.get_by_username(username):
            raise ValueError("اسم المستخدم مسجل بالفعل")
        if UserRepository.get_by_email(email):
            raise ValueError("البريد الإلكتروني مسجل بالفعل")

        user_data = {
            "id": uuid.uuid4().hex,
            "username": username,
            "email": email,
            "hashed_password": get_password_hash(password),
            "full_name": full_name,
            "role": "student",
            "is_active": 1,
            "is_verified": 1,
            "phone": phone,
            "avatar_url": None,
            "created_at": now_iso(),
            "updated_at": now_iso()
        }
        user = UserRepository.create(user_data)
        
        # Welcome notification
        db_engine.insert("notifications", {
            "id": uuid.uuid4().hex,
            "user_id": user["id"],
            "title": "مرحباً بك في منصة Code Spark! 🚀",
            "message": "يسعدنا انضمامك إلى رحلة تعلم البرمجة التأسيسية. يمكنك تصفح الدروس المجانية أو إدخال كود الاشتراك لفتح المحتوى الكامل.",
            "notification_type": "system",
            "link_url": "/student/dashboard",
            "is_read": 0,
            "created_at": now_iso()
        })

        AuditRepository.log(user["id"], "register", "user", user["id"], {"username": username, "email": email})
        return user

    @staticmethod
    def login(username_or_email: str, plain_password: str) -> Optional[Tuple[Dict[str, Any], str, str]]:
        ident = username_or_email.strip().lower()
        user = UserRepository.get_by_username(ident) or UserRepository.get_by_email(ident)
        if not user:
            return None

        if not user.get("is_active", 1):
            raise ValueError("الحساب معطل حالياً، يرجى مراجعة إدارة المنصة")

        if not verify_password(plain_password, user["hashed_password"]):
            return None

        permissions = []
        if user["role"] == "admin":
            permissions = ["all"]
        elif user["role"] == "assistant":
            permissions = UserRepository.get_assistant_permissions(user["id"])

        token_payload = {
            "sub": user["id"],
            "username": user["username"],
            "role": user["role"],
            "full_name": user["full_name"],
            "permissions": permissions
        }
        access_token = create_access_token(token_payload)
        refresh_token = create_refresh_token(token_payload)

        # Update streak and last active date
        if user["role"] == "student":
            today = now_iso()[:10]
            stats = db_engine.fetch_one("SELECT * FROM student_stats WHERE user_id = ?", (user["id"],))
            if stats:
                last_act = stats.get("last_active_date")
                streak = stats.get("streak_days", 1)
                if last_act != today:
                    # check if yesterday
                    try:
                        last_d = datetime.strptime(last_act, "%Y-%m-%d").date()
                        curr_d = datetime.strptime(today, "%Y-%m-%d").date()
                        if (curr_d - last_d).days == 1:
                            streak += 1
                        elif (curr_d - last_d).days > 1:
                            streak = 1
                    except Exception:
                        streak = 1
                    db_engine.execute("UPDATE student_stats SET streak_days = ?, last_active_date = ? WHERE user_id = ?", (streak, today, user["id"]))

        AuditRepository.log(user["id"], "login", "user", user["id"], {"login_time": now_iso()})
        return user, access_token, refresh_token

    @staticmethod
    def get_me(user_id: str) -> Dict[str, Any]:
        user = UserRepository.get_by_id(user_id)
        if not user:
            raise ValueError("المستخدم غير موجود")

        result = {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "phone": user.get("phone"),
            "avatar_url": user.get("avatar_url"),
            "created_at": user["created_at"],
            "is_active": bool(user.get("is_active", 1)),
            "is_verified": bool(user.get("is_verified", 1))
        }

        if user["role"] == "assistant":
            result["permissions"] = UserRepository.get_assistant_permissions(user_id)
        elif user["role"] == "admin":
            result["permissions"] = ["all"]
        else:
            result["permissions"] = []

        if user["role"] == "student":
            sub = SubscriptionRepository.get_active_subscription(user_id)
            result["has_active_subscription"] = sub is not None
            result["subscription"] = sub
            stats = db_engine.fetch_one("SELECT * FROM student_stats WHERE user_id = ?", (user_id,))
            result["stats"] = stats or {"xp": 0, "streak_days": 1, "study_time_minutes": 0.0}

        return result

# -----------------------------------------------------------------------------
# 2. Access Control Service (PUBLIC vs SUBSCRIBERS_ONLY)
# -----------------------------------------------------------------------------
class AccessControlService:
    @staticmethod
    def has_access(user: Optional[Dict[str, Any]], access_type: str) -> Tuple[bool, str]:
        if access_type == "PUBLIC":
            return True, "محتوى عام ومتاح للجميع"
        
        # SUBSCRIBERS_ONLY
        if not user:
            return False, "يجب تسجيل الدخول للوصول إلى هذا المحتوى المخصص للمشتركين"
        
        if user.get("role") in ("admin", "assistant"):
            return True, "صلاحية إدارة"

        if user.get("role") == "student":
            sub = SubscriptionRepository.get_active_subscription(user["id"])
            if sub:
                return True, "اشتراك نشط"
            return False, "هذا المحتوى متاح للمشتركين فقط. يرجى تفعيل كود الاشتراك للمتابعة"

        return False, "غير مصرح"

# -----------------------------------------------------------------------------
# 3. Subscription & Code System
# -----------------------------------------------------------------------------
class SubscriptionService:
    DURATIONS_MAP = {
        "1_MONTH": 30,
        "3_MONTHS": 90,
        "6_MONTHS": 180,
        "12_MONTHS": 365,
        "LIFETIME": 36500, # 100 years
        "CUSTOM": 30
    }

    @staticmethod
    def generate_random_code() -> str:
        chars = string.ascii_uppercase + "23456789" # avoid confusing 0/O, 1/I
        p1 = "".join(random.choices(chars, k=4))
        p2 = "".join(random.choices(chars, k=4))
        return f"CS-{p1}-{p2}"

    @staticmethod
    def create_code(
        duration_type: str,
        duration_days: Optional[int] = None,
        created_by: Optional[str] = None,
        custom_code: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        if duration_type not in SubscriptionService.DURATIONS_MAP:
            raise ValueError(f"نوع المدة غير صالح: {duration_type}")

        days = duration_days if duration_days and duration_days > 0 else SubscriptionService.DURATIONS_MAP[duration_type]
        code_str = (custom_code.strip().upper() if custom_code else SubscriptionService.generate_random_code())

        # Ensure uniqueness
        if SubscriptionRepository.get_code_by_string(code_str):
            raise ValueError(f"كود الاشتراك '{code_str}' موجود بالفعل")

        rec = {
            "id": uuid.uuid4().hex,
            "code": code_str,
            "code_hash": hash_code(code_str),
            "duration_type": duration_type,
            "duration_days": days,
            "status": "ACTIVE",
            "created_by": created_by,
            "used_by": None,
            "disabled": 0,
            "metadata_json": json.dumps(metadata or {}, ensure_ascii=False),
            "created_at": now_iso(),
            "activated_at": None,
            "expires_at": None
        }
        return SubscriptionRepository.create_code(rec)

    @staticmethod
    def validate_code(code_str: str) -> Dict[str, Any]:
        clean = code_str.strip().upper()
        code_rec = SubscriptionRepository.get_code_by_string(clean)
        if not code_rec:
            raise ValueError("كود الاشتراك غير صحيح أو غير موجود")

        if code_rec.get("disabled") == 1 or code_rec.get("status") == "DISABLED":
            raise ValueError("هذا الكود تم تعطيله من قبل الإدارة")

        if code_rec.get("status") == "USED":
            raise ValueError("هذا الكود تم استخدامه مسبقاً")

        if code_rec.get("status") == "EXPIRED":
            raise ValueError("هذا الكود منتهي الصلاحية")

        return {
            "valid": True,
            "code": code_rec["code"],
            "duration_type": code_rec["duration_type"],
            "duration_days": code_rec["duration_days"],
            "status": code_rec["status"]
        }

    @staticmethod
    def activate_code(user_id: str, code_str: str) -> Dict[str, Any]:
        clean = code_str.strip().upper()
        with db_engine.transaction():
            code_rec = SubscriptionRepository.get_code_by_string(clean)
            if not code_rec:
                raise ValueError("كود الاشتراك غير صحيح أو غير موجود")

            if code_rec.get("disabled") == 1 or code_rec.get("status") == "DISABLED":
                raise ValueError("هذا الكود تم تعطيله من قبل الإدارة")

            if code_rec.get("status") == "USED":
                raise ValueError("هذا الكود تم استخدامه مسبقاً")

            if code_rec.get("status") == "EXPIRED":
                raise ValueError("هذا الكود منتهي الصلاحية")

            # Calculate subscription duration
            now = datetime.now(timezone.utc)
            duration_days = code_rec.get("duration_days", 30)
            is_lifetime = 1 if code_rec.get("duration_type") == "LIFETIME" else 0

            # Check if user already has active subscription to extend it
            existing_sub = SubscriptionRepository.get_active_subscription(user_id)
            if existing_sub and not existing_sub.get("is_lifetime"):
                curr_exp = datetime.fromisoformat(existing_sub["expires_at"].replace("Z", "+00:00"))
                base_start = max(now, curr_exp)
            else:
                base_start = now

            if is_lifetime:
                expires_at_iso = None
            else:
                expires_at_iso = (base_start + timedelta(days=duration_days)).isoformat()

            # Mark code as USED
            SubscriptionRepository.update_code(code_rec["id"], {
                "status": "USED",
                "used_by": user_id,
                "activated_at": now.isoformat(),
                "expires_at": expires_at_iso
            })

            # Create subscription
            sub_rec = {
                "id": uuid.uuid4().hex,
                "user_id": user_id,
                "code_id": code_rec["id"],
                "status": "ACTIVE",
                "started_at": now.isoformat(),
                "expires_at": expires_at_iso,
                "is_lifetime": is_lifetime,
                "created_at": now.isoformat()
            }
            SubscriptionRepository.create_subscription(sub_rec)

            # Award XP for activating subscription
            db_engine.execute("UPDATE student_stats SET xp = xp + 150 WHERE user_id = ?", (user_id,))

            # Notification
            db_engine.insert("notifications", {
                "id": uuid.uuid4().hex,
                "user_id": user_id,
                "title": "تم تفعيل الاشتراك بنجاح! 🎉",
                "message": f"تم تفعيل اشتراكك بنجاح عبر الكود ({code_rec['code']}). أصبحت جميع الدروس والتمارين والامتحانات متاحة لك بالكامل!",
                "notification_type": "subscription",
                "link_url": "/student/courses",
                "is_read": 0,
                "created_at": now.isoformat()
            })

            AuditRepository.log(user_id, "subscription_activate", "subscription", sub_rec["id"], {
                "code": code_rec["code"],
                "duration_days": duration_days,
                "is_lifetime": bool(is_lifetime)
            })

            return sub_rec

# -----------------------------------------------------------------------------
# 4. Curriculum Service (Courses, Units, Lessons, Progress)
# -----------------------------------------------------------------------------
class CurriculumService:
    @staticmethod
    def get_course_details(course_id: str, user: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        course = CurriculumRepository.get_course(course_id)
        if not course:
            return None

        is_admin = user and user.get("role") in ("admin", "assistant")
        units = CurriculumRepository.list_units(course_id, is_admin=is_admin)
        for u in units:
            lessons, _ = CurriculumRepository.list_lessons(unit_id=u["id"], is_admin=is_admin)
            for les in lessons:
                # check access
                has_acc, _ = AccessControlService.has_access(user, les["access_type"])
                les["is_unlocked"] = has_acc
                if user and user.get("role") == "student":
                    prog = CurriculumRepository.get_lesson_progress(user["id"], les["id"])
                    les["progress"] = prog or {"watch_percentage": 0, "is_completed": 0, "last_video_position_seconds": 0}
            u["lessons"] = lessons
        course["units"] = units
        return course

    @staticmethod
    def get_lesson_view(lesson_id: str, user: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        les = CurriculumRepository.get_lesson(lesson_id)
        if not les:
            return None

        has_acc, reason = AccessControlService.has_access(user, les["access_type"])
        les["is_unlocked"] = has_acc
        les["access_reason"] = reason

        # Attach resources
        resources, _ = CurriculumRepository.list_resources(lesson_id=lesson_id, is_admin=bool(user and user.get("role") in ("admin", "assistant")))
        # filter or annotate resources access
        for r in resources:
            r_acc, _ = AccessControlService.has_access(user, r["access_type"])
            r["is_unlocked"] = r_acc
        les["resources"] = resources

        # Attach exercises
        exercises, _ = ExerciseRepository.list_exercises(lesson_id=lesson_id, is_admin=bool(user and user.get("role") in ("admin", "assistant")))
        for ex in exercises:
            e_acc, _ = AccessControlService.has_access(user, ex["access_type"])
            ex["is_unlocked"] = e_acc
        les["exercises"] = exercises

        # Attach quiz
        quizzes, _ = AssessmentRepository.list_quizzes(lesson_id=lesson_id, is_admin=bool(user and user.get("role") in ("admin", "assistant")))
        les["quiz"] = quizzes[0] if quizzes else None

        # User progress & bookmark
        if user and user.get("role") == "student":
            prog = CurriculumRepository.get_lesson_progress(user["id"], lesson_id)
            les["progress"] = prog or {"watch_percentage": 0, "is_completed": 0, "last_video_position_seconds": 0}
            bm = db_engine.fetch_one("SELECT id FROM bookmarks WHERE user_id = ? AND item_type = 'lesson' AND item_id = ?", (user["id"], lesson_id))
            les["is_bookmarked"] = bm is not None

        # Previous and Next lessons
        all_unit_lessons, _ = CurriculumRepository.list_lessons(unit_id=les["unit_id"], is_admin=False)
        curr_idx = -1
        for i, l in enumerate(all_unit_lessons):
            if l["id"] == lesson_id:
                curr_idx = i
                break
        les["prev_lesson_id"] = all_unit_lessons[curr_idx - 1]["id"] if curr_idx > 0 else None
        les["next_lesson_id"] = all_unit_lessons[curr_idx + 1]["id"] if curr_idx >= 0 and curr_idx + 1 < len(all_unit_lessons) else None

        return les

# -----------------------------------------------------------------------------
# 5. Assessment Service (Question Bank, Quizzes, Exams)
# -----------------------------------------------------------------------------
class AssessmentService:
    @staticmethod
    def start_exam(user_id: str, exam_id: str) -> Dict[str, Any]:
        exam = AssessmentRepository.get_exam(exam_id)
        if not exam:
            raise ValueError("الامتحان غير موجود")

        if not exam.get("is_published", 1):
            raise ValueError("هذا الامتحان غير منشور حالياً")

        # Check access
        user = UserRepository.get_by_id(user_id)
        has_acc, reason = AccessControlService.has_access(user, exam["access_type"])
        if not has_acc:
            raise ValueError(reason)

        # Check existing attempts
        attempts = db_engine.fetch_all("SELECT * FROM exam_attempts WHERE user_id = ? AND exam_id = ?", (user_id, exam_id))
        max_att = exam.get("max_attempts", 1)
        if len(attempts) >= max_att:
            # check if last attempt is in progress
            if attempts[-1]["status"] == "IN_PROGRESS":
                return attempts[-1]
            raise ValueError(f"لقد استنفدت الحد الأقصى للمحاولات المسموح بها ({max_att})")

        now = datetime.now(timezone.utc)
        duration_mins = exam.get("duration_minutes", 45)
        expires_at = now + timedelta(minutes=duration_mins)

        attempt_rec = {
            "id": uuid.uuid4().hex,
            "user_id": user_id,
            "exam_id": exam_id,
            "attempt_number": len(attempts) + 1,
            "answers_json": json.dumps({}, ensure_ascii=False),
            "score": 0.0,
            "total_possible": 0.0,
            "percentage": 0.0,
            "is_passed": 0,
            "status": "IN_PROGRESS",
            "started_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "completed_at": None,
            "feedback": None
        }
        return db_engine.insert("exam_attempts", attempt_rec)

    @staticmethod
    def autosave_exam(attempt_id: str, user_id: str, answers: Dict[str, Any]) -> Dict[str, Any]:
        att = db_engine.fetch_one("SELECT * FROM exam_attempts WHERE id = ? AND user_id = ?", (attempt_id, user_id))
        if not att:
            raise ValueError("محاولة الامتحان غير موجودة")
        if att["status"] != "IN_PROGRESS":
            raise ValueError("لا يمكن تعديل إجابات امتحان تم تسليمه")

        now = datetime.now(timezone.utc)
        exp = datetime.fromisoformat(att["expires_at"].replace("Z", "+00:00"))
        if now > exp:
            raise ValueError("انتهى الوقت المخصص للامتحان")

        # Merge answers
        current_answers = json.loads(att.get("answers_json") or "{}")
        current_answers.update(answers)
        db_engine.execute("UPDATE exam_attempts SET answers_json = ? WHERE id = ?", (json.dumps(current_answers, ensure_ascii=False), attempt_id))
        return {"saved": True, "answers_count": len(current_answers)}

    @staticmethod
    def submit_exam(attempt_id: str, user_id: str, final_answers: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        with db_engine.transaction():
            att = db_engine.fetch_one("SELECT * FROM exam_attempts WHERE id = ? AND user_id = ?", (attempt_id, user_id))
            if not att:
                raise ValueError("محاولة الامتحان غير موجودة")
            if att["status"] != "IN_PROGRESS":
                return att

            exam = AssessmentRepository.get_exam(att["exam_id"])
            questions = AssessmentRepository.get_exam_questions(att["exam_id"])

            answers = json.loads(att.get("answers_json") or "{}")
            if final_answers:
                answers.update(final_answers)

            total_possible = 0.0
            total_earned = 0.0

            for q in questions:
                q_id = q["id"]
                points = float(q.get("points", 1.0))
                total_possible += points
                user_ans = str(answers.get(q_id, "")).strip().lower()
                correct_ans = str(q.get("correct_answer", "")).strip().lower()

                if q.get("question_type") in ("multiple_choice", "true_false", "code"):
                    if user_ans and user_ans == correct_ans:
                        total_earned += points

            pct = round((total_earned / total_possible * 100.0), 1) if total_possible > 0 else 0.0
            passing_score = float(exam.get("passing_score", 75.0))
            is_passed = 1 if pct >= passing_score else 0

            updates = {
                "answers_json": json.dumps(answers, ensure_ascii=False),
                "score": total_earned,
                "total_possible": total_possible,
                "percentage": pct,
                "is_passed": is_passed,
                "status": "SUBMITTED",
                "completed_at": now_iso()
            }
            updated_att = db_engine.update("exam_attempts", attempt_id, updates)

            # Award XP on passing exam
            if is_passed:
                db_engine.execute("UPDATE student_stats SET xp = xp + 100 WHERE user_id = ?", (user_id,))

            AuditRepository.log(user_id, "exam_submit", "exam_attempt", attempt_id, {
                "score": total_earned,
                "total": total_possible,
                "percentage": pct,
                "passed": bool(is_passed)
            })

            return updated_att

# -----------------------------------------------------------------------------
# 6. Sandboxed Code Runner & Exercise Service
# -----------------------------------------------------------------------------
class CodeRunnerService:
    @staticmethod
    def execute_code(language: str, code: str, user_input: str = "") -> Dict[str, Any]:
        lang = language.strip().lower()
        if lang not in ("python", "javascript"):
            if lang in ("html", "css"):
                return {"success": True, "output": "Renderable in Browser DOM Sandbox", "error": None}
            raise ValueError(f"لغة التشغيل غير مدعومة: {language}")

        if not code.strip():
            return {"success": True, "output": "", "error": None}

        # Isolated execution using subprocess with strict timeout and output limits
        if lang == "python":
            with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as tf:
                tf.write(code)
                temp_path = tf.name

            try:
                # Run isolated python process with 5-second timeout and restricted environment
                env = {"PATH": "/usr/bin:/bin", "PYTHONUNBUFFERED": "1"}
                proc = subprocess.run(
                    ["python3", temp_path],
                    input=user_input,
                    capture_output=True,
                    text=True,
                    timeout=5,
                    env=env
                )
                output = proc.stdout
                error = proc.stderr
                success = proc.returncode == 0
                if len(output) > 10000:
                    output = output[:10000] + "\n... [تم اقتطاع المخرجات لتجاوز الحد المسموح]"
                return {"success": success, "output": output, "error": error if not success else None}
            except subprocess.TimeoutExpired:
                return {"success": False, "output": "", "error": "تجاوز الكود المهلة الزمنية المحددة للتشغيل (5 ثوانٍ)"}
            except Exception as e:
                return {"success": False, "output": "", "error": str(e)}
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)

        elif lang == "javascript":
            with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False, encoding="utf-8") as tf:
                tf.write(code)
                temp_path = tf.name

            try:
                proc = subprocess.run(
                    ["node", temp_path],
                    input=user_input,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                output = proc.stdout
                error = proc.stderr
                success = proc.returncode == 0
                return {"success": success, "output": output, "error": error if not success else None}
            except subprocess.TimeoutExpired:
                return {"success": False, "output": "", "error": "تجاوز الكود المهلة المحددة (5 ثوانٍ)"}
            except Exception as e:
                return {"success": False, "output": "", "error": str(e)}
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)

    @staticmethod
    def check_exercise(exercise_id: str, user_id: str, code: str) -> Dict[str, Any]:
        ex = ExerciseRepository.get_exercise(exercise_id)
        if not ex:
            raise ValueError("التمرين غير موجود")

        test_cases = json.loads(ex.get("test_cases_json") or "[]")
        passed_count = 0
        total_count = len(test_cases) if test_cases else 1
        run_output = ""

        if not test_cases:
            # check expected output
            res = CodeRunnerService.execute_code(ex["language"], code)
            run_output = res.get("output", "")
            expected = (ex.get("expected_output") or "").strip()
            passed = (res.get("success") and expected in run_output.strip())
            passed_count = 1 if passed else 0
        else:
            for tc in test_cases:
                inp = tc.get("input", "")
                exp = str(tc.get("expected", "")).strip()
                res = CodeRunnerService.execute_code(ex["language"], code, user_input=inp)
                out = res.get("output", "").strip()
                run_output += f"المدخل: {inp} => المخرج: {out}\n"
                if exp in out:
                    passed_count += 1

        all_passed = (passed_count == total_count)
        submission = {
            "id": uuid.uuid4().hex,
            "user_id": user_id,
            "exercise_id": exercise_id,
            "submitted_code": code,
            "status": "PASSED" if all_passed else "FAILED",
            "output": run_output,
            "tests_passed": passed_count,
            "tests_total": total_count,
            "created_at": now_iso()
        }
        db_engine.insert("exercise_submissions", submission)

        if all_passed:
            db_engine.execute("UPDATE student_stats SET xp = xp + 30 WHERE user_id = ?", (user_id,))

        return {
            "status": "PASSED" if all_passed else "FAILED",
            "passed": all_passed,
            "tests_passed": passed_count,
            "tests_total": total_count,
            "output": run_output
        }
