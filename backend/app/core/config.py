"""
Code Spark - Centralized Application Configuration
Environment Variables & Application Settings
Cross-platform compatibility (Windows, Linux, Docker, Python 3.10-3.14, Pydantic v1 & v2)
"""
import os
from typing import List

try:
    from pydantic_settings import BaseSettings
except ImportError:
    try:
        from pydantic import BaseSettings
    except ImportError:
        class BaseSettings:
            pass

_this_file = globals().get("__file__")
if not _this_file and "__spec__" in globals() and getattr(__spec__, "origin", None):
    _this_file = __spec__.origin

if _this_file:
    CURRENT_DIR = os.path.dirname(os.path.abspath(_this_file))
    BASE_BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
else:
    BASE_BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))

candidate_storage = os.path.abspath(os.path.join(BASE_BACKEND_DIR, "..", "storage"))
if os.path.exists(candidate_storage) and os.access(candidate_storage, os.W_OK):
    DEFAULT_STORAGE_DIR = candidate_storage
else:
    DEFAULT_STORAGE_DIR = "/tmp/codespark_storage"
os.makedirs(DEFAULT_STORAGE_DIR, exist_ok=True)

DEFAULT_DB_PATH = os.path.abspath(os.path.join(BASE_BACKEND_DIR, "codespark.db"))

class Settings(BaseSettings):
    PROJECT_NAME: str = "Code Spark"
    PROJECT_DESCRIPTION: str = "منصة كود سبارك التعليمية المتقدمة لتدريس البرمجة"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "codespark_super_secret_production_key_2026_blue_cyan_spark")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
    DB_PATH: str = os.getenv("DB_PATH", DEFAULT_DB_PATH)

    # Storage Configuration
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", DEFAULT_STORAGE_DIR)
    MAX_UPLOAD_SIZE_MB: int = 100
    ALLOWED_EXTENSIONS: List[str] = [
        "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "zip", "png", "jpg", "jpeg", "webp", "mp4", "webm"
    ]

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # AI Coding Assistant
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")

    # Official Payment & Subscription Info
    OFFICIAL_CONTACT_PHONE: str = os.getenv("OFFICIAL_CONTACT_PHONE", "+20159159038")
    INSTAPAY_PHONE: str = os.getenv("INSTAPAY_PHONE", "+20159159038")
    INSTAPAY_LINK: str = os.getenv("INSTAPAY_LINK", "https://ipn.eg/S/moazasem/instapay/27DsGj")

    class Config:
        case_sensitive = True
        extra = "allow"

settings = Settings()

try:
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    os.makedirs(os.path.join(settings.STORAGE_DIR, "files"), exist_ok=True)
    os.makedirs(os.path.join(settings.STORAGE_DIR, "videos"), exist_ok=True)
except Exception:
    pass
