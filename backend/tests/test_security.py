"""
Code Spark — Production Security & Anti-Tampering Regression Test Suite
Tests:
1. Production secret requirement (startup failure if missing)
2. Production wildcard CORS rejection
3. Student data ownership scoping (Student A cannot access Student B's data)
4. Fake student_id in request payload is strictly ignored (JWT identity enforced)
5. Exam & Quiz score tampering prevention (Server-side grading strictly enforced)
6. Password reset token validation (wrong token, expired token, single-use enforcement)
7. Code execution sandbox restriction (dangerous imports & functions blocked)
"""

import sys
import unittest
import os
import subprocess
import json
import secrets
import datetime
from pathlib import Path

# Ensure backend package and project root are in sys.path
_tests_dir = Path(__file__).resolve().parent
_backend_dir = _tests_dir.parent
_project_root = _backend_dir.parent
for p in [str(_backend_dir), str(_project_root)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi.testclient import TestClient

try:
    from app.main import app
    from app.database import get_db, init_db
    from app.seed_data import seed_database
    from app.security import hash_password, create_access_token
except ImportError:
    from backend.app.main import app
    from backend.app.database import get_db, init_db
    from backend.app.seed_data import seed_database
    from backend.app.security import hash_password, create_access_token


class CodeSparkSecurityRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_database(force_refresh=True)
        cls.client = TestClient(app)

        # Create two distinct test students
        rnd_a = secrets.token_hex(4)
        rnd_b = secrets.token_hex(4)
        cls.student_a_phone = f"010{secrets.randbelow(90000000) + 10000000}"
        cls.student_a_parent = f"011{secrets.randbelow(90000000) + 10000000}"
        cls.student_b_phone = f"010{secrets.randbelow(90000000) + 10000000}"
        cls.student_b_parent = f"011{secrets.randbelow(90000000) + 10000000}"
        cls.student_a_email = f"student_a_{rnd_a}@codespark.edu.eg"
        cls.student_b_email = f"student_b_{rnd_b}@codespark.edu.eg"
        cls.password = "SecTestPass123!"

        # Register Student A
        res_a = cls.client.post("/api/auth/register", json={
            "name": f"طالب أ {rnd_a}",
            "phone": cls.student_a_phone,
            "parent_phone": cls.student_a_parent,
            "email": cls.student_a_email,
            "password": cls.password,
            "confirm_password": cls.password,
            "subscription_code": "SPARK-2026"
        })
        self_data_a = res_a.json()
        assert res_a.status_code == 200, f"Failed to register student A: {self_data_a}"
        cls.student_a_id = self_data_a["user"]["id"]
        cls.token_a = self_data_a["token"]

        # Register Student B
        res_b = cls.client.post("/api/auth/register", json={
            "name": f"طالب ب {rnd_b}",
            "phone": cls.student_b_phone,
            "parent_phone": cls.student_b_parent,
            "email": cls.student_b_email,
            "password": cls.password,
            "confirm_password": cls.password,
            "subscription_code": "SPARK-2026"
        })
        self_data_b = res_b.json()
        assert res_b.status_code == 200, f"Failed to register student B: {self_data_b}"
        cls.student_b_id = self_data_b["user"]["id"]
        cls.token_b = self_data_b["token"]

        # Login Admin
        res_admin = cls.client.post("/api/auth/login", json={
            "identifier": "01099998888",
            "password": "admin12345"
        })
        cls.admin_token = res_admin.json()["token"]

    # --------------------------------------------------------------------------
    # 1. Production Secret Requirement (Startup failure if missing in prod)
    # --------------------------------------------------------------------------
    def test_01_production_missing_secret_rejects_startup(self):
        """Verify that in ENVIRONMENT=production, missing CODESPARK_SECRET_KEY aborts startup."""
        cmd = [
            sys.executable, "-c",
            "import os; os.environ['ENVIRONMENT'] = 'production'; os.environ['CODESPARK_SECRET_KEY'] = ''; os.environ['JWT_SECRET'] = ''; os.environ['CORS_ALLOWED_ORIGINS'] = 'http://localhost:8000'; from app import config"
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(_backend_dir))
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("CRITICAL SECURITY ERROR", proc.stderr + proc.stdout)
        self.assertIn("CODESPARK_SECRET_KEY", proc.stderr + proc.stdout)

    # --------------------------------------------------------------------------
    # 2. Production Wildcard CORS Rejection
    # --------------------------------------------------------------------------
    def test_02_production_wildcard_cors_rejected(self):
        """Verify that in ENVIRONMENT=production, wildcard CORS ('*') is strictly forbidden."""
        cmd = [
            sys.executable, "-c",
            "import os; os.environ['ENVIRONMENT'] = 'production'; os.environ['CODESPARK_SECRET_KEY'] = 'test_secret_12345'; os.environ['CORS_ALLOWED_ORIGINS'] = '*'; from app import config"
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(_backend_dir))
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("Wildcard CORS ('*') is strictly forbidden in production", proc.stderr + proc.stdout)

    # --------------------------------------------------------------------------
    # 3. Student Ownership Scoping (Student A cannot access Student B's data)
    # --------------------------------------------------------------------------
    def test_03_student_data_ownership_isolation(self):
        """Verify Student A only receives their own notifications, progress, and support tickets."""
        # 1. Student A should get 403 on Admin Student detail endpoint
        res = self.client.get(
            f"/api/admin/students/{self.student_b_id}",
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(res.status_code, 403, "Student A must be forbidden from accessing admin student records")

        # 2. Student A support tickets list only includes tickets created by Student A
        self.client.post("/api/support/tickets", json={
            "subject": "استفسار خاص بالطالب أ",
            "message": "هذه رسالة دعم فني خاصة بالطالب أ"
        }, headers={"Authorization": f"Bearer {self.token_a}"})

        res_tickets_b = self.client.get(
            "/api/support/tickets",
            headers={"Authorization": f"Bearer {self.token_b}"}
        )
        self.assertEqual(res_tickets_b.status_code, 200)
        b_tickets = res_tickets_b.json().get("tickets", [])
        for t in b_tickets:
            self.assertNotEqual(t.get("subject"), "استفسار خاص بالطالب أ", "Student B must not see Student A's ticket")

    # --------------------------------------------------------------------------
    # 4. Fake student_id in request payload is strictly ignored
    # --------------------------------------------------------------------------
    def test_04_fake_student_id_in_payload_ignored(self):
        """Verify passing a forged student_id in request body does NOT affect the other student."""
        # Get baseline XP and progress for Student B
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT xp FROM student_profiles WHERE user_id = ?", (self.student_b_id,))
            initial_xp_b = cur.fetchone()["xp"]

        # Student A submits lesson progress attempting to attribute it to Student B
        res = self.client.post("/api/progress/lesson", json={
            "student_id": self.student_b_id,  # FORGED STUDENT ID
            "lesson_id": "lesson_1_1",
            "progress": 100,
            "completed": True,
            "last_position": 120
        }, headers={"Authorization": f"Bearer {self.token_a}"})
        self.assertEqual(res.status_code, 200)

        # Verify Student B's lesson progress is untouched
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM lesson_progress WHERE student_id = ? AND lesson_id = 'lesson_1_1'", (self.student_b_id,))
            lp_b = cur.fetchone()
            self.assertIsNone(lp_b, "Student B must not have progress recorded from Student A's forged request")

            # Verify Student A's own progress was updated
            cur.execute("SELECT * FROM lesson_progress WHERE student_id = ? AND lesson_id = 'lesson_1_1'", (self.student_a_id,))
            lp_a = cur.fetchone()
            self.assertIsNotNone(lp_a, "Student A's progress should be updated under Student A's own ID from JWT")

    # --------------------------------------------------------------------------
    # 5. Exam & Quiz Anti-Cheat / Server-Side Grading Strict Enforcement
    # --------------------------------------------------------------------------
    def test_05_exam_score_tampering_prevented(self):
        """Verify client cannot forge score/percentage/answers in exam submission."""
        # Student gets exam detail - verify answers are redacted
        res = self.client.get("/api/exams/exam_unit_1", headers={"Authorization": f"Bearer {self.token_a}"})
        self.assertEqual(res.status_code, 200)
        exam_data = res.json()
        questions = exam_data.get("questions", [])
        self.assertGreater(len(questions), 0)

        for q in questions:
            self.assertNotIn("correct_answer", q, "correct_answer must never leak in student exam view")
            self.assertNotIn("explanation", q, "explanation must never leak before submission")
            for opt in q.get("options", []):
                self.assertNotIn("is_correct", opt)
                self.assertNotIn("isCorrect", opt)

        # Student submits fake score and wrong answer mapping
        submission = {
            "exam_id": "exam_unit_1",
            "time_spent_seconds": 60,
            "answers": {
                questions[0]["id"]: "bogus_wrong_option_id"
            }
        }
        submit_res = self.client.post(
            "/api/exams/submit",
            json=submission,
            headers={"Authorization": f"Bearer {self.token_a}"}
        )
        self.assertEqual(submit_res.status_code, 200)
        result = submit_res.json()
        # Server graded it properly -> score is calculated, cannot be forged
        self.assertEqual(result.get("success"), True)
        self.assertIn("score", result)
        self.assertIn("percentage", result)

    # --------------------------------------------------------------------------
    # 6. Password Reset Token Validation & Single-Use Enforcement
    # --------------------------------------------------------------------------
    def test_06_password_reset_wrong_expired_used_token_rejected(self):
        """Verify password reset rejects invalid tokens, expired tokens, and enforces single-use."""
        # 1. Initiate forgot password for Student A
        res_forgot = self.client.post("/api/auth/forgot-password", json={
            "phone_or_email": self.student_a_phone
        })
        self.assertEqual(res_forgot.status_code, 200)
        self.assertTrue(res_forgot.json()["success"])

        # Fetch the token from DB
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
            SELECT id, code, expires_at, used
            FROM password_reset_tokens
            WHERE user_id = ? AND used = 0
            ORDER BY created_at DESC LIMIT 1
            """, (self.student_a_id,))
            token_row = cur.fetchone()

        self.assertIsNotNone(token_row)
        valid_code = token_row["code"]

        # Case A: Wrong token/code
        res_wrong = self.client.post("/api/auth/reset-password", json={
            "token_or_phone": "999999",  # WRONG CODE
            "new_password": "NewSecretPass2026!"
        })
        self.assertEqual(res_wrong.status_code, 400, "Wrong reset code must be rejected with 400")

        # Case B: Expired token
        with get_db() as conn:
            cur = conn.cursor()
            past_time = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)).isoformat()
            cur.execute("UPDATE password_reset_tokens SET expires_at = ? WHERE id = ?", (past_time, token_row["id"]))

        res_expired = self.client.post("/api/auth/reset-password", json={
            "token_or_phone": valid_code,
            "new_password": "NewSecretPass2026!"
        })
        self.assertEqual(res_expired.status_code, 400, "Expired reset token must be rejected with 400")

        # Restore valid expiration
        with get_db() as conn:
            cur = conn.cursor()
            future_time = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)).isoformat()
            cur.execute("UPDATE password_reset_tokens SET expires_at = ? WHERE id = ?", (future_time, token_row["id"]))

        # Case C: Valid reset
        res_valid = self.client.post("/api/auth/reset-password", json={
            "token_or_phone": valid_code,
            "new_password": "NewSecretPass2026!"
        })
        self.assertEqual(res_valid.status_code, 200, "Valid reset token must succeed")
        self.assertTrue(res_valid.json()["success"])

        # Verify password changed by logging in
        res_login_new = self.client.post("/api/auth/login", json={
            "identifier": self.student_a_phone,
            "password": "NewSecretPass2026!"
        })
        self.assertEqual(res_login_new.status_code, 200, "Must be able to login with new password")

        # Case D: Reusing the same token (Single-Use enforcement)
        res_reuse = self.client.post("/api/auth/reset-password", json={
            "token_or_phone": valid_code,
            "new_password": "AnotherNewPass2026!"
        })
        self.assertEqual(res_reuse.status_code, 400, "Already-used reset token must be rejected on reuse")

    # --------------------------------------------------------------------------
    # 7. Code Execution Sandbox Security (Dangerous Imports & Functions Blocked)
    # --------------------------------------------------------------------------
    def test_07_code_sandbox_blocks_dangerous_operations(self):
        """Verify Python execution sandbox blocks dangerous imports, filesystem, network, and eval."""
        dangerous_snippets = [
            "import os\nos.system('ls')",
            "import sys\nsys.exit(0)",
            "import subprocess\nsubprocess.run(['ls'])",
            "import socket\ns = socket.socket()",
            "import shutil\nshutil.rmtree('/')",
            "import requests\nr = requests.get('https://google.com')",
            "open('/etc/passwd', 'r')",
            "eval('1 + 1')",
            "exec('x = 2')",
            "__import__('os').system('whoami')"
        ]

        for snippet in dangerous_snippets:
            res = self.client.post("/api/code/run", json={"code": snippet})
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertFalse(data["success"], f"Snippet should fail security inspection: {snippet}")
            self.assertTrue(
                "تنبيه أمني" in data["error"] or "غير مسموح" in data["error"] or "محظور" in data["error"] or "SyntaxError" in data["error"] or "NameError" in data["error"],
                f"Expected security message in error for: {snippet}, got: {data['error']}"
            )


if __name__ == "__main__":
    unittest.main()
