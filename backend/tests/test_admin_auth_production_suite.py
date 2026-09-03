import unittest
import json
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import init_db, get_db
from backend.app.seed_data import seed_database
from backend.app.security import clear_rate_limits, hash_password, verify_password
from backend.tests.test_credentials import apply_test_credentials_env, TEST_ADMIN_PASSWORD, TEST_STUDENT_PASSWORD

class CodeSparkAdminProductionAuthTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        apply_test_credentials_env()
        init_db()
        seed_database(force_refresh=True)
        cls.client = TestClient(app)

    def setUp(self):
        clear_rate_limits()

    def test_01_admin_login_with_email_success(self):
        """1. Admin can log in successfully using standard email."""
        res = self.client.post("/api/auth/login", json={
            "identifier": "admin@codespark.edu.eg",
            "password": TEST_ADMIN_PASSWORD
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("token", data)
        self.assertEqual(data["user"]["role"], "SUPER_ADMIN")
        self.assertTrue(data["user"]["is_super_admin"])

    def test_02_admin_login_with_phone_and_variations(self):
        """2. Admin can log in using phone number with or without international prefix."""
        for ident in ["01099998888", "+201099998888", "201099998888", "010-9999-8888"]:
            clear_rate_limits()
            res = self.client.post("/api/auth/login", json={
                "identifier": ident,
                "password": TEST_ADMIN_PASSWORD
            })
            self.assertEqual(res.status_code, 200, f"Failed for identifier: {ident}")
            data = res.json()
            self.assertTrue(data["success"])
            self.assertTrue(data["user"]["is_super_admin"])

    def test_03_admin_login_with_alias_email(self):
        """3. Admin can log in using domain alias (admin@codespark.com)."""
        res = self.client.post("/api/auth/login", json={
            "identifier": "admin@codespark.com",
            "password": TEST_ADMIN_PASSWORD
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["user"]["is_super_admin"])

    def test_04_admin_wrong_password_rejected(self):
        """4. Wrong password is strictly rejected with 401 Unauthorized."""
        res = self.client.post("/api/auth/login", json={
            "identifier": "admin@codespark.edu.eg",
            "password": "IncorrectPassword999!"
        })
        self.assertEqual(res.status_code, 401)
        data = res.json()
        self.assertEqual(data["detail"], "رقم الهاتف أو البريد الإلكتروني أو كلمة المرور غير صحيحة")

    def test_05_student_login_still_works(self):
        """5. Student login continues to work seamlessly."""
        for ident in ["ahmed@codespark.edu.eg", "01012345678", "student@codespark.com"]:
            clear_rate_limits()
            res = self.client.post("/api/auth/login", json={
                "identifier": ident,
                "password": TEST_STUDENT_PASSWORD
            })
            self.assertEqual(res.status_code, 200, f"Failed for student identifier: {ident}")
            data = res.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["user"]["role"], "STUDENT")

    def test_06_rerunning_seed_preserves_custom_admin_password(self):
        """6. Re-running the seed does not change or overwrite an existing Admin password."""
        # Update Admin password in DB to custom password
        custom_password = "CustomAdminPass@2026!"
        new_hash = hash_password(custom_password)
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET password_hash = ? WHERE email = 'admin@codespark.edu.eg'", (new_hash,))

        # Re-run seeding (simulating application restart or redeployment in production)
        seed_database(force_refresh=False)

        # Verify admin can still log in with custom password
        clear_rate_limits()
        res = self.client.post("/api/auth/login", json={
            "identifier": "admin@codespark.edu.eg",
            "password": custom_password
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

        # Verify old password is now rejected
        clear_rate_limits()
        res_old = self.client.post("/api/auth/login", json={
            "identifier": "admin@codespark.edu.eg",
            "password": TEST_ADMIN_PASSWORD
        })
        self.assertEqual(res_old.status_code, 401)

        # Reset back to default  for subsequent tests
        default_hash = hash_password(TEST_ADMIN_PASSWORD)
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET password_hash = ? WHERE email = 'admin@codespark.edu.eg'", (default_hash,))

if __name__ == '__main__':
    unittest.main()
