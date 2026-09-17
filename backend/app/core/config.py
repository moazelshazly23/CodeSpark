"""
CodeSpark - Centralized Configuration Management
Provides strict type-safe environment variables and configuration defaults.
"""
import os
from typing import List

class Settings:
    PROJECT_NAME: str = "CodeSpark Educational Platform"
    PROJECT_DESCRIPTION: str = "منصة كود سبارك لتعليم البرمجة التأسيسية لطلاب المرحلة الثانوية في جمهورية مصر العربية"
    VERSION: str = "2.5.0-production"
    API_V1_STR: str = "/api"

    # Security & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "codespark_super_secret_production_key_2026_egypt_secondary")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

    # Persistent Data Directory (uses /home/spark/codespark_data for reliable file locking)
    DATA_DIR: str = os.getenv("DATA_DIR", "/home/spark/codespark_data")
    
    # Database Configuration
    # Supports PostgreSQL connection strings (e.g. postgresql://user:pass@localhost:5432/codespark)
    # or persistent SQLite file path for local development/testing.
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(DATA_DIR, 'codespark_persistent.db')}"
    )

    # File Storage
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(DATA_DIR, "uploads"))

    # Payment Defaults
    DEFAULT_VODAFONE_CASH: str = os.getenv("DEFAULT_VODAFONE_CASH", "+20159159038")
    DEFAULT_INSTAPAY_PHONE: str = os.getenv("DEFAULT_INSTAPAY_PHONE", "+20159159038")
    DEFAULT_INSTAPAY_LINK: str = os.getenv("DEFAULT_INSTAPAY_LINK", "https://ipn.eg/S/moazasem/instapay/27DsGj")
    DEFAULT_CONTACT_PHONE: str = os.getenv("DEFAULT_CONTACT_PHONE", "+20159159038")

    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # Code Execution Environment
    PYTHON_EXECUTABLE: str = os.getenv("PYTHON_EXECUTABLE", "")
    NODE_EXECUTABLE: str = os.getenv("NODE_EXECUTABLE", "")

settings = Settings()

# Ensure directories exist
os.makedirs(settings.DATA_DIR, exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
