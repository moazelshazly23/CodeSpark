import secrets
import json
import os
import datetime
from pathlib import Path

from .database import get_db, init_db
from .config import ENVIRONMENT, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD
from .security import hash_password, verify_password
from .subscription_utils import (
    hash_code,
    mask_code,
    get_code_prefix,
    generate_random_code,
)


def get_utc_now_iso():
    """Return current UTC time as ISO string."""
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def seed_database(force_refresh=False):
    """
    Seed the database with initial CodeSpark curriculum and configuration.

    Adheres strictly to the live database schema:
    - Never uses hardcoded fallback production passwords.
    - Admin password and email must be configured via environment / configuration.
    - Supports both legacy and modern data structures for questions, options, and units.
    """
    init_db()

    seed_file = Path(__file__).resolve().parent.parent.parent / "seed_data.json"
    if not seed_file.exists():
        seed_file = Path(__file__).resolve().parent.parent / "seed_data.json"

    data = {}
    if seed_file.exists():
        try:
            with open(seed_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error loading seed file: {e}")

    seed_data = data
    now = get_utc_now_iso()

    with get_db() as db:
        if force_refresh:
            print("Force refreshing database...")
            tables_to_clear = [
                "exam_answers", "exam_attempts", "exam_questions", "exams",
                "quiz_answers", "quiz_attempts", "quiz_questions", "quizzes",
                "question_options", "questions", "exercises", "lesson_progress",
                "lessons", "units", "notifications", "announcements",
                "support_tickets", "student_profiles", "users",
                "subscription_codes", "user_bookmarks", "student_notes",
                "student_code_drafts", "activity_logs", "educational_resources",
                "subscription_offers", "certificates", "content_files"
            ]
            for table in tables_to_clear:
                try:
                    db.execute(f"DELETE FROM {table}")
                except Exception:
                    pass

        # ============================================================
        # 1. ADMIN USER
        # ============================================================
        admin = db.execute(
            """
            SELECT id, email, phone, password_hash
            FROM users
            WHERE role IN ('admin', 'SUPER_ADMIN', 'super_admin')
            LIMIT 1
            """
        ).fetchone()

        adm_data = next((u for u in data.get("users", []) if u.get("role") in ("SUPER_ADMIN", "ADMIN")), {})
        adm_name = (ADMIN_NAME or os.getenv("ADMIN_NAME", "").strip() or adm_data.get("name") or "المهندس معاذ الشاذلي").strip()
        adm_email = (ADMIN_EMAIL or os.getenv("ADMIN_EMAIL", "").strip() or adm_data.get("email") or "").strip()
        adm_phone = (ADMIN_PHONE or os.getenv("ADMIN_PHONE", "").strip() or adm_data.get("phone") or "01000000000").strip()
        adm_password = (ADMIN_PASSWORD or os.getenv("ADMIN_PASSWORD", "")).strip()

        if not admin:
            if not adm_name:
                adm_name = "CodeSpark Administrator"

            if not adm_email:
                raise RuntimeError(
                    "ADMIN_EMAIL is required when creating the initial admin account."
                )

            if not adm_password:
                raise RuntimeError(
                    "ADMIN_PASSWORD is required when creating the initial admin account."
                )

            password_hash = hash_password(adm_password)
            admin_id = "admin_1"

            db.execute(
                """
                INSERT INTO users (
                    id,
                    name,
                    email,
                    phone,
                    password_hash,
                    role,
                    avatar,
                    is_active,
                    status,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, 'SUPER_ADMIN', 'مع', 1, 'active', ?, ?)
                """,
                (
                    admin_id,
                    adm_name,
                    adm_email,
                    adm_phone or "01000000000",
                    password_hash,
                    now,
                    now,
                ),
            )
            print(f"Created initial admin account: {adm_email}")
        else:
            # Admin already exists! Strictly preserve existing credentials and password
            admin_id = admin["id"]
            db.execute(
                """
                UPDATE users
                SET role = 'SUPER_ADMIN', status = 'active', is_active = 1, is_deleted = 0, updated_at = ?
                WHERE id = ?
                """,
                (now, admin_id),
            )

        # ============================================================
        # 2. STUDENTS & USERS
        # ============================================================
        users = seed_data.get("users", [])

        for user_data in users:
            role = (user_data.get("role") or "STUDENT").strip()
            if role.upper() in ("SUPER_ADMIN", "ADMIN"):
                continue

            email = (user_data.get("email") or "").strip()
            u_id = user_data.get("id") or f"user_{secrets.token_hex(12)}"

            if email:
                existing = db.execute(
                    "SELECT id FROM users WHERE email = ? LIMIT 1",
                    (email,),
                ).fetchone()
            else:
                existing = db.execute(
                    "SELECT id FROM users WHERE id = ? LIMIT 1",
                    (u_id,),
                ).fetchone()

            if existing:
                continue

            password = user_data.get("password")
            if not password:
                password = os.getenv("STUDENT_DEFAULT_PASSWORD", "").strip()
            if not password:
                password = os.getenv("TEST_STUDENT_PASSWORD", "").strip()
            if not password:
                password = secrets.token_urlsafe(18)

            password_hash = hash_password(password)
            phone = user_data.get("phone")
            avatar = user_data.get("avatar", "ط")
            created_at = user_data.get("createdAt", now)
            status_val = user_data.get("status", "active").lower()

            db.execute(
                """
                INSERT INTO users (
                    id,
                    name,
                    email,
                    phone,
                    password_hash,
                    role,
                    avatar,
                    is_active,
                    status,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
                """,
                (
                    u_id,
                    user_data.get("name", ""),
                    email or None,
                    phone or None,
                    password_hash,
                    role,
                    avatar,
                    status_val,
                    created_at,
                    now,
                ),
            )

            if role.lower() in ("student", "demo"):
                grade = user_data.get("grade", "الصف الثاني الثانوي")
                section = user_data.get("section", "عام")
                class_name = user_data.get("className", section)
                parent_phone = user_data.get("parentPhone", "")
                subscription_code = user_data.get("subscriptionCode", "SPARK-2026")
                streak = int(user_data.get("streak", 1))
                xp = int(user_data.get("xp", 100))
                learning_hours = float(user_data.get("learningHours", 0.0))
                last_activity = user_data.get("lastActivity", now)

                db.execute(
                    """
                    INSERT OR IGNORE INTO student_profiles (
                        id,
                        user_id,
                        grade,
                        class_name,
                        section,
                        parent_phone,
                        subscription_code,
                        subscription_status,
                        subscription_start,
                        subscription_expires_at,
                        subscription_duration_days,
                        subscription_type,
                        streak,
                        xp,
                        learning_hours,
                        last_activity,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NULL, -1, 'lifetime', ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        f"sp_{u_id}",
                        u_id,
                        grade,
                        class_name,
                        section,
                        parent_phone,
                        subscription_code,
                        created_at,
                        streak,
                        xp,
                        learning_hours,
                        last_activity,
                        created_at,
                        now,
                    ),
                )

        # ============================================================
        # 3. ASSISTANT
        # ============================================================
        assistant_data = seed_data.get("assistant") or {}
        ast_email = (
            os.getenv("ASSISTANT_EMAIL", "").strip()
            or assistant_data.get("email", "")
            or "assistant@codespark.edu.eg"
        ).strip()

        ast_phone = (
            os.getenv("ASSISTANT_PHONE", "").strip()
            or assistant_data.get("phone", "")
            or "01088887777"
        ).strip()

        ast_password = (
            os.getenv("ASSISTANT_PASSWORD", "").strip()
            or os.getenv("TEST_ASSISTANT_PASSWORD", "").strip()
            or assistant_data.get("password", "")
        ).strip()

        existing_assistant = db.execute(
            """
            SELECT id
            FROM users
            WHERE role IN ('assistant', 'ASSISTANT')
            LIMIT 1
            """
        ).fetchone()

        if not existing_assistant:
            if not ast_password:
                ast_password = secrets.token_urlsafe(18)
            ast_id = "assistant_demo"
            db.execute(
                """
                INSERT INTO users (
                    id,
                    name,
                    email,
                    phone,
                    password_hash,
                    role,
                    avatar,
                    is_active,
                    status,
                    is_deleted,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, 'ASSISTANT', 'مس', 1, 'active', 0, 'admin_1', ?, ?)
                """,
                (
                    ast_id,
                    assistant_data.get("name", "Assistant Demo"),
                    ast_email,
                    ast_phone or None,
                    hash_password(ast_password),
                    now,
                    now,
                ),
            )

        # ============================================================
        # 4. SUBSCRIPTION CODES
        # ============================================================
        initial_sub_codes = [
            {"code": "SPARK-2026", "type": "lifetime", "days": -1, "max": 1000, "notes": "كود شامل مدى الحياة للطلاب المتميزين"},
            {"code": "SPARK-SEC2", "type": "lifetime", "days": -1, "max": 1000, "notes": "كود الدفعة الثانية للثانوية العامة"},
            {"code": "SPARK-ADMIN", "type": "lifetime", "days": -1, "max": 1000, "notes": "كود الإدارة للاختبار والمراجعة"},
            {"code": "SPARK-NEW", "type": "lifetime", "days": -1, "max": 1000, "notes": "كود ترحيبي للطلاب الجدد"},
            {"code": "CS-8F4K-29XM", "type": "1_month", "days": 30, "max": 10, "notes": "كود باقة الشهر التجريبي"},
            {"code": "CS-TERM-1ST2", "type": "3_months", "days": 90, "max": 10, "notes": "كود الفصل الدراسي الأول"},
            {"code": "CS-SEME-STER", "type": "6_months", "days": 180, "max": 10, "notes": "كود نصف سنوي"},
            {"code": "CS-FULL-YEAR", "type": "1_year", "days": 365, "max": 10, "notes": "كود السنة الدراسية كاملة"},
            {"code": "CS-LIFE-TIME", "type": "lifetime", "days": -1, "max": 10, "notes": "كود شامل دائم"},
        ]
        subscription_codes = seed_data.get("subscription_codes", []) or initial_sub_codes

        for c_idx, code_data in enumerate(subscription_codes, start=1):
            raw_code = str(code_data.get("code", "")).strip().upper()
            if not raw_code:
                continue

            code_hash = hash_code(raw_code)
            existing_code = db.execute(
                """
                SELECT id
                FROM subscription_codes
                WHERE code_hash = ?
                LIMIT 1
                """,
                (code_hash,),
            ).fetchone()

            if existing_code:
                continue

            c_prefix = get_code_prefix(raw_code)
            c_masked = mask_code(raw_code)
            c_id = code_data.get("id") or f"subcode_seed_{c_idx}_{c_prefix}"
            sub_type = code_data.get("subscription_type") or code_data.get("type") or "1_month"
            dur_days = int(code_data.get("duration_days") or code_data.get("days") or 30)
            max_u = int(code_data.get("max_uses") or code_data.get("max") or 1)
            notes = code_data.get("notes") or "كود اشتراك معتمد في المنصة"

            db.execute(
                """
                INSERT INTO subscription_codes (
                    id,
                    code_hash,
                    code_prefix,
                    masked_code,
                    status,
                    subscription_type,
                    duration_days,
                    max_uses,
                    uses_count,
                    assigned_user_id,
                    notes,
                    created_at,
                    activated_at,
                    expires_at,
                    disabled_at
                )
                VALUES (?, ?, ?, ?, 'active', ?, ?, ?, 0, NULL, ?, ?, NULL, NULL, NULL)
                """,
                (
                    c_id,
                    code_hash,
                    c_prefix,
                    c_masked,
                    sub_type,
                    dur_days,
                    max_u,
                    notes,
                    now,
                ),
            )

        # ============================================================
        # 5. UNITS
        # ============================================================
        units = seed_data.get("units", [])

        for index, unit_data in enumerate(units, start=1):
            unit_id = unit_data.get("id") or f"unit_{index}"
            unit_title = (
                unit_data.get("title")
                or unit_data.get("name")
                or f"الوحدة {index}"
            ).strip()

            existing_unit = db.execute(
                """
                SELECT id
                FROM units
                WHERE id = ?
                LIMIT 1
                """,
                (unit_id,),
            ).fetchone()

            if existing_unit:
                continue

            order_idx = int(unit_data.get("order_index", unit_data.get("order", index)))
            is_pub = 1 if unit_data.get("is_published", unit_data.get("isPublished", unit_data.get("published", unit_data.get("is_active", True)))) else 0
            tot_lessons = int(unit_data.get("total_lessons", unit_data.get("totalLessons", 0)))
            tot_exams = int(unit_data.get("total_exams", unit_data.get("totalExams", 0)))

            db.execute(
                """
                INSERT INTO units (
                    id,
                    number,
                    title,
                    description,
                    icon,
                    total_lessons,
                    total_exams,
                    status,
                    is_published,
                    published,
                    order_index,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    unit_id,
                    int(unit_data.get("number", index)),
                    unit_title,
                    unit_data.get("description"),
                    unit_data.get("icon", "code"),
                    tot_lessons,
                    tot_exams,
                    unit_data.get("status", "active"),
                    is_pub,
                    is_pub,
                    order_idx,
                    now,
                    now,
                ),
            )

        # ============================================================
        # 6. LESSONS
        # ============================================================
        lessons = seed_data.get("lessons", [])

        for index, lesson_data in enumerate(lessons, start=1):
            lesson_id = lesson_data.get("id") or f"lesson_{index}"
            lesson_title = (lesson_data.get("title") or "").strip()

            if not lesson_title:
                continue

            unit_id = lesson_data.get("unit_id") or lesson_data.get("unitId")
            if not unit_id:
                continue

            existing_lesson = db.execute(
                """
                SELECT id
                FROM lessons
                WHERE id = ?
                LIMIT 1
                """,
                (lesson_id,),
            ).fetchone()

            if existing_lesson:
                continue

            is_pub = 1 if lesson_data.get("is_published", lesson_data.get("isPublished", lesson_data.get("published", lesson_data.get("is_active", True)))) else 0
            order_idx = int(lesson_data.get("order_index", lesson_data.get("order", index)))

            ex_data = lesson_data.get("exercise") or {}
            ex_title = lesson_data.get("exercise_title") or ex_data.get("title")
            ex_desc = lesson_data.get("exercise_description") or ex_data.get("instruction") or ex_data.get("description")
            ex_starter = lesson_data.get("exercise_starter_code") or ex_data.get("starterCode")
            ex_solution = lesson_data.get("exercise_solution_code") or ex_data.get("solutionCode")

            ex_test_cases = lesson_data.get("exercise_test_cases") or ex_data.get("testCases") or ex_data.get("test_cases")
            if not ex_test_cases and ex_data.get("testExpected"):
                ex_test_cases = [{"expected": t} for t in ex_data["testExpected"]]
            ex_tc_json = json.dumps(ex_test_cases, ensure_ascii=False) if ex_test_cases else None

            access_lvl = lesson_data.get("access_level")
            if not access_lvl:
                access_lvl = "public" if index == 1 else "subscribers_only"
            is_free_val = 1 if access_lvl == "public" else 0

            db.execute(
                """
                INSERT INTO lessons (
                    id,
                    unit_id,
                    number,
                    title,
                    description,
                    duration,
                    type,
                    video_source,
                    video_provider,
                    video_id,
                    video_url,
                    storage_path,
                    thumbnail_url,
                    file_size,
                    mime_type,
                    content,
                    content_html,
                    code_example,
                    code_solution,
                    exercise_title,
                    exercise_description,
                    exercise_starter_code,
                    exercise_solution_code,
                    exercise_test_cases,
                    is_published,
                    published,
                    order_index,
                    created_at,
                    updated_at,
                    access_level,
                    is_free
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
                """,
                (
                    lesson_id,
                    unit_id,
                    int(lesson_data.get("number", index)),
                    lesson_title,
                    lesson_data.get("description"),
                    lesson_data.get("duration", "20 دقيقة"),
                    lesson_data.get("type", "video"),
                    lesson_data.get("video_source", "youtube"),
                    lesson_data.get("video_provider", "youtube"),
                    lesson_data.get("video_id"),
                    lesson_data.get("video_url") or lesson_data.get("videoUrl"),
                    lesson_data.get("storage_path"),
                    lesson_data.get("thumbnail_url"),
                    lesson_data.get("file_size"),
                    lesson_data.get("mime_type"),
                    lesson_data.get("content"),
                    lesson_data.get("content_html"),
                    lesson_data.get("code_example") or lesson_data.get("codeExample"),
                    lesson_data.get("code_solution") or lesson_data.get("codeSolution"),
                    ex_title,
                    ex_desc,
                    ex_starter,
                    ex_solution,
                    ex_tc_json,
                    is_pub,
                    is_pub,
                    order_idx,
                    now,
                    now,
                    access_lvl,
                    is_free_val,
                ),
            )

            if ex_title:
                ex_id = f"ex_{lesson_id}"
                db.execute(
                    """
                    INSERT OR REPLACE INTO exercises (
                        id, lesson_id, title, description, type, difficulty,
                        starter_code, solution_code, test_cases,
                        published, is_published, created_at, updated_at
                    )
                    VALUES (?, ?, ?, ?, 'code', 'medium', ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        ex_id,
                        lesson_id,
                        ex_title,
                        ex_desc,
                        ex_starter,
                        ex_solution,
                        ex_tc_json,
                        is_pub,
                        is_pub,
                        now,
                        now,
                    ),
                )

        # ============================================================
        # 7. QUESTIONS & QUESTION_OPTIONS
        # ============================================================
        questions = seed_data.get("questions", [])

        for q_idx, question_data in enumerate(questions, start=1):
            q_id = question_data.get("id") or f"q_{q_idx}"
            question_text = (
                question_data.get("question")
                or question_data.get("question_text")
                or ""
            ).strip()

            if not question_text:
                continue

            existing_question = db.execute(
                """
                SELECT id
                FROM questions
                WHERE id = ? OR question = ?
                LIMIT 1
                """,
                (q_id, question_text),
            ).fetchone()

            if existing_question:
                continue

            unit_id = question_data.get("unit_id") or question_data.get("unitId")
            lesson_id = question_data.get("lesson_id") or question_data.get("lessonId")
            q_type = question_data.get("type") or question_data.get("question_type") or "mcq"
            difficulty = question_data.get("difficulty", "medium")
            score = int(question_data.get("score", question_data.get("points", 10)))
            explanation = question_data.get("explanation", "")
            code_snippet = question_data.get("code_snippet") or question_data.get("codeSnippet")
            is_pub = 1 if question_data.get("is_published", question_data.get("isPublished", question_data.get("published", question_data.get("is_active", True)))) else 0

            # Normalize options from both formats
            standardized_options = []
            keys = ["a", "b", "c", "d"]
            raw_options = question_data.get("options")
            raw_correct = question_data.get("correct_answer")
            if raw_correct is None:
                raw_correct = question_data.get("correctAnswer")

            if isinstance(raw_options, list):
                for idx, opt in enumerate(raw_options):
                    opt_key = keys[idx] if idx < len(keys) else str(idx)
                    if isinstance(opt, dict):
                        k = opt.get("key") or opt.get("option_key") or opt_key
                        t = opt.get("text") or opt.get("option_text") or ""
                        is_c = 1 if (
                            opt.get("is_correct")
                            or opt.get("isCorrect")
                            or (raw_correct is not None and str(raw_correct) == str(k))
                            or (raw_correct is not None and str(raw_correct) == str(idx))
                        ) else 0
                        standardized_options.append((k, t, is_c, idx))
                    elif isinstance(opt, str):
                        is_c = 1 if (
                            (raw_correct is not None and str(raw_correct) == str(idx))
                            or (raw_correct is not None and str(raw_correct).lower() == opt_key)
                        ) else 0
                        standardized_options.append((opt_key, opt, is_c, idx))
            else:
                for idx, k in enumerate(keys):
                    opt_val = question_data.get(f"option_{k}")
                    if opt_val is not None:
                        is_c = 1 if (raw_correct is not None and str(raw_correct).lower() in (k, str(idx))) else 0
                        standardized_options.append((k, str(opt_val), is_c, idx))

            correct_ans_str = None
            for k, t, is_c, idx in standardized_options:
                if is_c:
                    correct_ans_str = str(k)
                    break
            if correct_ans_str is None and raw_correct is not None:
                correct_ans_str = str(raw_correct)

            db.execute(
                """
                INSERT INTO questions (
                    id,
                    unit_id,
                    lesson_id,
                    question,
                    type,
                    difficulty,
                    score,
                    explanation,
                    correct_answer,
                    code_snippet,
                    is_published,
                    published,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    q_id,
                    unit_id,
                    lesson_id,
                    question_text,
                    q_type,
                    difficulty,
                    score,
                    explanation,
                    correct_ans_str,
                    code_snippet,
                    is_pub,
                    is_pub,
                    now,
                ),
            )

            for opt_k, opt_t, opt_is_c, opt_idx in standardized_options:
                opt_id = f"opt_{q_id}_{opt_k}"
                db.execute(
                    """
                    INSERT INTO question_options (
                        id,
                        question_id,
                        option_key,
                        option_text,
                        is_correct,
                        order_index
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        opt_id,
                        q_id,
                        opt_k,
                        opt_t,
                        opt_is_c,
                        opt_idx,
                    ),
                )

        # ============================================================
        # 8. QUIZZES & QUIZ_QUESTIONS
        # ============================================================
        quizzes = seed_data.get("quizzes", [])
        if not quizzes:
            cursor = db.cursor()
            cursor.execute("SELECT DISTINCT lesson_id FROM questions WHERE lesson_id IS NOT NULL")
            lessons_with_qs = [r["lesson_id"] for r in cursor.fetchall()]

            for l_id in lessons_with_qs:
                cursor.execute(
                    "SELECT id, title, unit_id FROM lessons WHERE id = ?",
                    (l_id,)
                )
                l_row = cursor.fetchone()
                if l_row:
                    quizzes.append({
                        "id": f"quiz_{l_id}",
                        "lesson_id": l_id,
                        "unit_id": l_row["unit_id"],
                        "title": f"اختبار قصير: {l_row['title']}",
                        "description": "اختبر فهمك لمفاهيم الدرس",
                        "duration": 10,
                        "duration_minutes": 10,
                        "passing_score": 60,
                        "is_published": 1
                    })

        for qz in quizzes:
            quiz_id = qz.get("id")
            existing_q = db.execute(
                "SELECT id FROM quizzes WHERE id = ? LIMIT 1",
                (quiz_id,)
            ).fetchone()
            if existing_q:
                continue

            l_id = qz.get("lesson_id") or qz.get("lessonId")
            u_id = qz.get("unit_id") or qz.get("unitId")
            q_title = qz.get("title", "اختبار قصير")
            q_desc = qz.get("description", "اختبر فهمك لمفاهيم الدرس")
            dur = int(qz.get("duration_minutes", qz.get("duration", 10)))
            pass_score = int(qz.get("passing_score", qz.get("passingScore", 60)))
            is_pub = 1 if qz.get("is_published", qz.get("isPublished", qz.get("published", qz.get("is_active", 1)))) else 0

            db.execute(
                """
                INSERT INTO quizzes (
                    id,
                    lesson_id,
                    unit_id,
                    title,
                    description,
                    duration,
                    duration_minutes,
                    passing_score,
                    is_published,
                    published,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    quiz_id,
                    l_id,
                    u_id,
                    q_title,
                    q_desc,
                    dur,
                    dur,
                    pass_score,
                    is_pub,
                    is_pub,
                    now,
                    now,
                ),
            )

            q_ids = qz.get("question_ids") or qz.get("questionIds")
            if not q_ids and l_id:
                cursor = db.cursor()
                cursor.execute(
                    "SELECT id FROM questions WHERE lesson_id = ? ORDER BY created_at ASC",
                    (l_id,)
                )
                q_ids = [r["id"] for r in cursor.fetchall()]

            if q_ids:
                for idx, qid in enumerate(q_ids):
                    db.execute(
                        """
                        INSERT OR IGNORE INTO quiz_questions (quiz_id, question_id, order_index)
                        VALUES (?, ?, ?)
                        """,
                        (quiz_id, qid, idx),
                    )

        # ============================================================
        # 9. EXAMS & EXAM_QUESTIONS
        # ============================================================
        exams = seed_data.get("exams", [])

        for ex in exams:
            e_id = ex.get("id")
            if not e_id:
                continue

            existing_e = db.execute(
                "SELECT id FROM exams WHERE id = ? LIMIT 1",
                (e_id,)
            ).fetchone()
            if existing_e:
                continue

            unit_id = ex.get("unit_id") or ex.get("unitId")
            title = ex.get("title", "امتحان شامل")
            desc = ex.get("description", "")
            dur_m = int(ex.get("duration_minutes", ex.get("durationMinutes", 30)))
            total_q = int(ex.get("total_questions", ex.get("questionsCount", 10)))
            pass_score = int(ex.get("passing_score", ex.get("passingScore", 60)))
            attempts = int(ex.get("attempts_allowed", ex.get("maxAttempts", 3)))
            rand_q = 1 if ex.get("randomize_questions", ex.get("randomizeQuestions", ex.get("random_questions", False))) else 0
            is_pub = 1 if ex.get("is_published", ex.get("isPublished", ex.get("published", ex.get("is_active", 1)))) else 0

            db.execute(
                """
                INSERT INTO exams (
                    id,
                    unit_id,
                    title,
                    description,
                    duration_minutes,
                    total_questions,
                    passing_score,
                    attempts_allowed,
                    randomize_questions,
                    is_published,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    e_id,
                    unit_id,
                    title,
                    desc,
                    dur_m,
                    total_q,
                    pass_score,
                    attempts,
                    rand_q,
                    is_pub,
                    now,
                    now,
                ),
            )

            q_ids = ex.get("question_ids") or ex.get("questionIds") or []
            if not q_ids and unit_id:
                cursor = db.cursor()
                cursor.execute(
                    "SELECT id FROM questions WHERE unit_id = ? ORDER BY created_at ASC LIMIT ?",
                    (unit_id, total_q),
                )
                q_ids = [r["id"] for r in cursor.fetchall()]

            for idx, qid in enumerate(q_ids):
                eq_id = f"eq_{e_id}_{qid}"
                db.execute(
                    """
                    INSERT OR IGNORE INTO exam_questions (id, exam_id, question_id, order_index)
                    VALUES (?, ?, ?, ?)
                    """,
                    (eq_id, e_id, qid, idx),
                )

        # ============================================================
        # 10. ANNOUNCEMENTS
        # ============================================================
        announcements = seed_data.get("announcements", [])

        for ann in announcements:
            a_id = ann.get("id")
            if not a_id:
                continue

            existing_a = db.execute(
                "SELECT id FROM announcements WHERE id = ? LIMIT 1",
                (a_id,)
            ).fetchone()
            if existing_a:
                continue

            title = ann.get("title", "")
            content = ann.get("content", "")
            badge = ann.get("badge", "تنبيه")
            date_str = ann.get("date_str") or ann.get("date") or now
            is_pub = 1 if ann.get("is_published", ann.get("isPublished", ann.get("published", ann.get("is_active", True)))) else 0

            db.execute(
                """
                INSERT INTO announcements (
                    id,
                    title,
                    content,
                    badge,
                    date_str,
                    published,
                    is_published,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    a_id,
                    title,
                    content,
                    badge,
                    date_str,
                    is_pub,
                    is_pub,
                    date_str,
                ),
            )

        # ============================================================
        # 11. NOTIFICATIONS
        # ============================================================
        notifications = seed_data.get("notifications", [])

        for notif in notifications:
            n_id = notif.get("id")
            if not n_id:
                continue

            existing_n = db.execute(
                "SELECT id FROM notifications WHERE id = ? LIMIT 1",
                (n_id,)
            ).fetchone()
            if existing_n:
                continue

            u_id = notif.get("user_id") or notif.get("userId")
            title = notif.get("title", "")
            message = notif.get("message", "")
            n_type = notif.get("type", "info")
            is_read = 1 if notif.get("is_read", notif.get("read", False)) else 0
            link = notif.get("link", "#curriculum")
            created_at = notif.get("created_at") or notif.get("date") or now

            db.execute(
                """
                INSERT INTO notifications (
                    id,
                    user_id,
                    title,
                    message,
                    type,
                    is_read,
                    link,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    n_id,
                    u_id,
                    title,
                    message,
                    n_type,
                    is_read,
                    link,
                    created_at,
                ),
            )

        # ============================================================
        # 12. SUPPORT TICKETS
        # ============================================================
        support_tickets = seed_data.get("supportTickets", []) or seed_data.get("support_tickets", [])

        for ticket in support_tickets:
            t_id = ticket.get("id")
            if not t_id:
                continue

            existing_t = db.execute(
                "SELECT id FROM support_tickets WHERE id = ? LIMIT 1",
                (t_id,)
            ).fetchone()
            if existing_t:
                continue

            u_id = ticket.get("user_id") or ticket.get("studentId")
            s_name = ticket.get("student_name") or ticket.get("studentName") or "طالب"
            s_phone = ticket.get("student_phone") or ticket.get("studentPhone") or ""
            subject = ticket.get("subject", "")
            message = ticket.get("message", "")
            status = ticket.get("status", "open")
            reply = ticket.get("reply", "")
            t_date = ticket.get("created_at") or ticket.get("date") or now

            db.execute(
                """
                INSERT INTO support_tickets (
                    id,
                    user_id,
                    student_name,
                    student_phone,
                    subject,
                    message,
                    status,
                    reply,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    t_id,
                    u_id,
                    s_name,
                    s_phone,
                    subject,
                    message,
                    status,
                    reply,
                    t_date,
                    t_date,
                ),
            )

        # ============================================================
        # 13. STUDENT PROGRESS & EXAM ATTEMPTS
        # ============================================================
        student_prog = seed_data.get("studentProgress", {}) or seed_data.get("student_progress", {})

        for student_id, sp_data in student_prog.items():
            for lesson_id in sp_data.get("completedLessons", []):
                lp_id = f"lp_{student_id}_{lesson_id}"
                db.execute(
                    """
                    INSERT OR IGNORE INTO lesson_progress (
                        id,
                        student_id,
                        lesson_id,
                        progress,
                        completed,
                        last_position,
                        started_at,
                        completed_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, 100, 1, 0, ?, ?, ?)
                    """,
                    (lp_id, student_id, lesson_id, now, now, now),
                )

            for att in sp_data.get("examAttempts", []):
                now_epoch = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
                att_id = att.get("id") or f"att_{now_epoch}_{secrets.token_hex(4)}"
                exam_id = att.get("exam_id") or att.get("examId", "exam_unit_1")
                score = int(att.get("score", 85))
                total_score = int(att.get("total_score", att.get("totalScore", 100)))
                pct = int(att.get("percentage", 85))
                corr = int(att.get("correct_count", att.get("correctCount", 17)))
                tot = int(att.get("total_count", att.get("totalCount", 20)))
                time_s = int(att.get("time_spent_seconds", att.get("timeSpentSeconds", 1122)))

                strengths = json.dumps(
                    att.get("strengths", ["المتغيرات وأنواع البيانات", "الجمل الشرطية"]),
                    ensure_ascii=False,
                )
                weaknesses = json.dumps(
                    att.get("weaknesses", ["المصفوفات والدوال"]),
                    ensure_ascii=False,
                )
                passed = 1 if pct >= 60 else 0
                att_date = att.get("date", now)

                db.execute(
                    """
                    INSERT OR IGNORE INTO exam_attempts (
                        id,
                        exam_id,
                        student_id,
                        score,
                        total_score,
                        percentage,
                        correct_count,
                        total_count,
                        time_spent_seconds,
                        strengths_json,
                        weaknesses_json,
                        passed,
                        started_at,
                        completed_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        att_id,
                        exam_id,
                        student_id,
                        score,
                        total_score,
                        pct,
                        corr,
                        tot,
                        time_s,
                        strengths,
                        weaknesses,
                        passed,
                        att_date,
                        att_date,
                    ),
                )

        _seed_educational_resources(db, now)
        _seed_subscription_offers(db, now)

        # Default system settings
        default_settings = [
            ("platform_name", "Code Spark"),
            ("academic_year", "2025/2026"),
            ("curriculum_subject", "مادة البرمجة — الصف الثاني الثانوي"),
            ("allow_registration", "true"),
            ("default_passing_score", "60"),
            ("max_exam_attempts", "3"),
            ("contact_whatsapp", "01000000000"),
            ("maintenance_mode", "false"),
        ]
        for s_k, s_v in default_settings:
            db.execute(
                """
                INSERT OR IGNORE INTO system_settings (key, value, updated_at)
                VALUES (?, ?, ?)
                """,
                (s_k, s_v, now),
            )

        print("Seeding completed successfully!")


def _seed_educational_resources(db, now: str):
    """Seed initial educational resources if not present."""
    row = db.execute("SELECT COUNT(*) as cnt FROM educational_resources").fetchone()
    count = row["cnt"] if row else 0

    if count > 0:
        return

    sample_resources = [
        {
            "id": "res_unit1_notes",
            "title": "مذكرة الشرح والتدريبات الشاملة — الوحدة الأولى: أساسيات بايثون",
            "description": "ملخص كامل لقواعد لغة بايثون، المتغيرات، أنواع البيانات، جمل الشرط، والتكرارات مع تمارين محلولة.",
            "file_url": "https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J_sample_unit1/view?usp=sharing",
            "preview_url": "https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J_sample_unit1/preview",
            "download_url": "https://drive.google.com/uc?export=download&id=1A2B3C4D5E6F7G8H9I0J_sample_unit1",
            "file_type": "pdf",
            "file_size_label": "3.4 MB",
            "category": "مذكرات شرح",
            "unit_id": "unit_1",
            "lesson_id": "lesson_1_1",
            "is_active": 1,
            "status": "active",
            "display_order": 1,
            "created_by": "admin_1",
            "created_by_name": "المهندس معاذ الشاذلي",
            "access_level": "subscribers_only",
            "is_free": 0,
            "storage_source": "google_drive"
        },
        {
            "id": "res_python_cheatsheet",
            "title": "ورقة المفاهيم السريعة وأهم الدوال البرمجية في بايثون (Cheat Sheet)",
            "description": "مرجع سريع لجميع الدوال المدمجة، القوائم، والعمليات المنطقية للمراجعة السريعة قبل الامتحانات.",
            "file_url": "https://drive.google.com/file/d/2B3C4D5E6F7G8H9I0J1K_sample_cheatsheet/view?usp=sharing",
            "preview_url": "https://drive.google.com/file/d/2B3C4D5E6F7G8H9I0J1K_sample_cheatsheet/preview",
            "download_url": "https://drive.google.com/uc?export=download&id=2B3C4D5E6F7G8H9I0J1K_sample_cheatsheet",
            "file_type": "pdf",
            "file_size_label": "1.8 MB",
            "category": "ملخصات وتفاصيل",
            "unit_id": "unit_1",
            "lesson_id": None,
            "is_active": 1,
            "status": "active",
            "display_order": 2,
            "created_by": "admin_1",
            "created_by_name": "المهندس معاذ الشاذلي",
            "access_level": "public",
            "is_free": 1,
            "storage_source": "google_drive"
        },
        {
            "id": "res_unit2_workbook",
            "title": "كراسة التمارين والتطبيقات العملية — الوحدة الثانية: هياكل البيانات",
            "description": "أكثر من 40 تدريب برمجي تطبيقي على القوائم والمصفوفات والمعاجم مع نماذج الإجابات النموذجية.",
            "file_url": "https://drive.google.com/file/d/3C4D5E6F7G8H9I0J1K2L_sample_unit2/view?usp=sharing",
            "preview_url": "https://drive.google.com/file/d/3C4D5E6F7G8H9I0J1K2L_sample_unit2/preview",
            "download_url": "https://drive.google.com/uc?export=download&id=3C4D5E6F7G8H9I0J1K2L_sample_unit2",
            "file_type": "pdf",
            "file_size_label": "4.2 MB",
            "category": "تدريبات وامتحانات",
            "unit_id": "unit_2",
            "lesson_id": None,
            "is_active": 1,
            "status": "active",
            "display_order": 3,
            "created_by": "admin_1",
            "created_by_name": "المهندس معاذ الشاذلي",
            "access_level": "subscribers_only",
            "is_free": 0,
            "storage_source": "google_drive"
        },
        {
            "id": "res_final_exam_prep",
            "title": "بنك أسئلة ونماذج امتحانات نهاية الفصل الدراسي الرسمية مع الإجابات",
            "description": "نماذج مطابقة لمواصفات الورقة الامتحانية الوزارية مع شروحات وتوزيع الدرجات لكل سؤال.",
            "file_url": "https://drive.google.com/file/d/4D5E6F7G8H9I0J1K2L3M_sample_final/view?usp=sharing",
            "preview_url": "https://drive.google.com/file/d/4D5E6F7G8H9I0J1K2L3M_sample_final/preview",
            "download_url": "https://drive.google.com/uc?export=download&id=4D5E6F7G8H9I0J1K2L3M_sample_final",
            "file_type": "pdf",
            "file_size_label": "5.1 MB",
            "category": "نماذج إجابة",
            "unit_id": "unit_4",
            "lesson_id": None,
            "is_active": 1,
            "status": "active",
            "display_order": 4,
            "created_by": "admin_1",
            "created_by_name": "المهندس معاذ الشاذلي",
            "access_level": "subscribers_only",
            "is_free": 0,
            "storage_source": "google_drive"
        },
    ]

    for r in sample_resources:
        db.execute(
            """
            INSERT INTO educational_resources (
                id,
                title,
                description,
                file_url,
                preview_url,
                download_url,
                file_type,
                file_size_label,
                category,
                unit_id,
                lesson_id,
                is_active,
                status,
                display_order,
                views_count,
                downloads_count,
                created_by,
                created_by_name,
                created_at,
                updated_at,
                access_level,
                is_free,
                storage_source
            )
            VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 12, 5, ?, ?, ?, ?, ?, ?, ?
            )
            """,
            (
                r["id"],
                r["title"],
                r["description"],
                r["file_url"],
                r["preview_url"],
                r["download_url"],
                r["file_type"],
                r["file_size_label"],
                r["category"],
                r["unit_id"],
                r["lesson_id"],
                r["is_active"],
                r["status"],
                r["display_order"],
                r["created_by"],
                r["created_by_name"],
                now,
                now,
                r.get("access_level", "subscribers_only"),
                r.get("is_free", 0),
                r.get("storage_source", "upload"),
            ),
        )


def _seed_subscription_offers(db, now: str):
    """Seed initial subscription packages and pricing tiers."""
    row = db.execute("SELECT COUNT(*) as cnt FROM subscription_offers").fetchone()
    if row and row["cnt"] > 0:
        return

    offers = [
        {
            "id": "pack_1m",
            "name": "باقة الشهر الواحد",
            "title": "باقة الشهر الواحد (30 يوم)",
            "duration_type": "1_month",
            "duration_days": 30,
            "price": 99.0,
            "currency": "EGP",
            "description": "وصول كامل لكافة الدروس التفاعلية، بنك الأسئلة والتمارين لشهر كامل.",
            "badge": "الأكثر مرونة",
            "features_json": json.dumps([
                "وصول غير محدود لجميع دروس المنهج التفاعلية",
                "محرر أكواد بايثون الذكي السحابي",
                "بنك أسئلة واختبارات دورية مع التقييم الفوري",
                "دعم فني واستفسارات أكاديمية مباشرة",
            ], ensure_ascii=False),
            "display_order": 1,
            "is_active": 1,
            "status": "active",
        },
        {
            "id": "pack_3m",
            "name": "باقة الفصل الدراسي",
            "title": "باقة الفصل الدراسي (3 أشهر)",
            "duration_type": "3_months",
            "duration_days": 90,
            "price": 249.0,
            "currency": "EGP",
            "description": "تغطية شاملة للفصل الدراسي بالكامل مع المذكرات ونماذج الامتحانات.",
            "badge": "الأكثر طلبًا ⭐",
            "features_json": json.dumps([
                "كل مميزات باقة الشهر الواحد",
                "مذكرات وملخصات PDF قابلة للمعاينة والتحميل",
                "نماذج امتحانات الوزارة السابقة مع نماذج الإجابة",
                "تتبع متقدم لمستوى الطالب ونقاط الضعف والقوة",
            ], ensure_ascii=False),
            "display_order": 2,
            "is_active": 1,
            "status": "active",
        },
        {
            "id": "pack_6m",
            "name": "باقة نصف السنوية",
            "title": "باقة نصف السنوية (6 أشهر)",
            "duration_type": "6_months",
            "duration_days": 180,
            "price": 449.0,
            "currency": "EGP",
            "description": "اشتراك ممتد يوفر تغطية كاملة لموسم دراسي كامل مع أولوية الرد.",
            "badge": "توفير ممتاز 🚀",
            "features_json": json.dumps([
                "كل مميزات باقة الفصل الدراسي",
                "متابعة دورية أسبوعية من المساعدين الأكاديميين",
                "مراجعات ليلة الامتحان واختبارات تجريبية مكثفة",
                "توفير كبير مقارنة بالدفع الشهري",
            ], ensure_ascii=False),
            "display_order": 3,
            "is_active": 1,
            "status": "active",
        },
        {
            "id": "pack_1y",
            "name": "باقة السنة الكاملة",
            "title": "باقة السنة الكاملة (12 شهر)",
            "duration_type": "1_year",
            "duration_days": 365,
            "price": 799.0,
            "currency": "EGP",
            "description": "وصول شامل للعام الدراسي كاملًا مع شهادة إتمام المسار المعتمدة.",
            "badge": "القيمة الأفضل 💎",
            "features_json": json.dumps([
                "وصول كامل للعام بأكمله بدون أي رسوم إضافية",
                "شهادة إتمام معتمدة بـ QR Code عند إكمال المنهج",
                "جميع المشاريع البرمجية التطبيقية الإضافية",
                "أولوية قصوى في الدعم الأكاديمي والاستفسارات",
            ], ensure_ascii=False),
            "display_order": 4,
            "is_active": 1,
            "status": "active",
        },
        {
            "id": "pack_pro",
            "name": "باقة المحترفين المتكاملة (Pro)",
            "title": "باقة المحترفين المتكاملة (Pro VIP)",
            "duration_type": "1_year",
            "duration_days": 365,
            "price": 899.0,
            "currency": "EGP",
            "description": "الباقة الاحترافية الكاملة لتعلم علوم الحاسب والبرمجة المتقدمة والمشاريع الواقعية.",
            "badge": "VIP Pro 🔥",
            "features_json": json.dumps([
                "وصول غير محدود لجميع الكورسات والمسارات التخصصية",
                "ورش عمل برمجية وتطبيقات مشاريع واقعية",
                "شهادة معتمدة مع رابط تحقق رقمي دائم",
                "استشارات توجيهية خاصة لمسابقات البرمجة",
            ], ensure_ascii=False),
            "display_order": 5,
            "is_active": 1,
            "status": "active",
        },
    ]

    for o in offers:
        db.execute(
            """
            INSERT INTO subscription_offers (
                id,
                name,
                title,
                duration_type,
                duration_days,
                price,
                currency,
                description,
                badge,
                features_json,
                image_url,
                is_active,
                status,
                display_order,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)
            """,
            (
                o["id"],
                o["name"],
                o["title"],
                o["duration_type"],
                o["duration_days"],
                o["price"],
                o["currency"],
                o["description"],
                o["badge"],
                o["features_json"],
                o["is_active"],
                o["status"],
                o["display_order"],
                now,
                now,
            ),
        )


if __name__ == "__main__":
    seed_database(force_refresh=True)