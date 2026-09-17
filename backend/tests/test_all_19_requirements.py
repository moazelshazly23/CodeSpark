"""
Code Spark - Complete Integration & Regression Verification Suite
Tests all functional and security requirements end-to-end.
"""
import unittest
import threading
import time
from fastapi.testclient import TestClient
from app.main import app
from app.db.engine import db_engine

class TestCodeSparkPlatform(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_system_health(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("status"), "healthy")

    def test_02_auth_and_login(self):
        # Admin login
        res = self.client.post("/api/auth/login", json={
            "username_or_email": "admin",
            "password": "admin_password_2026"
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["role"], "admin")
        self.__class__.admin_token = res.json()["access_token"]

        # Student Registration
        test_user = f"student_{int(time.time() * 1000)}"
        res = self.client.post("/api/auth/register", json={
            "username": test_user,
            "email": f"{test_user}@test.com",
            "password": "student_password_2026",
            "full_name": "طالب اختبار تجريبي",
            "phone": "01099998888"
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["role"], "student")
        self.__class__.student_token = res.json()["access_token"]
        self.__class__.student_id = res.json()["user_id"]

    def test_03_account_settings_email_and_password(self):
        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Change Email
        new_email = f"admin_updated_{int(time.time() * 1000)}@codespark.edu"
        res = self.client.put("/api/users/profile", json={
            "full_name": "المهندس معاذ الشاذلي (محدث)",
            "email": new_email
        }, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["user"]["email"], new_email)

        # Verify login works with new email
        res = self.client.post("/api/auth/login", json={
            "username_or_email": new_email,
            "password": "admin_password_2026"
        })
        self.assertEqual(res.status_code, 200)

        # Change Password
        res = self.client.post("/api/users/change-password", json={
            "current_password": "admin_password_2026",
            "new_password": "new_admin_password_2026",
            "confirm_password": "new_admin_password_2026"
        }, headers=headers)
        self.assertEqual(res.status_code, 200)

        # Verify old password fails
        res_old = self.client.post("/api/auth/login", json={
            "username_or_email": "admin",
            "password": "admin_password_2026"
        })
        self.assertEqual(res_old.status_code, 401)

        # Login with new password
        res = self.client.post("/api/auth/login", json={
            "username_or_email": "admin",
            "password": "new_admin_password_2026"
        })
        self.assertEqual(res.status_code, 200)
        self.__class__.admin_token = res.json()["access_token"]

        # Restore original password for ongoing tests
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        self.client.post("/api/users/change-password", json={
            "current_password": "new_admin_password_2026",
            "new_password": "admin_password_2026",
            "confirm_password": "admin_password_2026"
        }, headers=headers)

    def test_04_assistant_permissions_boundary(self):
        # Login assistant
        res = self.client.post("/api/auth/login", json={
            "username_or_email": "assistant_ahmed",
            "password": "assistant_password_2026"
        })
        self.assertEqual(res.status_code, 200)
        asst_token = res.json()["access_token"]
        asst_headers = {"Authorization": f"Bearer {asst_token}"}

        # Assistant CAN generate 1_MONTH code
        res = self.client.post("/api/subscriptions/codes", json={
            "duration_type": "1_MONTH",
            "batch_name": "دفعة المساعد"
        }, headers=asst_headers)
        self.assertEqual(res.status_code, 200)

        # Assistant CANNOT generate 12_MONTHS code (Forbidden)
        res = self.client.post("/api/subscriptions/codes", json={
            "duration_type": "12_MONTHS",
            "batch_name": "كود غير مصرح"
        }, headers=asst_headers)
        self.assertEqual(res.status_code, 403)

        # Assistant CANNOT access admin-only settings
        res = self.client.put("/api/settings", json={"platform_name": "Hacked"}, headers=asst_headers)
        self.assertEqual(res.status_code, 403)

    def test_05_dynamic_subscription_plans(self):
        # Public / Student sees all active plans dynamically
        res = self.client.get("/api/subscriptions/plans?active_only=true")
        self.assertEqual(res.status_code, 200)
        plans = res.json()["plans"]
        self.assertGreaterEqual(len(plans), 5)

        # Admin creates new unique plan
        plan_id = f"plan_summer_{int(time.time() * 1000)}"
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        res = self.client.post("/api/subscriptions/plans", json={
            "id": plan_id,
            "name": "اشتراك المعسكر الصيفي المتميز",
            "duration_months": 2,
            "price": 220.0,
            "is_active": True,
            "order_index": 20,
            "features": ["دورة مكثفة", "تمارين يومية"]
        }, headers=admin_headers)
        self.assertEqual(res.status_code, 200)

        # Student now dynamically sees the new plan!
        res = self.client.get("/api/subscriptions/plans?active_only=true")
        plan_names = [p["name"] for p in res.json()["plans"]]
        self.assertIn("اشتراك المعسكر الصيفي المتميز", plan_names)

        # Admin can delete the test plan
        res_del = self.client.delete(f"/api/subscriptions/plans/{plan_id}", headers=admin_headers)
        self.assertEqual(res_del.status_code, 200)

    def test_06_subscription_request_workflow(self):
        student_headers = {"Authorization": f"Bearer {self.student_token}"}
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Student submits payment request
        res = self.client.post("/api/subscriptions/requests", json={
            "plan_id": "plan_3m",
            "package_name": "اشتراك فصلي (3 أشهر)",
            "duration_months": 3,
            "amount": 270.0,
            "payment_method": "Vodafone Cash",
            "payment_number": "01099998888",
            "payment_reference": f"VF-TX-{int(time.time())}",
            "phone": "01099998888"
        }, headers=student_headers)
        self.assertEqual(res.status_code, 200)
        req_id = res.json()["request"]["id"]

        # Admin lists requests and sees the student's request
        res = self.client.get("/api/subscriptions/requests", headers=admin_headers)
        self.assertEqual(res.status_code, 200)
        req_ids = [r["id"] for r in res.json()["requests"]]
        self.assertIn(req_id, req_ids)

        # Admin approves the request
        res = self.client.post(f"/api/subscriptions/requests/{req_id}/review", json={
            "action": "approve",
            "admin_notes": "تم استلام التحويل وتفعيل الاشتراك"
        }, headers=admin_headers)
        self.assertEqual(res.status_code, 200)

        # Student now has active subscription
        res = self.client.get("/api/subscriptions/my-status", headers=student_headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["is_subscribed"])

    def test_07_announcements_full_crud(self):
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        student_headers = {"Authorization": f"Bearer {self.student_token}"}

        # 1. Admin creates announcement
        res = self.client.post("/api/announcements", json={
            "title": "إعلان عاجل: موعد اختبار الأسبوع القادم",
            "content": "يرجى من جميع الطلاب مراجعة وحدة القوائم قبل الامتحان الشامل يوم الأحد القادم.",
            "is_urgent": True,
            "is_published": True
        }, headers=admin_headers)
        self.assertEqual(res.status_code, 200)
        ann_id = res.json()["announcement"]["id"]

        # 2. Student views announcements (returns {"announcements": [...], "total": ...})
        res_list = self.client.get("/api/announcements", headers=student_headers)
        self.assertEqual(res_list.status_code, 200)
        anns = res_list.json()["announcements"]
        self.assertTrue(any(a["id"] == ann_id for a in anns))

        # 3. Admin updates announcement
        res_up = self.client.put(f"/api/announcements/{ann_id}", json={
            "title": "إعلان عاجل: موعد اختبار الأسبوع القادم (محدث)",
            "content": "تم تعديل الموعد ليكون يوم الاثنين القادم.",
            "is_urgent": True,
            "is_published": True
        }, headers=admin_headers)
        self.assertEqual(res_up.status_code, 200)
        self.assertEqual(res_up.json()["announcement"]["title"], "إعلان عاجل: موعد اختبار الأسبوع القادم (محدث)")

        # 4. Admin deletes announcement
        res_del = self.client.delete(f"/api/announcements/{ann_id}", headers=admin_headers)
        self.assertEqual(res_del.status_code, 200)

        # Verify gone
        res_after = self.client.get("/api/announcements")
        self.assertFalse(any(a["id"] == ann_id for a in res_after.json()["announcements"]))

    def test_08_payment_settings_persistence(self):
        admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Verify default payment info has Vodafone Cash = +20159159038
        res = self.client.get("/api/subscriptions/payment-info")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["vodafone_cash"], "+20159159038")

        # Admin updates payment settings
        new_voda = "+20159159038"
        new_insta = "instapay_codespark@ipn"
        res_up = self.client.put("/api/settings", json={
            "vodafone_cash": new_voda,
            "payment_phone": new_voda,
            "instapay_phone": new_insta,
            "offer_banner_text": "خصم خاص 25% بمناسبة الفصل الدراسي الجديد",
            "offers_visible": True
        }, headers=admin_headers)
        self.assertEqual(res_up.status_code, 200)

        # Verify updated settings reflected in payment-info
        res_check = self.client.get("/api/subscriptions/payment-info")
        self.assertEqual(res_check.status_code, 200)
        self.assertEqual(res_check.json()["vodafone_cash"], new_voda)
        self.assertEqual(res_check.json()["instapay_phone"], new_insta)

    def test_09_code_playground_execution(self):
        # Successful run
        res = self.client.post("/api/playground/run", json={
            "language": "python",
            "code": "a = 20\nb = 30\nprint('SUM:', a + b)"
        })
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])
        self.assertIn("SUM: 50", res.json()["output"])

        # Syntax error handled gracefully
        res = self.client.post("/api/playground/run", json={
            "language": "python",
            "code": "print('hello"
        })
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["success"])

    def test_10_database_concurrency_and_wal(self):
        errors = []
        def worker(idx):
            try:
                for _ in range(10):
                    db_engine.fetch_all("SELECT * FROM subscription_plans")
                    db_engine.fetch_val("SELECT COUNT(*) FROM users")
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(8)]
        for t in threads: t.start()
        for t in threads: t.join()

        self.assertEqual(len(errors), 0, f"Concurrency errors encountered: {errors}")

    def test_11_demo_data_persistence(self):
        # Delete student created in test_02
        db_engine.execute("DELETE FROM users WHERE id = ?", (self.student_id,))
        # Verify student is gone
        self.assertIsNone(db_engine.fetch_one("SELECT id FROM users WHERE id = ?", (self.student_id,)))

        # Simulate app restart startup hook
        from app.db.seed import seed_database
        user_count = db_engine.fetch_val("SELECT COUNT(*) FROM users") or 0
        if user_count == 0:
            seed_database(force=False)

        # Verify deleted student DID NOT magically reappear!
        self.assertIsNone(db_engine.fetch_one("SELECT id FROM users WHERE id = ?", (self.student_id,)))

if __name__ == "__main__":
    unittest.main()
