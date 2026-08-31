import json
import os
import datetime
from pathlib import Path
from .database import get_db, init_db
from .config import ENVIRONMENT, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD
from .security import hash_password, verify_password
from .subscription_utils import hash_code, mask_code, get_code_prefix, generate_random_code

def get_utc_now_iso() -> str:
    """Return timezone-aware ISO 8601 UTC timestamp."""
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def seed_database(force_refresh: bool = False):
    """Seed the database with complete secondary school programming curriculum and initial packages."""
    init_db()
    
    seed_json_path = Path(__file__).resolve().parent.parent.parent / "seed_data.json"
    if not seed_json_path.exists():
        seed_json_path = Path(__file__).resolve().parent.parent / "seed_data.json"
    
    data = {}
    if seed_json_path.exists():
        try:
            with open(seed_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error loading seed file: {e}")

    now = get_utc_now_iso()

    with get_db() as conn:
        cursor = conn.cursor()

        # Check if already seeded
        cursor.execute("SELECT COUNT(*) as count FROM users")
        user_count_row = cursor.fetchone()
        user_count = user_count_row["count"] if user_count_row else 0
        if user_count > 0 and not force_refresh:
            # Ensure Super Admin exists & is active without destroying user-modified passwords
            cursor.execute("""
            SELECT id, password_hash, email, role, status, is_active, is_deleted
            FROM users
            WHERE role IN ('SUPER_ADMIN', 'super_admin', 'ADMIN', 'admin') AND (is_deleted = 0 OR is_deleted IS NULL)
            LIMIT 1
            """)
            admin_row = cursor.fetchone()
            if not admin_row:
                # Create initial Super Admin if configured in environment or dev fallback
                adm_email = ADMIN_EMAIL or "admin@codespark.edu.eg"
                adm_name = ADMIN_NAME or "المهندس معاذ الشاذلي"
                adm_phone = ADMIN_PHONE or "01000000000"
                raw_pwd = ADMIN_PASSWORD or "admin12345"
                admin_pw = hash_password(raw_pwd)
                cursor.execute("""
                INSERT INTO users (id, name, email, phone, password_hash, role, avatar, is_active, status, is_deleted, created_at, updated_at)
                VALUES ('admin_1', ?, ?, ?, ?, 'SUPER_ADMIN', 'مع', 1, 'ACTIVE', 0, ?, ?)
                """, (adm_name, adm_email, adm_phone, admin_pw, now, now))
            else:
                # Admin already exists! Strictly preserve existing credentials and email
                adm_id = admin_row["id"]
                cursor.execute("""
                UPDATE users
                SET role = 'SUPER_ADMIN', status = 'ACTIVE', is_active = 1, is_deleted = 0, updated_at = ?
                WHERE id = ?
                """, (now, adm_id))

            _seed_educational_resources(cursor, now)
            return

        if force_refresh:
            print("Force refreshing database...")
            for table in [
                "exam_answers", "exam_attempts", "exam_questions", "exams",
                "quiz_answers", "quiz_attempts", "quiz_questions", "quizzes",
                "question_options", "questions", "exercises", "lesson_progress",
                "lessons", "units", "notifications", "announcements",
                "support_tickets", "student_profiles", "users", "system_settings",
                "subscription_codes",
                "user_bookmarks", "student_notes", "student_code_drafts", "activity_logs", "educational_resources"
            ]:
                try:
                    cursor.execute(f"DELETE FROM {table}")
                except Exception as e:
                    pass

        print("Seeding database from seed_data.json...")

        # 1. Seed Users and Student Profiles
        for user in data.get("users", []):
            u_id = user.get("id")
            name = user.get("name")
            email = user.get("email")
            phone = user.get("phone")
            role = user.get("role", "STUDENT")
            avatar = user.get("avatar", "ط")
            
            # If Super Admin, allow overriding from env
            if role.upper() in ("SUPER_ADMIN", "ADMIN"):
                if ADMIN_EMAIL:
                    email = ADMIN_EMAIL
                if ADMIN_NAME:
                    name = ADMIN_NAME
                if ADMIN_PHONE:
                    phone = ADMIN_PHONE
                raw_password = ADMIN_PASSWORD or user.get("password") or "admin12345"
            else:
                raw_password = user.get("password", "password123")
                
            pw_hash = hash_password(raw_password)
            created_at = user.get("createdAt", now)
            status_val = user.get("status", "ACTIVE")
            
            cursor.execute("""
            INSERT INTO users (id, name, email, phone, password_hash, role, avatar, is_active, status, is_deleted, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 0, ?, ?)
            """, (u_id, name, email, phone, pw_hash, role, avatar, status_val, created_at, now))

            if role.upper() in ("STUDENT", "DEMO"):
                grade = user.get("grade", "الصف الأول الثانوي")
                section = user.get("section", "عام")
                class_name = user.get("className", section)
                parent_phone = user.get("parentPhone", "")
                subscription_code = user.get("subscriptionCode", "SPARK-2026")
                streak = user.get("streak", 1)
                xp = user.get("xp", 100)
                learning_hours = user.get("learningHours", 0.0)
                last_activity = user.get("lastActivity", now)

                cursor.execute("""
                INSERT INTO student_profiles (
                    id, user_id, grade, class_name, section, parent_phone,
                    subscription_code, subscription_status, subscription_start,
                    subscription_expires_at, subscription_duration_days, subscription_type,
                    streak, xp, learning_hours, last_activity, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NULL, -1, 'lifetime', ?, ?, ?, ?, ?, ?)
                """, (
                    f"sp_{u_id}", u_id, grade, class_name, section, parent_phone,
                    subscription_code, created_at, streak, xp, learning_hours, last_activity, created_at, now
                ))

        
        # 1.2 Ensure Assistant exists for RBAC operations
        cursor.execute("SELECT id FROM users WHERE role = 'ASSISTANT'")
        if not cursor.fetchone():
            ast_pw = hash_password('assistant123')
            cursor.execute("""
            INSERT INTO users (id, name, email, phone, password_hash, role, avatar, is_active, status, is_deleted, created_by, created_at, updated_at)
            VALUES ('assistant_demo', 'Assistant Demo', 'assistant@codespark.edu.eg', '01088887777', ?, 'ASSISTANT', 'مس', 1, 'ACTIVE', 0, 'admin_1', ?, ?)
            """, (ast_pw, now, now))

        # 1.1 Seed Base Subscription Codes (Securely Hashed)
        initial_sub_codes = [
            {"code": "SPARK-2026", "type": "lifetime", "days": -1, "max": 1000},
            {"code": "SPARK-SEC2", "type": "lifetime", "days": -1, "max": 1000},
            {"code": "SPARK-ADMIN", "type": "lifetime", "days": -1, "max": 1000},
            {"code": "SPARK-NEW", "type": "lifetime", "days": -1, "max": 1000},
            {"code": "CS-8F4K-29XM", "type": "1_month", "days": 30, "max": 10},
            {"code": "CS-TERM-1ST2", "type": "3_months", "days": 90, "max": 10},
            {"code": "CS-SEME-STER", "type": "6_months", "days": 180, "max": 10},
            {"code": "CS-FULL-YEAR", "type": "1_year", "days": 365, "max": 10},
            {"code": "CS-LIFE-TIME", "type": "lifetime", "days": -1, "max": 10},
        ]
        for sc in initial_sub_codes:
            raw_c = sc["code"]
            c_hash = hash_code(raw_c)
            c_prefix = get_code_prefix(raw_c)
            c_masked = mask_code(raw_c)
            c_hash_num = abs(hash(raw_c)) % 1000000
            c_id = f"sub_{c_hash_num:06d}"
            
            cursor.execute("""
            INSERT INTO subscription_codes (
                id, code_hash, code_prefix, masked_code, status,
                subscription_type, duration_days, max_uses, uses_count,
                assigned_user_id, notes, created_at, activated_at, expires_at, disabled_at
            )
            VALUES (?, ?, ?, ?, 'active', ?, ?, ?, 0, NULL, 'Seeded System Code', ?, NULL, NULL, NULL)
            """, (c_id, c_hash, c_prefix, c_masked, sc["type"], sc["days"], sc["max"], now))

        # 2. Seed Units
        for unit in data.get("units", []):
            u_id = unit.get("id")
            number = unit.get("number", 1)
            title = unit.get("title")
            description = unit.get("description", "")
            icon = unit.get("icon", "code")
            total_lessons = unit.get("totalLessons", 0)
            total_exams = unit.get("totalExams", 0)
            status = unit.get("status", "in-progress")
            is_published = 1 if unit.get("isPublished", True) else 0
            order_index = unit.get("order", number)

            cursor.execute("""
            INSERT INTO units (id, number, title, description, icon, total_lessons, total_exams, status, is_published, published, order_index, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (u_id, number, title, description, icon, total_lessons, total_exams, status, is_published, is_published, order_index, now, now))

        # 3. Seed Lessons
        for lesson in data.get("lessons", []):
            l_id = lesson.get("id")
            unit_id = lesson.get("unitId")
            number = lesson.get("number", 1)
            title = lesson.get("title")
            description = lesson.get("description", "")
            duration = lesson.get("duration", "20 دقيقة")
            l_type = lesson.get("type", "video")
            video_url = lesson.get("videoUrl", "")
            content_html = lesson.get("contentHtml", "")
            code_example = lesson.get("codeExample", "")
            code_solution = lesson.get("codeSolution", "")
            
            ex = lesson.get("exercise") or {}
            ex_title = ex.get("title", "")
            ex_desc = ex.get("description", "")
            ex_starter = ex.get("starterCode", "")
            ex_solution = ex.get("solutionCode", "")
            ex_test_cases = json.dumps(ex.get("testCases", [])) if ex.get("testCases") else None

            is_published = 1 if lesson.get("isPublished", True) else 0
            order_index = lesson.get("order", number)

            v_source = lesson.get("videoSource", "youtube" if video_url else None)
            v_provider = lesson.get("videoProvider", "youtube" if video_url else None)
            v_id = lesson.get("videoId", "kqtD5dpn9C8" if video_url and "kqtD5dpn9C8" in video_url else None)
            v_storage_path = lesson.get("storagePath", None)
            v_thumb = lesson.get("thumbnailUrl", f"https://img.youtube.com/vi/{v_id}/hqdefault.jpg" if v_id else None)
            v_size = lesson.get("fileSize", None)
            v_mime = lesson.get("mimeType", "video/mp4" if v_source == "upload" else None)

            cursor.execute("""
            INSERT INTO lessons (
                id, unit_id, number, title, description, duration, type, video_source, video_provider, video_id, video_url,
                storage_path, thumbnail_url, file_size, mime_type,
                content, content_html, code_example, code_solution,
                exercise_title, exercise_description, exercise_starter_code, exercise_solution_code, exercise_test_cases,
                is_published, published, order_index, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                l_id, unit_id, number, title, description, duration, l_type, v_source, v_provider, v_id, video_url,
                v_storage_path, v_thumb, v_size, v_mime,
                content_html, content_html, code_example, code_solution,
                ex_title, ex_desc, ex_starter, ex_solution, ex_test_cases,
                is_published, is_published, order_index, now, now
            ))

            if ex_title:
                cursor.execute("""
                INSERT INTO exercises (id, lesson_id, title, description, type, difficulty, content, solution, starter_code, solution_code, test_cases, published, is_published, created_at)
                VALUES (?, ?, ?, ?, 'code', 'medium', ?, ?, ?, ?, ?, 1, 1, ?)
                """, (f"ex_{l_id}", l_id, ex_title, ex_desc, ex_starter, ex_solution, ex_starter, ex_solution, ex_test_cases, now))

        # 4. Seed Questions and Question Options
        opt_keys = ["A", "B", "C", "D", "E", "F"]
        for q in data.get("questions", []):
            q_id = q.get("id")
            unit_id = q.get("unitId")
            lesson_id = q.get("lessonId")
            question_text = q.get("question")
            q_type = q.get("type", "mcq")
            difficulty = q.get("difficulty", "medium")
            score = q.get("score", 10)
            explanation = q.get("explanation", "")
            correct_ans_raw = q.get("correctAnswer", 0)
            correct_answer = str(correct_ans_raw)
            code_snippet = q.get("codeSnippet", "")
            is_published = 1 if q.get("isPublished", True) else 0

            cursor.execute("""
            INSERT INTO questions (id, unit_id, lesson_id, question_text, question, type, difficulty, score, explanation, correct_answer, code_snippet, published, is_published, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (q_id, unit_id, lesson_id, question_text, question_text, q_type, difficulty, score, explanation, correct_answer, code_snippet, is_published, is_published, now))

            options_list = q.get("options", [])
            for idx, opt in enumerate(options_list):
                if isinstance(opt, dict):
                    opt_key = opt.get("key", opt_keys[idx] if idx < len(opt_keys) else str(idx))
                    opt_text = opt.get("text", "")
                    is_corr = 1 if (opt_key == correct_answer or str(idx) == correct_answer or opt.get("isCorrect")) else 0
                else:
                    opt_key = opt_keys[idx] if idx < len(opt_keys) else str(idx)
                    opt_text = str(opt)
                    is_corr = 1 if (str(idx) == str(correct_ans_raw) or opt_key == str(correct_ans_raw)) else 0

                opt_id = f"opt_{q_id}_{idx}"
                cursor.execute("""
                INSERT INTO question_options (id, question_id, option_key, option_text, is_correct, order_index)
                VALUES (?, ?, ?, ?, ?, ?)
                """, (opt_id, q_id, opt_key, opt_text, is_corr, idx))

        # 4.1 Seed Quizzes for Lessons
        cursor.execute("SELECT DISTINCT lesson_id FROM questions WHERE lesson_id IS NOT NULL")
        lessons_with_qs = [r["lesson_id"] for r in cursor.fetchall()]
        for l_id in lessons_with_qs:
            cursor.execute("SELECT id, title, unit_id FROM lessons WHERE id = ?", (l_id,))
            l_row = cursor.fetchone()
            if l_row:
                q_quiz_id = f"quiz_{l_id}"
                q_title = f"اختبار قصير: {l_row['title']}"
                cursor.execute("""INSERT INTO quizzes (id, lesson_id, unit_id, title, description, duration, duration_minutes, passing_score, is_published, published, created_at, updated_at) VALUES (?, ?, ?, ?, 'اختبر فهمك لمفاهيم الدرس', 10, 10, 60, 1, 1, ?, ?)""", (q_quiz_id, l_id, l_row["unit_id"], q_title, now, now))
                cursor.execute("SELECT id FROM questions WHERE lesson_id = ? ORDER BY created_at ASC", (l_id,))
                q_rows = cursor.fetchall()
                for idx, qr in enumerate(q_rows):
                    cursor.execute("INSERT INTO quiz_questions (quiz_id, question_id, order_index) VALUES (?, ?, ?)", (q_quiz_id, qr["id"], idx))

        # 5. Seed Exams and Exam Questions
        for exam in data.get("exams", []):
            e_id = exam.get("id")
            unit_id = exam.get("unitId")
            title = exam.get("title")
            description = exam.get("description", "")
            duration = exam.get("duration", 30)
            total_q = exam.get("totalQuestions", 10)
            passing_score = exam.get("passingScore", 60)
            attempts_allowed = exam.get("attemptsAllowed", 3)
            randomize = 1 if exam.get("randomizeQuestions", False) else 0
            is_published = 1 if exam.get("isPublished", True) else 0

            cursor.execute("""
            INSERT INTO exams (id, unit_id, title, description, duration, duration_minutes, total_questions, passing_score, attempts_allowed, random_questions, randomize_questions, published, is_published, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (e_id, unit_id, title, description, duration, duration, total_q, passing_score, attempts_allowed, randomize, randomize, is_published, is_published, now, now))

            q_ids = exam.get("questionIds", [])
            for idx, q_id in enumerate(q_ids):
                eq_id = f"eq_{e_id}_{q_id}"
                cursor.execute("""
                INSERT INTO exam_questions (id, exam_id, question_id, order_index)
                VALUES (?, ?, ?, ?)
                """, (eq_id, e_id, q_id, idx))

        # 6. Seed Announcements
        for ann in data.get("announcements", []):
            a_id = ann.get("id")
            title = ann.get("title")
            content = ann.get("content")
            badge = ann.get("badge", "تنبيه")
            date_str = ann.get("date", now)
            is_pub = 1 if ann.get("isPublished", True) else 0

            cursor.execute("""
            INSERT INTO announcements (id, title, content, badge, date_str, published, is_published, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (a_id, title, content, badge, date_str, is_pub, is_pub, date_str))

        # 7. Seed Notifications
        for notif in data.get("notifications", []):
            n_id = notif.get("id")
            u_id = notif.get("userId")
            title = notif.get("title")
            message = notif.get("message")
            n_type = notif.get("type", "info")
            is_read = 1 if notif.get("read", False) else 0
            link = notif.get("link", "#curriculum")
            created_at = notif.get("date", now)

            cursor.execute("""
            INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (n_id, u_id, title, message, n_type, is_read, link, created_at))

        # 8. Seed Support Tickets
        for ticket in data.get("supportTickets", []):
            t_id = ticket.get("id")
            u_id = ticket.get("studentId")
            s_name = ticket.get("studentName", "طالب")
            subject = ticket.get("subject", "")
            message = ticket.get("message", "")
            status = ticket.get("status", "open")
            reply = ticket.get("reply", "")
            t_date = ticket.get("date", now)

            cursor.execute("""
            INSERT INTO support_tickets (id, user_id, student_name, student_phone, subject, message, status, reply, created_at, updated_at)
            VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?)
            """, (t_id, u_id, s_name, subject, message, status, reply, t_date, t_date))

        # 9. Seed Student Progress (for student_1)
        sp = data.get("studentProgress", {}).get("student_1", {})
        if sp:
            student_id = "student_1"
            for lesson_id in sp.get("completedLessons", []):
                lp_id = f"lp_{student_id}_{lesson_id}"
                cursor.execute("""
                INSERT INTO lesson_progress (id, student_id, lesson_id, progress, completed, last_position, updated_at)
                VALUES (?, ?, ?, 100, 1, 0, ?)
                """, (lp_id, student_id, lesson_id, now))

            for att in sp.get("examAttempts", []):
                now_epoch = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
                fallback_att_id = f"att_{now_epoch}"
                att_id = att.get("id", fallback_att_id)
                exam_id = att.get("examId", "exam_unit_1")
                score = att.get("score", 85)
                total_score = att.get("totalScore", 100)
                pct = att.get("percentage", 85)
                corr = att.get("correctCount", 17)
                tot = att.get("totalCount", 20)
                time_s = att.get("timeSpentSeconds", 1122)
                strengths = json.dumps(att.get("strengths", ["المتغيرات وأنواع البيانات", "الجمل الشرطية"]))
                weaknesses = json.dumps(att.get("weaknesses", ["المصفوفات والدوال"]))
                passed = 1 if pct >= 60 else 0
                att_date = att.get("date", now)

                cursor.execute("""
                INSERT INTO exam_attempts (
                    id, exam_id, student_id, score, total_score, percentage, correct_count, total_count,
                    time_spent_seconds, strengths_json, weaknesses_json, passed, started_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    att_id, exam_id, student_id, score, total_score, pct, corr, tot,
                    time_s, strengths, weaknesses, passed, att_date, att_date
                ))

        _seed_educational_resources(cursor, now)


        print("Seeding completed successfully!")


def _seed_educational_resources(cursor, now: str):
    """Seed initial educational resources (PDF study notes & cheatsheets) if not present."""
    cursor.execute("SELECT COUNT(*) as cnt FROM educational_resources")
    row = cursor.fetchone()
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
            "created_by_name": "المهندس معاذ الشاذلي"
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
            "created_by_name": "المهندس معاذ الشاذلي"
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
            "created_by_name": "المهندس معاذ الشاذلي"
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
            "created_by_name": "المهندس معاذ الشاذلي"
        }
    ]

    for r in sample_resources:
        cursor.execute("""
        INSERT INTO educational_resources (
            id, title, description, file_url, preview_url, download_url,
            file_type, file_size_label, category, unit_id, lesson_id,
            is_active, status, display_order, views_count, downloads_count,
            created_by, created_by_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 12, 5, ?, ?, ?, ?)
        """, (
            r["id"], r["title"], r["description"], r["file_url"], r["preview_url"], r["download_url"],
            r["file_type"], r["file_size_label"], r["category"], r["unit_id"], r["lesson_id"],
            r["is_active"], r["status"], r["display_order"], r["created_by"], r["created_by_name"], now, now
        ))


if __name__ == "__main__":
    seed_database(force_refresh=True)
