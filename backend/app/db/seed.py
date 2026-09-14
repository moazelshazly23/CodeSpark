"""
Code Spark - Development Database Seeder
Seeds initial courses, units, lessons, exercises, exams, question bank, subscription codes, and test accounts.
"""
import os
import json
import uuid
from datetime import datetime, timezone, timedelta
from app.db.engine import db_engine, now_iso
from app.core.security import get_password_hash, hash_code

def seed_database():
    print("Seeding Code Spark relational database...")
    now = datetime.now(timezone.utc)
    now_str = now.isoformat()
    one_year_later = (now + timedelta(days=365)).isoformat()
    three_months_later = (now + timedelta(days=90)).isoformat()

    # Clear existing data in correct FK order
    tables_to_clear = [
        "exercise_submissions", "exercises", "quiz_attempts", "quiz_questions", "quizzes",
        "exam_attempts", "exam_questions", "exams", "question_bank", "lesson_progress",
        "educational_resources", "lessons", "units", "courses", "bookmarks", "support_messages",
        "support_tickets", "notifications", "announcements", "activity_logs", "subscriptions",
        "subscription_codes", "assistant_permissions", "student_stats", "users"
    ]
    with db_engine.transaction():
        for t in tables_to_clear:
            db_engine.execute(f"DELETE FROM {t}")

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
            "phone": "+201000000001",
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
            "full_name": "سارة إبراهيم (طالبة تجريبية)",
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
            "granted_at": now_str
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
            "created_by": admin_id,
            "used_by": None,
            "disabled": 0,
            "metadata_json": json.dumps({"note": "كود ترويجي فصلي"}, ensure_ascii=False),
            "created_at": now_str,
            "activated_at": None,
            "expires_at": None
        },
        {
            "id": "code_002",
            "code": "CS-ANNUAL-VIP",
            "code_hash": hash_code("CS-ANNUAL-VIP"),
            "duration_type": "12_MONTHS",
            "duration_days": 365,
            "status": "ACTIVE",
            "created_by": admin_id,
            "used_by": None,
            "disabled": 0,
            "metadata_json": json.dumps({"note": "اشتراك سنوي VIP"}, ensure_ascii=False),
            "created_at": now_str,
            "activated_at": None,
            "expires_at": None
        },
        {
            "id": "code_003",
            "code": "CS-LIFETIME-PASS",
            "code_hash": hash_code("CS-LIFETIME-PASS"),
            "duration_type": "LIFETIME",
            "duration_days": 36500,
            "status": "ACTIVE",
            "created_by": admin_id,
            "used_by": None,
            "disabled": 0,
            "metadata_json": json.dumps({"note": "اشتراك مدى الحياة"}, ensure_ascii=False),
            "created_at": now_str,
            "activated_at": None,
            "expires_at": None
        },
        {
            "id": "code_004",
            "code": "CS-USED-CODE",
            "code_hash": hash_code("CS-USED-CODE"),
            "duration_type": "12_MONTHS",
            "duration_days": 365,
            "status": "USED",
            "created_by": admin_id,
            "used_by": student_sub_id,
            "disabled": 0,
            "metadata_json": json.dumps({"note": "تم تفعيله للطالب المشترك"}, ensure_ascii=False),
            "created_at": now_str,
            "activated_at": now_str,
            "expires_at": one_year_later
        },
        {
            "id": "code_005",
            "code": "CS-DISABLED-01",
            "code_hash": hash_code("CS-DISABLED-01"),
            "duration_type": "1_MONTH",
            "duration_days": 30,
            "status": "DISABLED",
            "created_by": admin_id,
            "used_by": None,
            "disabled": 1,
            "metadata_json": json.dumps({"note": "كود معطل"}, ensure_ascii=False),
            "created_at": now_str,
            "activated_at": None,
            "expires_at": None
        }
    ]
    for c in codes:
        db_engine.insert("subscription_codes", c)

    # 4. Active Subscription for student_subscribed
    db_engine.insert("subscriptions", {
        "id": "sub_001",
        "user_id": student_sub_id,
        "code_id": "code_004",
        "status": "ACTIVE",
        "started_at": now_str,
        "expires_at": one_year_later,
        "is_lifetime": 0,
        "created_at": now_str
    })

    # 5. Course
    course_id = "crs_py_001"
    db_engine.insert("courses", {
        "id": course_id,
        "title": "أساسيات البرمجة بلغة بايثون - Python Programming Fundamentals",
        "slug": "python-fundamentals",
        "description": "دورة تأسيسية شاملة مصممة خصيصاً لتعليم المفاهيم البرمجية من الصفر وحتى الاحتراف مع تطبيقات عملية واختبارات دورية.",
        "thumbnail_url": "/static/assets/branding/app_icon.svg",
        "order_index": 1,
        "is_published": 1,
        "access_type": "PUBLIC",
        "created_at": now_str,
        "updated_at": now_str
    })

    # 6. Units
    unit1_id = "unt_001"
    unit2_id = "unt_002"
    db_engine.insert("units", {
        "id": unit1_id,
        "course_id": course_id,
        "title": "الوحدة الأولى: المفاهيم الأساسية والمتغيرات وبيئة العمل",
        "description": "التعرف على بيئة البرمجة، طباعة المخرجات، أنواع البيانات الأساسية، واستقبال المدخلات.",
        "order_index": 1,
        "is_published": 1,
        "access_type": "PUBLIC",
        "created_at": now_str,
        "updated_at": now_str
    })
    db_engine.insert("units", {
        "id": unit2_id,
        "course_id": course_id,
        "title": "الوحدة الثانية: جمل التحكم الشرطية وحلقات التكرار",
        "description": "اتخاذ القرارات البرمجية عبر if-elif-else، والتكرار المنظم باستخدام for و while.",
        "order_index": 2,
        "is_published": 1,
        "access_type": "SUBSCRIBERS_ONLY",
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
        "title": "الدرس الأول: مقدمة إلى لغة بايثون وتشغيل أول برنامج",
        "slug": "intro-python-hello-world",
        "description": "شرح مفهوم البرمجة، سبب اختيار لغة بايثون، كتابة أمر الطباعة print، والتعامل مع محرر الأكواد.",
        "content_markdown": "# مرحباً بك في عالم البرمجة مع بايثون!\n\nلغة بايثون هي إحدى أقوى لغات البرمجة وأكثرها سهولة للقراءة والكتابة.\n\n### أمر الطباعة الأساسي:\n```python\nprint('Hello, Code Spark!')\n```\nيقوم هذا الأمر بعرض النص المحدد داخل القوسين على شاشة المخرجات.",
        "video_type": "youtube",
        "video_url": "https://www.youtube.com/watch?v=kqtD5dpn9C8",
        "video_id": "kqtD5dpn9C8",
        "duration_seconds": 920.0,
        "order_index": 1,
        "is_published": 1,
        "access_type": "PUBLIC",
        "created_at": now_str,
        "updated_at": now_str
    })

    db_engine.insert("lessons", {
        "id": les2_id,
        "unit_id": unit1_id,
        "title": "الدرس الثاني: المتغيرات وأنواع البيانات وسلاسل النصوص",
        "slug": "variables-and-data-types",
        "description": "التعامل مع المتغيرات، الأعداد الصحيحة والعشرية، النصوص، والتحويل بين الأنواع.",
        "content_markdown": "# المتغيرات وأنواع البيانات\n\nالمتغير هو مكان مخصص في الذاكرة لتخزين قيمة يمكن استخدامها وتعديلها لاحقاً.\n\n```python\nx = 10\nname = 'Ahmed'\npi = 3.14\nprint(f'{name} has {x} points')\n```",
        "video_type": "youtube",
        "video_url": "https://www.youtube.com/watch?v=khKv-8q7YmY",
        "video_id": "khKv-8q7YmY",
        "duration_seconds": 1250.0,
        "order_index": 2,
        "is_published": 1,
        "access_type": "SUBSCRIBERS_ONLY",
        "created_at": now_str,
        "updated_at": now_str
    })

    db_engine.insert("lessons", {
        "id": les3_id,
        "unit_id": unit2_id,
        "title": "الدرس الثالث: جمل الشروط if-else والمنطق البرمجي",
        "slug": "conditional-logic-if-else",
        "description": "بناء القرارات المنطقية في الكود، المقارنات الرياضية، والتعامل مع الحالات المتعددة.",
        "content_markdown": "# التحكم الشرطي في بايثون\n\nتسمح جمل if للبرنامج باتخاذ مسارات تنفيذ مختلفة بناءً على تحقق شرط معين.\n\n```python\nscore = 85\nif score >= 90:\n    print('ممتاز')\nelif score >= 75:\n    print('جيد جداً')\nelse:\n    print('يحتاج إلى مراجعة')\n```",
        "video_type": "uploaded",
        "video_url": "/storage/videos/sample_lesson_video.mp4",
        "video_id": None,
        "duration_seconds": 1400.0,
        "order_index": 3,
        "is_published": 1,
        "access_type": "SUBSCRIBERS_ONLY",
        "created_at": now_str,
        "updated_at": now_str
    })

    # 8. Educational Resources
    db_engine.insert("educational_resources", {
        "id": "res_001",
        "unit_id": unit1_id,
        "lesson_id": les1_id,
        "title": "دليل تثبيت بيئة بايثون ومحرر VS Code (PDF)",
        "description": "ملف توجيهي كامل يوضح خطوات التثبيت وإعداد بيئة العمل على أنظمة ويندوز وماك.",
        "resource_type": "drive_link",
        "file_url": "https://drive.google.com/file/d/sample_guide_pdf/view",
        "file_size_bytes": 1024 * 1024 * 2,
        "file_format": "pdf",
        "access_type": "PUBLIC",
        "is_published": 1,
        "created_by": admin_id,
        "created_at": now_str
    })
    db_engine.insert("educational_resources", {
        "id": "res_002",
        "unit_id": unit1_id,
        "lesson_id": les2_id,
        "title": "ملخص الدوال القياسية والعمليات الحسابية (PDF)",
        "description": "مرجع شامل للمتغيرات، أنواع البيانات، والعمليات الحسابية والمنطقية الأساسية.",
        "resource_type": "uploaded_file",
        "file_url": "/storage/files/sample_summary.pdf",
        "file_size_bytes": 1024 * 1024 * 4,
        "file_format": "pdf",
        "access_type": "SUBSCRIBERS_ONLY",
        "is_published": 1,
        "created_by": admin_id,
        "created_at": now_str
    })

    # 9. Exercises
    ex1_id = "ex_001"
    ex2_id = "ex_002"
    db_engine.insert("exercises", {
        "id": ex1_id,
        "unit_id": unit1_id,
        "lesson_id": les1_id,
        "title": "تمرين 1: طباعة رسالة الترحيب الأولى",
        "description": "اكتب برنامجاً بلغة بايثون يقوم بطباعة الرسالة الدقيقة: Hello, Code Spark!",
        "instructions": "استخدم دالة print() لطباعة النص المطلوب حرفياً وبنفس حالة الأحرف.",
        "starter_code": "# اكتب الكود هنا\nprint('Hello, Code Spark!')",
        "expected_output": "Hello, Code Spark!",
        "test_cases_json": json.dumps([{"input": "", "expected": "Hello, Code Spark!"}], ensure_ascii=False),
        "language": "python",
        "difficulty": "easy",
        "solution_code": "print('Hello, Code Spark!')",
        "access_type": "PUBLIC",
        "is_published": 1,
        "order_index": 1,
        "created_at": now_str,
        "updated_at": now_str
    })

    db_engine.insert("exercises", {
        "id": ex2_id,
        "unit_id": unit1_id,
        "lesson_id": les2_id,
        "title": "تمرين 2: حساب مساحة المستطيل",
        "description": "اكتب كوداً يعرف المتغيرين length = 8 و width = 5 ثم يطبع حاصل ضربهما.",
        "instructions": "احسب المساحة = الطول * العرض واطبع الناتج.",
        "starter_code": "length = 8\nwidth = 5\n# احسب واطبع المساحة\n",
        "expected_output": "40",
        "test_cases_json": json.dumps([{"input": "", "expected": "40"}], ensure_ascii=False),
        "language": "python",
        "difficulty": "medium",
        "solution_code": "length = 8\nwidth = 5\nprint(length * width)",
        "access_type": "SUBSCRIBERS_ONLY",
        "is_published": 1,
        "order_index": 2,
        "created_at": now_str,
        "updated_at": now_str
    })

    # 10. Question Bank
    q1_id = "qb_001"
    q2_id = "qb_002"
    q3_id = "qb_003"
    q4_id = "qb_004"
    q5_id = "qb_005"
    q6_id = "qb_006"

    questions = [
        {
            "id": q1_id,
            "question_text": "ما هي الدالة المستخدمة لعرض المخرجات على الشاشة في بايثون؟",
            "question_type": "multiple_choice",
            "options_json": json.dumps([
                {"id": "opt1", "text": "echo()"},
                {"id": "opt2", "text": "print()"},
                {"id": "opt3", "text": "console.log()"},
                {"id": "opt4", "text": "display()"}
            ], ensure_ascii=False),
            "correct_answer": "opt2",
            "explanation": "الدالة print() هي الدالة القياسية في بايثون لطباعة النصوص والمخرجات.",
            "difficulty": "easy",
            "topic": "الأساسيات",
            "unit_id": unit1_id,
            "lesson_id": les1_id,
            "tags_json": json.dumps(["print", "io"], ensure_ascii=False),
            "status": "active",
            "created_by": admin_id,
            "created_at": now_str,
            "updated_at": now_str
        },
        {
            "id": q2_id,
            "question_text": "هل لغة بايثون حساسة لحالة الأحرف (Case-Sensitive) في تسمية المتغيرات؟",
            "question_type": "true_false",
            "options_json": json.dumps([
                {"id": "true", "text": "صح (True)"},
                {"id": "false", "text": "خطأ (False)"}
            ], ensure_ascii=False),
            "correct_answer": "true",
            "explanation": "نعم، المتغير Age يختلف تماماً عن age في بايثون.",
            "difficulty": "easy",
            "topic": "المتغيرات",
            "unit_id": unit1_id,
            "lesson_id": les2_id,
            "tags_json": json.dumps(["variables", "syntax"], ensure_ascii=False),
            "status": "active",
            "created_by": admin_id,
            "created_at": now_str,
            "updated_at": now_str
        },
        {
            "id": q3_id,
            "question_text": "ما هو ناتج تنفيذ الكود التالي: print(type(3.14))؟",
            "question_type": "multiple_choice",
            "options_json": json.dumps([
                {"id": "opt_int", "text": "<class 'int'>"},
                {"id": "opt_float", "text": "<class 'float'>"},
                {"id": "opt_str", "text": "<class 'str'>"},
                {"id": "opt_bool", "text": "<class 'bool'>"}
            ], ensure_ascii=False),
            "correct_answer": "opt_float",
            "explanation": "الأعداد التي تحتوي على فاصلة عشرية تصنف كـ float.",
            "difficulty": "medium",
            "topic": "أنواع البيانات",
            "unit_id": unit1_id,
            "lesson_id": les2_id,
            "tags_json": json.dumps(["data_types", "float"], ensure_ascii=False),
            "status": "active",
            "created_by": admin_id,
            "created_at": now_str,
            "updated_at": now_str
        },
        {
            "id": q4_id,
            "question_text": "أي من الرموز التالية يمثل معامل المقارنة 'يساوي' في بايثون؟",
            "question_type": "multiple_choice",
            "options_json": json.dumps([
                {"id": "opt_assign", "text": "="},
                {"id": "opt_equal", "text": "=="},
                {"id": "opt_triple", "text": "==="},
                {"id": "opt_is", "text": "eq"}
            ], ensure_ascii=False),
            "correct_answer": "opt_equal",
            "explanation": "المعامل == للمقارنة الشرطية، بينما = هو معامل الإسناد.",
            "difficulty": "easy",
            "topic": "الشروط",
            "unit_id": unit2_id,
            "lesson_id": les3_id,
            "tags_json": json.dumps(["operators", "conditions"], ensure_ascii=False),
            "status": "active",
            "created_by": admin_id,
            "created_at": now_str,
            "updated_at": now_str
        },
        {
            "id": q5_id,
            "question_text": "ما هي الكلمة المفتاحية المستخدمة لفحص شرط بديل في جملة if؟",
            "question_type": "multiple_choice",
            "options_json": json.dumps([
                {"id": "opt_elseif", "text": "else if"},
                {"id": "opt_elif", "text": "elif"},
                {"id": "opt_case", "text": "case"},
                {"id": "opt_then", "text": "then"}
            ], ensure_ascii=False),
            "correct_answer": "opt_elif",
            "explanation": "بايثون تستخدم elif كاختصار لـ else if.",
            "difficulty": "easy",
            "topic": "الشروط",
            "unit_id": unit2_id,
            "lesson_id": les3_id,
            "tags_json": json.dumps(["conditions", "elif"], ensure_ascii=False),
            "status": "active",
            "created_by": admin_id,
            "created_at": now_str,
            "updated_at": now_str
        },
        {
            "id": q6_id,
            "question_text": "ما ناتج الكود: print(10 // 3)؟",
            "question_type": "multiple_choice",
            "options_json": json.dumps([
                {"id": "opt_3_33", "text": "3.3333333333333335"},
                {"id": "opt_3", "text": "3"},
                {"id": "opt_1", "text": "1"},
                {"id": "opt_err", "text": "خطأ برمجي"}
            ], ensure_ascii=False),
            "correct_answer": "opt_3",
            "explanation": "المعامل // يقوم بالقسمة الصحيحة (Floor Division) مهملاً الكسور.",
            "difficulty": "medium",
            "topic": "العمليات الحسابية",
            "unit_id": unit1_id,
            "lesson_id": les2_id,
            "tags_json": json.dumps(["operators", "math"], ensure_ascii=False),
            "status": "active",
            "created_by": admin_id,
            "created_at": now_str,
            "updated_at": now_str
        }
    ]
    for q in questions:
        db_engine.insert("question_bank", q)

    # 11. Quiz
    quiz_id = "qz_001"
    db_engine.insert("quizzes", {
        "id": quiz_id,
        "lesson_id": les1_id,
        "unit_id": unit1_id,
        "title": "اختبار الدرس الأول القصير: مدخل بايثون",
        "description": "اختبار سريع لقياس مدى استيعاب المفاهيم الأولية وأمر الطباعة.",
        "passing_score": 70.0,
        "time_limit_minutes": 10,
        "access_type": "PUBLIC",
        "is_published": 1,
        "created_at": now_str,
        "updated_at": now_str
    })
    db_engine.insert("quiz_questions", {
        "id": uuid.uuid4().hex,
        "quiz_id": quiz_id,
        "question_id": q1_id,
        "points": 5.0,
        "order_index": 1
    })
    db_engine.insert("quiz_questions", {
        "id": uuid.uuid4().hex,
        "quiz_id": quiz_id,
        "question_id": q2_id,
        "points": 5.0,
        "order_index": 2
    })

    # 12. Exam
    exam_id = "exm_001"
    db_engine.insert("exams", {
        "id": exam_id,
        "title": "امتحان منتصف الفصل: البرمجة التأسيسية الشاملة",
        "description": "امتحان رسمي يغطي الوحدة الأولى والثانية ويشمل الأسئلة الاختيارية وتحليل الأكواد.",
        "duration_minutes": 45,
        "passing_score": 75.0,
        "max_attempts": 2,
        "is_randomized": 1,
        "start_window": now_str,
        "end_window": (now + timedelta(days=60)).isoformat(),
        "access_type": "SUBSCRIBERS_ONLY",
        "is_published": 1,
        "created_by": admin_id,
        "created_at": now_str,
        "updated_at": now_str
    })
    for idx, qid in enumerate([q1_id, q2_id, q3_id, q4_id, q5_id, q6_id]):
        db_engine.insert("exam_questions", {
            "id": uuid.uuid4().hex,
            "exam_id": exam_id,
            "question_id": qid,
            "points": 5.0,
            "order_index": idx + 1
        })

    # 13. Sample Announcement & Notification & Support Ticket
    db_engine.insert("announcements", {
        "id": "ann_001",
        "title": "انطلاق الفصل الدراسي الجديد على منصة Code Spark! 🌟",
        "content": "نرحب بجميع الطلاب الكرام في الفصل الدراسي الجديد. تم تحديث الدروس العملية وإضافة تمارين تفاعلية جديدة في بايثون.",
        "target_audience": "ALL",
        "is_published": 1,
        "publish_date": now_str,
        "expiration_date": (now + timedelta(days=90)).isoformat(),
        "created_by": admin_id,
        "created_at": now_str
    })

    db_engine.insert("support_tickets", {
        "id": "tkt_001",
        "user_id": student_sub_id,
        "subject": "استفسار حول بيئة تشغيل بايثون على نظام ويندوز",
        "category": "technical",
        "priority": "MEDIUM",
        "status": "OPEN",
        "created_at": now_str,
        "updated_at": now_str
    })
    db_engine.insert("support_messages", {
        "id": uuid.uuid4().hex,
        "ticket_id": "tkt_001",
        "sender_id": student_sub_id,
        "message": "السلام عليكم، هل أحتاج لتثبيت بايثون على جهازي أم يمكنني الاعتماد كلياً على محرر الأكواد المدمج في المنصة؟",
        "is_staff_reply": 0,
        "created_at": now_str
    })

    print("✓ Seeding completed successfully!")
    print(f"  - Admin: admin / admin_password_2026")
    print(f"  - Assistant: assistant_ahmed / assistant_password_2026")
    print(f"  - Student (Subscribed): student_subscribed / student_password_2026")
    print(f"  - Student (Free): student_free / student_password_2026")
    print(f"  - Active Code: CS-SPARK-2026")
    print(f"  - Annual VIP Code: CS-ANNUAL-VIP")

if __name__ == "__main__":
    seed_database()
