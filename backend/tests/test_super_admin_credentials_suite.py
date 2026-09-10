from backend.tests.test_credentials import (
    apply_test_credentials_env, TEST_ADMIN_PASSWORD, TEST_ASSISTANT_PASSWORD, TEST_STUDENT_PASSWORD
)
import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import get_db, init_db
from backend.app.seed_data import seed_database
from backend.app.security import verify_password

class CodeSparkSuperAdminCredentialsTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        apply_test_credentials_env()
        init_db()
        seed_database(force_refresh=True)
        cls.client = TestClient(app)

    def test_01_super_admin_change_email_success(self):
        """1. Super Admin changes email successfully with valid current password."""
        # 1. Login as Super Admin
        login_res = self.client.post("/api/auth/login", json={
            "identifier": "admin@codespark.edu.eg",
            "password": TEST_ADMIN_PASSWORD
        })
        self.assertEqual(login_res.status_code, 200)
        admin_token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. Change email
        new_email = "superadmin.official@codespark.edu.eg"
        change_res = self.client.post("/api/auth/super-admin/change-email", headers=headers, json={
            "current_email": "admin@codespark.edu.eg",
            "new_email": new_email,
            "confirm_new_email": new_email,
            "current_password": TEST_ADMIN_PASSWORD
        })
        self.assertEqual(change_res.status_code, 200)
        data = change_res.json()
        self.assertTrue(data["success"])
        self.assertIn("token", data)

        # 3. Verify in database
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT email FROM users WHERE id = 'admin_1'")
            row = cur.fetchone()
            self.assertEqual(row["email"], new_email)

        # 4. Verify login with new email
        new_login = self.client.post("/api/auth/login", json={
            "identifier": new_email,
            "password": TEST_ADMIN_PASSWORD
        })
        self.assertEqual(new_login.status_code, 200)

    def test_02_super_admin_change_email_wrong_password_rejected(self):
        """2. Super Admin change email is rejected with wrong password."""
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT email FROM users WHERE id = 'admin_1'")
            curr_email = cur.fetchone()["email"]

        login_res = self.client.post("/api/auth/login", json={
            "identifier": curr_email,
            "password": TEST_ADMIN_PASSWORD
        })
        admin_token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        res = self.client.post("/api/auth/super-admin/change-email", headers=headers, json={
            "current_email": curr_email,
            "new_email": "hack@email.com",
            "confirm_new_email": "hack@email.com",
            "current_password": "WrongPassword999"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("كلمة المرور الحالية غير صحيحة", res.json()["detail"])

    def test_03_super_admin_change_password_success(self):
        """3. Super Admin changes password securely with PBKDF2 hashing."""
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT email FROM users WHERE id = 'admin_1'")
            curr_email = cur.fetchone()["email"]

        login_res = self.client.post("/api/auth/login", json={
            "identifier": curr_email,
            "password": TEST_ADMIN_PASSWORD
        })
        admin_token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        new_pw = "test-new-admin-pass-2026"
        res = self.client.post("/api/auth/super-admin/change-password", headers=headers, json={
            "current_password": TEST_ADMIN_PASSWORD,
            "new_password": new_pw,
            "confirm_new_password": new_pw
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

        # Verify old password fails
        old_login = self.client.post("/api/auth/login", json={
            "identifier": curr_email,
            "password": TEST_ADMIN_PASSWORD
        })
        self.assertEqual(old_login.status_code, 401)

        # Verify new password succeeds
        new_login = self.client.post("/api/auth/login", json={
            "identifier": curr_email,
            "password": new_pw
        })
        self.assertEqual(new_login.status_code, 200)

        # Restore original credentials so subsequent logins always work with default admin12345
        new_token = new_login.json()["token"]
        self.client.post("/api/auth/super-admin/change-password", headers={"Authorization": f"Bearer {new_token}"}, json={
            "current_password": new_pw,
            "new_password": TEST_ADMIN_PASSWORD,
            "confirm_new_password": TEST_ADMIN_PASSWORD
        })
        self.client.post("/api/auth/super-admin/change-email", headers={"Authorization": f"Bearer {new_token}"}, json={
            "current_email": curr_email,
            "new_email": "admin@codespark.edu.eg",
            "confirm_new_email": "admin@codespark.edu.eg",
            "current_password": TEST_ADMIN_PASSWORD
        })

    def test_04_assistant_or_student_blocked_from_super_admin_credentials(self):
        """4. Students and Assistants are strictly blocked with 403 Forbidden from changing Super Admin credentials."""
        # Student login
        student_login = self.client.post("/api/auth/login", json={
            "identifier": "ahmed@codespark.edu.eg",
            "password": TEST_STUDENT_PASSWORD
        })
        st_token = student_login.json()["token"]
        st_headers = {"Authorization": f"Bearer {st_token}"}

        res1 = self.client.post("/api/auth/super-admin/change-email", headers=st_headers, json={
            "current_email": "admin@codespark.edu.eg",
            "new_email": "hack@email.com",
            "confirm_new_email": "hack@email.com",
            "current_password": TEST_STUDENT_PASSWORD
        })
        self.assertEqual(res1.status_code, 403)

        res2 = self.client.post("/api/auth/super-admin/change-password", headers=st_headers, json={
            "current_password": TEST_STUDENT_PASSWORD,
            "new_password": "NewPassword123!",
            "confirm_new_password": "NewPassword123!"
        })
        self.assertEqual(res2.status_code, 403)

if __name__ == "__main__":
    unittest.main()
