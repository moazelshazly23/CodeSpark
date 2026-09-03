from backend.tests.test_credentials import (
    apply_test_credentials_env, TEST_ADMIN_PASSWORD, TEST_ASSISTANT_PASSWORD, TEST_STUDENT_PASSWORD
)
"""
Code Spark — Comprehensive Production E2E & Security Test Suite
Verifies all critical educational flows, student journey, admin management,
anti-cheat protections, password recovery, sandboxed code execution, and data integrity.
"""

import sys
import unittest
import time
import json
import secrets
from pathlib import Path

# Ensure backend package and project root are in sys.path
_backend_dir = Path(__file__).resolve().parent
_project_root = _backend_dir.parent
for p in [str(_backend_dir), str(_project_root)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi.testclient import TestClient

try:
    from app.main import app
    from app.database import get_db, init_db
    from app.seed_data import seed_database
    from app.security import hash_password, verify_password
except ImportError:
    from backend.app.main import app
    from backend.app.database import get_db, init_db
    from backend.app.seed_data import seed_database
    from backend.app.security import hash_password, verify_password


class CodeSparkComprehensiveTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        apply_test_credentials_env()
        init_db()
        seed_database(force_refresh=True)
        cls.client = TestClient(app)

    def test_01_student_registration_and_jwt_profile(self):
        """Test student registration with unique phone/email and profile verification."""
        rnd = secrets.token_hex(4)
        student_data = {
            "name": f"طالب تجريبي {rnd}",
            "phone": f"010{secrets.randbelow(90000000) + 10000000}",
            "parent_phone": f"011{secrets.randbelow(90000000) + 10000000}",
            "password": "StrongPassword123!",
            "confirm_password": "StrongPassword123!",
            "email": f"test_{rnd}@student.codespark.edu.eg",
            "grade": "الصف الأول الثانوي",
            "subscription_code": "SPARK-2026"
        }
        res = self.client.post("/api/auth/register", json=student_data)
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("token", data)
        token = data["token"]

        # Verify /auth/me
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["user"]["role"], "student")

    def test_02_admin_login_and_analytics(self):
        """Test Admin login and analytics retrieval."""
        res = self.client.post("/api/auth/login", json={
            "identifier": "01099998888",
            "password": TEST_ADMIN_PASSWORD
        })
        self.assertEqual(res.status_code, 200, res.text)
        admin_token = res.json()["token"]

        # Admin fetches analytics
        an_res = self.client.get("/api/admin/analytics", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(an_res.status_code, 200)
        analytics = an_res.json()["analytics"]
        self.assertIn("totalStudents", analytics)
        self.assertIn("totalUnits", analytics)
        self.assertIn("totalLessons", analytics)

    def test_03_student_rbac_protection(self):
        """Test that student token is rejected with 403 Forbidden on all admin routes."""
        res = self.client.post("/api/auth/login", json={
            "identifier": "01012345678",
            "password": TEST_STUDENT_PASSWORD
        })
        student_token = res.json()["token"]
        headers = {"Authorization": f"Bearer {student_token}"}

        admin_endpoints = [
            ("GET", "/api/admin/students"),
            ("GET", "/api/admin/analytics"),
            ("POST", "/api/admin/units"),
            ("POST", "/api/admin/lessons"),
            ("POST", "/api/admin/questions"),
            ("POST", "/api/admin/exams"),
            ("POST", "/api/admin/quizzes"),
            ("GET", "/api/admin/results")
        ]

        for method, path in admin_endpoints:
            if method == "GET":
                r = self.client.get(path, headers=headers)
            else:
                r = self.client.post(path, json={"title": "test"}, headers=headers)
            self.assertEqual(r.status_code, 403, f"Expected 403 on {method} {path}, got {r.status_code}")

    def test_04_anti_cheat_question_and_exam_redaction(self):
        """Test that students CANNOT see correct_answer or explanation prior to submitting."""
        res = self.client.post("/api/auth/login", json={
            "identifier": "01012345678",
            "password": TEST_STUDENT_PASSWORD
        })
        student_token = res.json()["token"]
        student_headers = {"Authorization": f"Bearer {student_token}"}

        # 1. Questions API
        q_res = self.client.get("/api/questions", headers=student_headers)
        self.assertEqual(q_res.status_code, 200)
        for q in q_res.json()["questions"]:
            self.assertNotIn("correct_answer", q, "Student must not see correct_answer in /api/questions")
            self.assertNotIn("correctAnswer", q, "Student must not see correctAnswer in /api/questions")
            self.assertNotIn("explanation", q, "Student must not see explanation before answering")
            for opt in q.get("optionsDetailed", []):
                self.assertFalse(opt.get("isCorrect"), "Option isCorrect must be False/redacted for student")

        # 2. Exams API
        exam_res = self.client.get("/api/exams/exam_unit_1", headers=student_headers)
        self.assertEqual(exam_res.status_code, 200)
        for q in exam_res.json()["exam"]["questions"]:
            self.assertNotIn("correct_answer", q, "Student must not see correct_answer in exam detail")
            self.assertNotIn("correctAnswer", q, "Student must not see correctAnswer in exam detail")
            self.assertNotIn("explanation", q, "Student must not see explanation in exam detail")

    def test_05_code_execution_sandbox_security_and_timeout(self):
        """Test Python sandbox blocking forbidden modules and handling infinite loops."""
        # 1. Safe execution
        safe_code = "a = 10\nb = 20\nprint('SUM:', a + b)"
        res = self.client.post("/api/code/run", json={"code": safe_code})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("SUM: 30", data["output"])

        # 2. Block forbidden modules
        unsafe_modules = [
            "import os\nos.listdir('.')",
            "import sys\nprint(sys.version)",
            "import subprocess\nsubprocess.run(['ls'])",
            "import socket\ns = socket.socket()",
            "open('test.txt', 'w')"
        ]
        for code in unsafe_modules:
            r = self.client.post("/api/code/run", json={"code": code})
            self.assertEqual(r.status_code, 200)
            self.assertFalse(r.json()["success"], f"Expected unsafe code to be rejected: {code}")
            self.assertIn("🔒 تنبيه أمني", r.json()["error"])

        # 3. Timeout protection for infinite loops
        infinite_loop = "while True:\n    pass"
        t0 = time.time()
        r = self.client.post("/api/code/run", json={"code": infinite_loop, "timeout": 2})
        t1 = time.time()
        self.assertLess(t1 - t0, 5, "Timeout protection took too long")
        self.assertFalse(r.json()["success"])
        self.assertIn("⏱️", r.json()["error"])

    def test_06_in_lesson_exercise_server_verification(self):
        """Test student submitting code to /api/code/verify-exercise with server-side validation."""
        res = self.client.post("/api/auth/login", json={
            "identifier": "01012345678",
            "password": TEST_STUDENT_PASSWORD
        })
        token = res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Valid exercise solve
        student_solve = "x = 10\ny = 25\nprint('Total:', x + y)"
        r = self.client.post("/api/code/verify-exercise", json={
            "lesson_id": "lesson_1_1",
            "code": student_solve
        }, headers=headers)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["passed"])
        self.assertEqual(data["xp_earned"], 30)

    def test_07_in_lesson_quiz_lifecycle_and_grading(self):
        """Test student taking lesson quiz, getting server-side score and explanations."""
        res = self.client.post("/api/auth/login", json={
            "identifier": "01012345678",
            "password": TEST_STUDENT_PASSWORD
        })
        student_id = res.json()["user"]["id"]
        token = res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Fetch lesson quiz (verify answers redacted)
        quiz_res = self.client.get("/api/quizzes/lesson/lesson_1_2", headers=headers)
        self.assertEqual(quiz_res.status_code, 200)
        quiz_data = quiz_res.json()["quiz"]
        self.assertIn("questions", quiz_data)
        for q in quiz_data["questions"]:
            self.assertNotIn("correct_answer", q)
            self.assertNotIn("explanation", q)

        # 2. Submit quiz answers
        answers = {}
        for q in quiz_data["questions"]:
            answers[q["id"]] = 0 # choose first option

        sub_res = self.client.post("/api/quizzes/submit", json={
            "quiz_id": quiz_data["id"],
            "lesson_id": "lesson_1_2",
            "answers": answers
        }, headers=headers)
        self.assertEqual(sub_res.status_code, 200, sub_res.text)
        sub_data = sub_res.json()
        self.assertTrue(sub_data["success"])
        self.assertIn("attempt_id", sub_data)
        self.assertIn("percentage", sub_data)
        self.assertIn("reviews", sub_data)
        self.assertGreaterEqual(len(sub_data["reviews"]), 1)
        self.assertIn("explanation", sub_data["reviews"][0])

        # 3. Fetch attempt result
        att_res = self.client.get(f"/api/quizzes/attempts/{sub_data['attempt_id']}", headers=headers)
        self.assertEqual(att_res.status_code, 200)
        self.assertEqual(att_res.json()["result"]["student_id"], student_id)

    def test_08_password_reset_security_and_expiry(self):
        """Test secure single-use password reset tokens with no account enumeration."""
        # 1. Forgot password for existing student
        res = self.client.post("/api/auth/forgot-password", json={"phone_or_email": "01012345678"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("إذا كان الحساب مسجلاً لدينا", data["message"])

        # 2. Forgot password for non-existent student (no enumeration)
        fake_res = self.client.post("/api/auth/forgot-password", json={"phone_or_email": "01099999999"})
        self.assertEqual(fake_res.status_code, 200)
        self.assertIn("إذا كان الحساب مسجلاً لدينا", fake_res.json()["message"])

        # 3. Retrieve valid reset token directly from database for testing
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT code FROM password_reset_tokens WHERE used = 0 ORDER BY created_at DESC LIMIT 1")
            token_row = cursor.fetchone()
            self.assertIsNotNone(token_row)
            valid_code = token_row["code"]

        # 4. Attempt reset with wrong code
        bad_reset = self.client.post("/api/auth/reset-password", json={
            "token_or_phone": "01012345678",
            "new_password": "NewSecretPass2026!"
        })
        # If no valid code passed as identifier or token
        # Try wrong token
        bad_reset2 = self.client.post("/api/auth/reset-password", json={
            "token_or_phone": "wrong_code_9999",
            "new_password": "NewSecretPass2026!"
        })
        self.assertEqual(bad_reset2.status_code, 400)

        # 5. Successful reset with valid code
        ok_reset = self.client.post("/api/auth/reset-password", json={
            "token_or_phone": valid_code,
            "new_password": "NewSecretPass2026!"
        })
        self.assertEqual(ok_reset.status_code, 200)
        self.assertTrue(ok_reset.json()["success"])

        # 6. Verify token cannot be reused (single-use enforcement)
        reuse_reset = self.client.post("/api/auth/reset-password", json={
            "token_or_phone": valid_code,
            "new_password": "AnotherNewPass2026!"
        })
        self.assertEqual(reuse_reset.status_code, 400, "Single-use token reuse must be rejected")

        # 7. Login with new password
        login_res = self.client.post("/api/auth/login", json={
            "identifier": "01012345678",
            "password": "NewSecretPass2026!"
        })
        self.assertEqual(login_res.status_code, 200)

    def test_09_soft_delete_preserves_student_grading_history(self):
        """Test admin soft-deleting student preserves exam/quiz grading history."""
        # Login admin
        res = self.client.post("/api/auth/login", json={
            "identifier": "01099998888",
            "password": TEST_ADMIN_PASSWORD
        })
        admin_token = res.json()["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Create a test student
        rnd = secrets.token_hex(4)
        student_data = {
            "name": f"طالب للحذف {rnd}",
            "phone": f"010{secrets.randbelow(90000000) + 10000000}",
            "password": "Password123!"
        }
        create_res = self.client.post("/api/admin/students", json=student_data, headers=headers)
        self.assertEqual(create_res.status_code, 200)
        st_id = create_res.json()["student_id"]

        # Submit an exam attempt for this student
        st_login = self.client.post("/api/auth/login", json={
            "identifier": student_data["phone"],
            "password": student_data["password"]
        })
        st_token = st_login.json()["token"]
        sub_res = self.client.post("/api/exams/submit", json={
            "exam_id": "exam_unit_1",
            "answers": {"q_1": 0, "q_2": 0}
        }, headers={"Authorization": f"Bearer {st_token}"})
        self.assertEqual(sub_res.status_code, 200)
        attempt_id = sub_res.json()["attemptId"]

        # Admin soft-deletes student
        del_res = self.client.delete(f"/api/admin/students/{st_id}", headers=headers)
        self.assertEqual(del_res.status_code, 200)

        # Verify attempt still exists in database
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM exam_attempts WHERE id = ?", (attempt_id,))
            self.assertIsNotNone(cursor.fetchone(), "Exam attempt must be preserved after soft delete")

            cursor.execute("SELECT status FROM users WHERE id = ?", (st_id,))
            user_row = cursor.fetchone()
            self.assertEqual(user_row["status"], "deleted")

    def test_10_security_headers_enforcement(self):
        """Test that all required HTTP security headers are present on responses."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        headers = res.headers
        self.assertEqual(headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(headers.get("x-frame-options"), "SAMEORIGIN")
        self.assertEqual(headers.get("x-xss-protection"), "1; mode=block")
        self.assertEqual(headers.get("referrer-policy"), "strict-origin-when-cross-origin")
        self.assertIn("geolocation=()", headers.get("permissions-policy", ""))


if __name__ == "__main__":
    unittest.main()
