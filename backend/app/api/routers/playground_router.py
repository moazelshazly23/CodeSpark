from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uuid, json
from app.api.deps import get_current_user, get_optional_user
from app.services.core_services import CodeRunnerService
from app.services.ai_assistant import AIAssistantService
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/playground", tags=["Code Playground & Web Workspace"])

class CodeRunRequest(BaseModel):
    language: str  # python, javascript, html, css, web
    code: str
    user_input: Optional[str] = ""

class AIAssistRequest(BaseModel):
    action: str  # explain, hint, fix, complete, detect_error, improve
    code: str
    language: str = "python"
    error_message: Optional[str] = None
    student_question: Optional[str] = None

class WebProjectSaveRequest(BaseModel):
    title: str
    description: Optional[str] = None
    files: Dict[str, str]  # {"index.html": "...", "style.css": "...", "script.js": "..."}

@router.post("/run")
def execute_code(req: CodeRunRequest, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    try:
        res = CodeRunnerService.execute_code(req.language, req.code, req.user_input or "")
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/ai-assist")
def ai_coding_assistant(req: AIAssistRequest, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    try:
        return AIAssistantService.analyze(
            action=req.action,
            code=req.code,
            language=req.language,
            error_message=req.error_message,
            student_question=req.student_question
        )
    except Exception as e:
        return {
            "success": False,
            "title": "مساعد البرمجة",
            "explanation": f"تعذر إكمال التحليل حالياً: {str(e)}",
            "hint": "تأكد من كتابة الكود بشكل صحيح وإعادة المحاولة."
        }

@router.get("/projects")
def list_user_projects(user: Dict[str, Any] = Depends(get_current_user)):
    projects = db_engine.fetch_all(
        "SELECT id, user_id, title, description, created_at, updated_at FROM web_projects WHERE user_id = ? ORDER BY updated_at DESC",
        (user["id"],)
    )
    return projects

@router.post("/projects")
def save_project(req: WebProjectSaveRequest, user: Dict[str, Any] = Depends(get_current_user)):
    project_id = uuid.uuid4().hex
    now = now_iso()
    rec = {
        "id": project_id,
        "user_id": user["id"],
        "title": req.title.strip() or "مشروع ويب جديد",
        "description": req.description,
        "files_json": json.dumps(req.files, ensure_ascii=False),
        "created_at": now,
        "updated_at": now
    }
    db_engine.insert("web_projects", rec)
    return {"success": True, "project_id": project_id, "title": rec["title"], "updated_at": now}

@router.get("/projects/{project_id}")
def get_project(project_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    row = db_engine.fetch_one("SELECT * FROM web_projects WHERE id = ?", (project_id,))
    if not row:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if row["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح بعرض هذا المشروع")
    row["files"] = json.loads(row.get("files_json") or "{}")
    return row

@router.put("/projects/{project_id}")
def update_project(project_id: str, req: WebProjectSaveRequest, user: Dict[str, Any] = Depends(get_current_user)):
    row = db_engine.fetch_one("SELECT * FROM web_projects WHERE id = ?", (project_id,))
    if not row:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if row["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح بتعديل هذا المشروع")
    
    now = now_iso()
    up = {
        "title": req.title.strip() or row["title"],
        "description": req.description,
        "files_json": json.dumps(req.files, ensure_ascii=False),
        "updated_at": now
    }
    db_engine.update("web_projects", project_id, up)
    return {"success": True, "project_id": project_id, "updated_at": now}

@router.delete("/projects/{project_id}")
def delete_project(project_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    row = db_engine.fetch_one("SELECT * FROM web_projects WHERE id = ?", (project_id,))
    if not row:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    if row["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح بحذف هذا المشروع")
    db_engine.delete("web_projects", project_id)
    return {"success": True, "message": "تم حذف المشروع بنجاح"}
