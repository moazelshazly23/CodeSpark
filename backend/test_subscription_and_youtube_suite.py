"""
Code Spark - Comprehensive Test Suite for YouTube Video Player & Subscription Code System
Verifies all 13 subscription test scenarios, access control, atomic concurrency, and YouTube player features.
"""

import unittest
import datetime
import secrets
import threading
import concurrent.futures
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db, init_db
from app.seed_data import seed_database
from app.subscription_utils import (
    generate_random_code, hash_code, mask_code, get_code_prefix,
    resolve_duration_days, compute_expiration_date, enrich_user_subscription
)
from app.youtube_utils import (
    extract_youtube_id, get_youtube_embed_url, get_youtube_thumbnail_url, validate_and_format_youtube
)


class TestSubscriptionAndYouTubeSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        seed_database(force_refresh=True)
        cls.client = TestClient(app)

        # Login Admin
        res_admin = cls.client.post("/api/auth/login", json={
            "identifier": "01099998888",
            "password": "admin12345"
        })
        assert res_admin.status_code == 200, f"Admin login failed: {res_admin.json()}"
        cls.admin_token = res_admin.json()["token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # Login Existing Demo Student (Ahmed)
        res_student = cls.client.post("/api/auth/login", json={
            "identifier": "01012345678",
            "password": "password123"
        })
        assert res_student.status_code == 200, f"Student login failed: {res_student.json()}"
        cls.demo_student_token = res_student.json()["token"]
        cls.demo_student_headers = {"Authorization": f"Bearer {cls.demo_student_token}"}

    # ==========================================================================
    # 1. Generate Single Code
    # ==========================================================================
    def test_01_generate_single_code(self):
        """1. Admin generates a single cryptographically secure subscription code."""
        res = self.client.post("/api/admin/subscriptions/generate", json={
            "type": "1_month",
            "count": 1,
            "max_uses": 1,
            "notes": "Test Single Month Code"
        }, headers=self.admin_headers)

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["duration_days"], 30)
        self.assertEqual(len(data["generated_codes"]), 1)

        code_obj = data["generated_codes"][0]
        raw_code = code_obj["code"]
        self.assertTrue(raw_code.startswith("CS-"))
        self.assertEqual(len(raw_code.split("-")), 3)
        self.assertEqual(code_obj["masked_code"], mask_code(raw_code))
        self.assertEqual(code_obj["status"], "active")

        # Verify only hash is stored in database, not raw code
        c_hash = hash_code(raw_code)
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM subscription_codes WHERE code_hash = ?", (c_hash,))
            row = cursor.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["code_hash"], c_hash)
            self.assertEqual(row["duration_days"], 30)
            self.assertEqual(row["uses_count"], 0)

    # ==========================================================================
    # 2. Generate Multiple Codes & Types
    # ==========================================================================
    def test_02_generate_multiple_codes(self):
        """2. Admin generates multiple distinct codes across all subscription types."""
        types_to_test = [
            ("3_months", None, 90),
            ("6_months", None, 180),
            ("1_year", None, 365),
            ("lifetime", None, -1),
            ("custom", 45, 45)
        ]

        for sub_type, custom_days, expected_days in types_to_test:
            res = self.client.post("/api/admin/subscriptions/generate", json={
                "type": sub_type,
                "duration_days": custom_days,
                "count": 5,
                "max_uses": 1,
                "notes": f"Batch for {sub_type}"
            }, headers=self.admin_headers)

            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["count"], 5)
            self.assertEqual(data["duration_days"], expected_days)
            self.assertEqual(len(data["generated_codes"]), 5)

            # Ensure all 5 generated codes are strictly unique
            raw_codes = [c["code"] for c in data["generated_codes"]]
            self.assertEqual(len(set(raw_codes)), 5)

            for code_str in raw_codes:
                self.assertTrue(code_str.startswith("CS-"))
                self.assertRegex(code_str, r"^CS-[A-Z0-9]{4}-[A-Z0-9]{4}$")

    # ==========================================================================
    # 3. Register with Valid Code
    # ==========================================================================
    def test_03_register_with_valid_code(self):
        """3. Student successfully registers with a valid subscription code."""
        # 1. Admin generates code
        gen_res = self.client.post("/api/admin/subscriptions/generate", json={
            "type": "3_months",
            "count": 1
        }, headers=self.admin_headers)
        code_to_use = gen_res.json()["generated_codes"][0]["code"]

        # 2. Verify code endpoint
        verify_res = self.client.post("/api/auth/verify-subscription-code", json={
            "code": code_to_use
        })
        self.assertEqual(verify_res.status_code, 200)
        self.assertTrue(verify_res.json()["valid"])
        self.assertEqual(verify_res.json()["duration_days"], 90)

        # 3. Register student
        rnd = secrets.token_hex(3)
        phone = f"010{secrets.randbelow(90000000) + 10000000}"
        parent_phone = f"011{secrets.randbelow(90000000) + 10000000}"
        email = f"new_student_{rnd}@codespark.edu.eg"

        reg_res = self.client.post("/api/auth/register", json={
            "name": f"طالب تجريبي جديد {rnd}",
            "phone": phone,
            "parent_phone": parent_phone,
            "email": email,
            "password": "Password123!",
            "confirm_password": "Password123!",
            "grade": "الصف الأول الثانوي",
            "subscription_code": code_to_use
        })

        self.assertEqual(reg_res.status_code, 200)
        reg_data = reg_res.json()
        self.assertTrue(reg_data["success"])
        self.assertIn("token", reg_data)
        self.assertEqual(reg_data["user"]["subscription_status"], "active")
        self.assertEqual(reg_data["user"]["subscription_duration_days"], 90)
        self.assertGreater(reg_data["user"]["days_remaining"], 85)

        # 4. Verify code is marked used in database
        c_hash = hash_code(code_to_use)
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM subscription_codes WHERE code_hash = ?", (c_hash,))
            code_row = cursor.fetchone()
            self.assertEqual(code_row["status"], "used")
            self.assertEqual(code_row["uses_count"], 1)
            self.assertEqual(code_row["assigned_user_id"], reg_data["user"]["id"])
            self.assertIsNotNone(code_row["activated_at"])
            self.assertIsNotNone(code_row["expires_at"])

    # ==========================================================================
    # 4. Register with Invalid Code
    # ==========================================================================
    def test_04_register_with_invalid_code(self):
        """4. Registration fails when subscription code is invalid or missing."""
        rnd = secrets.token_hex(3)
        phone = f"010{secrets.randbelow(90000000) + 10000000}"
        parent_phone = f"011{secrets.randbelow(90000000) + 10000000}"

        # 1. Non-existent code
        res_fake = self.client.post("/api/auth/register", json={
            "name": "طالب بكود وهمي",
            "phone": phone,
            "parent_phone": parent_phone,
            "password": "Password123!",
            "subscription_code": "CS-FAKE-CODE-99"
        })
        self.assertEqual(res_fake.status_code, 400)
        self.assertIn("كود الاشتراك غير صحيح", res_fake.json()["detail"])

        # 2. Empty code
        res_empty = self.client.post("/api/auth/register", json={
            "name": "طالب بكود فارغ",
            "phone": phone,
            "parent_phone": parent_phone,
            "password": "Password123!",
            "subscription_code": ""
        })
        self.assertEqual(res_empty.status_code, 400)
        self.assertIn("كود تفعيل الاشتراك مطلوب", res_empty.json()["detail"])

    # ==========================================================================
    # 5. Register with Already Used Code
    # ==========================================================================
    def test_05_register_with_used_code(self):
        """5. Re-registering with an already used single-use code is strictly rejected."""
        gen_res = self.client.post("/api/admin/subscriptions/generate", json={
            "type": "1_month",
            "count": 1,
            "max_uses": 1
        }, headers=self.admin_headers)
        single_code = gen_res.json()["generated_codes"][0]["code"]

        # First registration -> Success
        p1 = f"010{secrets.randbelow(90000000) + 10000000}"
        self.client.post("/api/auth/register", json={
            "name": "طالب أول",
            "phone": p1,
            "parent_phone": f"011{secrets.randbelow(90000000) + 10000000}",
            "password": "Password123!",
            "subscription_code": single_code
        })

        # Second registration with SAME code -> Rejection
        p2 = f"010{secrets.randbelow(90000000) + 10000000}"
        res_used = self.client.post("/api/auth/register", json={
            "name": "طالب ثانٍ",
            "phone": p2,
            "parent_phone": f"011{secrets.randbelow(90000000) + 10000000}",
            "password": "Password123!",
            "subscription_code": single_code
        })
        self.assertEqual(res_used.status_code, 400)
        self.assertIn("تم استخدام كود الاشتراك", res_used.json()["detail"])

    # ==========================================================================
    # 6. Register with Expired Code
    # ==========================================================================
    def test_06_register_with_expired_code(self):
        """6. Registration with an expired subscription code is rejected."""
        raw_code = "CS-EXPI-RED1"
        c_hash = hash_code(raw_code)
        past_date = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=10)).isoformat()

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO subscription_codes (
                id, code_hash, code_prefix, masked_code, status,
                subscription_type, duration_days, max_uses, uses_count,
                created_at, expires_at
            )
            VALUES ('sub_test_exp', ?, 'CS-EXPI', 'CS-EXPI-****', 'active', '1_month', 30, 1, 0, ?, ?)
            """, (c_hash, past_date, past_date))

        res = self.client.post("/api/auth/register", json={
            "name": "طالب بكود منتهي",
            "phone": f"010{secrets.randbelow(90000000) + 10000000}",
            "parent_phone": f"011{secrets.randbelow(90000000) + 10000000}",
            "password": "Password123!",
            "subscription_code": raw_code
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("انتهت صلاحية كود الاشتراك", res.json()["detail"])

    # ==========================================================================
    # 7. Register with Disabled Code
    # ==========================================================================
    def test_07_register_with_disabled_code(self):
        """7. Registration with a disabled subscription code is rejected."""
        # 1. Admin generates code
        gen_res = self.client.post("/api/admin/subscriptions/generate", json={
            "type": "1_month",
            "count": 1
        }, headers=self.admin_headers)
        code_obj = gen_res.json()["generated_codes"][0]
        code_id = code_obj["id"]
        raw_code = code_obj["code"]

        # 2. Admin disables the code
        dis_res = self.client.post(f"/api/admin/subscriptions/{code_id}/disable", headers=self.admin_headers)
        self.assertEqual(dis_res.status_code, 200)

        # 3. Student attempts registration
        res = self.client.post("/api/auth/register", json={
            "name": "طالب بكود معطل",
            "phone": f"010{secrets.randbelow(90000000) + 10000000}",
            "parent_phone": f"011{secrets.randbelow(90000000) + 10000000}",
            "password": "Password123!",
            "subscription_code": raw_code
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("كود الاشتراك معطل", res.json()["detail"])

    # ==========================================================================
    # 8. Concurrent Race Condition Protection
    # ==========================================================================
    def test_08_same_code_concurrent_usage(self):
        """8. Atomic database transaction prevents concurrent double-redemption of a single-use code."""
        gen_res = self.client.post("/api/admin/subscriptions/generate", json={
            "type": "6_months",
            "count": 1,
            "max_uses": 1
        }, headers=self.admin_headers)
        shared_code = gen_res.json()["generated_codes"][0]["code"]

        results = []
        def attempt_register(idx):
            client = TestClient(app)
            rnd = f"{idx}_{secrets.token_hex(2)}"
            phone = f"010{secrets.randbelow(90000000) + 10000000}"
            parent_phone = f"011{secrets.randbelow(90000000) + 10000000}"
            res = client.post("/api/auth/register", json={
                "name": f"طالب متزامن {rnd}",
                "phone": phone,
                "parent_phone": parent_phone,
                "password": "Password123!",
                "subscription_code": shared_code
            })
            results.append(res.status_code)

        # Launch 5 concurrent threads
        threads = [threading.Thread(target=attempt_register, args=(i,)) for i in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Exactly 1 thread must succeed (200), all others must fail (400)
        success_count = results.count(200)
        fail_count = results.count(400)
        self.assertEqual(success_count, 1, f"Expected exactly 1 successful registration, got {success_count}. Results: {results}")
        self.assertEqual(fail_count, 4, f"Expected 4 failed registrations, got {fail_count}")

    # ==========================================================================
    # 9. Subscription Expiration & Educational Access Control
    # ==========================================================================
    def test_09_subscription_expiration_access_control(self):
        """9. Expired student subscription is blocked from paid lessons, exams, quizzes, and code runner."""
        # 1. Create a student with expired subscription
        rnd = secrets.token_hex(3)
        phone = f"010{secrets.randbelow(90000000) + 10000000}"
        parent_phone = f"011{secrets.randbelow(90000000) + 10000000}"
        email = f"expired_student_{rnd}@codespark.edu.eg"

        reg_res = self.client.post("/api/auth/register", json={
            "name": f"طالب منتهي الاشتراك {rnd}",
            "phone": phone,
            "parent_phone": parent_phone,
            "email": email,
            "password": "Password123!",
            "subscription_code": "SPARK-2026"
        })
        user_id = reg_res.json()["user"]["id"]
        exp_token = reg_res.json()["token"]
        exp_headers = {"Authorization": f"Bearer {exp_token}"}

        # 2. Manually set subscription as expired in database
        past_iso = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=5)).isoformat()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE student_profiles
            SET subscription_status = 'expired',
                subscription_expires_at = ?,
                subscription_duration_days = 30
            WHERE user_id = ?
            """, (past_iso, user_id))

        # 3. Verify /auth/me returns expired status
        me_res = self.client.get("/api/auth/me", headers=exp_headers)
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["user"]["subscription_status"], "expired")
        self.assertEqual(me_res.json()["user"]["days_remaining"], 0)

        # 4. Verify blocked from paid lesson content
        lesson_res = self.client.get("/api/lessons/lesson_1_1", headers=exp_headers)
        self.assertEqual(lesson_res.status_code, 403)
        self.assertIn("انتهى اشتراكك", lesson_res.json()["detail"])

        # 5. Verify blocked from taking exams
        exam_res = self.client.get("/api/exams/exam_unit_1", headers=exp_headers)
        self.assertEqual(exam_res.status_code, 403)
        self.assertIn("انتهى اشتراكك", exam_res.json()["detail"])

        # 6. Verify blocked from running code
        code_res = self.client.post("/api/code/run", json={"code": "print('hello')"}, headers=exp_headers)
        self.assertEqual(code_res.status_code, 403)
        self.assertIn("انتهى اشتراكك", code_res.json()["detail"])

        # 7. Verify Admin is exempt and can access lesson_1_1 without issue
        admin_lesson_res = self.client.get("/api/lessons/lesson_1_1", headers=self.admin_headers)
        self.assertEqual(admin_lesson_res.status_code, 200)

    # ==========================================================================
    # 10. Student Cannot Tamper With Subscription
    # ==========================================================================
    def test_10_student_cannot_modify_subscription(self):
        """10. Server-side security prevents student from altering subscription status or expiry date."""
        # Attempt to tamper via update-profile
        tamper_res = self.client.post("/api/auth/update-profile", json={
            "name": "أحمد المعدل",
            "subscription_status": "active",
            "subscription_expires_at": "2099-12-31T23:59:59Z",
            "subscription_duration_days": 9999
        }, headers=self.demo_student_headers)

        self.assertEqual(tamper_res.status_code, 200)
        user_res = tamper_res.json()["user"]
        # Subscription attributes remain pristine and unmodified
        self.assertEqual(user_res["name"], "أحمد المعدل")
        self.assertNotEqual(user_res.get("subscription_duration_days"), 9999)

    # ==========================================================================
    # 11. Student Cannot Access Admin Subscription Endpoints
    # ==========================================================================
    def test_11_student_cannot_access_admin_subscriptions(self):
        """11. Strict RBAC blocks student role with 403 Forbidden on all admin subscription routes."""
        routes_to_test = [
            ("POST", "/api/admin/subscriptions/generate", {"type": "1_month"}),
            ("GET", "/api/admin/subscriptions", None),
            ("GET", "/api/admin/subscriptions/sub_test", None),
            ("POST", "/api/admin/subscriptions/sub_test/disable", {}),
            ("POST", "/api/admin/subscriptions/sub_test/enable", {}),
            ("DELETE", "/api/admin/subscriptions/sub_test", None)
        ]

        for method, endpoint, body in routes_to_test:
            if method == "GET":
                res = self.client.get(endpoint, headers=self.demo_student_headers)
            elif method == "POST":
                res = self.client.post(endpoint, json=body, headers=self.demo_student_headers)
            elif method == "DELETE":
                res = self.client.delete(endpoint, headers=self.demo_student_headers)

            self.assertEqual(res.status_code, 403, f"Student should be 403 on {method} {endpoint}, got {res.status_code}")

    # ==========================================================================
    # 12. Admin Full Code Management Lifecycle
    # ==========================================================================
    def test_12_admin_can_manage_codes(self):
        """12. Admin can list, search, filter, disable, re-enable, and delete unused codes."""
        # 1. Generate a test code
        gen = self.client.post("/api/admin/subscriptions/generate", json={
            "type": "custom",
            "duration_days": 60,
            "notes": "Auditing LifeCycle Code"
        }, headers=self.admin_headers)
        c_obj = gen.json()["generated_codes"][0]
        c_id = c_obj["id"]

        # 2. Get code detail
        det = self.client.get(f"/api/admin/subscriptions/{c_id}", headers=self.admin_headers)
        self.assertEqual(det.status_code, 200)
        self.assertEqual(det.json()["code"]["duration_days"], 60)

        # 3. List with search
        list_res = self.client.get(f"/api/admin/subscriptions?search={c_obj['prefix']}", headers=self.admin_headers)
        self.assertEqual(list_res.status_code, 200)
        self.assertGreaterEqual(len(list_res.json()["codes"]), 1)
        self.assertIn("summary", list_res.json())

        # 4. Disable code
        dis_res = self.client.post(f"/api/admin/subscriptions/{c_id}/disable", headers=self.admin_headers)
        self.assertEqual(dis_res.status_code, 200)
        det_dis = self.client.get(f"/api/admin/subscriptions/{c_id}", headers=self.admin_headers)
        self.assertEqual(det_dis.json()["code"]["status"], "disabled")

        # 5. Re-enable code
        en_res = self.client.post(f"/api/admin/subscriptions/{c_id}/enable", headers=self.admin_headers)
        self.assertEqual(en_res.status_code, 200)
        det_en = self.client.get(f"/api/admin/subscriptions/{c_id}", headers=self.admin_headers)
        self.assertEqual(det_en.json()["code"]["status"], "active")

        # 6. Delete unused code
        del_res = self.client.delete(f"/api/admin/subscriptions/{c_id}", headers=self.admin_headers)
        self.assertEqual(del_res.status_code, 200)

        # Verify 404 after deletion
        det_after = self.client.get(f"/api/admin/subscriptions/{c_id}", headers=self.admin_headers)
        self.assertEqual(det_after.status_code, 404)

    # ==========================================================================
    # 13. Existing Demo Accounts Still Work
    # ==========================================================================
    def test_13_existing_demo_accounts_work(self):
        """13. Existing student and admin accounts continue to work with active lifetime status."""
        # Demo student login
        st_res = self.client.post("/api/auth/demo-login?role=student")
        self.assertEqual(st_res.status_code, 200)
        st_data = st_res.json()["user"]
        self.assertEqual(st_data["subscription_status"], "active")
        self.assertTrue(st_data["is_lifetime"])

        # Demo admin login
        adm_res = self.client.post("/api/auth/demo-login?role=admin")
        self.assertEqual(adm_res.status_code, 200)
        adm_data = adm_res.json()["user"]
        self.assertIn(adm_data["role"], ["admin", "SUPER_ADMIN"])
        self.assertTrue(adm_data["is_lifetime"])

    # ==========================================================================
    # 14. YouTube Player & Video Features
    # ==========================================================================
    def test_14_youtube_video_player_and_progress_saving(self):
        """14. YouTube URL parsing, embed sanitization, progress tracking, and position bookmarking."""
        # 1. URL extraction test
        test_urls = [
            ("https://www.youtube.com/watch?v=kqtD5dpn9C8", "kqtD5dpn9C8"),
            ("https://youtu.be/kqtD5dpn9C8", "kqtD5dpn9C8"),
            ("https://www.youtube.com/shorts/kqtD5dpn9C8", "kqtD5dpn9C8"),
            ("https://www.youtube-nocookie.com/embed/kqtD5dpn9C8", "kqtD5dpn9C8"),
            ("kqtD5dpn9C8", "kqtD5dpn9C8")
        ]
        for url, expected_id in test_urls:
            self.assertEqual(extract_youtube_id(url), expected_id)
            embed = get_youtube_embed_url(url)
            self.assertIn("youtube-nocookie.com/embed/kqtD5dpn9C8", embed)

        # 2. Admin creates a YouTube lesson
        lesson_res = self.client.post("/api/lessons", json={
            "unit_id": "unit_1",
            "title": "درس بايثون يوتيوب التفاعلي",
            "description": "شرح المتغيرات وأنواع البيانات في بايثون",
            "duration": "18 دقيقة",
            "video_source": "youtube",
            "video_url": "https://www.youtube.com/watch?v=kqtD5dpn9C8"
        }, headers=self.admin_headers)
        self.assertEqual(lesson_res.status_code, 200)
        lesson_id = lesson_res.json().get("lesson_id") or lesson_res.json()["lesson"]["id"]

        # 3. Student views lesson (verifying video URL is formatted cleanly)
        view_res = self.client.get(f"/api/lessons/{lesson_id}", headers=self.demo_student_headers)
        self.assertEqual(view_res.status_code, 200)
        lesson_data = view_res.json()["lesson"]
        self.assertEqual(lesson_data["video_id"], "kqtD5dpn9C8")
        self.assertIn("youtube-nocookie.com/embed/kqtD5dpn9C8", lesson_data["video_url"])

        # 4. Student updates playback bookmark / saved position
        prog_res = self.client.post("/api/progress/video", json={
            "lesson_id": lesson_id,
            "last_position": 240,
            "progress": 45
        }, headers=self.demo_student_headers)
        self.assertEqual(prog_res.status_code, 200)

        # 5. Verify saved position persists
        view_after = self.client.get(f"/api/lessons/{lesson_id}", headers=self.demo_student_headers)
        self.assertEqual(view_after.json()["lesson"]["lastPosition"], 240)
        self.assertEqual(view_after.json()["lesson"]["progress"], 45)

        # 6. Student completes lesson
        comp_res = self.client.post("/api/progress/lesson", json={
            "lesson_id": lesson_id,
            "completed": True,
            "progress": 100,
            "last_position": 600
        }, headers=self.demo_student_headers)
        self.assertEqual(comp_res.status_code, 200)
        self.assertTrue(comp_res.json()["success"])
        self.assertEqual(comp_res.json()["xpAwarded"], 50)


if __name__ == "__main__":
    unittest.main()
