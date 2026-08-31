import unittest
import os
import uuid
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import get_db, init_db
from backend.app.seed_data import seed_database

class CodeSparkAssistantAndRBACTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_database(force_refresh=True)
        cls.client = TestClient(app)

    def test_01_super_admin_authentication(self):
        """1. Super Admin (المهندس معاذ الشاذلي) authenticates with SUPER_ADMIN role."""
        res = self.client.post("/api/auth/login", json={
            "identifier": "admin@codespark.edu.eg",
            "password": "admin12345"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("token", data)
        user = data["user"]
        self.assertEqual(user["name"], "المهندس معاذ الشاذلي")
        self.assertEqual(user["role"], "SUPER_ADMIN")
        self.assertTrue(user["is_super_admin"])
        self.assertTrue(user["is_staff"])

    def test_02_assistant_demo_authentication(self):
        """2. Assistant Demo authenticates with ASSISTANT role and redirect info."""
        res = self.client.post("/api/auth/login", json={
            "identifier": "assistant@codespark.edu.eg",
            "password": "assistant123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        user = data["user"]
        self.assertEqual(user["name"], "Assistant Demo")
        self.assertEqual(user["role"], "ASSISTANT")
        self.assertTrue(user["is_assistant"])
        self.assertTrue(user["is_staff"])
        self.assertFalse(user["is_super_admin"])

    def test_03_student_demo_authentication(self):
        """3. Demo students authenticate cleanly with standard credentials."""
        for email, expected_name in [
            ("ahmed@codespark.edu.eg", "أحمد محمد الشناوي"),
            ("salma@codespark.edu.eg", "سلمى طارق العوضي")
        ]:
            res = self.client.post("/api/auth/login", json={
                "identifier": email,
                "password": "password123"
            })
            self.assertEqual(res.status_code, 200)
            user = res.json()["user"]
            self.assertEqual(user["name"], expected_name)
            self.assertIn(user["role"], ["STUDENT", "student"])
            self.assertFalse(user["is_staff"])

    def test_04_super_admin_manages_assistants_lifecycle(self):
        """4. Super Admin full CRUD on Assistants: Create, Edit, Status Toggle, Reset PW, Delete."""
        admin_res = self.client.post("/api/auth/login", json={"identifier": "admin@codespark.edu.eg", "password": "admin12345"})
        admin_token = admin_res.json()["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 4.1 Create Assistant
        unique_email = f"ast_{uuid.uuid4().hex[:6]}@codespark.edu.eg"
        create_res = self.client.post("/api/admin/assistants", json={
            "name": "أ. حسام الدين",
            "email": unique_email,
            "phone": f"010{uuid.uuid4().int % 100000000:08d}",
            "password": "AssistantPass@2026"
        }, headers=headers)
        self.assertEqual(create_res.status_code, 200)
        ast = create_res.json()["assistant"]
        ast_id = ast["id"]
        self.assertEqual(ast["role"], "ASSISTANT")
        self.assertEqual(ast["status"], "ACTIVE")

        # 4.2 List Assistants
        list_res = self.client.get("/api/admin/assistants", headers=headers)
        self.assertEqual(list_res.status_code, 200)
        self.assertGreaterEqual(list_res.json()["count"], 2)

        # 4.3 Get Single Assistant
        get_res = self.client.get(f"/api/admin/assistants/{ast_id}", headers=headers)
        self.assertEqual(get_res.status_code, 200)
        self.assertEqual(get_res.json()["assistant"]["name"], "أ. حسام الدين")

        # 4.4 Update Assistant
        update_res = self.client.put(f"/api/admin/assistants/{ast_id}", json={
            "name": "أ. حسام الدين المحدث"
        }, headers=headers)
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.json()["assistant"]["name"], "أ. حسام الدين المحدث")

        # 4.5 Toggle Assistant Status to INACTIVE
        status_res = self.client.patch(f"/api/admin/assistants/{ast_id}/status", json={"status": "INACTIVE"}, headers=headers)
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(status_res.json()["status"], "INACTIVE")

        # Verify disabled assistant cannot log in
        login_fail = self.client.post("/api/auth/login", json={"identifier": unique_email, "password": "AssistantPass@2026"})
        self.assertEqual(login_fail.status_code, 401)

        # Toggle back to ACTIVE
        self.client.patch(f"/api/admin/assistants/{ast_id}/status", json={"status": "ACTIVE"}, headers=headers)

        # 4.6 Reset Password
        reset_res = self.client.post(f"/api/admin/assistants/{ast_id}/reset-password", json={"password": "NewSecret@2026!"}, headers=headers)
        self.assertEqual(reset_res.status_code, 200)

        # Verify login with new password
        login_new = self.client.post("/api/auth/login", json={"identifier": unique_email, "password": "NewSecret@2026!"})
        self.assertEqual(login_new.status_code, 200)

        # 4.7 Delete Assistant
        del_res = self.client.delete(f"/api/admin/assistants/{ast_id}", headers=headers)
        self.assertEqual(del_res.status_code, 200)

        # Verify deleted assistant cannot log in
        login_del = self.client.post("/api/auth/login", json={"identifier": unique_email, "password": "NewSecret@2026!"})
        self.assertEqual(login_del.status_code, 401)

    def test_05_assistant_strictly_forbidden_from_managing_assistants(self):
        """5. RBAC Enforcement: Assistant is blocked (403 Forbidden) from managing Assistants."""
        ast_res = self.client.post("/api/auth/login", json={"identifier": "assistant@codespark.edu.eg", "password": "assistant123"})
        ast_token = ast_res.json()["token"]
        headers = {"Authorization": f"Bearer {ast_token}"}

        self.assertEqual(self.client.get("/api/admin/assistants", headers=headers).status_code, 403)
        self.assertEqual(self.client.post("/api/admin/assistants", json={"name": "X", "email": "x@x.com", "password": "pass"}, headers=headers).status_code, 403)
        self.assertEqual(self.client.put("/api/admin/assistants/assistant_demo", json={"name": "X"}, headers=headers).status_code, 403)
        self.assertEqual(self.client.delete("/api/admin/assistants/assistant_demo", headers=headers).status_code, 403)

    def test_06_assistant_strictly_forbidden_from_publishing_lessons(self):
        """6. Strict RBAC: Assistant CANNOT publish/unpublish lessons or modify published lessons."""
        ast_res = self.client.post("/api/auth/login", json={"identifier": "assistant@codespark.edu.eg", "password": "assistant123"})
        ast_token = ast_res.json()["token"]
        headers = {"Authorization": f"Bearer {ast_token}"}

        admin_res = self.client.post("/api/auth/login", json={"identifier": "admin@codespark.edu.eg", "password": "admin12345"})
        admin_token = admin_res.json()["token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 6.1 Assistant tries to create published lesson -> 403
        res1 = self.client.post("/api/lessons", json={
            "unit_id": "unit_1",
            "title": "درس تجريبي",
            "is_published": True
        }, headers=headers)
        self.assertEqual(res1.status_code, 403)

        # 6.2 Assistant creates a DRAFT lesson -> 200
        res2 = self.client.post("/api/lessons", json={
            "unit_id": "unit_1",
            "title": "درس مسودة للمساعد",
            "is_published": False
        }, headers=headers)
        self.assertEqual(res2.status_code, 200)
        draft_lesson_id = res2.json()["lesson_id"]

        # 6.3 Assistant tries to publish via endpoints -> 403
        self.assertEqual(self.client.post(f"/api/lessons/{draft_lesson_id}/publish", headers=headers).status_code, 403)
        self.assertEqual(self.client.post(f"/api/admin/lessons/{draft_lesson_id}/publish", headers=headers).status_code, 403)
        self.assertEqual(self.client.patch(f"/api/admin/lessons/{draft_lesson_id}/publish", json={"is_published": True}, headers=headers).status_code, 403)

        # 6.4 Super Admin publishes the lesson -> 200
        pub_res = self.client.post(f"/api/lessons/{draft_lesson_id}/publish", headers=admin_headers)
        self.assertEqual(pub_res.status_code, 200)

        # 6.5 Assistant tries to modify published lesson -> 403
        res_mod = self.client.put(f"/api/lessons/{draft_lesson_id}", json={
            "title": "تعديل محظور على درس منشور"
        }, headers=headers)
        self.assertEqual(res_mod.status_code, 403)

        # 6.6 Assistant tries to unpublish published lesson -> 403
        self.assertEqual(self.client.post(f"/api/lessons/{draft_lesson_id}/unpublish", headers=headers).status_code, 403)

        # 6.7 Assistant tries to delete published lesson -> 403
        self.assertEqual(self.client.delete(f"/api/lessons/{draft_lesson_id}", headers=headers).status_code, 403)

        # 6.8 Super Admin unpublishes and deletes the lesson -> 200
        self.assertEqual(self.client.post(f"/api/lessons/{draft_lesson_id}/unpublish", headers=admin_headers).status_code, 200)
        self.assertEqual(self.client.delete(f"/api/lessons/{draft_lesson_id}", headers=admin_headers).status_code, 200)

    def test_07_assistant_authorized_operations(self):
        """7. Assistant permissions verified: Code Generator, Questions Bank, Exams, Inquiries, Grades."""
        ast_res = self.client.post("/api/auth/login", json={"identifier": "assistant@codespark.edu.eg", "password": "assistant123"})
        ast_token = ast_res.json()["token"]
        headers = {"Authorization": f"Bearer {ast_token}"}

        # 7.1 Generate Code
        code_gen_res = self.client.post("/api/code/generate", json={"topic": "loops", "level": "intermediate"}, headers=headers)
        self.assertEqual(code_gen_res.status_code, 200)
        self.assertIn("generated", code_gen_res.json())

        # 7.2 Add Question to Bank
        q_res = self.client.post("/api/questions", json={
            "question": "ما ناتج تنفيذ print(2 ** 3) في بايثون؟",
            "type": "mcq",
            "difficulty": "easy",
            "score": 10,
            "correct_answer": "0",
            "options": ["8", "6", "9", "5"]
        }, headers=headers)
        self.assertEqual(q_res.status_code, 200)
        q_id = q_res.json()["question_id"]

        # 7.3 Create Exam
        exam_res = self.client.post("/api/admin/exams", json={
            "title": "امتحان البرمجة النصفي - إعداد المساعد",
            "duration_minutes": 45,
            "passing_score": 60,
            "total_questions": 10
        }, headers=headers)
        self.assertEqual(exam_res.status_code, 200)
        exam_id = exam_res.json()["exam_id"]

        # 7.4 View Students Directory
        st_list_res = self.client.get("/api/admin/students", headers=headers)
        self.assertEqual(st_list_res.status_code, 200)
        self.assertGreaterEqual(len(st_list_res.json()["students"]), 1)

        # 7.5 View Results and Grades
        res_list = self.client.get("/api/admin/results", headers=headers)
        self.assertEqual(res_list.status_code, 200)

        # 7.6 Reply to student support ticket
        tickets = self.client.get("/api/admin/support/tickets", headers=headers).json()["tickets"]
        if tickets:
            t_id = tickets[0]["id"]
            rep_res = self.client.post(f"/api/admin/support/tickets/{t_id}/reply", json={"reply": "تأكد من كتابة المسافات البادئة Indentation في بايثون بدقة."}, headers=headers)
            self.assertEqual(rep_res.status_code, 200)

    def test_08_student_soft_delete_preserves_relational_integrity(self):
        """8. Admin soft-deletes student who canceled subscription; student cannot login but grades persist."""
        admin_res = self.client.post("/api/auth/login", json={"identifier": "admin@codespark.edu.eg", "password": "admin12345"})
        admin_token = admin_res.json()["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Soft delete student_2 (Salma)
        del_res = self.client.delete("/api/admin/students/student_2", headers=headers)
        self.assertEqual(del_res.status_code, 200)

        # Verify soft-deleted student login fails with 401
        st_login = self.client.post("/api/auth/login", json={"identifier": "salma@codespark.edu.eg", "password": "password123"})
        self.assertEqual(st_login.status_code, 401)
        self.assertIn("تم حذف هذا الحساب", st_login.json()["detail"])

        # Verify database record still exists with is_deleted=1
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id, name, is_deleted, status FROM users WHERE id = 'student_2'")
            row = cur.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["is_deleted"], 1)
            self.assertEqual(row["status"], "deleted")

    def test_09_super_admin_activity_log_monitoring(self):
        """9. Activity Log verifies tracking of Admin and Assistant actions with full audit metadata."""
        admin_res = self.client.post("/api/auth/login", json={"identifier": "admin@codespark.edu.eg", "password": "admin12345"})
        admin_token = admin_res.json()["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        logs_res = self.client.get("/api/admin/activity-logs", headers=headers)
        self.assertEqual(logs_res.status_code, 200)
        logs = logs_res.json()["logs"]
        self.assertGreater(len(logs), 0)

        # Verify logs contain proper user and action info
        actions = [l["action"] for l in logs]
        self.assertTrue(any(a in ["CREATE_ASSISTANT", "CREATE_EXAM", "CREATE_QUESTION", "PUBLISH_LESSON", "SOFT_DELETE_STUDENT", "USER_LOGIN"] for a in actions))

        # Assistant is blocked from activity logs -> 403
        ast_res = self.client.post("/api/auth/login", json={"identifier": "assistant@codespark.edu.eg", "password": "assistant123"})
        ast_token = ast_res.json()["token"]
        self.assertEqual(self.client.get("/api/admin/activity-logs", headers={"Authorization": f"Bearer {ast_token}"}).status_code, 403)

    def test_10_student_rbac_comprehensive_blocking(self):
        """10. Students are blocked (403 Forbidden) from all Admin & Assistant privileged endpoints."""
        std_res = self.client.post("/api/auth/login", json={"identifier": "ahmed@codespark.edu.eg", "password": "password123"})
        std_token = std_res.json()["token"]
        headers = {"Authorization": f"Bearer {std_token}"}

        self.assertEqual(self.client.get("/api/admin/assistants", headers=headers).status_code, 403)
        self.assertEqual(self.client.get("/api/admin/students", headers=headers).status_code, 403)
        self.assertEqual(self.client.get("/api/admin/settings", headers=headers).status_code, 403)
        self.assertEqual(self.client.get("/api/admin/activity-logs", headers=headers).status_code, 403)
        self.assertEqual(self.client.post("/api/lessons/lesson_1/publish", headers=headers).status_code, 403)
        self.assertEqual(self.client.post("/api/admin/exams", json={"title": "Hack"}, headers=headers).status_code, 403)

if __name__ == "__main__":
    unittest.main()
