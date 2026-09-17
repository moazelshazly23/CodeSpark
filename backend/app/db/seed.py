"""
Code Spark - Safe Database Seeder
Seeds initial courses, units, lessons, exercises, exams, question bank, and default accounts ONLY IF EMPTY.
Prevents demo data recreation and preserves existing user data.
"""
import os
import sys
import json
import uuid
from datetime import datetime, timezone, timedelta
from app.db.engine import db_engine, now_iso
from app.core.security import get_password_hash, hash_code

def seed_database(force: bool = False):
    existing_users = db_engine.fetch_val("SELECT COUNT(*) FROM users") or 0
    if existing_users > 0 and not force:
        print("Database already contains users. Skipping seed to protect production data.")
        return

    print("Seeding Code Spark database...")
    now = datetime.now(timezone.utc)
    now_str = now.isoformat()
    one_year_later = (now + timedelta(days=365)).isoformat()

    if force:
        tables_to_clear = [
            "exercise_submissions", "exercises", "quiz_attempts", "quiz_questions",
            "quizzes", "exam_attempts", "exam_questions", "exams", "question_bank",
            "lesson_progress", "educational_resources", "study_files", "lessons",
            "units", "courses", "bookmarks", "support_messages", "support_tickets",
            "notifications", "announcements", "activity_logs", "subscription_requests",
            "subscriptions", "subscription_codes", "assistant_permissions",
            "student_stats", "users"
        ]
        with db_engine.transaction():
            for t in tables_to_clear:
                try:
                    db_engine.execute(f"DELETE FROM {t}")
                except Exception:
                    pass

    # 1. Accounts
    admin_id = "usr_admin_001"
    assistant_id = "usr_asst_002"
    student_sub_id = "usr_stud_sub_003"
    student_free_id = "usr_stud_free_004"

    users = [
        {
            "id": admin_id,
            "username": "admin",
            "email": "admin@codespark.edu",
            "hashed_password": get_password_hash("admin_password_2026"),
            "full_name": "المهندس معاذ الشاذلي (المشرف العام)",
            "role": "admin",
            "is_active": 1,
            "is_verified": 1,
            "phone": "+20159159038",
            "avatar_url": None,
            "created_at": now_str,
            "updated_at": now_str
        },
        {
            "id": assistant_id,
            "username": "assistant_ahmed",
            "email": "ahmed@codespark.edu",
            "hashed_password": get_password_hash("assistant_password_2026"),
            "full_name": "أحمد خليل (المساعد التعليمي)",
            "role": "assistant",
            "is_active": 1,
            "is_verified": 1,
            "phone": "+201000000002",
            "avatar_url": None,
            "created_at": now_str,
            "updated_at": now_str
        },
        {
            "id": student_sub_id,
            "username": "student_subscribed",
            "email": "student1@codespark.edu",
            "hashed_password": get_password_hash("student_password_2026"),
            "full_name": "عمر محمود (طالب مشترك)",
            "role": "student",
            "is_active": 1,
            "is_verified": 1,
            "phone": "+201000000003",
            "avatar_url": None,
            "created_at": now_str,
            "updated_at": now_str
        },
        {
            "id": student_free_id,
            "username": "student_free",
            "email": "student2@codespark.edu",
            "hashed_password": get_password_hash("student_password_2026"),
            "full_name": "سارة إبراهيم (طالبة مجانية)",
            "role": "student",
            "is_active": 1,
            "is_verified": 1,
            "phone": "+201000000004",
            "avatar_url": None,
            "created_at": now_str,
            "updated_at": now_str
        }
    ]

    for u in users:
        db_engine.insert("users", u)
        if u["role"] == "student":
            db_engine.insert("student_stats", {
                "user_id": u["id"],
                "xp": 120 if u["id"] == student_sub_id else 50,
                "streak_days": 3 if u["id"] == student_sub_id else 1,
                "last_active_date": now_str[:10],
                "study_time_minutes": 45.0 if u["id"] == student_sub_id else 10.0
            })

    # 2. Assistant Permissions
    assistant_perms = [
        "students.read", "questions.read", "questions.create", "questions.edit",
        "exams.read", "exams.create", "exams.edit", "resources.manage",
        "subscriptions.view", "support.manage"
    ]
    for p in assistant_perms:
        db_engine.insert("assistant_permissions", {
            "id": uuid.uuid4().hex,
            "user_id": assistant_id,
            "permission": p,
            "created_at": now_str
        })

    # 3. Subscription Codes
    codes = [
        {
            "id": "code_001",
            "code": "CS-SPARK-2026",
            "code_hash": hash_code("CS-SPARK-2026"),
            "duration_type": "3_MONTHS",
            "duration_days": 90,
            "status": "ACTIVE",
            "batch_name": "كود ترويجي فصلي",
            "created_by": admin_id,
            "used_by": None,
            "created_at": now_str,
            "expires_at": None
        },
        {
            "id": "code_002",
            "code": "CS-ANNUAL-VIP",
            "code_hash": hash_code("CS-ANNUAL-VIP"),
            "duration_type": "12_MONTHS",
            "duration_days": 365,
            "status": "ACTIVE",
            "batch_name": "اشتراك سنوي VIP",
            "created_by": admin_id,
            "used_by": None,
            "created_at": now_str,
            "expires_at": None
        }
    ]
    for c in codes:
        db_engine.insert("subscription_codes", c)

    # 4. Active Subscription for student_subscribed
    db_engine.insert("subscriptions", {
        "id": "sub_001",
        "user_id": student_sub_id,
        "code": "CS-ANNUAL-VIP",
        "plan_id": "plan_12m",
        "plan_name": "اشتراك سنوي",
        "starts_at": now_str,
        "expires_at": one_year_later,
        "is_active": 1,
        "created_at": now_str,
        "updated_at": now_str
    })

    # 5. Course
    course_id = "crs_py_001"
    db_engine.insert("courses", {
        "id": course_id,
        "title": "أساسيات البرمجة بلغة بايثون - Python Programming",
        "description": "دورة تأسيسية شاملة لتعليم مفاهيم البرمجة وحل المشكلات لطلاب المرحلة الثانوية.",
        "thumbnail_url": "/static/assets/branding/app_icon.svg",
        "order_index": 1,
        "is_published": 1,
        "academic_term": "الفصل الأول",
        "created_at": now_str,
        "updated_at": now_str
    })

    # 6. Units
    unit1_id = "unt_001"
    unit2_id = "unt_002"
    db_engine.insert("units", {
        "id": unit1_id,
        "course_id": course_id,
        "title": "الوحدة الأولى: المفاهيم الأساسية والمتغيرات",
        "description": "بيئة العمل، أمر الطباعة، وأنواع البيانات الأساسية.",
        "order_index": 1,
        "is_published": 1,
        "created_at": now_str,
        "updated_at": now_str
    })
    db_engine.insert("units", {
        "id": unit2_id,
        "course_id": course_id,
        "title": "الوحدة الثانية: جمل التحكم الشرطية",
        "description": "اتخاذ القرارات البرمجية عبر if-elif-else والعمليات المنطقية.",
        "order_index": 2,
        "is_published": 1,
        "created_at": now_str,
        "updated_at": now_str
    })

    # 7. Lessons
    les1_id = "les_001"
    les2_id = "les_002"
    les3_id = "les_003"
    db_engine.insert("lessons", {
        "id": les1_id,
        "unit_id": unit1_id,
        "title": "الدرس الأول: مقدمة إلى بايثون وأمر الطباعة",
        "content_markdown": "# مرحباً بك في بايثون!\n\nأمر الطباعة الأساسي:\n```python\nprint('Hello, Code Spark!')\n```",
        "video_type": "youtube",
        "video_url": "https://www.youtube.com/watch?v=kqtD5dpn9C8",
        "duration_minutes": 15,
        "order_index": 1,
        "is_free": 1,
        "is_published": 1,
        "created_at": now_str,
        "updated_at": now_str
    })
    db_engine.insert("lessons", {
        "id": les2_id,
        "unit_id": unit1_id,
        "title": "الدرس الثاني: المتغيرات وأنواع البيانات",
        "content_markdown": "# المتغيرات في بايثون\n\n```python\nx = 10\nname = 'Ahmed'\nprint(f'{name} has {x} points')\n```",
        "video_type": "youtube",
        "video_url": "https://www.youtube.com/watch?v=khKv-8q7YmY",
        "duration_minutes": 20,
        "order_index": 2,
        "is_free": 0,
        "is_published": 1,
        "created_at": now_str,
        "updated_at": now_str
    })
    db_engine.insert("lessons", {
        "id": les3_id,
        "unit_id": unit2_id,
        "title": "الدرس الثالث: جمل الشروط if-else",
        "content_markdown": "# التحكم الشرطي\n\n```python\nscore = 85\nif score >= 90:\n    print('ممتاز')\nelse:\n    print('جيد')\n```",
        "video_type": "embed",
        "video_url": "https://www.youtube.com/embed/kqtD5dpn9C8",
        "duration_minutes": 25,
        "order_index": 1,
        "is_free": 0,
        "is_published": 1,
        "created_at": now_str,
        "updated_at": now_str
    })

    # 8. Exercises
    ex1_id = "ex_001"
    db_engine.insert("exercises", {
        "id": ex1_id,
        "lesson_id": les1_id,
        "title": "تمرين 1: طباعة رسالة الترحيب",
        "instructions_markdown": "اكتب برنامجاً يقوم بطباعة النص: `Hello, Code Spark!`",
        "starter_code": "# اكتب الكود هنا\nprint('Hello, Code Spark!')",
        "solution_code": "print('Hello, Code Spark!')",
        "language": "python",
        "test_cases_json": json.dumps([{"input": "", "expected": "Hello, Code Spark!"}], ensure_ascii=False),
        "expected_output": "Hello, Code Spark!",
        "points": 10,
        "difficulty": "easy",
        "order_index": 1,
        "created_at": now_str,
        "updated_at": now_str
    })

    # 9. Question Bank
    q1_id = "qb_001"
    q2_id = "qb_002"
    db_engine.insert("question_bank", {
        "id": q1_id,
        "lesson_id": les1_id,
        "question_type": "multiple_choice",
        "question_text": "ما هي الدالة المستخدمة لعرض المخرجات على الشاشة في بايثون؟",
        "options_json": json.dumps([
            {"id": "opt1", "text": "echo()"},
            {"id": "opt2", "text": "print()"},
            {"id": "opt3", "text": "console.log()"}
        ], ensure_ascii=False),
        "correct_answer": "opt2",
        "explanation": "الدالة print() هي الدالة القياسية في بايثون.",
        "points": 5,
        "difficulty": "easy",
        "is_active": 1,
        "created_at": now_str,
        "updated_at": now_str
    })
    db_engine.insert("question_bank", {
        "id": q2_id,
        "lesson_id": les2_id,
        "question_type": "true_false",
        "question_text": "هل لغة بايثون حساسة لحالة الأحرف (Case-Sensitive)؟",
        "options_json": json.dumps([
            {"id": "true", "text": "صح (True)"},
            {"id": "false", "text": "خطأ (False)"}
        ], ensure_ascii=False),
        "correct_answer": "true",
        "explanation": "نعم، اسم المتغير Age يختلف تماماً عن age.",
        "points": 5,
        "difficulty": "easy",
        "is_active": 1,
        "created_at": now_str,
        "updated_at": now_str
    })

    # 10. Study Files
    db_engine.insert("study_files", {
        "id": "file_001",
        "title": "مذكرة الدرس الأول: مدخل بايثون الشامل (PDF)",
        "description": "ملف PDF يحتوي على شرح الدروس والأمثلة التوضيحية للوحدة الأولى.",
        "source_type": "google_drive",
        "external_url": "https://drive.google.com/file/d/1vcuy3r_9zImgjTBAq7lLY-lrpQR0duUIMfShV61eyYA/view",
        "file_name": "python_lesson1.pdf",
        "mime_type": "application/pdf",
        "file_size": 204800,
        "course_id": course_id,
        "unit_id": unit1_id,
        "lesson_id": les1_id,
        "visibility": "PUBLIC",
        "status": "active",
        "is_published": 1,
        "uploaded_by": admin_id,
        "created_at": now_str,
        "updated_at": now_str
    })

    print("✓ Seeding completed successfully!")

if __name__ == "__main__":
    force = "--force" in sys.argv
    seed_database(force=force)
