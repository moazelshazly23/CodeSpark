from backend.tests.test_credentials import apply_test_credentials_env
"""
Code Spark - Comprehensive Production Password Reset & OTP Test Suite
Tests all 12+ security and functional scenarios for Forgot/Reset Password flow.
"""

import unittest
import os
import time
import datetime
import hashlib
from fastapi.testclient import TestClient
from fastapi import HTTPException

from backend.app.main import app
from backend.app.database import init_db, get_db
from backend.app.seed_data import seed_database
from backend.app.security import verify_password, hash_password, clear_rate_limits
from backend.app.models import (
    ForgotPasswordRequest, VerifyOtpRequest, ResendOtpRequest,
    ResetPasswordRequest, LoginRequest
)
from backend.app.routers.auth import (
    forgot_password, verify_otp, resend_otp, reset_password, login
)
from backend.app.email_service import generate_otp_email_html, generate_otp_email_text, send_password_reset_email


class CodeSparkPasswordResetTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        apply_test_credentials_env()
        init_db()
        seed_database()
        cls.client = TestClient(app)

    def setUp(self):
        clear_rate_limits()
        # Retrieve seeded student account
        with get_db() as conn:
            c = conn.cursor()
            c.execute("SELECT id, name, email, phone, password_hash FROM users WHERE LOWER(role) = 'student' LIMIT 1")
            self.student = dict(c.fetchone())

    def test_01_complete_successful_flow(self):
        """Scenario 1: Full valid flow: Forgot -> OTP -> Verify -> Reset -> Login."""
        email = self.student["email"]

        # 1. Request OTP
        req1 = ForgotPasswordRequest(email=email)
        res1 = forgot_password(req1)
        self.assertTrue(res1.get("success"))
        self.assertIn("إذا كان الحساب مسجلاً لدينا", res1.get("message"))
        self.assertIn("dev_code", res1)
        otp = res1["dev_code"]
        self.assertEqual(len(otp), 6)
        self.assertTrue(otp.isdigit())

        # 2. Verify OTP
        req2 = VerifyOtpRequest(email=email, otp=otp)
        res2 = verify_otp(req2)
        self.assertTrue(res2.get("success"))
        self.assertIn("reset_token", res2)
        reset_token = res2["reset_token"]
        self.assertTrue(reset_token.startswith("rst_"))

        # 3. Reset Password
        new_password = "SparkSecurePassword@2026"
        req3 = ResetPasswordRequest(
            reset_token=reset_token,
            new_password=new_password,
            confirm_password=new_password
        )
        res3 = reset_password(req3)
        self.assertTrue(res3.get("success"))
        self.assertIn("تم تغيير كلمة المرور بنجاح", res3.get("message"))

        # 4. Verify in DB that password hash updated using PBKDF2
        with get_db() as conn:
            c = conn.cursor()
            c.execute("SELECT password_hash FROM users WHERE id = ?", (self.student["id"],))
            row = c.fetchone()
            self.assertTrue(row["password_hash"].startswith("pbkdf2_sha256$"))
            self.assertTrue(verify_password(new_password, row["password_hash"]))

        # 5. Login with new password
        login_res = login(LoginRequest(identifier=email, password=new_password))
        self.assertTrue(login_res.get("success"))
        self.assertIn("token", login_res)

    def test_02_anti_enumeration_unknown_email(self):
        """Scenario 2: Anti-enumeration check for non-existent email."""
        unknown_email = "nonexistent_student_999@domain.com"
        res = forgot_password(ForgotPasswordRequest(email=unknown_email))
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("message"), "إذا كان الحساب مسجلاً لدينا، فسيتم إرسال رمز التحقق إلى البريد الإلكتروني المرتبط به.")
        # Dev code must not be generated for unknown accounts
        self.assertNotIn("dev_code", res)

    def test_03_invalid_otp_rejection(self):
        """Scenario 3: Incorrect OTP returns clear error with remaining attempts."""
        email = self.student["email"]
        forgot_password(ForgotPasswordRequest(email=email))

        with self.assertRaises(HTTPException) as ctx:
            verify_otp(VerifyOtpRequest(email=email, otp="000000"))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("رمز التحقق غير صحيح", ctx.exception.detail)
        self.assertIn("محاولات", ctx.exception.detail)

    def test_04_expired_otp_rejection(self):
        """Scenario 4: Expired OTP is strictly rejected."""
        email = self.student["email"]
        res = forgot_password(ForgotPasswordRequest(email=email))
        otp = res["dev_code"]

        # Manually expire the token in database
        past_str = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=15)).isoformat()
        with get_db() as conn:
            c = conn.cursor()
            c.execute("UPDATE password_reset_tokens SET expires_at = ? WHERE user_id = ? AND used = 0", (past_str, self.student["id"]))

        with self.assertRaises(HTTPException) as ctx:
            verify_otp(VerifyOtpRequest(email=email, otp=otp))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("انتهت صلاحية رمز التحقق", ctx.exception.detail)

    def test_05_reused_used_otp_rejection(self):
        """Scenario 5: OTP marked as used cannot be reused."""
        email = self.student["email"]
        res = forgot_password(ForgotPasswordRequest(email=email))
        otp = res["dev_code"]

        # Manually mark as used
        with get_db() as conn:
            c = conn.cursor()
            c.execute("UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?", (self.student["id"],))

        with self.assertRaises(HTTPException) as ctx:
            verify_otp(VerifyOtpRequest(email=email, otp=otp))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("رمز التحقق غير صحيح أو انتهت صلاحيته", ctx.exception.detail)

    def test_06_brute_force_lockout_after_max_attempts(self):
        """Scenario 6: Max 5 incorrect OTP attempts invalidates token and locks out."""
        email = self.student["email"]
        res = forgot_password(ForgotPasswordRequest(email=email))
        correct_otp = res["dev_code"]

        # 5 consecutive incorrect attempts
        for attempt in range(1, 6):
            with self.assertRaises(HTTPException) as ctx:
                verify_otp(VerifyOtpRequest(email=email, otp="112233"))
            self.assertEqual(ctx.exception.status_code, 400)

        # 6th attempt (even with the correct OTP) must be rejected
        with self.assertRaises(HTTPException) as ctx:
            verify_otp(VerifyOtpRequest(email=email, otp=correct_otp))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("انتهت صلاحيته", ctx.exception.detail)

    def test_07_resend_otp_invalidates_previous_code(self):
        """Scenario 7: Requesting a new OTP code invalidates any previous active codes."""
        email = self.student["email"]
        res1 = forgot_password(ForgotPasswordRequest(email=email))
        old_otp = res1["dev_code"]

        res2 = resend_otp(ResendOtpRequest(email=email))
        new_otp = res2["dev_code"]
        self.assertNotEqual(old_otp, new_otp)

        # Attempting old OTP must fail
        with self.assertRaises(HTTPException):
            verify_otp(VerifyOtpRequest(email=email, otp=old_otp))

        # Attempting new OTP must succeed
        verify_res = verify_otp(VerifyOtpRequest(email=email, otp=new_otp))
        self.assertTrue(verify_res.get("success"))
        self.assertIn("reset_token", verify_res)

    def test_08_mismatched_passwords_rejection(self):
        """Scenario 8: Password and confirm password mismatch is rejected."""
        email = self.student["email"]
        res = forgot_password(ForgotPasswordRequest(email=email))
        v_res = verify_otp(VerifyOtpRequest(email=email, otp=res["dev_code"]))
        reset_token = v_res["reset_token"]

        with self.assertRaises(HTTPException) as ctx:
            reset_password(ResetPasswordRequest(
                reset_token=reset_token,
                new_password="Password123!",
                confirm_password="DifferentPassword123!"
            ))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("غير متطابقتين", ctx.exception.detail)

    def test_09_weak_password_rejection(self):
        """Scenario 9: Overly simple/weak passwords are rejected."""
        email = self.student["email"]
        res = forgot_password(ForgotPasswordRequest(email=email))
        v_res = verify_otp(VerifyOtpRequest(email=email, otp=res["dev_code"]))
        reset_token = v_res["reset_token"]

        for weak in ["123456", "password", "qwerty"]:
            with self.assertRaises(HTTPException) as ctx:
                reset_password(ResetPasswordRequest(
                    reset_token=reset_token,
                    new_password=weak,
                    confirm_password=weak
                ))
            self.assertEqual(ctx.exception.status_code, 400)
            self.assertIn("ضعيفة", ctx.exception.detail)

    def test_10_replay_attack_prevention(self):
        """Scenario 10: After successful reset, same reset token cannot be reused."""
        email = self.student["email"]
        res = forgot_password(ForgotPasswordRequest(email=email))
        v_res = verify_otp(VerifyOtpRequest(email=email, otp=res["dev_code"]))
        reset_token = v_res["reset_token"]

        new_pw = "ValidComplexPassword#2026"
        res_reset = reset_password(ResetPasswordRequest(
            reset_token=reset_token,
            new_password=new_pw,
            confirm_password=new_pw
        ))
        self.assertTrue(res_reset.get("success"))

        # Second attempt using same token must fail
        with self.assertRaises(HTTPException) as ctx:
            reset_password(ResetPasswordRequest(
                reset_token=reset_token,
                new_password="AnotherPassword#2026",
                confirm_password="AnotherPassword#2026"
            ))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("غير صحيحة أو انتهت صلاحيتها", ctx.exception.detail)

    def test_11_email_template_rendering(self):
        """Scenario 11: Email template rendering contains CodeSpark branding and OTP."""
        html = generate_otp_email_html("أحمد الشناوي", "483921")
        self.assertIn("CodeSpark", html)
        self.assertIn("483921", html)
        self.assertIn("10 دقائق", html)
        self.assertIn("dir=\"rtl\"", html)

        text = generate_otp_email_text("أحمد الشناوي", "483921")
        self.assertIn("CodeSpark", text)
        self.assertIn("483921", text)
        self.assertIn("10 دقائق", text)

    def test_12_fastapi_http_endpoints_e2e(self):
        """Scenario 12: Full HTTP API client E2E test via TestClient."""
        email = self.student["email"]

        # POST /api/auth/forgot-password
        r1 = self.client.post("/api/auth/forgot-password", json={"email": email})
        self.assertEqual(r1.status_code, 200)
        data1 = r1.json()
        self.assertTrue(data1["success"])
        otp = data1["dev_code"]

        # POST /api/auth/verify-otp
        r2 = self.client.post("/api/auth/verify-otp", json={"email": email, "otp": otp})
        self.assertEqual(r2.status_code, 200)
        data2 = r2.json()
        self.assertTrue(data2["success"])
        reset_token = data2["reset_token"]

        # POST /api/auth/reset-password
        new_pw = "FinalE2EPw@2026!"
        r3 = self.client.post("/api/auth/reset-password", json={
            "reset_token": reset_token,
            "new_password": new_pw,
            "confirm_password": new_pw
        })
        self.assertEqual(r3.status_code, 200)
        data3 = r3.json()
        self.assertTrue(data3["success"])

        # POST /api/auth/login with new password
        r4 = self.client.post("/api/auth/login", json={
            "identifier": email,
            "password": new_pw
        })
        self.assertEqual(r4.status_code, 200)
        data4 = r4.json()
        self.assertTrue(data4["success"])
        self.assertIn("token", data4)


if __name__ == "__main__":
    unittest.main()
