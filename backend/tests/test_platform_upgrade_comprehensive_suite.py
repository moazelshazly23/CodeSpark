"""
Code Spark - Complete Platform Upgrade Comprehensive Test Suite
Validates all requirements requested by the user:
1. Role-Based Access Control (Super Admin, Assistant, Student)
2. Assistant Monthly Subscription Codes generation ONLY (Rejection of non-monthly with 403)
3. Code tracking in database: created_by, assigned_user_id, activated_at, unique code
4. Real Database Dashboard Analytics for Admin (12 KPIs: students, subscriptions, assistants, lessons, exercises, questions, codes)
5. Scoped Assistant Dashboard Analytics
6. Real Student Progress & Solved Exercises metrics
7. Admin Question Bank CRUD (MCQ, options, score, correct answer, explanation)
8. Student Question Solving and Exercise Verification
9. Blocking of unauthorized endpoint access
"""

import unittest
import os
import json
import secrets
from fastapi.testclient import TestClient

from backend.tests.test_credentials import (
    apply_test_credentials_env, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_ASSISTANT_PASSWORD
)
from backend.app.main import app
from backend.app.database import get_db, init_db
from backend.app.seed_data import seed_database
from backend.app.security import hash_password, create_access_token


class PlatformUpgradeComprehensiveTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        apply_test_credentials_env()
        init_db()
        seed_database(force_refresh=False)
        cls.client = TestClient(app)

        # 1. Super Admin Authentication
        admin_login = cls.client.post("/api/auth/login", json={
            "identifier": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
        cls.admin_token = admin_login.json()["token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # 2. Assistant Authentication
        ast_login = cls.client.post("/api/auth/login", json={
            "identifier": "assistant@codespark.edu.eg",
            "password": TEST_ASSISTANT_PASSWORD
        })
        assert ast_login.status_code == 200, f"Assistant login failed: {ast_login.text}"
        cls.assistant_token = ast_login.json()["token"]
        cls.assistant_user = ast_login.json()["user"]
        cls.assistant_id = cls.assistant_user["id"]
        cls.assistant_headers = {"Authorization": f"Bearer {cls.assistant_token}"}

        # 3. Student Account Registration & Login
        reg_res = cls.client.post("/api/auth/register", json={
            "name": "طالب ترقية شامل",
            "phone": "01055554444",
            "parent_phone": "01011112222",
            "password": "studentPassword123",
            "grade": "الصف الأول الثانوي",
            "subscription_code": "SPARK-PRO-2026"
        })
        if reg_res.status_code == 200:
            cls.student_token = reg_res.json()["token"]
            cls.student_user = reg_res.json()["user"]
            cls.student_id = cls.student_user["id"]
        else:
            # Fallback direct login or create
            st_login = cls.client.post("/api/auth/login", json={
                "identifier": "01055554444",
                "password": "studentPassword123"
            })
            cls.student_token = st_login.json()["token"]
            cls.student_user = st_login.json()["user"]
            cls.student_id = cls.student_user["id"]

        cls.student_headers = {"Authorization": f"Bearer {cls.student_token}"}

    # ==========================================
    # 1. ASSISTANT SUBSCRIPTION GENERATION RULES
    # ==========================================
    def test_01_assistant_can_generate_monthly_code(self):
        """Assistant can successfully generate 1-Month (30 days) subscription codes."""
        res = self.client.post("/api/admin/subscriptions/generate", json={
            "type": "1_month",
            "duration_days": 30,
            "count": 3,
            "notes": "أكواد مساعد لشهر سبتمبر"
        }, headers=self.assistant_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["count"], 3)
        self.assertEqual(data["subscription_type"], "1_month")
        self.assertEqual(data["duration_days"], 30)
        self.assertEqual(len(data["generated_codes"]), 3)

        # Check database records have created_by set to assistant_id
        first_code = data["generated_codes"][0]
        with get_db() as conn:
            c = conn.cursor()
            c.execute("SELECT created_by, status, duration_days, subscription_type FROM subscription_codes WHERE id = ?", (first_code["id"],))
            row = c.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["created_by"], self.assistant_id)
            self.assertEqual(row["subscription_type"], "1_month")
            self.assertEqual(row["duration_days"], 30)

    def test_02_assistant_forbidden_from_generating_non_monthly_codes(self):
        """Assistant is strictly forbidden from creating 1_year, lifetime, or other codes (403)."""
        for forbidden_type in ["1_year", "lifetime", "3_months", "6_months", "custom"]:
            res = self.client.post("/api/admin/subscriptions/generate", json={
                "type": forbidden_type,
                "count": 1
            }, headers=self.assistant_headers)
            self.assertEqual(res.status_code, 403, f"Assistant was not forbidden from creating {forbidden_type}")

    def test_03_assistant_forbidden_from_admin_endpoints(self):
        """Assistant cannot access Super Admin endpoints (403 Forbidden)."""
        # Super Admin Analytics
        res = self.client.get("/api/admin/analytics", headers=self.assistant_headers)
        self.assertEqual(res.status_code, 403)

        # Assistants Management
        res = self.client.get("/api/admin/assistants", headers=self.assistant_headers)
        self.assertEqual(res.status_code, 403)

    # ==========================================
    # 2. SUBSCRIPTION CODE REDEMPTION & TRACKING
    # ==========================================
    def test_04_code_unique_and_atomic_redemption(self):
        """Codes are unique, tracked in DB with student ID, used date, and cannot be reused."""
        gen_res = self.client.post("/api/admin/subscriptions/generate", json={
            "type": "1_month",
            "count": 1,
            "notes": "كود فحص التفعيل لمرة واحدة"
        }, headers=self.assistant_headers)
        self.assertEqual(gen_res.status_code, 200)
        raw_code = gen_res.json()["generated_codes"][0]["code"]

        # 1st redemption: should succeed
        red_res = self.client.post("/api/subscriptions/redeem", json={"code": raw_code}, headers=self.student_headers)
        self.assertEqual(red_res.status_code, 200)
        red_data = red_res.json()
        self.assertTrue(red_data["success"])

        # Check DB: assigned_user_id and activated_at must be populated
        with get_db() as conn:
            c = conn.cursor()
            c.execute("SELECT status, uses_count, assigned_user_id, activated_at, created_by FROM subscription_codes WHERE id = ?", (gen_res.json()["generated_codes"][0]["id"],))
            row = dict(c.fetchone())
            self.assertEqual(row["status"], "used")
            self.assertEqual(row["uses_count"], 1)
            self.assertEqual(row["assigned_user_id"], self.student_id)
            self.assertIsNotNone(row["activated_at"])
            self.assertEqual(row["created_by"], self.assistant_id)

        # 2nd redemption of same code: must fail
        dup_res = self.client.post("/api/subscriptions/redeem", json={"code": raw_code}, headers=self.student_headers)
        self.assertEqual(dup_res.status_code, 400)
        self.assertIn("من قبل", dup_res.json()["detail"])

    # ==========================================
    # 3. REAL DATABASE DASHBOARD ANALYTICS
    # ==========================================
    def test_05_admin_dashboard_real_database_metrics(self):
        """Admin dashboard analytics endpoint returns all 12 required real database metrics."""
        res = self.client.get("/api/admin/analytics", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        an = res.json()["analytics"]

        # Verify all 12 requested fields exist and are real numbers
        required_fields = [
            "totalStudents", "activeStudents", "expiredStudents",
            "activeSubscriptions", "expiredSubscriptions",
            "totalAssistants", "totalLessons", "totalExercises",
            "totalQuestions", "totalCodes", "usedCodes", "unusedCodes"
        ]
        for field in required_fields:
            self.assertIn(field, an, f"Missing {field} in admin analytics")
            self.assertIsInstance(an[field], int, f"{field} is not an integer")

        self.assertGreaterEqual(an["totalStudents"], 1)
        self.assertGreaterEqual(an["totalLessons"], 1)
        self.assertGreaterEqual(an["totalCodes"], 1)

    def test_06_assistant_dashboard_scoped_metrics(self):
        """Assistant dashboard returns only scoped metrics (codes created by assistant)."""
        res = self.client.get("/api/assistant/analytics", headers=self.assistant_headers)
        self.assertEqual(res.status_code, 200)
        an = res.json()["analytics"]

        self.assertIn("totalCodes", an)
        self.assertIn("usedCodes", an)
        self.assertIn("unusedCodes", an)
        self.assertIn("recentCodes", an)
        self.assertGreaterEqual(an["totalCodes"], 1)

    def test_07_student_progress_and_solved_exercises_real_data(self):
        """Student progress endpoint returns real student metrics and solved exercises."""
        res = self.client.get("/api/progress/student", headers=self.student_headers)
        self.assertEqual(res.status_code, 200)
        prog = res.json()["progress"]

        self.assertEqual(prog["studentId"], self.student_id)
        self.assertIn("studentName", prog)
        self.assertIn("subscriptionStatus", prog)
        self.assertIn("subscriptionType", prog)
        self.assertIn("subscriptionStart", prog)
        self.assertIn("totalLessonsCount", prog)
        self.assertIn("completedLessonsCount", prog)
        self.assertIn("completionPercentage", prog)
        self.assertIn("solvedExercisesCount", prog)
        self.assertIn("recentActivities", prog)
        self.assertIn("recentLessons", prog)

    # ==========================================
    # 4. ADMIN QUESTION BANK CRUD & MCQ
    # ==========================================
    def test_08_admin_question_crud_and_student_solving(self):
        """Admin creates, edits, and manages MCQ questions, which students can solve."""
        # 1. Admin creates MCQ question
        create_res = self.client.post("/api/admin/questions", json={
            "question": "ما ناتج التعبير التالي في بايثون: 5 + 3 ؟",
            "type": "mcq",
            "difficulty": "easy",
            "score": 10,
            "correct_answer": "2",  # 0: 6, 1: 7, 2: 8, 3: 9
            "explanation": "عملية الجمع البسيطة 5 + 3 تنتج 8.",
            "options": ["6", "7", "8", "9"]
        }, headers=self.admin_headers)
        self.assertEqual(create_res.status_code, 200)
        q_id = create_res.json()["question_id"]

        # 2. Verify question appears in public question bank with answer redacted for student
        st_get = self.client.get(f"/api/questions/{q_id}", headers=self.student_headers)
        self.assertEqual(st_get.status_code, 200)
        q_data = st_get.json()["question"]
        self.assertNotIn("correct_answer", q_data)
        self.assertNotIn("explanation", q_data)
        self.assertEqual(len(q_data["options"]), 4)

        # 3. Student solves question with correct answer (option index 2 = '8')
        solve_res = self.client.post(f"/api/questions/{q_id}/answer", json={
            "selected_option": "2"
        }, headers=self.student_headers)
        self.assertEqual(solve_res.status_code, 200)
        solve_data = solve_res.json()
        self.assertTrue(solve_data["is_correct"])
        self.assertEqual(solve_data["score"], 10)
        self.assertIn("8", solve_data["explanation"])

        # 4. Verify solved exercise is recorded in DB for student
        with get_db() as conn:
            c = conn.cursor()
            c.execute("SELECT score, passed FROM exercise_completions WHERE student_id = ? AND question_id = ?", (self.student_id, q_id))
            comp_row = c.fetchone()
            self.assertIsNotNone(comp_row)
            self.assertEqual(comp_row["passed"], 1)

        # 5. Admin updates the question
        up_res = self.client.put(f"/api/admin/questions/{q_id}", json={
            "question": "ما ناتج التعبير: 5 + 3 ؟ (تم التحديث)",
            "score": 15
        }, headers=self.admin_headers)
        self.assertEqual(up_res.status_code, 200)

        # 6. Admin deletes the question
        del_res = self.client.delete(f"/api/admin/questions/{q_id}", headers=self.admin_headers)
        self.assertEqual(del_res.status_code, 200)

        # Verify deletion
        not_found = self.client.get(f"/api/questions/{q_id}", headers=self.admin_headers)
        self.assertEqual(not_found.status_code, 404)


if __name__ == "__main__":
    unittest.main()
