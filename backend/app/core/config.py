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

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.path.abspath("app/core")
BASE_BACKEND_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))

# Storage & DB Paths resolved cleanly within user working directory
DEFAULT_STORAGE_DIR = os.path.abspath(os.path.join(BASE_BACKEND_DIR, "storage"))
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
        "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", 
        "zip", "png", "jpg", "jpeg", "webp", "mp4", "webm"
    ]
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

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
