"""
Code Spark - Test-Only Credentials and Environment Configuration.
Strictly isolated for automated regression and integration testing.
Never used in production.
"""
import os

TEST_ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "test-admin-sandbox-pass-2026")
TEST_ASSISTANT_PASSWORD = os.getenv("TEST_ASSISTANT_PASSWORD", "test-assistant-sandbox-pass-2026")
TEST_STUDENT_PASSWORD = os.getenv("TEST_STUDENT_PASSWORD", "test-student-sandbox-pass-2026")

def apply_test_credentials_env():
    """Inject test-only passwords into environment before seeding database."""
    os.environ["ADMIN_PASSWORD"] = TEST_ADMIN_PASSWORD
    os.environ["ASSISTANT_PASSWORD"] = TEST_ASSISTANT_PASSWORD
    os.environ["STUDENT_DEFAULT_PASSWORD"] = TEST_STUDENT_PASSWORD
    os.environ["CODESPARK_SECRET_KEY"] = os.getenv("TEST_SECRET_KEY", "test-jwt-secret-key-32-characters-long-automated-testing")
