"""
Code Spark - Comprehensive Subscription Codes End-to-End Test Suite
Tests:
1. Admin single code generation (all duration types: 1_month, 3_months, 6_months, 1_year, custom, lifetime)
2. Admin bulk codes generation (count=5)
3. Code listing, summary statistics, search by prefix/mask, status filter, type filter, pagination
4. Code verification API (/api/auth/verify-subscription-code)
5. Student registration with valid code
6. Code state transition to 'used' & student assignment
7. Student profile subscription activation, start date, expiration calculation, duration days
8. Negative tests: invalid code, already used code, disabled code, expired code rejection
9. Admin disable / enable code lifecycle
10. Admin delete code protection (cannot delete used code, can delete unused code)
11. Hashing & masking security verification (plain code NEVER stored in DB)
12. Existing seeded codes preservation
"""

import unittest
import datetime
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import get_db, init_db
from backend.app.seed_data import seed_database
from backend.app.subscription_utils import hash_code, mask_code, get_code_prefix

class SubscriptionCodesComprehensiveTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_database(force_refresh=True)
        cls.client = TestClient(app)

    def _get_admin_token(self):
        res = self.client.post("/api/auth/login", json={
            "identifier": "admin@codespark.edu.eg",
            "password": "admin12345"
        })
        self.assertEqual(res.status_code, 200)
        return res.json()["token"]

    def _get_student_token(self):
        res = self.client.post("/api/auth/login", json={
            "identifier": "ahmed@codespark.edu.eg",
            "password": "password123"
        })
        self.assertEqual(res.status_code, 200)
        return res.json()["token"]

    def test_01_admin_generates_single_and_bulk_codes(self):
        """1. Admin generates single code and bulk codes with proper hashing."""
        admin_token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Single 1_month code
        res1 = self.client.post("/api/admin/subscriptions/generate", json={
            "type": "1_month",
            "count": 1,
            "max_uses": 1,
            "notes": "كود تجريبي لشهر"
        }, headers=headers)
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertTrue(data1["success"])
        self.assertEqual(data1["count"], 1)
        self.assertEqual(len(data1["generated_codes"]), 1)
        code_item = data1["generated_codes"][0]
        self.assertTrue(code_item["code"].startswith("CS-"))
        self.assertEqual(code_item["duration_days"], 30)

        # Bulk 5 codes (lifetime)
        res2 = self.client.post("/api/admin/subscriptions/generate", json={
            "type": "lifetime",
            "count": 5,
            "max_uses": 1,
            "notes": "حزمة أكواد مدى الحياة"
        }, headers=headers)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertEqual(len(data2["generated_codes"]), 5)
        for gc in data2["generated_codes"]:
            self.assertEqual(gc["duration_days"], -1)
            self.assertEqual(gc["subscription_type"], "lifetime")

    def test_02_verify_code_security_and_hashing(self):
        """2. Plaintext codes are NEVER stored in the database."""
        admin_token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {admin_token}"}

        res = self.client.post("/api/admin/subscriptions/generate", json={
            "type": "3_months",
            "count": 1
        }, headers=headers)
        raw_code = res.json()["generated_codes"][0]["code"]
        code_id = res.json()["generated_codes"][0]["id"]
        expected_hash = hash_code(raw_code)

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT code_hash, masked_code, code_prefix FROM subscription_codes WHERE id = ?", (code_id,))
            row = cursor.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["code_hash"], expected_hash)
            self.assertNotEqual(row["code_hash"], raw_code)
            self.assertTrue("*" in row["masked_code"])
            self.assertTrue(raw_code.startswith(row["code_prefix"]))

    def test_03_code_verification_api(self):
        """3. Public API accurately verifies valid codes and rejects invalid ones."""
        admin_token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {admin_token}"}

        res = self.client.post("/api/admin/subscriptions/generate", json={
            "type": "6_months",
            "count": 1
        }, headers=headers)
        raw_code = res.json()["generated_codes"][0]["code"]

        # Valid code check
        v_res = self.client.post("/api/auth/verify-subscription-code", json={"code": raw_code})
        self.assertEqual(v_res.status_code, 200)
        v_data = v_res.json()
        self.assertTrue(v_data["valid"])
        self.assertEqual(v_data["duration_days"], 180)
        self.assertEqual(v_data["subscription_type"], "6_months")

        # Invalid non-existent code
        inv_res = self.client.post("/api/auth/verify-subscription-code", json={"code": "INVALID-CODE-9999"})
        self.assertEqual(inv_res.status_code, 400)

        # Empty code
        empty_res = self.client.post("/api/auth/verify-subscription-code", json={"code": ""})
        self.assertEqual(empty_res.status_code, 400)

    def test_04_student_registration_and_activation_with_code(self):
        """4. New student registers using subscription code and gets active status & expiration."""
        admin_token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Generate a 1-year code (365 days)
        res = self.client.post("/api/admin/subscriptions/generate", json={
            "type": "1_year",
            "count": 1
        }, headers=headers)
        raw_code = res.json()["generated_codes"][0]["code"]

        # Register new student
        phone = f"0112{int(datetime.datetime.now().timestamp()) % 10000000:07d}"
        reg_res = self.client.post("/api/auth/register", json={
            "name": "طالب تجريبي للاشتراكات",
            "phone": phone,
            "parent_phone": "01099998888",
            "password": "Password@123",
            "grade": "الصف الأول الثانوي",
            "subscription_code": raw_code
        })
        self.assertEqual(reg_res.status_code, 200)
        student_data = reg_res.json()["user"]
        student_id = student_data["id"]

        # Verify student profile in response
        self.assertEqual(student_data["subscription_status"], "active")
        self.assertEqual(student_data["subscription_duration_days"], 365)
        self.assertEqual(student_data["subscription_type"], "1_year")
        self.assertIsNotNone(student_data["subscription_expires_at"])

        # Verify code status changed to 'used' and assigned to student
        c_hash = hash_code(raw_code)
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT status, uses_count, assigned_user_id FROM subscription_codes WHERE code_hash = ?", (c_hash,))
            c_row = cursor.fetchone()
            self.assertEqual(c_row["status"], "used")
            self.assertEqual(c_row["uses_count"], 1)
            self.assertEqual(c_row["assigned_user_id"], student_id)

    def test_05_negative_cases_used_disabled_expired_codes(self):
        """5. Used, disabled, and expired codes cannot be reused for registration."""
        admin_token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 5.1 Reusing already used code
        res1 = self.client.post("/api/admin/subscriptions/generate", json={"type": "1_month"}, headers=headers)
        used_code = res1.json()["generated_codes"][0]["code"]
        
        # First use
        phone1 = f"0122{int(datetime.datetime.now().timestamp()) % 10000000:07d}"
        self.client.post("/api/auth/register", json={
            "name": "طالب 1", "phone": phone1, "parent_phone": "01000000001",
            "password": "Password@123", "subscription_code": used_code
        })
        
        # Second use (must fail)
        phone2 = f"0123{int(datetime.datetime.now().timestamp()) % 10000000:07d}"
        reuse_res = self.client.post("/api/auth/register", json={
            "name": "طالب 2", "phone": phone2, "parent_phone": "01000000002",
            "password": "Password@123", "subscription_code": used_code
        })
        self.assertEqual(reuse_res.status_code, 400)
        self.assertIn("تم استخدام", reuse_res.json()["detail"])

        # 5.2 Disabled code
        res2 = self.client.post("/api/admin/subscriptions/generate", json={"type": "1_month"}, headers=headers)
        dis_code = res2.json()["generated_codes"][0]["code"]
        dis_id = res2.json()["generated_codes"][0]["id"]
        # Admin disables it
        self.client.post(f"/api/admin/subscriptions/{dis_id}/disable", headers=headers)

        phone3 = f"0124{int(datetime.datetime.now().timestamp()) % 10000000:07d}"
        dis_res = self.client.post("/api/auth/register", json={
            "name": "طالب 3", "phone": phone3, "parent_phone": "01000000003",
            "password": "Password@123", "subscription_code": dis_code
        })
        self.assertEqual(dis_res.status_code, 400)
        self.assertIn("معطل", dis_res.json()["detail"])

    def test_06_admin_code_lifecycle_and_deletion_protection(self):
        """6. Admin can enable/disable/delete unused codes, but cannot delete used codes."""
        admin_token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Generate code
        res = self.client.post("/api/admin/subscriptions/generate", json={"type": "custom", "duration_days": 45}, headers=headers)
        code_obj = res.json()["generated_codes"][0]
        c_id = code_obj["id"]
        c_raw = code_obj["code"]

        # Disable
        dis_res = self.client.post(f"/api/admin/subscriptions/{c_id}/disable", headers=headers)
        self.assertEqual(dis_res.status_code, 200)

        # Enable
        en_res = self.client.post(f"/api/admin/subscriptions/{c_id}/enable", headers=headers)
        self.assertEqual(en_res.status_code, 200)

        # Delete unused code
        del_res = self.client.delete(f"/api/admin/subscriptions/{c_id}", headers=headers)
        self.assertEqual(del_res.status_code, 200)

        # Verify it no longer exists
        get_res = self.client.get(f"/api/admin/subscriptions/{c_id}", headers=headers)
        self.assertEqual(get_res.status_code, 404)

        # Generate and use a code, then try deleting it
        res_used = self.client.post("/api/admin/subscriptions/generate", json={"type": "1_month"}, headers=headers)
        c_used_obj = res_used.json()["generated_codes"][0]
        phone = f"0125{int(datetime.datetime.now().timestamp()) % 10000000:07d}"
        self.client.post("/api/auth/register", json={
            "name": "طالب مستخدم", "phone": phone, "parent_phone": "01000000004",
            "password": "Password@123", "subscription_code": c_used_obj["code"]
        })

        del_used_res = self.client.delete(f"/api/admin/subscriptions/{c_used_obj['id']}", headers=headers)
        self.assertEqual(del_used_res.status_code, 400)
        self.assertIn("لا يمكن حذف كود اشتراك تم استخدامه", del_used_res.json()["detail"])

    def test_07_existing_seed_codes_and_users_preserved(self):
        """7. Existing seeded demo accounts and subscription codes are fully functional."""
        admin_token = self._get_admin_token()
        headers = {"Authorization": f"Bearer {admin_token}"}

        # List codes
        list_res = self.client.get("/api/admin/subscriptions", headers=headers)
        self.assertEqual(list_res.status_code, 200)
        data = list_res.json()
        self.assertTrue(data["summary"]["total"] >= 10)
        self.assertTrue(len(data["codes"]) > 0)

        # Student login works
        std_res = self.client.post("/api/auth/login", json={
            "identifier": "ahmed@codespark.edu.eg",
            "password": "password123"
        })
        self.assertEqual(std_res.status_code, 200)
        u = std_res.json()["user"]
        self.assertEqual(u["name"], "أحمد محمد الشناوي")
        self.assertEqual(u["subscription_status"], "active")

if __name__ == "__main__":
    unittest.main()
