from backend.tests.test_credentials import (
    apply_test_credentials_env, TEST_ADMIN_PASSWORD, TEST_ASSISTANT_PASSWORD, TEST_STUDENT_PASSWORD
)
import unittest
import os
import uuid
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import get_db, init_db
from backend.app.seed_data import seed_database

class CodeSparkCriticalFixesTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        apply_test_credentials_env()
        init_db()
        seed_database(force_refresh=True)
        cls.client = TestClient(app)

    def _get_admin_token(self):
        res = self.client.post("/api/auth/login", json={
            "identifier": "admin@codespark.edu.eg",
            "password": TEST_ADMIN_PASSWORD
        })
        self.assertEqual(res.status_code, 200)
        return res.json()["token"]

    def _get_student_token(self):
        res = self.client.post("/api/auth/login", json={
            "identifier": "ahmed@codespark.edu.eg",
            "password": TEST_STUDENT_PASSWORD
        })
        self.assertEqual(res.status_code, 200)
        return res.json()["token"]

# =========================================================================
    # FEATURE 2: ADD ASSISTANT FLOW & RBAC
    # =========================================================================
    def test_04_super_admin_creates_assistant_end_to_end(self):
        """4. Super Admin creates a new Assistant: validation, hashing, DB record, and login."""
        admin_token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {admin_token}"}

        unique_email = f"assistant_{uuid.uuid4().hex[:6]}@codespark.edu.eg"
        unique_phone = f"011{uuid.uuid4().int % 100000000:08d}"
        password = "SecureAssistantPass2026!"

        payload = {
            "name": "أ. طارق عبد الرحمن",
            "email": unique_email,
            "phone": unique_phone,
            "password": password,
            "status": "ACTIVE"
        }

        # 4.1 Create Assistant
        create_res = self.client.post("/api/admin/assistants", json=payload, headers=headers)
        self.assertEqual(create_res.status_code, 200)
        data = create_res.json()
        self.assertTrue(data["success"])
        ast = data["assistant"]
        ast_id = ast["id"]
        self.assertEqual(ast["name"], "أ. طارق عبد الرحمن")
        self.assertEqual(ast["email"], unique_email)
        self.assertEqual(ast["phone"], unique_phone)
        self.assertEqual(ast["role"], "ASSISTANT")
        self.assertEqual(ast["status"], "ACTIVE")
        self.assertEqual(ast["is_active"], 1)

        # 4.2 Check Database Record directly
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id, name, email, role, status, is_active, password_hash FROM users WHERE id = ?", (ast_id,))
            db_user = dict(cur.fetchone())
            self.assertEqual(db_user["role"], "ASSISTANT")
            self.assertEqual(db_user["status"], "ACTIVE")
            self.assertEqual(db_user["is_active"], 1)
            self.assertNotEqual(db_user["password_hash"], password) # Verifying it is hashed

        # 4.3 New Assistant logs in successfully
        login_res = self.client.post("/api/auth/login", json={
            "identifier": unique_email,
            "password": password
        })
        self.assertEqual(login_res.status_code, 200)
        login_data = login_res.json()
        self.assertTrue(login_data["success"])
        self.assertIn("token", login_data)
        user_info = login_data["user"]
        self.assertEqual(user_info["role"], "ASSISTANT")
        self.assertTrue(user_info["is_assistant"])
        self.assertTrue(user_info["is_staff"])
        self.assertFalse(user_info["is_super_admin"])

        # 4.4 Assistant cannot access Super Admin endpoints
        ast_token = login_data["token"]
        ast_headers = {"Authorization": f"Bearer {ast_token}"}
        self.assertEqual(self.client.get("/api/admin/assistants", headers=ast_headers).status_code, 403)
        self.assertEqual(self.client.get("/api/admin/activity-logs", headers=ast_headers).status_code, 403)
        self.assertEqual(self.client.put("/api/admin/subscriptions/packages/pack_pro", json={"name": "Hacked"}, headers=ast_headers).status_code, 403)

    def test_05_add_assistant_validation_and_security_negative_cases(self):
        """5. Negative tests for Add Assistant: Duplicate email/phone, weak password, invalid email format, unauthorized."""
        admin_token = self._get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        student_token = self._get_student_token()
        student_headers = {"Authorization": f"Bearer {student_token}"}

        # 5.1 Student cannot create assistant -> 403
        res_std = self.client.post("/api/admin/assistants", json={
            "name": "Bad Actor",
            "email": "bad@codespark.edu.eg",
            "password": TEST_STUDENT_PASSWORD
        }, headers=student_headers)
        self.assertEqual(res_std.status_code, 403)

        # 5.2 Duplicate email -> 400
        res_dup_email = self.client.post("/api/admin/assistants", json={
            "name": "مساعد مكرر",
            "email": "admin@codespark.edu.eg", # Existing email
            "password": TEST_STUDENT_PASSWORD
        }, headers=admin_headers)
        self.assertEqual(res_dup_email.status_code, 400)
        self.assertIn("مسجل بالفعل", res_dup_email.json()["detail"])

        # 5.3 Weak password (<6 chars) -> 400
        res_weak_pw = self.client.post("/api/admin/assistants", json={
            "name": "مساعد ضعيف",
            "email": f"ast_{uuid.uuid4().hex[:6]}@codespark.edu.eg",
            "password": "123"
        }, headers=admin_headers)
        self.assertEqual(res_weak_pw.status_code, 400)

        # 5.4 Invalid email format -> 400
        res_inv_email = self.client.post("/api/admin/assistants", json={
            "name": "مساعد إيميل خاطئ",
            "email": "invalid_email_format",
            "password": TEST_STUDENT_PASSWORD
        }, headers=admin_headers)
        self.assertEqual(res_inv_email.status_code, 400)

    # =========================================================================
    # FEATURE 3: PDF CATEGORIES FILTERING & EDUCATIONAL RESOURCES
    # =========================================================================
    def test_06_student_educational_pdf_category_filtering(self):
        """6. Student filters educational resources by categories: الكل, تدريبات وامتحانات, مذكرات شرح, ملخصات وتفاصيل, نماذج إجابة."""
        # 6.1 Filter by 'all' or 'الكل'
        res_all = self.client.get("/api/resources?category=all")
        self.assertEqual(res_all.status_code, 200)
        data_all = res_all.json()
        self.assertTrue(data_all["success"])
        self.assertGreaterEqual(data_all["count"], 4)

        # 6.2 Filter by 'مذكرات شرح'
        res_notes = self.client.get("/api/resources?category=مذكرات شرح")
        self.assertEqual(res_notes.status_code, 200)
        data_notes = res_notes.json()
        self.assertTrue(data_notes["success"])
        self.assertGreaterEqual(data_notes["count"], 1)
        for r in data_notes["resources"]:
            self.assertEqual(r["category"], "مذكرات شرح")

        # 6.3 Filter by 'تدريبات وامتحانات'
        res_exercises = self.client.get("/api/resources?category=تدريبات وامتحانات")
        self.assertEqual(res_exercises.status_code, 200)
        data_ex = res_exercises.json()
        self.assertTrue(data_ex["success"])
        self.assertGreaterEqual(data_ex["count"], 1)
        for r in data_ex["resources"]:
            self.assertEqual(r["category"], "تدريبات وامتحانات")

        # 6.4 Filter by 'ملخصات وتفاصيل' (and alias 'ملخصات وقوانين')
        res_summary = self.client.get("/api/resources?category=ملخصات وتفاصيل")
        self.assertEqual(res_summary.status_code, 200)
        data_sum = res_summary.json()
        self.assertTrue(data_sum["success"])
        self.assertGreaterEqual(data_sum["count"], 1)
        for r in data_sum["resources"]:
            self.assertIn(r["category"], ["ملخصات وتفاصيل", "ملخصات وقوانين"])

        # 6.5 Filter by 'نماذج إجابة'
        res_answers = self.client.get("/api/resources?category=نماذج إجابة")
        self.assertEqual(res_answers.status_code, 200)
        data_ans = res_answers.json()
        self.assertTrue(data_ans["success"])
        self.assertGreaterEqual(data_ans["count"], 1)
        for r in data_ans["resources"]:
            self.assertEqual(r["category"], "نماذج إجابة")

        # 6.6 Categories list endpoint
        res_cats = self.client.get("/api/resources/categories")
        self.assertEqual(res_cats.status_code, 200)
        cats = res_cats.json()["categories"]
        for expected in ["تدريبات وامتحانات", "مذكرات شرح", "ملخصات وتفاصيل", "نماذج إجابة"]:
            self.assertIn(expected, cats)

    def test_07_educational_resources_crud_lifecycle(self):
        """7. Full CRUD Lifecycle for educational resources (Admin / Staff): Add, Get, Edit, Toggle, Delete."""
        admin_token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 7.1 Add PDF resource
        create_res = self.client.post("/api/admin/resources", json={
            "title": "مذكرة مراجعة نهائية - نماذج أسئلة متميزة",
            "description": "مراجعة شاملة لجميع دوال بايثون مع أمثلة برمجية تطبيقية.",
            "file_url": "https://drive.google.com/file/d/1X2Y3Z_new_sample/view?usp=sharing",
            "category": "تدريبات وامتحانات",
            "unit_id": "unit_1",
            "status": "active",
            "display_order": 5,
            "file_size_label": "2.9 MB"
        }, headers=headers)
        self.assertEqual(create_res.status_code, 200)
        res_id = create_res.json()["resource_id"]

        # 7.2 Get resource
        get_res = self.client.get(f"/api/resources/{res_id}")
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.json()["resource"]["title"], "مذكرة مراجعة نهائية - نماذج أسئلة متميزة")

        # 7.3 Edit resource
        update_res = self.client.put(f"/api/admin/resources/{res_id}", json={
            "title": "مذكرة مراجعة نهائية - نماذج أسئلة متميزة (محدثة)",
            "category": "ملخصات وتفاصيل"
        }, headers=headers)
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["resource"]["title"], "مذكرة مراجعة نهائية - نماذج أسئلة متميزة (محدثة)")
        self.assertEqual(update_res.json()["resource"]["category"], "ملخصات وتفاصيل")

        # 7.4 Toggle status to inactive
        status_res = self.client.patch(f"/api/admin/resources/{res_id}/status", json={"status": "inactive"}, headers=headers)
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(status_res.json()["status"], "inactive")

        # Verify inactive resource does not appear in public student list
        pub_list = self.client.get("/api/resources").json()["resources"]
        self.assertIsNone(next((r for r in pub_list if r["id"] == res_id), None))

        # 7.5 Delete resource
        del_res = self.client.delete(f"/api/admin/resources/{res_id}", headers=headers)
        self.assertEqual(del_res.status_code, 200)

if __name__ == "__main__":
    unittest.main()
