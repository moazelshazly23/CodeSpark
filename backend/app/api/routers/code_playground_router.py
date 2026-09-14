from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.api.deps import get_current_user
from app.services.code_runner import CodeExecutionService
from app.services.core_services import ActivityService

router = APIRouter(prefix="/code-playground", tags=["Code Playground"])

class CodeRunRequest(BaseModel):
    language: str  # python, javascript, html, css
    code: str
    input_data: Optional[str] = ""

@router.post("/run")
def execute_code(req: CodeRunRequest, user: dict = Depends(get_current_user)):
    res = CodeExecutionService.execute(req.language, req.code, req.input_data or "")
    ActivityService.log(user["id"], "playground_run", {"language": req.language})
    return res
