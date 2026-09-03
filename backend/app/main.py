import os
import logging
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from .config import FRONTEND_DIR, ALLOWED_ORIGINS, ENVIRONMENT, DEBUG
from .database import check_db_health, init_db, get_db_type, get_db
from .seed_data import seed_database
from .routers import (
    auth, student_api, curriculum, progress, questions, exams, quizzes,
    subscriptions, students, announcements, notifications, support, code_exec,
    assistants, activity_logs, resources
)

# Configure structured application logger
logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("codespark.app")

app = FastAPI(
    title="Code Spark API",
    description="Production Backend API for Code Spark - High School Secondary Programming Educational Platform",
    version="2.0.0-production"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    if ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Include API Routers
app.include_router(auth.router)
app.include_router(student_api.router)
app.include_router(curriculum.router)
app.include_router(progress.router)
app.include_router(questions.router)
app.include_router(exams.router)
app.include_router(quizzes.router)
app.include_router(quizzes.admin_router)
app.include_router(subscriptions.router)
app.include_router(students.router)
app.include_router(announcements.router)
app.include_router(notifications.router)
app.include_router(support.router)
app.include_router(code_exec.router)
app.include_router(assistants.router)
app.include_router(activity_logs.router)
app.include_router(resources.router)

@app.on_event("startup")
def on_startup():
    """Ensure database schema is initialized and seed data is available."""
    db_engine = get_db_type()
    logger.info(f"Starting Code Spark Backend [Environment: {ENVIRONMENT}, Database Engine: {db_engine.upper()}]")
    try:
        init_db()
        seed_database()
        # Synchronize Super Admin credentials from ADMIN_PASSWORD environment variable only
        from .security import hash_password, verify_password
        from .config import ADMIN_PASSWORD
        with get_db() as conn:
            c = conn.cursor()
            c.execute("SELECT id, password_hash FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'super_admin') LIMIT 1")
            row = c.fetchone()
            if ADMIN_PASSWORD:
                if not row or not verify_password(ADMIN_PASSWORD, row.get("password_hash", "")):
                    h = hash_password(ADMIN_PASSWORD)
                    c.execute("""
                    UPDATE users
                    SET password_hash = ?, status = 'ACTIVE', is_active = 1, is_deleted = 0
                    WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'super_admin') OR id = 'admin_1'
                    """, (h,))
                    logger.info("Super Admin credentials synchronized from ADMIN_PASSWORD environment variable.")
            else:
                if not row or not row.get("password_hash"):
                    logger.warning("SECURITY NOTICE: Super Admin account has no password set and ADMIN_PASSWORD is missing in environment. Please set ADMIN_PASSWORD in your .env file or run 'python reset_admin.py'.")
        logger.info("Database schema and initial seed verification successful.")
    except Exception as e:
        logger.error(f"Error during startup database initialization: {e}")

@app.get("/api/health")
@app.get("/health")
def health_check():
    """System and database connectivity health check."""
    db_health = check_db_health()
    is_db_ok = db_health.get("status") == "ok"
    
    response_data = {
        "status": "ok" if is_db_ok else "degraded",
        "database": "ok" if is_db_ok else "error",
        "engine": db_health.get("engine", get_db_type()),
        "platform": "Code Spark",
        "version": "2.0.0-production",
        "environment": ENVIRONMENT
    }
    
    if not is_db_ok:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response_data
        )
    return response_data

# Mount Static Directories for direct web serving
if os.path.exists(os.path.join(FRONTEND_DIR, "css")):
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
if os.path.exists(os.path.join(FRONTEND_DIR, "js")):
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
if os.path.exists(os.path.join(FRONTEND_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

# Root / Single Page Application handler
@app.get("/")
def serve_index():
    index_file = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse({"message": "Code Spark API is online"})
