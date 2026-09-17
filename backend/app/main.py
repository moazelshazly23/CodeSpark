"""
Code Spark - Master FastAPI Application Entrypoint
Modular, Secure, High-Performance Educational Backend
"""
import os
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

# Import all domain routers
from app.api.routers.auth_router import router as auth_router
from app.api.routers.subscriptions_router import router as subscriptions_router
from app.api.routers.courses_router import router as courses_router
from app.api.routers.units_router import router as units_router
from app.api.routers.lessons_router import router as lessons_router
from app.api.routers.files_router import router as files_router
from app.api.routers.resources_router import router as resources_router
from app.api.routers.exercises_router import router as exercises_router
from app.api.routers.questions_router import router as questions_router
from app.api.routers.quizzes_router import router as quizzes_router
from app.api.routers.exams_router import router as exams_router
from app.api.routers.progress_router import router as progress_router
from app.api.routers.bookmarks_router import router as bookmarks_router
from app.api.routers.notifications_router import router as notifications_router
from app.api.routers.announcements_router import router as announcements_router
from app.api.routers.support_router import router as support_router
from app.api.routers.assistants_router import router as assistants_router
from app.api.routers.students_router import router as students_router
from app.api.routers.admin_router import router as admin_router
from app.api.routers.playground_router import router as playground_router
from app.api.routers.users_router import router as users_router
from app.api.routers.activity_router import router as activity_router
from app.api.routers.settings_router import router as settings_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Startup Hook: Seed ONLY if database has zero users
@app.on_event("startup")
def startup_event():
    try:
        from app.db.engine import db_engine
        from app.db.seed import seed_database
        user_count = db_engine.fetch_val("SELECT COUNT(*) FROM users") or 0
        if user_count == 0:
            print("Empty database detected on startup. Initializing safe baseline data...")
            seed_database(force=False)
            print("✓ Safe baseline seeded successfully.")
    except Exception as e:
        print(f"Startup check notification: {e}")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Error Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "حدث خطأ في الخادم، يرجى المحاولة لاحقًا", "error_type": exc.__class__.__name__}
    )

# Health Check
@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "SQLite WAL Engine (Zero Lock Contention)"
    }

# Register all Routers under /api
api_prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=api_prefix)
app.include_router(users_router, prefix=api_prefix)
app.include_router(subscriptions_router, prefix=api_prefix)
app.include_router(courses_router, prefix=api_prefix)
app.include_router(units_router, prefix=api_prefix)
app.include_router(lessons_router, prefix=api_prefix)
app.include_router(files_router, prefix=api_prefix)
app.include_router(resources_router, prefix=api_prefix)
app.include_router(exercises_router, prefix=api_prefix)
app.include_router(questions_router, prefix=api_prefix)
app.include_router(quizzes_router, prefix=api_prefix)
app.include_router(exams_router, prefix=api_prefix)
app.include_router(progress_router, prefix=api_prefix)
app.include_router(bookmarks_router, prefix=api_prefix)
app.include_router(notifications_router, prefix=api_prefix)
app.include_router(announcements_router, prefix=api_prefix)
app.include_router(support_router, prefix=api_prefix)
app.include_router(assistants_router, prefix=api_prefix)
app.include_router(students_router, prefix=api_prefix)
app.include_router(admin_router, prefix=api_prefix)
app.include_router(playground_router, prefix=api_prefix)
app.include_router(activity_router, prefix=api_prefix)
app.include_router(settings_router, prefix=api_prefix)

# Mount Static Storage
if os.path.exists(settings.STORAGE_DIR):
    app.mount("/storage", StaticFiles(directory=settings.STORAGE_DIR), name="storage")

# Resolve Frontend Directory
frontend_candidates = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend")),
    os.path.abspath("frontend"),
    os.path.abspath("../frontend")
]
frontend_dir = None
for cand in frontend_candidates:
    if os.path.exists(cand) and os.path.isfile(os.path.join(cand, "index.html")):
        frontend_dir = cand
        break

if not frontend_dir:
    frontend_dir = frontend_candidates[0]

if os.path.exists(frontend_dir):
    for sub in ["css", "js", "assets", "static"]:
        sub_path = os.path.join(frontend_dir, sub)
        if os.path.exists(sub_path):
            app.mount(f"/{sub}", StaticFiles(directory=sub_path), name=f"frontend_{sub}")

@app.get("/")
async def serve_root():
    index_file = os.path.join(frontend_dir, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    return JSONResponse(content={"platform": settings.PROJECT_NAME, "status": "running"})

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        return JSONResponse(status_code=404, content={"detail": "Not found"})
    candidate = os.path.join(frontend_dir, full_path)
    if os.path.isfile(candidate):
        return FileResponse(candidate)
    ext = os.path.splitext(full_path)[1].lower()
    if ext in [".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".ico", ".json"]:
        return JSONResponse(status_code=404, content={"detail": f"File '{full_path}' not found"})
    index_file = os.path.join(frontend_dir, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    return JSONResponse(content={"platform": settings.PROJECT_NAME, "status": "running"})
