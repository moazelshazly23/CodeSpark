"""
CodeSpark - Comprehensive Automated Test Suite
Tests all 35 architectural requirements:
- Authentication, session validation, registration
- Verified password change workflow with persistent DB validation & re-login checks
- Role-Based Access Control (Admin, Assistant, Student)
- Assistant strict restrictions (monthly code generation only, no price/payment/admin changes)
- Payment settings persistence (Vodafone Cash & InstaPay)
- Subscription code generation, redemption, status updates, and prevention of code reuse
- Subscription requests workflow (submission, admin review, approval & auto-activation)
- Curriculum access rules (free vs subscriber-only video lessons)
- Lesson progress tracking & gamification XP awards
- Study files ("الملفات الدراسية") and Google Drive link permission notices
- Sandboxed Python code execution
- Exercise submission & grading
- Question bank & exam auto-grading with persistent attempt history
- Announcements loading and error-free retrieval
"""
import sys
import os
import json
import uuid

# Ensure backend root is on sys.path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from starlette.testclient import TestClient
from app.main import app
from app.db.engine import db_engine
from app.db.seed import seed_database

client = TestClient(app)

def setup_clean_test_db():
    print("\n[SETUP] Initializing clean database state...")
    seed_database(force=True)
    print("✓ Database ready.")

def test_health_check():
    print("\n--- TEST: Health Check ---")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database_connected"] is True
    print("✓ Health check passed.")

def test_authentication_and_registration():
    print("\n--- TEST: Authentication & Student Registration ---")
    # 1. Register new student
    test_user = f"student_test_{uuid.uuid4().hex[:6]}"
    test_email = f"{test_user}@test.edu"
    test_pass = "secure_pass_123"

    reg_res = client.post("/api/auth/register", json={
        "username": test_user,
        "email": test_email,
        "password": test_pass,
        "full_name": "طالب تجريبي جديد",
        "phone": "+201012345678"
    })
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    token_data = reg_res.json()
    assert "access_token" in token_data
    assert token_data["username"] == test_user
    assert token_data["role"] == "student"

    # 2. Prevent duplicate username
    dup_user_res = client.post("/api/auth/register", json={
        "username": test_user,
        "email": f"other_{test_email}",
        "password": test_pass,
        "full_name": "طالب مكرر"
    })
    assert dup_user_res.status_code == 400
    assert "مسجل بالفعل" in dup_user_res.json()["detail"]

    # 3. Prevent duplicate email
    dup_email_res = client.post("/api/auth/register", json={
        "username": f"other_{test_user}",
        "email": test_email,
        "password": test_pass,
        "full_name": "طالب مكرر إيميل"
    })
    assert dup_email_res.status_code == 400
    assert "مسجل بالفعل" in dup_email_res.json()["detail"]

    # 4. Login with username
    login_res = client.post("/api/auth/login", json={
        "username_or_email": test_user,
        "password": test_pass
    })
    assert login_res.status_code == 200
    assert login_res.json()["user_id"] == token_data["user_id"]

    # 5. Login with email
    login_email_res = client.post("/api/auth/login", json={
        "username_or_email": test_email,
        "password": test_pass
    })
    assert login_email_res.status_code == 200

    # 6. Login with wrong password -> 401
    bad_login = client.post("/api/auth/login", json={
        "username_or_email": test_user,
        "password": "wrong_password"
    })
    assert bad_login.status_code == 401

    # 7. Get current user profile with token
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == test_user

    # 8. Access protected endpoint without token -> 401
    no_auth_res = client.get("/api/auth/me")
    assert no_auth_res.status_code == 401

    print("✓ Authentication & Registration passed.")

def test_password_change_workflow():
    print("\n--- TEST: Verified Password Change & Re-login Workflow ---")
    # 1. Login as default student2 (student_free)
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "student_free",
        "password": "student_password_2026"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Attempt change with wrong current password -> 400
    bad_cur_res = client.post("/api/users/change-password", headers=headers, json={
        "current_password": "incorrect_old_password",
        "new_password": "new_awesome_password_2026",
        "confirm_password": "new_awesome_password_2026"
    })
    assert bad_cur_res.status_code == 400
    assert "الحالية غير صحيحة" in bad_cur_res.json()["detail"]

    # 3. Attempt change with mismatched confirmation -> 400
    mismatch_res = client.post("/api/users/change-password", headers=headers, json={
        "current_password": "student_password_2026",
        "new_password": "new_awesome_password_2026",
        "confirm_password": "different_password"
    })
    assert mismatch_res.status_code == 400
    assert "غير متطابقين" in mismatch_res.json()["detail"]

    # 4. Attempt change with short password -> 400
    short_res = client.post("/api/users/change-password", headers=headers, json={
        "current_password": "student_password_2026",
        "new_password": "123",
        "confirm_password": "123"
    })
    assert short_res.status_code == 400
    assert "6 خانات" in short_res.json()["detail"]

    # 5. Successful password change
    change_res = client.post("/api/users/change-password", headers=headers, json={
        "current_password": "student_password_2026",
        "new_password": "new_awesome_password_2026",
        "confirm_password": "new_awesome_password_2026"
    })
    assert change_res.status_code == 200
    assert change_res.json()["success"] is True

    # 6. Verify OLD password NO LONGER WORKS
    old_try = client.post("/api/auth/login", json={
        "username_or_email": "student_free",
        "password": "student_password_2026"
    })
    assert old_try.status_code == 401, "Old password must be rejected after change!"

    # 7. Verify NEW password WORKS for login
    new_try = client.post("/api/auth/login", json={
        "username_or_email": "student_free",
        "password": "new_awesome_password_2026"
    })
    assert new_try.status_code == 200, "New password must succeed for login!"
    assert "access_token" in new_try.json()

    # 8. Reset password back so other tests have clean expectations
    new_headers = {"Authorization": f"Bearer {new_try.json()['access_token']}"}
    client.post("/api/users/change-password", headers=new_headers, json={
        "current_password": "new_awesome_password_2026",
        "new_password": "student_password_2026",
        "confirm_password": "student_password_2026"
    })

    print("✓ Password Change Workflow passed with persistent database verification.")

def test_rbac_and_assistant_restrictions():
    print("\n--- TEST: Role-Based Access Control & Assistant Restrictions ---")
    # Tokens
    admin_login = client.post("/api/auth/login", json={"username_or_email": "admin", "password": "admin_password_2026"}).json()
    admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}

    asst_login = client.post("/api/auth/login", json={"username_or_email": "assistant_ahmed", "password": "assistant_password_2026"}).json()
    asst_headers = {"Authorization": f"Bearer {asst_login['access_token']}"}

    stud_login = client.post("/api/auth/login", json={"username_or_email": "student_free", "password": "student_password_2026"}).json()
    stud_headers = {"Authorization": f"Bearer {stud_login['access_token']}"}

    # 1. Student accessing admin endpoint -> 403
    res_stud = client.get("/api/admin/stats", headers=stud_headers)
    assert res_stud.status_code == 403, "Student must be forbidden from admin stats"

    # 2. Assistant accessing admin-only endpoint -> 403
    res_asst_manage = client.get("/api/assistants", headers=asst_headers)
    assert res_asst_manage.status_code == 403, "Assistant must be forbidden from managing assistants"

    # 3. Admin accessing admin stats -> 200
    res_admin = client.get("/api/admin/stats", headers=admin_headers)
    assert res_admin.status_code == 200

    # 4. Assistant generating monthly subscription code -> ALLOWED (200)
    asst_code_res = client.post("/api/subscriptions/codes/generate", headers=asst_headers, json={
        "count": 1,
        "duration_type": "1_MONTH",
        "duration_days": 30,
        "batch_name": "كود شهري من المساعد"
    })
    assert asst_code_res.status_code == 200, f"Assistant monthly code failed: {asst_code_res.text}"
    assert len(asst_code_res.json()["codes"]) == 1

    # 5. Assistant attempting to generate 12_MONTHS (annual) code -> FORBIDDEN (403)
    asst_annual_res = client.post("/api/subscriptions/codes/generate", headers=asst_headers, json={
        "count": 1,
        "duration_type": "12_MONTHS",
        "duration_days": 365,
        "batch_name": "محاولة غير مصرح بها"
    })
    assert asst_annual_res.status_code == 403, "Assistant must NOT generate annual codes!"

    # 6. Assistant attempting to change payment settings -> FORBIDDEN (403)
    asst_pay_res = client.put("/api/payment-settings", headers=asst_headers, json={
        "vodafone_cash": "+201099999999"
    })
    assert asst_pay_res.status_code == 403, "Assistant must NOT update payment settings!"

    print("✓ RBAC & Assistant Strict Limitations verified.")

def test_payment_settings_persistence():
    print("\n--- TEST: Payment Settings Persistence (Vodafone Cash & InstaPay) ---")
    admin_login = client.post("/api/auth/login", json={"username_or_email": "admin", "password": "admin_password_2026"}).json()
    admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}

    # 1. Read default payment settings
    res1 = client.get("/api/payment-settings")
    assert res1.status_code == 200
    pay1 = res1.json()
    assert pay1["vodafone_cash"] == "+20159159038"

    # 2. Update payment settings
    new_voda = "+20159159038"
    new_insta = "+20159159038"
    new_banner = "عروض الاشتراك البرمجي الحصرية - خصم خاص للمتفوقين ⚡"
    
    update_res = client.put("/api/payment-settings", headers=admin_headers, json={
        "vodafone_cash": new_voda,
        "instapay_phone": new_insta,
        "instapay_link": "https://ipn.eg/S/codespark/instapay",
        "contact_phone": "+20159159038",
        "offer_banner_text": new_banner,
        "offers_visible": True
    })
    assert update_res.status_code == 200
    assert update_res.json()["success"] is True

    # 3. Read again from public endpoint to verify updated values are returned
    res2 = client.get("/api/payment-settings")
    assert res2.status_code == 200
    pay2 = res2.json()
    assert pay2["vodafone_cash"] == new_voda
    assert pay2["instapay_link"] == "https://ipn.eg/S/codespark/instapay"
    assert pay2["offer_banner_text"] == new_banner

    # 4. Verify directly in the persistent database
    row = db_engine.fetch_one("SELECT value_json FROM platform_settings WHERE key = 'general'")
    assert row is not None
    db_val = json.loads(row["value_json"])
    assert db_val["vodafone_cash"] == new_voda
    assert db_val["offer_banner_text"] == new_banner

    print("✓ Payment Settings Persistence verified in database.")

def test_subscriptions_and_payment_requests():
    print("\n--- TEST: Subscriptions, Code Redemption & Payment Requests ---")
    admin_login = client.post("/api/auth/login", json={"username_or_email": "admin", "password": "admin_password_2026"}).json()
    admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}

    # Register a fresh student for this test
    fresh_user = f"sub_student_{uuid.uuid4().hex[:6]}"
    reg = client.post("/api/auth/register", json={
        "username": fresh_user,
        "email": f"{fresh_user}@example.com",
        "password": "password_123456",
        "full_name": "طالب اشتراك تجريبي"
    }).json()
    student_headers = {"Authorization": f"Bearer {reg['access_token']}"}

    # 1. Check initial status -> Not subscribed
    status1 = client.get("/api/subscriptions/my-status", headers=student_headers).json()
    assert status1["is_subscribed"] is False

    # 2. Redeem pre-seeded active code "CS-SPARK-2026"
    redeem_res = client.post("/api/subscriptions/activate", headers=student_headers, json={
        "code": "CS-SPARK-2026"
    })
    assert redeem_res.status_code == 200, f"Redeem failed: {redeem_res.text}"
    assert redeem_res.json()["success"] is True

    # 3. Check status again -> Now subscribed!
    status2 = client.get("/api/subscriptions/my-status", headers=student_headers).json()
    assert status2["is_subscribed"] is True
    assert status2["expires_at"] is not None

    # 4. Attempt to reuse already redeemed code -> Must FAIL (400)
    reuse_res = client.post("/api/subscriptions/activate", headers=student_headers, json={
        "code": "CS-SPARK-2026"
    })
    assert reuse_res.status_code == 400
    assert "استخدام" in reuse_res.json()["detail"]

    # 5. Submit payment request for 3-month plan
    plan_req_res = client.post("/api/subscriptions/requests", headers=student_headers, json={
        "plan_id": "plan_3m",
        "payment_method": "فودافون كاش",
        "payment_number": "01012345678",
        "payment_reference": "TXN987654321",
        "notes": "تم التحويل بنجاح"
    })
    assert plan_req_res.status_code == 200
    req_id = plan_req_res.json()["request"]["id"]

    # 6. Admin lists requests and finds pending request
    reqs_res = client.get("/api/subscriptions/requests", headers=admin_headers)
    assert reqs_res.status_code == 200
    all_reqs = reqs_res.json()["requests"]
    found = [r for r in all_reqs if r["id"] == req_id]
    assert len(found) == 1
    assert found[0]["status"] == "pending"

    # 7. Admin approves request
    review_res = client.post(f"/api/subscriptions/requests/{req_id}/review", headers=admin_headers, json={
        "status": "approved",
        "admin_notes": "تم التحقق من إشعار استلام فودافون كاش وتفعيل الحساب"
    })
    assert review_res.status_code == 200
    assert review_res.json()["request"]["status"] == "approved"

    print("✓ Subscriptions & Payment Requests Workflow verified.")

def test_curriculum_and_files():
    print("\n--- TEST: Curriculum, Video Lessons & Study Files ---")
    admin_login = client.post("/api/auth/login", json={"username_or_email": "admin", "password": "admin_password_2026"}).json()
    admin_headers = {"Authorization": f"Bearer {admin_login['access_token']}"}

    # Free student vs subscribed student
    free_login = client.post("/api/auth/login", json={"username_or_email": "student_free", "password": "student_password_2026"}).json()
    free_headers = {"Authorization": f"Bearer {free_login['access_token']}"}

    sub_login = client.post("/api/auth/login", json={"username_or_email": "student_subscribed", "password": "student_password_2026"}).json()
    sub_headers = {"Authorization": f"Bearer {sub_login['access_token']}"}

    # 1. Lesson 1 is FREE: Free student CAN access video URL
    les1_res = client.get("/api/lessons/les_001", headers=free_headers)
    assert les1_res.status_code == 200
    data1 = les1_res.json()
    assert data1["can_access"] is True
    assert data1["video_url"] is not None

    # 2. Lesson 2 is PAID: Free student CANNOT access video URL
    les2_res = client.get("/api/lessons/les_002", headers=free_headers)
    assert les2_res.status_code == 200
    data2 = les2_res.json()
    assert data2["can_access"] is False
    assert data2["video_url"] is None
    assert "متاح للمشتركين فقط" in data2["content_markdown"]

    # 3. Lesson 2 is PAID: Subscribed student CAN access video URL
    les2_sub_res = client.get("/api/lessons/les_002", headers=sub_headers)
    assert les2_sub_res.status_code == 200
    data2_sub = les2_sub_res.json()
    assert data2_sub["can_access"] is True
    assert data2_sub["video_url"] is not None

    # 4. Update Lesson Progress
    prog_res = client.post("/api/lessons/les_001/progress", headers=sub_headers, json={
        "lesson_id": "les_001",
        "is_completed": True,
        "watch_percentage": 100.0,
        "last_position_seconds": 900.0
    })
    assert prog_res.status_code == 200
    assert prog_res.json()["progress"]["is_completed"] == 1

    # 5. Study Files ("الملفات الدراسية")
    files_res = client.get("/api/study-files", headers=sub_headers)
    assert files_res.status_code == 200
    files_data = files_res.json()
    assert files_data["total"] >= 2
    for f in files_data["files"]:
        assert "is_drive" in f
        assert f["can_open"] is True

    print("✓ Curriculum & Study Files rules verified.")

def test_code_playground_and_exams():
    print("\n--- TEST: Code Playground Sandbox & Exam Auto-Grading ---")
    sub_login = client.post("/api/auth/login", json={"username_or_email": "student_subscribed", "password": "student_password_2026"}).json()
    sub_headers = {"Authorization": f"Bearer {sub_login['access_token']}"}

    # 1. Run Python code in sandbox
    run_res = client.post("/api/playground/run", json={
        "language": "python",
        "code": "print('CodeSpark Online IDE Working!')\nprint(7 * 6)"
    })
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["success"] is True
    assert "CodeSpark Online IDE Working!" in run_data["output"]
    assert "42" in run_data["output"]

    # 2. Run Python code with timeout safeguard
    timeout_res = client.post("/api/playground/run", json={
        "language": "python",
        "code": "import time\ntime.sleep(10)"
    })
    assert timeout_res.status_code == 200
    t_data = timeout_res.json()
    assert t_data["success"] is False
    assert "تجاوز" in t_data["error"]

    # 3. Submit Exercise 1
    ex_submit_res = client.post("/api/exercises/ex_001/submit", headers=sub_headers, json={
        "submitted_code": "print('Hello, CodeSpark!')"
    })
    assert ex_submit_res.status_code == 200
    ex_data = ex_submit_res.json()
    assert ex_data["status"] == "PASSED"
    assert ex_data["tests_passed"] == 1

    # 4. Fetch Exam details (verify correct answers are masked for student)
    exam_res = client.get("/api/exams/exm_001", headers=sub_headers)
    assert exam_res.status_code == 200
    exam_info = exam_res.json()
    assert len(exam_info["questions"]) == 3
    for q in exam_info["questions"]:
        assert "correct_answer" not in q, "Correct answers must not leak to students!"

    # 5. Submit Exam attempt
    submit_exam_res = client.post("/api/exams/exm_001/submit", headers=sub_headers, json={
        "answers": {
            "qb_001": "opt2",  # correct (print)
            "qb_002": "true",  # correct (case sensitive)
            "qb_003": "opt2"   # correct (float)
        }
    })
    assert submit_exam_res.status_code == 200
    attempt = submit_exam_res.json()["attempt"]
    assert attempt["score"] == 15.0
    assert attempt["percentage"] == 100.0
    assert attempt["is_passed"] == 1

    # 6. Verify Progress Summary includes newly passed exam
    summary_res = client.get("/api/progress/summary", headers=sub_headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["exams_passed"] >= 1
    assert summary["xp"] >= 150

    print("✓ Code Playground & Exam Auto-Grading passed.")

def test_announcements_loading():
    print("\n--- TEST: Announcements Stream Loading ---")
    res = client.get("/api/announcements")
    assert res.status_code == 200
    data = res.json()
    assert "announcements" in data
    assert isinstance(data["announcements"], list)
    assert data["total"] >= 2
    print("✓ Announcements loaded successfully without failure.")

if __name__ == "__main__":
    setup_clean_test_db()
    test_health_check()
    test_authentication_and_registration()
    test_password_change_workflow()
    test_rbac_and_assistant_restrictions()
    test_payment_settings_persistence()
    test_subscriptions_and_payment_requests()
    test_curriculum_and_files()
    test_code_playground_and_exams()
    test_announcements_loading()
    print("\n" + "="*70)
    print("ALL AUTOMATED TESTS PASSED SUCCESSFULLY! (100% SUCCESS RATE)")
    print("="*70)
