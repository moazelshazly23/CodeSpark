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

# Import all 19 domain routers
from app.api.routers.auth_router import router as auth_router
from app.api.routers.subscriptions_router import router as subscriptions_router
from app.api.routers.courses_router import router as courses_router
from app.api.routers.units_router import router as units_router
from app.api.routers.lessons_router import router as lessons_router
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

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)


# Auto-seed initial data on cloud/fresh container startup if database is empty
@app.on_event("startup")
def startup_event():
    try:
        from app.db.engine import db_engine
        from app.db.seed import seed_database
        user_count = db_engine.fetch_one("SELECT COUNT(*) as c FROM users")
        if not user_count or user_count.get("c", 0) == 0:
            print("Empty database detected on startup. Auto-seeding initial data...")
            seed_database()
            print("✓ Database auto-seeded successfully on startup!")
    except Exception as e:
        print(f"Startup auto-seed notification: {e}")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Error Handler - Clean, structured responses without stack trace leaks
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "حدث خطأ غير متوقع في الخادم، يرجى المحاولة لاحقًا", "error_type": exc.__class__.__name__}
    )

# Health Check
@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "Relational SQLite / PostgreSQL compatible"
    }

# Register all Routers under /api
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(subscriptions_router, prefix=settings.API_V1_STR)
app.include_router(courses_router, prefix=settings.API_V1_STR)
app.include_router(units_router, prefix=settings.API_V1_STR)
app.include_router(lessons_router, prefix=settings.API_V1_STR)
app.include_router(resources_router, prefix=settings.API_V1_STR)
app.include_router(exercises_router, prefix=settings.API_V1_STR)
app.include_router(questions_router, prefix=settings.API_V1_STR)
app.include_router(quizzes_router, prefix=settings.API_V1_STR)
app.include_router(exams_router, prefix=settings.API_V1_STR)
app.include_router(progress_router, prefix=settings.API_V1_STR)
app.include_router(bookmarks_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(announcements_router, prefix=settings.API_V1_STR)
app.include_router(support_router, prefix=settings.API_V1_STR)
app.include_router(assistants_router, prefix=settings.API_V1_STR)
app.include_router(students_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(playground_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(activity_router, prefix=settings.API_V1_STR)

# Mount Static Storage
if os.path.exists(settings.STORAGE_DIR):
    app.mount("/storage", StaticFiles(directory=settings.STORAGE_DIR), name="storage")

# Mount Frontend Static Assets & SPA Fallback
possible_frontend_dirs = [
    os.path.abspath("../frontend"),
    os.path.abspath("frontend"),
    os.path.abspath("CodeSpark/frontend"),
    os.path.abspath("../CodeSpark/frontend"),
    os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../frontend")) if "__file__" in globals() else None,
    os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../frontend")) if "__file__" in globals() else None,
    "/app/frontend",
    "/app/CodeSpark/frontend",
    "/working_dir/CodeSpark/frontend"
]
frontend_dir = None
for p in possible_frontend_dirs:
    if p and os.path.exists(p) and os.path.isfile(os.path.join(p, "index.html")):
        frontend_dir = p
        break

if not frontend_dir:
    frontend_dir = os.path.abspath("../frontend")

if os.path.exists(frontend_dir):
    for sub in ["css", "js", "assets", "static"]:
        sub_path = os.path.join(frontend_dir, sub)
        if os.path.exists(sub_path):
            app.mount(f"/{sub}", StaticFiles(directory=sub_path), name=f"frontend_{sub}")
    app.mount("/static", StaticFiles(directory=frontend_dir), name="frontend_root_static")

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
        
        # Guard: Never return HTML for broken script or stylesheet requests
        ext = os.path.splitext(full_path)[1].lower()
        if ext in [".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".ico", ".json"]:
            return JSONResponse(status_code=404, content={"detail": f"File '{full_path}' not found"})

        index_file = os.path.join(frontend_dir, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return JSONResponse(content={"platform": settings.PROJECT_NAME, "status": "running"})
