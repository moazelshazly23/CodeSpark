from backend.tests.test_credentials import (
    apply_test_credentials_env, TEST_ADMIN_PASSWORD, TEST_ASSISTANT_PASSWORD, TEST_STUDENT_PASSWORD
)
import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import get_db, init_db
from backend.app.seed_data import seed_database

class CodeSparkStudentAffairsAndFeaturesTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        apply_test_credentials_env()
        init_db()
        seed_database(force_refresh=True)
        cls.client = TestClient(app)

    def test_01_student_affairs_search_and_filtering(self):
        """1. Admin can search students by name/email/phone/ID and filter by grade/section/status."""
        admin_login = self.client.post("/api/auth/demo-login?role=admin")
        admin_token = admin_login.json()["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Search by name
        res1 = self.client.get("/api/admin/students?search=أحمد", headers=headers)
        self.assertEqual(res1.status_code, 200)
        students = res1.json()["students"]
        self.assertTrue(any("أحمد" in s["name"] for s in students))

        # Search by phone
        res2 = self.client.get("/api/admin/students?search=01012345678", headers=headers)
        self.assertEqual(res2.status_code, 200)
        students2 = res2.json()["students"]
        self.assertTrue(any(s["phone"] == "01012345678" for s in students2))

        # Filter by grade
        res3 = self.client.get("/api/admin/students?grade=الصف الأول الثانوي", headers=headers)
        self.assertEqual(res3.status_code, 200)
        for s in res3.json()["students"]:
            self.assertEqual(s["grade"], "الصف الأول الثانوي")

    def test_02_explain_error_endpoint_arabic_pedagogy(self):
        """2. POST /api/code/explain-error provides educational Arabic explanations for Python syntax errors."""
        student_login = self.client.post("/api/auth/login", json={
            "identifier": "ahmed@codespark.edu.eg",
            "password": TEST_STUDENT_PASSWORD
        })
        st_token = student_login.json()["token"]
        headers = {"Authorization": f"Bearer {st_token}"}

        res = self.client.post("/api/code/explain-error", headers=headers, json={
            "code": "if x > 10\n    print('Hello')",
            "error_message": "SyntaxError: expected ':' (line 1)"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("النقطتين الرأسيتين", data["meaning"])
        self.assertIn("guidance", data)

    def test_03_progressive_hints_endpoint(self):
        """3. POST /api/code/hint provides 3-tier progressive guidance without spoiling the direct answer."""
        student_login = self.client.post("/api/auth/login", json={
            "identifier": "ahmed@codespark.edu.eg",
            "password": TEST_STUDENT_PASSWORD
        })
        st_token = student_login.json()["token"]
        headers = {"Authorization": f"Bearer {st_token}"}

        # Level 1 hint
        res1 = self.client.post("/api/code/hint", headers=headers, json={
            "lesson_id": "lesson_1_1",
            "level": 1,
            "topic": "variables"
        })
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()["level"], 1)
        self.assertTrue(res1.json()["has_more_hints"])

        # Level 2 hint
        res2 = self.client.post("/api/code/hint", headers=headers, json={
            "lesson_id": "lesson_1_1",
            "level": 2,
            "topic": "variables"
        })
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["level"], 2)

    def test_04_student_bookmarks_lifecycle(self):
        """4. Student bookmarks lessons/questions, retrieves list, and removes bookmarks."""
        student_login = self.client.post("/api/auth/login", json={
            "identifier": "ahmed@codespark.edu.eg",
            "password": TEST_STUDENT_PASSWORD
        })
        st_token = student_login.json()["token"]
        headers = {"Authorization": f"Bearer {st_token}"}

        # Add bookmark
        add_res = self.client.post("/api/student/bookmarks", headers=headers, json={
            "item_type": "lesson",
            "item_id": "lesson_1_1",
            "title": "مقدمة إلى لغة البرمجة بايثون"
        })
        self.assertEqual(add_res.status_code, 200)
        self.assertTrue(add_res.json()["success"])

        # List bookmarks
        list_res = self.client.get("/api/student/bookmarks", headers=headers)
        self.assertEqual(list_res.status_code, 200)
        bms = list_res.json()["bookmarks"]
        self.assertTrue(any(b["item_id"] == "lesson_1_1" for b in bms))

        # Delete bookmark
        del_res = self.client.delete("/api/student/bookmarks/lesson/lesson_1_1", headers=headers)
        self.assertEqual(del_res.status_code, 200)

    def test_05_student_notes_and_code_drafts(self):
        """5. Student creates lesson notes and code drafts with cloud autosave."""
        student_login = self.client.post("/api/auth/login", json={
            "identifier": "ahmed@codespark.edu.eg",
            "password": TEST_STUDENT_PASSWORD
        })
        st_token = student_login.json()["token"]
        headers = {"Authorization": f"Bearer {st_token}"}

        # Save note
        note_res = self.client.post("/api/student/notes", headers=headers, json={
            "lesson_id": "lesson_1_1",
            "note_text": "ملاحظة هامة: دالة print تقبل معاملات متعددة مفصولة بفاصلة."
        })
        self.assertEqual(note_res.status_code, 200)

        # Get note
        get_note = self.client.get("/api/student/notes/lesson_1_1", headers=headers)
        self.assertEqual(get_note.status_code, 200)
        self.assertIn("print", get_note.json()["note"]["note_text"])

        # Save code draft
        draft_res = self.client.post("/api/student/code-drafts", headers=headers, json={
            "lesson_id": "lesson_1_1",
            "code": "x = 100\nprint('Saved draft', x)",
            "code_type": "playground"
        })
        self.assertEqual(draft_res.status_code, 200)

        # Get code draft
        get_draft = self.client.get("/api/student/code-drafts/lesson_1_1", headers=headers)
        self.assertEqual(get_draft.status_code, 200)
        self.assertIn("Saved draft", get_draft.json()["draft"]["code"])

    def test_06_student_global_search_and_achievements(self):
        """6. Student global search and verified achievements calculation."""
        student_login = self.client.post("/api/auth/login", json={
            "identifier": "ahmed@codespark.edu.eg",
            "password": TEST_STUDENT_PASSWORD
        })
        st_token = student_login.json()["token"]
        headers = {"Authorization": f"Bearer {st_token}"}

        # Global Search
        search_res = self.client.get("/api/student/search?q=بايثون", headers=headers)
        self.assertEqual(search_res.status_code, 200)
        results = search_res.json()["results"]
        self.assertIn("lessons", results)
        self.assertIn("units", results)

        # Achievements
        ach_res = self.client.get("/api/student/achievements", headers=headers)
        self.assertEqual(ach_res.status_code, 200)
        achs = ach_res.json()["achievements"]
        self.assertGreater(len(achs), 3)

if __name__ == "__main__":
    unittest.main()
