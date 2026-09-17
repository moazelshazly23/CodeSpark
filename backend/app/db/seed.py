"""
CodeSpark - Production Database Seeder
Seeds baseline curriculum, default accounts, study files, plans, and persistent payment settings.
Only executes when the database has zero users to preserve all live production records.
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

    print("Seeding CodeSpark database with baseline curriculum and accounts...")
    now = datetime.now(timezone.utc)
    now_str = now.isoformat()
    one_year_later = (now + timedelta(days=365)).isoformat()

    if force:
        tables_to_clear = [
            "exercise_submissions", "exercises", "exam_attempts", "exam_questions",
            "exams", "question_bank", "lesson_progress", "study_files", "lessons",
            "units", "courses", "support_messages", "support_tickets",
            "notifications", "announcements", "activity_logs", "payment_requests",
            "subscriptions", "subscription_codes", "subscription_plans",
            "assistant_permissions", "student_stats", "platform_settings", "users"
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
                "xp": 150 if u["id"] == student_sub_id else 50,
                "streak_days": 3 if u["id"] == student_sub_id else 1,
                "last_active_date": now_str[:10],
                "study_time_minutes": 65.0 if u["id"] == student_sub_id else 10.0,
                "achievements_json": json.dumps(["بداية الرحلة 🚀", "المثابر الأول ⭐"] if u["id"] == student_sub_id else ["بداية الرحلة 🚀"], ensure_ascii=False),
                "updated_at": now_str
            })

    # 2. Assistant Permissions (Strictly controlled: assistant CANNOT change prices or payment settings)
    assistant_perms = [
        "students.read", "questions.read", "questions.create",
        "exams.read", "study_files.manage", "codes.monthly_generate"
    ]
    for p in assistant_perms:
        db_engine.insert("assistant_permissions", {
            "id": uuid.uuid4().hex,
            "user_id": assistant_id,
            "permission": p,
            "created_at": now_str
        })

    # 3. Subscription Plans
    plans = [
        {
            "id": "plan_1m",
            "name": "اشتراك شهري (30 يومًا)",
            "duration_months": 1,
            "price": 150.0,
            "features_json": json.dumps([
                "الوصول لجميع دروس بايثون",
                "محرر الأكواد التفاعلي وتصحيح التمارين",
                "تحميل مذكرات الشرح بصيغة PDF",
                "الدعم الفني والرد على الأسئلة البرمجية"
            ], ensure_ascii=False),
            "is_active": 1,
            "order_index": 1,
            "created_at": now_str,
            "updated_at": now_str
        },
        {
            "id": "plan_3m",
            "name": "اشتراك فصلي (الترم الدراسي)",
            "duration_months": 3,
            "price": 350.0,
            "features_json": json.dumps([
                "كل مميزات الاشتراك الشهري",
                "خصم 25% مقارنة بالاشتراك الشهري",
                "الوصول لجميع الامتحانات الدورية وبنك الأسئلة",
                "مراجعات ليلة الامتحان ونماذج الوزارة"
            ], ensure_ascii=False),
            "is_active": 1,
            "order_index": 2,
            "created_at": now_str,
            "updated_at": now_str
        },
        {
            "id": "plan_12m",
            "name": "الاشتراك السنوي الكامل (VIP)",
            "duration_months": 12,
            "price": 850.0,
            "features_json": json.dumps([
                "الوصول الكامل للمنصة طوال العام الدراسي",
                "كافة المسارات: بايثون، وتطوير الويب HTML/CSS/JS",
                "شهادة إتمام معتمدة من منصة كود سبارك",
                "متابعة شخصية مستمرة مع المساعدين التعليميين"
            ], ensure_ascii=False),
            "is_active": 1,
            "order_index": 3,
            "created_at": now_str,
            "updated_at": now_str
        }
    ]
    for pl in plans:
        db_engine.insert("subscription_plans", pl)

    # 4. Subscription Codes
    codes = [
        {
            "id": "code_001",
            "code": "CS-SPARK-2026",
            "code_hash": hash_code("CS-SPARK-2026"),
            "duration_days": 90,
            "duration_type": "3_MONTHS",
            "status": "ACTIVE",
            "batch_name": "أكواد أوائل الطلبة",
            "created_by": admin_id,
            "used_by": None,
            "used_at": None,
            "created_at": now_str,
            "expires_at": None
        },
        {
            "id": "code_002",
            "code": "CS-ANNUAL-VIP",
            "code_hash": hash_code("CS-ANNUAL-VIP"),
            "duration_days": 365,
            "duration_type": "12_MONTHS",
            "status": "USED",
            "batch_name": "أكواد التفعيل المباشر",
            "created_by": admin_id,
            "used_by": student_sub_id,
            "used_at": now_str,
            "created_at": now_str,
            "expires_at": None
        },
        {
            "id": "code_003",
            "code": "CS-MONTHLY-FREE",
            "code_hash": hash_code("CS-MONTHLY-FREE"),
            "duration_days": 30,
            "duration_type": "1_MONTH",
            "status": "ACTIVE",
            "batch_name": "كود ترويجي تجريبي",
            "created_by": assistant_id,
            "used_by": None,
            "used_at": None,
            "created_at": now_str,
            "expires_at": None
        }
    ]
    for c in codes:
        db_engine.insert("subscription_codes", c)

    # 5. Active Subscription for student_subscribed
    db_engine.insert("subscriptions", {
        "id": "sub_001",
        "user_id": student_sub_id,
        "code": "CS-ANNUAL-VIP",
        "plan_id": "plan_12m",
        "plan_name": "الاشتراك السنوي الكامل (VIP)",
        "starts_at": now_str,
        "expires_at": one_year_later,
        "is_active": 1,
        "is_lifetime": 0,
        "created_at": now_str,
        "updated_at": now_str
    })

    # 6. Courses (Subjects)
    course_id = "crs_py_001"
    db_engine.insert("courses", {
        "id": course_id,
        "title": "منهج البرمجة وعلوم الحاسب للمرحلة الثانوية (بايثون)",
        "description": "المنهج المتكامل لتعليم التفكير البرمجي ولغة بايثون وتطوير تطبيقات الويب لطلاب المرحلة الثانوية في مصر.",
        "thumbnail_url": "/assets/branding/codespark-icon.svg",
        "academic_term": "العام الدراسي الكامل",
        "order_index": 1,
        "is_published": 1,
        "created_at": now_str,
        "updated_at": now_str
    })

    # 7. Units
    unit1_id = "unt_001"
    unit2_id = "unt_002"
    db_engine.insert("units", {
        "id": unit1_id,
        "course_id": course_id,
        "title": "الوحدة الأولى: أساسيات لغة بايثون والمتغيرات",
        "description": "مدخل إلى بيئة البرمجة، دالة الطباعة print، المتغيرات، وأنواع البيانات الأساسية.",
        "order_index": 1,
        "is_published": 1,
        "created_at": now_str,
        "updated_at": now_str
    })
    db_engine.insert("units", {
        "id": unit2_id,
        "course_id": course_id,
        "title": "الوحدة الثانية: جمل التحكم الشرطية والمنطق البرمجي",
        "description": "اتخاذ القرارات البرمجية عبر if, elif, else والمعاملات المنطقية والمقارنات.",
        "order_index": 2,
        "is_published": 1,
        "created_at": now_str,
        "updated_at": now_str
    })

    # 8. Lessons
    les1_id = "les_001"
    les2_id = "les_002"
    les3_id = "les_003"
    db_engine.insert("lessons", {
        "id": les1_id,
        "unit_id": unit1_id,
        "title": "الدرس الأول: مقدمة إلى بايثون وأمر الطباعة",
        "description": "تعلم كيفية كتابة أول كود برمجي بلغة بايثون باستخدام دالة print() وعرض النصوص.",
        "content_markdown": """# الدرس الأول: مرحباً بك في عالم البرمجة مع CodeSpark ⚡

تعتبر لغة بايثون (Python) من أقوى وأسهل لغات البرمجة في العالم، وهي اللغة المعتمدة في المناهج الحديثة للمرحلة الثانوية.

### دالة الطباعة الأساسية:
في بايثون، نستخدم الدالة `print()` لطباعة المخرجات على الشاشة.

```python
# طباعة نص بسيط
print("مرحباً بك في منصة CodeSpark!")
print(10 + 25)
```

**ملاحظات هامة:**
1. النصوص يجب أن توضع دائماً بين علامتي تنصيص `""` أو `''`.
2. العمليات الحسابية والأرقام لا تحتاج لعلامات تنصيص.
""",
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
        "title": "الدرس الثاني: المتغيرات وأنواع البيانات (Data Types)",
        "description": "فهم مفهوم المتغيرات، النصوص (str)، الأرقام الصحيحة (int)، والأرقام العشرية (float).",
        "content_markdown": """# الدرس الثاني: المتغيرات وأنواع البيانات

المتغير هو مكان في ذاكرة الحاسب يتم تخزين قيمة بداخله لاستخدامها لاحقاً.

```python
# تعريف متغيرات
student_name = "معاذ"
grade = 11
score = 98.5
is_passed = True

print(f"الطالب: {student_name}، درجته: {score}")
```
""",
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
        "title": "الدرس الثالث: الشروط البرمجية (if - elif - else)",
        "description": "التحكم في مسار تنفيذ البرنامج بناءً على تحقق شروط معينة.",
        "content_markdown": """# الدرس الثالث: الشروط البرمجية

نستخدم الشروط لاتخاذ قرارات داخل البرنامج:

```python
score = 85

if score >= 90:
    print("تقدير: ممتاز")
elif score >= 75:
    print("تقدير: جيد جداً")
else:
    print("بحاجة لمزيد من المذاكرة")
```
""",
        "video_type": "youtube",
        "video_url": "https://www.youtube.com/watch?v=kqtD5dpn9C8",
        "duration_minutes": 25,
        "order_index": 1,
        "is_free": 0,
        "is_published": 1,
        "created_at": now_str,
        "updated_at": now_str
    })

    # 9. Study Files ("الملفات الدراسية")
    db_engine.insert("study_files", {
        "id": "file_001",
        "title": "مذكرة الدرس الأول: مدخل بايثون الشامل (PDF)",
        "description": "ملف PDF يحتوي على شرح الدروس والأمثلة التوضيحية للوحدة الأولى من المنهج المدرسي.",
        "source_type": "google_drive",
        "external_url": "https://drive.google.com/file/d/1vcuy3r_9zImgjTBAq7lLY-lrpQR0duUIMfShV61eyYA/view",
        "file_name": "python_lesson1_notes.pdf",
        "mime_type": "application/pdf",
        "file_size": 2560000,
        "course_id": course_id,
        "unit_id": unit1_id,
        "lesson_id": les1_id,
        "visibility": "PUBLIC",
        "is_published": 1,
        "uploaded_by": admin_id,
        "created_at": now_str,
        "updated_at": now_str
    })

    db_engine.insert("study_files", {
        "id": "file_002",
        "title": "كتاب التمارين البرمجية وبنك المسائل للمرحلة الثانوية",
        "description": "مجموعة تدريبات برمجية وتحديات مع حلولها النموذجية لترسيخ المفاهيم.",
        "source_type": "google_drive",
        "external_url": "https://drive.google.com/file/d/1ukIQxG9lBQA2pat_54vIbCvHm4i9I5Io/view",
        "file_name": "codespark_practice_book.pdf",
        "mime_type": "application/pdf",
        "file_size": 4120000,
        "course_id": course_id,
        "unit_id": unit1_id,
        "lesson_id": les2_id,
        "visibility": "PUBLIC",
        "is_published": 1,
        "uploaded_by": admin_id,
        "created_at": now_str,
        "updated_at": now_str
    })

    # 10. Exercises
    ex1_id = "ex_001"
    db_engine.insert("exercises", {
        "id": ex1_id,
        "lesson_id": les1_id,
        "title": "تمرين 1: طباعة رسالة الترحيب في بايثون",
        "instructions_markdown": "اكتب كود بايثون يقوم بطباعة العبارة التالية بدقة: `Hello, CodeSpark!`",
        "starter_code": "# اكتب الكود هنا لطباعة رسالة الترحيب\nprint(\"Hello, CodeSpark!\")",
        "solution_code": "print(\"Hello, CodeSpark!\")",
        "language": "python",
        "test_cases_json": json.dumps([{"input": "", "expected": "Hello, CodeSpark!"}], ensure_ascii=False),
        "expected_output": "Hello, CodeSpark!",
        "points": 10,
        "difficulty": "easy",
        "order_index": 1,
        "is_published": 1,
        "created_at": now_str,
        "updated_at": now_str
    })

    # 11. Question Bank
    q1_id = "qb_001"
    q2_id = "qb_002"
    q3_id = "qb_003"
    db_engine.insert("question_bank", {
        "id": q1_id,
        "lesson_id": les1_id,
        "unit_id": unit1_id,
        "question_type": "multiple_choice",
        "question_text": "ما هي الدالة المدمجة في لغة بايثون المستخدمة لعرض البيانات والمخرجات على الشاشة؟",
        "options_json": json.dumps([
            {"id": "opt1", "text": "echo()"},
            {"id": "opt2", "text": "print()"},
            {"id": "opt3", "text": "console.log()"},
            {"id": "opt4", "text": "write()"}
        ], ensure_ascii=False),
        "correct_answer": "opt2",
        "explanation": "الدالة print() هي الدالة القياسية المدمجة في لغة بايثون لطباعة النصوص والمخرجات.",
        "points": 5.0,
        "difficulty": "easy",
        "is_active": 1,
        "created_at": now_str,
        "updated_at": now_str
    })

    db_engine.insert("question_bank", {
        "id": q2_id,
        "lesson_id": les1_id,
        "unit_id": unit1_id,
        "question_type": "true_false",
        "question_text": "هل لغة بايثون حساسة لحالة الأحرف (Case-Sensitive) في تسمية المتغيرات والدوال؟",
        "options_json": json.dumps([
            {"id": "true", "text": "صح (True)"},
            {"id": "false", "text": "خطأ (False)"}
        ], ensure_ascii=False),
        "correct_answer": "true",
        "explanation": "نعم، بايثون حساسة لحالة الأحرف، فالمتغير Age يختلف تماماً عن age.",
        "points": 5.0,
        "difficulty": "easy",
        "is_active": 1,
        "created_at": now_str,
        "updated_at": now_str
    })

    db_engine.insert("question_bank", {
        "id": q3_id,
        "lesson_id": les2_id,
        "unit_id": unit1_id,
        "question_type": "multiple_choice",
        "question_text": "ما هو نوع البيانات الناتج عن القيمة 25.5 في بايثون؟",
        "options_json": json.dumps([
            {"id": "opt1", "text": "int (صحيح)"},
            {"id": "opt2", "text": "float (عشري)"},
            {"id": "opt3", "text": "str (نصي)"},
            {"id": "opt4", "text": "bool (منطقي)"}
        ], ensure_ascii=False),
        "correct_answer": "opt2",
        "explanation": "الأرقام التي تحتوي على علامة عشرية يتم تصنيفها كـ float في بايثون.",
        "points": 5.0,
        "difficulty": "easy",
        "is_active": 1,
        "created_at": now_str,
        "updated_at": now_str
    })

    # 12. Exams
    exam1_id = "exm_001"
    db_engine.insert("exams", {
        "id": exam1_id,
        "title": "امتحان التقييم الأسبوعي للوحدة الأولى",
        "description": "اختبار سريع لتقييم فهم أساسيات بايثون والمتغيرات وأمر الطباعة.",
        "course_id": course_id,
        "unit_id": unit1_id,
        "duration_minutes": 20,
        "passing_score": 70.0,
        "is_published": 1,
        "created_by": admin_id,
        "created_at": now_str,
        "updated_at": now_str
    })

    db_engine.insert("exam_questions", {
        "id": uuid.uuid4().hex,
        "exam_id": exam1_id,
        "question_id": q1_id,
        "points": 5.0,
        "order_index": 1
    })
    db_engine.insert("exam_questions", {
        "id": uuid.uuid4().hex,
        "exam_id": exam1_id,
        "question_id": q2_id,
        "points": 5.0,
        "order_index": 2
    })
    db_engine.insert("exam_questions", {
        "id": uuid.uuid4().hex,
        "exam_id": exam1_id,
        "question_id": q3_id,
        "points": 5.0,
        "order_index": 3
    })

    # 13. Platform Settings (Vodafone Cash + InstaPay persistent config)
    settings_data = {
        "platform_name": "CodeSpark",
        "academic_subject": "البرمجة لطلاب المرحلة الثانوية",
        "vodafone_cash": "+20159159038",
        "payment_phone": "+20159159038",
        "instapay_phone": "+20159159038",
        "instapay_link": "https://ipn.eg/S/moazasem/instapay/27DsGj",
        "contact_phone": "+20159159038",
        "offers_visible": True,
        "offer_banner_text": "عروض اشتراك الفصل الدراسي الجديد متاحة الآن! خصم 20% لفترة محدودة ⚡",
        "special_offers": "احصل على اشتراك الفصل الدراسي بالكامل مع مذكرات المنهج وبنك الأسئلة التفاعلي."
    }
    db_engine.insert("platform_settings", {
        "key": "general",
        "value_json": json.dumps(settings_data, ensure_ascii=False),
        "description": "الإعدادات العامة وطرق الدفع والاشتراك في المنصة",
        "updated_at": now_str
    })

    # 14. Announcements
    db_engine.insert("announcements", {
        "id": "ann_001",
        "title": "مرحباً بكم في منصة CodeSpark التعليمية لطلاب المرحلة الثانوية! ⚡",
        "content": "يسرنا إطلاق منصة CodeSpark بحلتها الجديدة لتعليم منهج البرمجة لطلاب الثانوية. يمكنكم الآن حضور الدروس التجريبية والتفاعل مع بيئة الأكواد.",
        "is_urgent": 1,
        "is_published": 1,
        "author_id": admin_id,
        "created_at": now_str,
        "updated_at": now_str
    })
    db_engine.insert("announcements", {
        "id": "ann_002",
        "title": "فتح باب الاشتراك في الفصل الدراسي ومجموعات المتابعة البرمجية",
        "content": "تم تفعيل استقبال طلبات الاشتراك عبر فودافون كاش وإنستاباي. لتفعيل حسابك، يرجى التوجه لصفحة الاشتراكات أو إدخال كود التفعيل.",
        "is_urgent": 0,
        "is_published": 1,
        "author_id": admin_id,
        "created_at": now_str,
        "updated_at": now_str
    })

    # 15. Initial Notification for students
    db_engine.insert("notifications", {
        "id": uuid.uuid4().hex,
        "user_id": student_sub_id,
        "title": "تم تفعيل اشتراكك السنوي بنجاح! 🎓",
        "message": "حسابك الآن مفعل بالكامل. يمكنك مشاهدة جميع الدروس وحل التمارين التفاعلية.",
        "type": "success",
        "is_read": 0,
        "action_url": "/student/courses",
        "created_at": now_str
    })
    db_engine.insert("notifications", {
        "id": uuid.uuid4().hex,
        "user_id": student_free_id,
        "title": "مرحباً بك في CodeSpark! 🚀",
        "message": "ابدأ الآن بمشاهدة الدرس الأول مجاناً وتجربة بيئة كتابة الأكواد.",
        "type": "info",
        "is_read": 0,
        "action_url": "/student/courses",
        "created_at": now_str
    })

    print("✓ CodeSpark database seeded successfully with complete persistent baseline.")

if __name__ == "__main__":
    force = "--force" in sys.argv
    seed_database(force=force)
