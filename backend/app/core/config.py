
import os
from pathlib import Path
from typing import List


class Settings:
    PROJECT_NAME: str = "CodeSpark Educational Platform"
    PROJECT_DESCRIPTION: str = (
        "منصة كود سبارك لتعليم البرمجة التأسيسية "
        "لطلاب المرحلة الثانوية في جمهورية مصر العربية"
    )
    VERSION: str = "2.5.0-production"
    API_V1_STR: str = "/api"

    # Security & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(
        os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30")
    )

    # Persistent data directory
    BASE_DIR: str = str(
        Path(__file__).resolve().parents[2]
    )

    DATA_DIR: str = os.getenv(
        "DATA_DIR",
        os.path.join(BASE_DIR, "data")
    )

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(DATA_DIR, 'codespark_persistent.db')}"
    )

    # File storage
    UPLOAD_DIR: str = os.getenv(
        "UPLOAD_DIR",
        os.path.join(DATA_DIR, "uploads")
    )

    # Payment Defaults
    DEFAULT_VODAFONE_CASH: str = os.getenv(
        "DEFAULT_VODAFONE_CASH", ""
    )
    DEFAULT_INSTAPAY_PHONE: str = os.getenv(
        "DEFAULT_INSTAPAY_PHONE", ""
    )
    DEFAULT_INSTAPAY_LINK: str = os.getenv(
        "DEFAULT_INSTAPAY_LINK", ""
    )
    DEFAULT_CONTACT_PHONE: str = os.getenv(
        "DEFAULT_CONTACT_PHONE", ""
    )

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # Code Execution
    PYTHON_EXECUTABLE: str = os.getenv("PYTHON_EXECUTABLE", "")
    NODE_EXECUTABLE: str = os.getenv("NODE_EXECUTABLE", "")


settings = Settings()


def ensure_storage_directories() -> None:
    """Create storage directories and report actionable errors."""
    for directory in (settings.DATA_DIR, settings.UPLOAD_DIR):
        try:
            Path(directory).mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            raise RuntimeError(
                f"Cannot create storage directory: {directory}. "
                "Configure DATA_DIR and UPLOAD_DIR to writable paths."
            ) from exc


if not settings.SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY is missing. Set a strong random value "
        "in the deployment environment."
    )

ensure_storage_directories()
