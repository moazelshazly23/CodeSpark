import secrets
import os
import logging
from pathlib import Path

logger = logging.getLogger("codespark.config")

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

def _load_env_file():
    """Load key-value pairs from .env file into os.environ if in development and not already set."""
    # In production mode, environment variables must be injected explicitly by the environment/container
    if os.getenv("ENVIRONMENT", "").lower() == "production":
        return
    env_paths = [
        PROJECT_ROOT / ".env",
        BASE_DIR / ".env",
        Path.cwd() / ".env"
    ]
    for p in env_paths:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'\"")
                            if k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass
            break

_load_env_file()

# Environment type: production, development, testing
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# Security & Secrets from Environment
_raw_secret = os.getenv("CODESPARK_SECRET_KEY") or os.getenv("JWT_SECRET")

if ENVIRONMENT == "production":
    if not _raw_secret or not _raw_secret.strip() or _raw_secret.strip() == "YOUR_SECURE_JWT_SECRET_KEY_HERE":
        raise RuntimeError(
            "CRITICAL SECURITY ERROR: CODESPARK_SECRET_KEY environment variable is missing in production environment. Application startup aborted."
        )
else:
    if not _raw_secret:
        _raw_secret = secrets.token_urlsafe(48)

SECRET_KEY = _raw_secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days default

# Database configuration: PostgreSQL in production or local SQLite
_default_db = "/tmp/codespark_production.db" if os.path.exists("/tmp") else str(Path(__file__).resolve().parent.parent / "codespark_production.db")
DATABASE_PATH = os.getenv("DATABASE_PATH", _default_db)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH}")
DATABASE_POOL_SIZE = int(os.getenv("DATABASE_POOL_SIZE", "10"))

# Server configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")

# Allowed CORS Origins - Supports CORS_ALLOWED_ORIGINS, CORS_ORIGINS, ALLOWED_ORIGINS, FRONTEND_URL
FRONTEND_URL = os.getenv("FRONTEND_URL", "").strip()
raw_cors = os.getenv("CORS_ALLOWED_ORIGINS") or os.getenv("CORS_ORIGINS") or os.getenv("ALLOWED_ORIGINS") or ""

if ENVIRONMENT == "production":
    if raw_cors:
        origins_split = [o.strip() for o in raw_cors.split(",") if o.strip()]
        if "*" in origins_split or raw_cors.strip() == "*":
            raise RuntimeError(
                "CRITICAL SECURITY ERROR: Wildcard CORS ('*') is strictly forbidden in production environment. Provide explicit CORS_ALLOWED_ORIGINS."
            )
        origins_set = set()
        for o in origins_split:
            if o != "*":
                origins_set.add(o.rstrip("/"))
        if FRONTEND_URL and FRONTEND_URL != "*":
            origins_set.add(FRONTEND_URL.rstrip("/"))
        ALLOWED_ORIGINS = list(origins_set) if origins_set else ["https://codespark.pages.dev"]
    elif FRONTEND_URL and FRONTEND_URL != "*":
        ALLOWED_ORIGINS = [FRONTEND_URL.rstrip("/")]
    else:
        ALLOWED_ORIGINS = ["https://codespark.pages.dev", "http://localhost:8000", "http://127.0.0.1:8000"]
else:
    if not raw_cors and not FRONTEND_URL:
        ALLOWED_ORIGINS = ["*"]
    else:
        origins_set = set()
        if raw_cors:
            if raw_cors.strip() == "*":
                origins_set.add("*")
            else:
                for o in raw_cors.split(","):
                    clean = o.strip()
                    if clean:
                        origins_set.add(clean.rstrip("/"))
        if FRONTEND_URL:
            origins_set.add(FRONTEND_URL.rstrip("/"))
        ALLOWED_ORIGINS = list(origins_set) if origins_set else ["*"]

# Static frontend path
FRONTEND_DIR = str(PROJECT_ROOT)

# SMTP Email Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@codespark.edu.eg").strip()
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "CodeSpark Education | منصة كود سبارك").strip()
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "True").lower() in ("true", "1", "t", "yes")
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "False").lower() in ("true", "1", "t", "yes")


# Super Admin Initial Credentials (Optional via Environment)
ADMIN_NAME = os.getenv("ADMIN_NAME", "المهندس معاذ الشاذلي").strip()
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").strip()
ADMIN_PHONE = os.getenv("ADMIN_PHONE", "").strip()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "").strip()
