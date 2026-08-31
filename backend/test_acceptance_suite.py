"""
Code Spark - Phase 4: Production Database Acceptance Test Suite
Comprehensive testing covering all 10 Required Acceptance Tests + Database Migration & RBAC.
"""

import unittest
import json
import time
import os
import sys
import datetime
from pathlib import Path

# Ensure backend package is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, init_db, check_db_health, get_db_type
from app.seed_data import seed_database

class CodeSparkProductionAcceptanceTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Initialize database with clean demo seed data."""
        seed_database(force_refresh=True)
        cls.client = TestClient(app)

    # --------------------------------------------------------------------------
    # Database Connection & Health Check
    # --------------------------------------------------------------------------
    def test_01_health_check_database_connectivity(self):
        """Test GET /api/health and GET /health reporting live database status."""
        for endpoint in ["/api/health", "/health"]:
            res = self.client.get(endpoint)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["status"], "ok")
            self.assertEqual(data["database"], "ok")
            self.assertEqual(data["platform"], "Code Spark")
            self.assertIn("engine", data)
            self.assertIn("version", data)

    # --------------------------------------------------------------------------
    # Required Acceptance Test 1: Register Student -> Database -> User Exists
    # --------------------------------------------------------------------------
    def test_02_register_student_persistence(self):
        """Test 1: Student registration with validation and relational persistence."""
        # 1. Validation check for short phone
        bad_res = self.client.post("/api/auth/register", json={
            "name": "طالب تجريبي",
            "phone": "010123",
            "parent_phone": "01099998888",
            "password": "secure_password_123"
        })
        self.assertEqual(bad_res.status_code, 400)
        self.assertIn("رقم الهاتف", bad_res.json()["detail"])

        # 2. Validation check for matching parent & student phone
        same_phone_res = self.client.post("/api/auth/register", json={
            "name": "طالب تجريبي",
            "phone": "01055554444",
            "parent_phone": "01055554444",
            "password": "secure_password_123"
        })
        self.assertEqual(same_phone_res.status_code, 400)

        # 3. Successful Registration (No section / stream required)
        reg_payload = {
            "name": "زياد طارق الشناوي",
            "phone": "01098765432",
            "parent_phone": "01198765432",
            "email": "ziad.tareq@codespark.edu.eg",
            "password": "secure_student_pass_2026",
            "confirm_password": "secure_student_pass_2026",
            "grade": "الصف الأول الثانوي",
            "subscription_code": "SPARK-2026"
        }
        res = self.client.post("/api/auth/register", json=reg_payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("token", data)
        self.assertEqual(data["user"]["phone"], "01098765432")

        # 4. Verify directly in Database
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id, name, email, phone, role, status FROM users WHERE phone = ?", ("01098765432",))
            user_row = cur.fetchone()
            self.assertIsNotNone(user_row)
            self.assertEqual(user_row["name"], "زياد طارق الشناوي")
            self.assertEqual(user_row["email"], "ziad.tareq@codespark.edu.eg")
            self.assertEqual(user_row["role"], "student")
            self.assertEqual(user_row["status"], "active")

            # Check linked student profile
            cur.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user_row["id"],))
            sp_row = cur.fetchone()
            self.assertIsNotNone(sp_row)
            self.assertEqual(sp_row["parent_phone"], "01198765432")
            self.assertEqual(sp_row["grade"], "الصف الأول الثانوي")

    # --------------------------------------------------------------------------
    # Required Acceptance Test 2: Login -> JWT -> /auth/me & /api/student/me
    # --------------------------------------------------------------------------
    def test_03_login_jwt_auth_me(self):
        """Test 2: Student login returning valid JWT and fetching /auth/me."""
        res = self.client.post("/api/auth/login", json={
            "identifier": "01098765432",
            "password": "secure_student_pass_2026",
            "remember": True
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        token = data["token"]

        # Validate Session through /api/auth/me
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        user_info = me_res.json()["user"]
        self.assertEqual(user_info["phone"], "01098765432")
        self.assertEqual(user_info["role"], "student")

        # Validate Profile through /api/student/profile
        st_prof_res = self.client.get("/api/student/profile", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(st_prof_res.status_code, 200)
        prof_info = st_prof_res.json()["profile"]
        self.assertEqual(prof_info["name"], "زياد طارق الشناوي")

    # --------------------------------------------------------------------------
    # Required Acceptance Test 3: Admin Login -> Admin endpoint -> 200
    # --------------------------------------------------------------------------
    def test_04_admin_login_access_control(self):
        """Test 3: Admin authentication granting access (200 OK) to Admin endpoints."""
        admin_login = self.client.post("/api/auth/demo-login?role=admin")
        self.assertEqual(admin_login.status_code, 200)
        admin_token = admin_login.json()["token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Check Admin Analytics
        analytics_res = self.client.get("/api/admin/analytics", headers=admin_headers)
        self.assertEqual(analytics_res.status_code, 200)
        self.assertTrue(analytics_res.json()["success"])
        self.assertIn("totalStudents", analytics_res.json()["analytics"])

        # Check Admin Students List
        students_res = self.client.get("/api/admin/students", headers=admin_headers)
        self.assertEqual(students_res.status_code, 200)

    # --------------------------------------------------------------------------
    # Required Acceptance Test 4: Student JWT -> Admin endpoint -> 403 Forbidden
    # --------------------------------------------------------------------------
    def test_05_student_rbac_forbidden_on_admin(self):
        """Test 4: Strict RBAC ensuring students are blocked with 403 Forbidden on all admin routes."""
        login_res = self.client.post("/api/auth/login", json={
            "identifier": "01098765432",
            "password": "secure_student_pass_2026"
        })
        student_token = login_res.json()["token"]
        student_headers = {"Authorization": f"Bearer {student_token}"}

        # 1. Admin Students
        res1 = self.client.get("/api/admin/students", headers=student_headers)
        self.assertEqual(res1.status_code, 403)

        # 2. Admin Analytics
        res2 = self.client.get("/api/admin/analytics", headers=student_headers)
        self.assertEqual(res2.status_code, 403)

        # 3. Admin Unit Creation
        res3 = self.client.post("/api/admin/units", json={"title": "Unauthorized Unit"}, headers=student_headers)
        self.assertEqual(res3.status_code, 403)

        # 4. Admin Settings
        res4 = self.client.get("/api/admin/settings", headers=student_headers)
        self.assertEqual(res4.status_code, 403)

    # --------------------------------------------------------------------------
    # Required Acceptance Test 5: Create Unit -> Database -> Retrieve Unit
    # --------------------------------------------------------------------------
    def test_06_admin_create_unit_retrieval(self):
        """Test 5: Admin creates Unit in PostgreSQL and verifies retrieval."""
        admin_login = self.client.post("/api/auth/demo-login?role=admin")
        admin_token = admin_login.json()["token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        unit_payload = {
            "title": "الوحدة السادسة — الذكاء الاصطناعي وتعلم الآلة",
            "description": "مقدمة لمفاهيم تعلم الآلة والشبكات العصبية لطلاب الثانوية",
            "icon": "cpu",
            "published": True,
            "is_published": True
        }
        create_res = self.client.post("/api/admin/units", json=unit_payload, headers=admin_headers)
        self.assertEqual(create_res.status_code, 200)
        u_id = create_res.json()["unit_id"]

        # Retrieve unit via Admin / API
        get_res = self.client.get(f"/api/units/{u_id}", headers=admin_headers)
        self.assertEqual(get_res.status_code, 200)
        unit_data = get_res.json()["unit"]
        self.assertEqual(unit_data["title"], "الوحدة السادسة — الذكاء الاصطناعي وتعلم الآلة")
        self.assertEqual(unit_data["icon"], "cpu")

    # --------------------------------------------------------------------------
    # Required Acceptance Test 6: Create Lesson -> Database -> Student Sees Lesson
    # --------------------------------------------------------------------------
    def test_07_admin_create_lesson_student_visible(self):
        """Test 6: Admin creates Lesson and student immediately accesses it."""
        admin_login = self.client.post("/api/auth/demo-login?role=admin")
        admin_token = admin_login.json()["token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Get units list
        curr_res = self.client.get("/api/units")
        unit_id = curr_res.json()["units"][0]["id"]

        lesson_payload = {
            "unit_id": unit_id,
            "title": "الدرس التطبيقي: معالجة النصوص وحساب التردد",
            "description": "شرح عملي لبناء برنامج يقوم بحساب تكرار الكلمات",
            "duration": "25 دقيقة",
            "type": "video",
            "video_url": "https://www.youtube.com/embed/sample_lesson_ai",
            "content_html": "<p>محتوى الدرس التطبيقي حول القواميس في لغة بايثون...</p>",
            "code_example": "text = 'code spark python'\nprint(len(text.split()))",
            "published": True,
            "is_published": True
        }
        create_res = self.client.post("/api/admin/lessons", json=lesson_payload, headers=admin_headers)
        self.assertEqual(create_res.status_code, 200)
        l_id = create_res.json()["lesson_id"]

        # Student queries the lesson
        st_login = self.client.post("/api/auth/login", json={
            "identifier": "01098765432",
            "password": "secure_student_pass_2026"
        })
        st_token = st_login.json()["token"]
        st_headers = {"Authorization": f"Bearer {st_token}"}

        st_lesson_res = self.client.get(f"/api/student/lessons/{l_id}", headers=st_headers)
        self.assertEqual(st_lesson_res.status_code, 200)
        st_lesson_data = st_lesson_res.json()["lesson"]
        self.assertEqual(st_lesson_data["title"], "الدرس التطبيقي: معالجة النصوص وحساب التردد")
        self.assertIn("code spark python", st_lesson_data.get("code_example", "") or st_lesson_data.get("codeExample", ""))

    # --------------------------------------------------------------------------
    # Required Acceptance Test 7: Complete Lesson -> Progress Saved
    # --------------------------------------------------------------------------
    def test_08_student_complete_lesson_progress_saved(self):
        """Test 7: Student completes lesson, saves bookmark/completion, and verifies progress state."""
        st_login = self.client.post("/api/auth/login", json={
            "identifier": "01098765432",
            "password": "secure_student_pass_2026"
        })
        st_token = st_login.json()["token"]
        st_headers = {"Authorization": f"Bearer {st_token}"}

        # 1. Update Video Position
        vid_res = self.client.post("/api/progress/video", json={
            "lesson_id": "lesson_1_1",
            "last_position": 420,
            "progress": 70
        }, headers=st_headers)
        self.assertEqual(vid_res.status_code, 200)

        # 2. Mark Lesson Completed
        comp_res = self.client.post("/api/student/lessons/lesson_1_1/progress", json={
            "progress": 100,
            "completed": True,
            "last_position": 600
        }, headers=st_headers)
        self.assertEqual(comp_res.status_code, 200)

        # 3. Verify in Student Progress API
        prog_res = self.client.get("/api/student/progress", headers=st_headers)
        self.assertEqual(prog_res.status_code, 200)
        prog_data = prog_res.json()["progress"]
        self.assertIn("lesson_1_1", prog_data["completedLessons"])

        # 4. Verify in Database
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
            SELECT completed, progress, last_position FROM lesson_progress
            WHERE student_id = ? AND lesson_id = 'lesson_1_1'
            """, (st_login.json()["user"]["id"],))
            lp = cur.fetchone()
            self.assertIsNotNone(lp)
            self.assertEqual(lp["completed"], 1)
            self.assertEqual(lp["progress"], 100)

    # --------------------------------------------------------------------------
    # Required Acceptance Test 8: Exam -> Attempt Created
    # --------------------------------------------------------------------------
    def test_09_student_exam_attempt_lifecycle(self):
        """Test 8: Student opens and begins exam; verify no answers leak before submission."""
        st_login = self.client.post("/api/auth/login", json={
            "identifier": "01098765432",
            "password": "secure_student_pass_2026"
        })
        st_token = st_login.json()["token"]
        st_headers = {"Authorization": f"Bearer {st_token}"}

        # Fetch exam
        exam_res = self.client.get("/api/exams/exam_unit_1", headers=st_headers)
        self.assertEqual(exam_res.status_code, 200)
        exam_data = exam_res.json()
        self.assertTrue(exam_data["success"])
        self.assertEqual(exam_data["exam"]["id"], "exam_unit_1")
        self.assertGreater(len(exam_data["questions"]), 0)

        # CRITICAL SECURITY CHECK: Ensure correct answers and explanations are scrubbed
        for q in exam_data["questions"]:
            self.assertNotIn("correct_answer", q)
            self.assertNotIn("correctAnswer", q)
            self.assertNotIn("explanation", q)

    # --------------------------------------------------------------------------
    # Required Acceptance Test 9: Exam Submission -> Server Grading -> Result Saved
    # --------------------------------------------------------------------------
    def test_10_exam_submission_server_grading_result(self):
        """Test 9: Submit answers, server-side grading, strengths/weaknesses computation, and result storage."""
        st_login = self.client.post("/api/auth/login", json={
            "identifier": "01098765432",
            "password": "secure_student_pass_2026"
        })
        st_token = st_login.json()["token"]
        st_headers = {"Authorization": f"Bearer {st_token}"}

        # Submit exam answers
        answers_payload = {
            "exam_id": "exam_unit_1",
            "answers": {
                "q_u1_1": "1",
                "q_u1_2": "0",
                "q_u1_3": "0",
                "q_u1_4": "1",
                "q_u1_5": "0"
            },
            "time_spent_seconds": 780
        }
        sub_res = self.client.post("/api/exams/submit", json=answers_payload, headers=st_headers)
        self.assertEqual(sub_res.status_code, 200)
        res_data = sub_res.json()
        self.assertTrue(res_data["success"])
        self.assertIn("score", res_data)
        self.assertIn("percentage", res_data)
        self.assertIn("passed", res_data)
        self.assertIn("strengths", res_data)
        self.assertIn("weaknesses", res_data)
        attempt_id = res_data["attemptId"]

        # Fetch attempt breakdown
        att_res = self.client.get(f"/api/exams/attempts/{attempt_id}", headers=st_headers)
        self.assertEqual(att_res.status_code, 200)
        att_data = att_res.json()["result"]
        self.assertEqual(att_data["id"], attempt_id)
        self.assertIn("questions", att_data)

    # --------------------------------------------------------------------------
    # Required Acceptance Test 10: Logout / Login -> Data Persists
    # --------------------------------------------------------------------------
    def test_11_cross_device_and_logout_login_persistence(self):
        """Test 10: Cross-session and cross-device persistence across logout/login cycle."""
        # Device 1: Mark another lesson
        st_login_1 = self.client.post("/api/auth/login", json={
            "identifier": "01098765432",
            "password": "secure_student_pass_2026"
        })
        token_1 = st_login_1.json()["token"]
        headers_1 = {"Authorization": f"Bearer {token_1}"}

        self.client.post("/api/student/lessons/lesson_1_2/progress", json={
            "progress": 100,
            "completed": True,
            "last_position": 300
        }, headers=headers_1)

        # Logout simulation (client clears token)
        # Device 2: New Login
        st_login_2 = self.client.post("/api/auth/login", json={
            "identifier": "01098765432",
            "password": "secure_student_pass_2026"
        })
        token_2 = st_login_2.json()["token"]
        headers_2 = {"Authorization": f"Bearer {token_2}"}

        # Verify progress is preserved
        prog_res_2 = self.client.get("/api/student/progress", headers=headers_2)
        self.assertEqual(prog_res_2.status_code, 200)
        completed_lessons = prog_res_2.json()["progress"]["completedLessons"]
        self.assertIn("lesson_1_1", completed_lessons)
        self.assertIn("lesson_1_2", completed_lessons)

    # --------------------------------------------------------------------------
    # Additional Security, Sandbox, and Management Tests
    # --------------------------------------------------------------------------
    def test_12_password_security_pbkdf2_hashing(self):
        """Verify PBKDF2 salt and iteration security on stored user passwords."""
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT password_hash FROM users WHERE phone = '01098765432'")
            row = cur.fetchone()
            self.assertIsNotNone(row)
            pw_hash = row["password_hash"]
            self.assertTrue(pw_hash.startswith("pbkdf2_sha256$100000$"))
            self.assertNotIn("secure_student_pass_2026", pw_hash)

    def test_13_python_sandbox_security_enforcement(self):
        """Test sandboxed code execution and blocking of unsafe system operations."""
        # 1. Valid python code
        res_ok = self.client.post("/api/code/run", json={
            "code": "nums = [10, 20, 30]\nprint(sum(nums))"
        })
        self.assertEqual(res_ok.status_code, 200)
        self.assertTrue(res_ok.json()["success"])
        self.assertEqual(res_ok.json()["output"].strip(), "60")

        # 2. Block unsafe modules (os, subprocess, eval, open)
        for bad in ["import os\nos.system('echo bad')", "import subprocess", "open('/etc/passwd')"]:
            res_bad = self.client.post("/api/code/run", json={"code": bad})
            self.assertEqual(res_bad.status_code, 200)
            self.assertFalse(res_bad.json()["success"])
            err_msg = res_bad.json().get("error", "") + (res_bad.json().get("details") or "")
            self.assertTrue("غير مسموح" in err_msg or "محظور" in err_msg or "أمني" in err_msg)

    def test_14_support_tickets_academic_inquiry_flow(self):
        """Test student creates support ticket and admin replies."""
        st_login = self.client.post("/api/auth/login", json={
            "identifier": "01098765432",
            "password": "secure_student_pass_2026"
        })
        st_token = st_login.json()["token"]
        st_headers = {"Authorization": f"Bearer {st_token}"}

        # Create ticket
        t_res = self.client.post("/api/support/tickets", json={
            "subject": "استفسار عن جملة elif",
            "message": "متى استخدم elif بدلاً من if متعددة؟"
        }, headers=st_headers)
        self.assertEqual(t_res.status_code, 200)
        ticket_id = t_res.json()["ticket_id"]

        # Admin replies
        admin_login = self.client.post("/api/auth/demo-login?role=admin")
        admin_token = admin_login.json()["token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        reply_res = self.client.post(f"/api/support/tickets/{ticket_id}/reply", json={
            "reply": "نستخدم elif عند وجود شروط مترابطة بحيث إذا تحقق أحدها يتجاهل باقي الشروط."
        }, headers=admin_headers)
        self.assertEqual(reply_res.status_code, 200)

    def test_15_admin_full_management_analytics_and_settings(self):
        """Test Admin Student Management, Settings, and Question Bank CRUD."""
        admin_login = self.client.post("/api/auth/demo-login?role=admin")
        admin_token = admin_login.json()["token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Update Platform Settings
        put_settings = self.client.put("/api/admin/settings", json={
            "platform_name": "Code Spark Production",
            "academic_year": "2026/2027",
            "default_passing_score": 60
        }, headers=admin_headers)
        self.assertEqual(put_settings.status_code, 200)

        # 2. Add question to question bank
        q_res = self.client.post("/api/admin/questions", json={
            "question": "ما هي الدالة المستخدمة لإدخال البيانات من المستخدم؟",
            "type": "mcq",
            "difficulty": "easy",
            "score": 10,
            "correct_answer": "0",
            "options": ["input()", "print()", "get()", "read()"],
            "explanation": "دالة input() هي المسؤولة عن استقبال المدخلات من المستخدم."
        }, headers=admin_headers)
        self.assertEqual(q_res.status_code, 200)

    def test_16_student_registration_no_stream_or_section_required(self):
        """Test that student registration strictly works with only required fields (no section/stream)."""
        payload = {
            "name": "محمود إبراهيم الشناوي",
            "phone": "01099887766",
            "parent_phone": "01199887766",
            "email": "mahmoud.ibrahim@codespark.edu.eg",
            "password": "student_password_2026",
            "confirm_password": "student_password_2026",
            "grade": "الصف الثاني الثانوي",
            "subscription_code": "SPARK-SEC2"
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("token", data)
        self.assertEqual(data["user"]["name"], "محمود إبراهيم الشناوي")
        self.assertEqual(data["user"]["grade"], "الصف الثاني الثانوي")

        # Direct DB verification
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM student_profiles WHERE user_id = ?", (data["user"]["id"],))
            sp = cur.fetchone()
            self.assertIsNotNone(sp)
            self.assertEqual(sp["grade"], "الصف الثاني الثانوي")


    # --------------------------------------------------------------------------
    # Phase 5 Test 17: YouTube URL Extraction, Formatting & Embed Validation
    # --------------------------------------------------------------------------
    def test_17_youtube_url_extraction_and_embed_validation(self):
        """Verify accurate parsing of all YouTube URL formats and embed generation."""
        from app.youtube_utils import (
            extract_youtube_id, get_youtube_embed_url,
            get_youtube_thumbnail_url, validate_and_format_youtube
        )

        test_cases = [
            ("https://www.youtube.com/watch?v=kqtD5dpn9C8", "kqtD5dpn9C8"),
            ("https://youtu.be/kqtD5dpn9C8", "kqtD5dpn9C8"),
            ("https://www.youtube.com/embed/kqtD5dpn9C8", "kqtD5dpn9C8"),
            ("https://www.youtube-nocookie.com/embed/kqtD5dpn9C8", "kqtD5dpn9C8"),
            ("https://www.youtube.com/shorts/kqtD5dpn9C8", "kqtD5dpn9C8"),
            ("https://m.youtube.com/watch?v=kqtD5dpn9C8&feature=share", "kqtD5dpn9C8"),
            ("kqtD5dpn9C8", "kqtD5dpn9C8")
        ]

        for url, expected_id in test_cases:
            vid = extract_youtube_id(url)
            self.assertEqual(vid, expected_id, f"Failed for {url}")
            embed = get_youtube_embed_url(url)
            self.assertIn("https://www.youtube-nocookie.com/embed/kqtD5dpn9C8", embed)
            thumb = get_youtube_thumbnail_url(url)
            self.assertEqual(thumb, "https://img.youtube.com/vi/kqtD5dpn9C8/hqdefault.jpg")

        # Invalid URLs
        self.assertIsNone(extract_youtube_id("https://vimeo.com/12345678"))
        self.assertIsNone(extract_youtube_id("not_a_valid_url"))
        is_val, _, err = validate_and_format_youtube("https://vimeo.com/1234567")
        self.assertFalse(is_val)
        self.assertIsNotNone(err)

    # --------------------------------------------------------------------------
    # Phase 5 Test 18: Admin Creates Lesson with YouTube Video & Student Access
    # --------------------------------------------------------------------------
    def test_18_admin_create_lesson_with_youtube_video(self):
        """Verify Admin creates YouTube-based lesson and student views nocookie embed."""
        admin_token = self.client.post("/api/auth/demo-login?role=admin").json()["token"]
        student_token = self.client.post("/api/auth/demo-login?role=student").json()["token"]

        payload = {
            "unit_id": "unit_1",
            "number": 10,
            "title": "شرح المتغيرات وأنواع البيانات في بايثون",
            "description": "فيديو تفاعلي يوضح كيفية تعريف المتغيرات والأرقام والنصوص في بايثون",
            "duration": "25 دقيقة",
            "type": "video",
            "video_source": "youtube",
            "video_url": "https://www.youtube.com/watch?v=kqtD5dpn9C8",
            "content": "<p>مفاهيم المتغيرات الأساسية وأنواع البيانات في بايثون</p>",
            "published": True,
            "is_published": True
        }

        res = self.client.post("/api/lessons", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(res.status_code, 200)
        lesson_id = res.json()["lesson_id"]

        # Student accesses lesson
        s_res = self.client.get(f"/api/lessons/{lesson_id}", headers={"Authorization": f"Bearer {student_token}"})
        self.assertEqual(s_res.status_code, 200)
        l_data = s_res.json()["lesson"]
        self.assertEqual(l_data["video_source"], "youtube")
        self.assertEqual(l_data["video_id"], "kqtD5dpn9C8")
        self.assertIn("https://www.youtube-nocookie.com/embed/kqtD5dpn9C8", l_data["video_url"])
        self.assertIn("https://img.youtube.com/vi/kqtD5dpn9C8/hqdefault.jpg", l_data["thumbnail_url"])

    # --------------------------------------------------------------------------
    # Phase 5 Test 19: Direct Video Upload, Validation, and RBAC Security
    # --------------------------------------------------------------------------
    def test_19_admin_upload_video_and_storage_validation(self):
        """Verify admin direct video upload, MIME/size validation, and student blocking (403)."""
        admin_token = self.client.post("/api/auth/demo-login?role=admin").json()["token"]
        student_token = self.client.post("/api/auth/demo-login?role=student").json()["token"]

        fake_mp4_bytes = b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2mp41" + b"\x00" * 1024

        # 1. Student attempted upload -> 403 Forbidden
        s_res = self.client.post(
            "/api/admin/videos/upload",
            files={"file": ("intro.mp4", fake_mp4_bytes, "video/mp4")},
            headers={"Authorization": f"Bearer {student_token}"}
        )
        self.assertEqual(s_res.status_code, 403)

        # 2. Admin valid MP4 upload -> 200 OK
        a_res = self.client.post(
            "/api/admin/videos/upload",
            files={"file": ("python_intro_lesson.mp4", fake_mp4_bytes, "video/mp4")},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        self.assertEqual(a_res.status_code, 200)
        up_data = a_res.json()
        self.assertTrue(up_data["success"])
        video = up_data["video"]
        self.assertEqual(video["video_source"], "upload")
        self.assertEqual(video["mime_type"], "video/mp4")
        self.assertIn("storage_path", video)
        self.assertIn("video_url", video)

        # 3. Invalid file extension rejection
        bad_ext_res = self.client.post(
            "/api/admin/videos/upload",
            files={"file": ("malicious_script.exe", b"binarycontent", "application/octet-stream")},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        self.assertEqual(bad_ext_res.status_code, 400)

    # --------------------------------------------------------------------------
    # Phase 5 Test 20: Uploaded Video Streaming and HTTP 206 Partial Content Range
    # --------------------------------------------------------------------------
    def test_20_uploaded_video_streaming_and_range_requests(self):
        """Verify HTML5 video streaming with HTTP 206 Partial Content support for seeking."""
        admin_token = self.client.post("/api/auth/demo-login?role=admin").json()["token"]
        
        test_video_data = b"HEADER_MP4_DATA" + b"X" * 10000 + b"FOOTER"
        up_res = self.client.post(
            "/api/admin/videos/upload",
            files={"file": ("stream_test.mp4", test_video_data, "video/mp4")},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        self.assertEqual(up_res.status_code, 200)
        video_url = up_res.json()["video"]["video_url"]

        # 1. Full playback request (HTTP 200)
        stream_res = self.client.get(video_url)
        self.assertEqual(stream_res.status_code, 200)
        self.assertEqual(stream_res.headers.get("accept-ranges"), "bytes")
        self.assertEqual(int(stream_res.headers.get("content-length")), len(test_video_data))

        # 2. HTTP Range Request (HTTP 206 Partial Content for instant seeking)
        range_res = self.client.get(video_url, headers={"Range": "bytes=100-500"})
        self.assertEqual(range_res.status_code, 206)
        self.assertEqual(range_res.headers.get("accept-ranges"), "bytes")
        self.assertIn("bytes 100-500/", range_res.headers.get("content-range"))
        self.assertEqual(len(range_res.content), 401)

    # --------------------------------------------------------------------------
    # Phase 5 Test 21: Video Replacement and Storage Cleanup (No Orphaned Files)
    # --------------------------------------------------------------------------
    def test_21_video_replacement_and_storage_cleanup(self):
        """Verify old video file is cleanly deleted from storage after replacement."""
        from app.storage_service import storage_service
        admin_token = self.client.post("/api/auth/demo-login?role=admin").json()["token"]

        # 1. Upload Video A
        vA_res = self.client.post(
            "/api/admin/videos/upload",
            files={"file": ("video_A.mp4", b"VIDEO_A_CONTENT_DATA", "video/mp4")},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        path_A = vA_res.json()["video"]["storage_path"]
        url_A = vA_res.json()["video"]["video_url"]
        self.assertTrue(storage_service.local_provider.exists(path_A))

        # 2. Create Lesson with Video A
        lesson_res = self.client.post("/api/lessons", json={
            "unit_id": "unit_1",
            "title": "درس مع فيديو أول",
            "video_source": "upload",
            "video_url": url_A,
            "storage_path": path_A,
            "file_size": 21,
            "mime_type": "video/mp4"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        lesson_id = lesson_res.json()["lesson_id"]

        # 3. Upload Video B and Update Lesson (Replacing Video A)
        vB_res = self.client.post(
            "/api/admin/videos/upload",
            files={"file": ("video_B.mp4", b"VIDEO_B_UPDATED_DATA", "video/mp4")},
            data={"old_storage_path": path_A, "lesson_id": lesson_id},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        path_B = vB_res.json()["video"]["storage_path"]
        url_B = vB_res.json()["video"]["video_url"]

        self.client.put(f"/api/lessons/{lesson_id}", json={
            "video_source": "upload",
            "video_url": url_B,
            "storage_path": path_B,
            "file_size": 20,
            "mime_type": "video/mp4"
        }, headers={"Authorization": f"Bearer {admin_token}"})

        # 4. Verify Video A deleted and Video B exists
        self.assertFalse(storage_service.local_provider.exists(path_A))
        self.assertTrue(storage_service.local_provider.exists(path_B))

    # --------------------------------------------------------------------------
    # Phase 5 Test 22: Lesson Deletion Storage Cleanup
    # --------------------------------------------------------------------------
    def test_22_lesson_deletion_storage_cleanup(self):
        """Verify deleting a lesson purges its uploaded video from object storage."""
        from app.storage_service import storage_service
        admin_token = self.client.post("/api/auth/demo-login?role=admin").json()["token"]

        up_res = self.client.post(
            "/api/admin/videos/upload",
            files={"file": ("to_delete.mp4", b"TEMP_DATA_FOR_DELETION", "video/mp4")},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        path = up_res.json()["video"]["storage_path"]
        url = up_res.json()["video"]["video_url"]

        l_res = self.client.post("/api/lessons", json={
            "unit_id": "unit_1",
            "title": "درس مؤقت للحذف",
            "video_source": "upload",
            "video_url": url,
            "storage_path": path
        }, headers={"Authorization": f"Bearer {admin_token}"})
        l_id = l_res.json()["lesson_id"]

        self.assertTrue(storage_service.local_provider.exists(path))

        # Delete Lesson
        del_res = self.client.delete(f"/api/lessons/{l_id}", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(del_res.status_code, 200)

        # Verify storage file deleted
        self.assertFalse(storage_service.local_provider.exists(path))

    # --------------------------------------------------------------------------
    # Phase 5 Test 23: Video Playback Progress and Cross-Device Persistence
    # --------------------------------------------------------------------------
    def test_23_video_playback_progress_and_cross_device_persistence(self):
        """Verify student video playback bookmarking and cross-device resumption."""
        student_token = self.client.post("/api/auth/demo-login?role=student").json()["token"]

        # Student watches lesson 1_1 up to 142 seconds (65% progress)
        p_res = self.client.post("/api/progress/video", json={
            "lesson_id": "lesson_1_1",
            "last_position": 142,
            "progress": 65
        }, headers={"Authorization": f"Bearer {student_token}"})
        self.assertEqual(p_res.status_code, 200)

        # Device B / New Session: Student fetches lesson
        dev_b_res = self.client.get("/api/lessons/lesson_1_1", headers={"Authorization": f"Bearer {student_token}"})
        self.assertEqual(dev_b_res.status_code, 200)
        l_data = dev_b_res.json()["lesson"]
        self.assertEqual(l_data["lastPosition"], 142)
        self.assertEqual(l_data["progress"], 65)

    # --------------------------------------------------------------------------
    # Phase 5 Test 24: Database Relational Verification - No Video Binary in Postgres
    # --------------------------------------------------------------------------
    def test_24_database_relational_verification_no_video_blobs(self):
        """Verify database stores strictly metadata/references and zero video binary BLOBs."""
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id, title, video_source, video_provider, video_id, video_url, storage_path, file_size, mime_type FROM lessons LIMIT 5")
            rows = cur.fetchall()
            self.assertTrue(len(rows) > 0)
            for r in rows:
                row_dict = dict(r)
                # Ensure all values are metadata primitives (str, int, float, None)
                for k, v in row_dict.items():
                    self.assertTrue(
                        v is None or isinstance(v, (str, int, float, bool)),
                        f"Found non-primitive value in lesson column {k}: {type(v)}"
                    )
                    if isinstance(v, str):
                        # Ensure no massive base64 payload is stored in text fields
                        self.assertTrue(len(v) < 10000, f"Column {k} is suspiciously large ({len(v)} chars)")


def run_suite():
    suite = unittest.TestLoader().loadTestsFromTestCase(CodeSparkProductionAcceptanceTestSuite)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return result.wasSuccessful()

if __name__ == "__main__":
    success = run_suite()
    sys.exit(0 if success else 1)
