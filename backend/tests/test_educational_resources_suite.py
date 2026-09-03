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
from backend.app.routers.resources import parse_file_url

class CodeSparkEducationalResourcesTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        apply_test_credentials_env()
        init_db()
        seed_database(force_refresh=True)
        cls.client = TestClient(app)

        # Login Super Admin
        admin_login = cls.client.post("/api/auth/login", json={
            "identifier": "admin@codespark.edu.eg",
            "password": TEST_ADMIN_PASSWORD
        })
        assert admin_login.status_code == 200, f"Admin login failed: {admin_login.json()}"
        cls.admin_token = admin_login.json()["token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # Login Assistant
        ast_login = cls.client.post("/api/auth/login", json={
            "identifier": "assistant@codespark.edu.eg",
            "password": TEST_ASSISTANT_PASSWORD
        })
        assert ast_login.status_code == 200, f"Assistant login failed: {ast_login.json()}"
        cls.ast_token = ast_login.json()["token"]
        cls.ast_headers = {"Authorization": f"Bearer {cls.ast_token}"}

        # Login Student
        std_login = cls.client.post("/api/auth/login", json={
            "identifier": "ahmed@codespark.edu.eg",
            "password": TEST_STUDENT_PASSWORD
        })
        assert std_login.status_code == 200, f"Student login failed: {std_login.json()}"
        cls.student_token = std_login.json()["token"]
        cls.student_headers = {"Authorization": f"Bearer {cls.student_token}"}

    def test_01_public_resources_listing(self):
        """1. Student / Public can list active educational PDF resources."""
        res = self.client.get("/api/resources")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(data["count"], 3)
        self.assertIsInstance(data["resources"], list)
        self.assertIn("categories", data)

        first_res = data["resources"][0]
        self.assertIn("title", first_res)
        self.assertIn("file_url", first_res)
        self.assertIn("preview_url", first_res)
        self.assertIn("download_url", first_res)
        self.assertIn("is_google_drive", first_res)

    def test_02_google_drive_url_parser(self):
        """2. Google Drive URL parser accurately extracts IDs and generates preview & download links."""
        sample_url = "https://drive.google.com/file/d/1B2C3D4E5F6G7H8I9J0K1L2M/view?usp=sharing"
        info = parse_file_url(sample_url)
        self.assertTrue(info["is_google_drive"])
        self.assertEqual(info["file_id"], "1B2C3D4E5F6G7H8I9J0K1L2M")
        self.assertEqual(info["preview_url"], "https://drive.google.com/file/d/1B2C3D4E5F6G7H8I9J0K1L2M/preview")
        self.assertEqual(info["download_url"], "https://drive.google.com/uc?export=download&id=1B2C3D4E5F6G7H8I9J0K1L2M")
        self.assertIn("Google Drive", info["sharing_guidance"])

    def test_03_lesson_linked_resources(self):
        """3. Lesson linked resources endpoint returns files attached to specific lesson."""
        res = self.client.get("/api/resources/lesson/lesson_1_1")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(data["count"], 1)
        self.assertEqual(data["resources"][0]["lesson_id"], "lesson_1_1")

    def test_04_resource_views_and_downloads_counter(self):
        """4. Recording views and downloads increments stats."""
        res = self.client.get("/api/resources")
        res_id = res.json()["resources"][0]["id"]

        # View
        v_res = self.client.post(f"/api/resources/{res_id}/view")
        self.assertEqual(v_res.status_code, 200)

        # Download
        d_res = self.client.post(f"/api/resources/{res_id}/download")
        self.assertEqual(d_res.status_code, 200)

        # Detail
        detail_res = self.client.get(f"/api/resources/{res_id}")
        self.assertEqual(detail_res.status_code, 200)
        self.assertGreater(detail_res.json()["resource"]["views_count"], 0)

    def test_05_assistant_creates_and_manages_resource(self):
        """5. Assistant can create, edit, toggle status, and delete an educational PDF."""
        title = f"مذكرة المراجعة السريعة {uuid.uuid4().hex[:6]}"
        drive_url = "https://drive.google.com/file/d/1X9Y8Z7A6B5C4D3E2F1G/view?usp=sharing"

        # 5.1 Create Resource
        create_res = self.client.post("/api/admin/resources", json={
            "title": title,
            "description": "شرح مبسط مع تمارين وتطبيقات لغة بايثون",
            "file_url": drive_url,
            "category": "مذكرات شرح",
            "unit_id": "unit_1",
            "file_size_label": "2.5 MB",
            "display_order": 5,
            "status": "active"
        }, headers=self.ast_headers)
        self.assertEqual(create_res.status_code, 200)
        res_data = create_res.json()
        self.assertTrue(res_data["success"])
        r_id = res_data["resource_id"]

        # Verify in admin list
        admin_list = self.client.get("/api/admin/resources", headers=self.ast_headers)
        self.assertEqual(admin_list.status_code, 200)
        titles = [r["title"] for r in admin_list.json()["resources"]]
        self.assertIn(title, titles)

        # Verify automatic student notification was created
        notifs = self.client.get("/api/student/notifications", headers=self.student_headers)
        self.assertEqual(notifs.status_code, 200)
        notif_titles = [n["title"] for n in notifs.json()["notifications"]]
        self.assertIn("📚 ملف تعليمي جديد", notif_titles)

        # 5.2 Edit Resource
        updated_title = title + " (نسخة منقحة)"
        edit_res = self.client.put(f"/api/admin/resources/{r_id}", json={
            "title": updated_title,
            "category": "ملخصات وقوانين"
        }, headers=self.ast_headers)
        self.assertEqual(edit_res.status_code, 200)

        # 5.3 Toggle Inactive
        status_res = self.client.patch(f"/api/admin/resources/{r_id}/status", json={
            "status": "inactive"
        }, headers=self.ast_headers)
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(status_res.json()["status"], "inactive")

        # Verify inactive resource is hidden from public student list
        pub_list = self.client.get("/api/resources")
        pub_titles = [r["title"] for r in pub_list.json()["resources"]]
        self.assertNotIn(updated_title, pub_titles)

        # 5.4 Delete Resource
        del_res = self.client.delete(f"/api/admin/resources/{r_id}", headers=self.ast_headers)
        self.assertEqual(del_res.status_code, 200)

        # Verify deleted
        get_del = self.client.get(f"/api/admin/resources/{r_id}", headers=self.ast_headers)
        self.assertEqual(get_del.status_code, 404)

    def test_06_student_strictly_blocked_from_admin_resource_mutations(self):
        """6. Security / RBAC: Student is blocked (403 Forbidden) from creating, modifying, or deleting resources."""
        # Attempt Create -> 403
        c_res = self.client.post("/api/admin/resources", json={
            "title": "Unauthorized PDF",
            "file_url": "https://drive.google.com/file/d/hack/view"
        }, headers=self.student_headers)
        self.assertEqual(c_res.status_code, 403)

        # Attempt List Admin Resources -> 403
        l_res = self.client.get("/api/admin/resources", headers=self.student_headers)
        self.assertEqual(l_res.status_code, 403)

        # Attempt Edit -> 403
        e_res = self.client.put("/api/admin/resources/res_unit1_notes", json={"title": "Hacked"}, headers=self.student_headers)
        self.assertEqual(e_res.status_code, 403)

        # Attempt Delete -> 403
        d_res = self.client.delete("/api/admin/resources/res_unit1_notes", headers=self.student_headers)
        self.assertEqual(d_res.status_code, 403)

if __name__ == "__main__":
    unittest.main()
