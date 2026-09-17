"""
CodeSpark - Interactive Code Playground Router
Executes Python, JS, HTML, CSS in an isolated environment.
"""
from fastapi import APIRouter
from app.services.code_runner import CodeExecutionService
from app.schemas.all_schemas import CodeRunRequest

router = APIRouter(prefix="/playground", tags=["Code Playground"])

@router.post("/run")
def run_code(req: CodeRunRequest):
    return CodeExecutionService.execute_code(req.language, req.code, req.test_input or "")
