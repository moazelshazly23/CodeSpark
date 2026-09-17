"""
Code Spark - Code Playground Router
"""
from fastapi import APIRouter
from app.services.code_runner import CodeExecutionService
from app.schemas.all_schemas import CodeRunRequest

router = APIRouter(prefix="/code-playground", tags=["Code Playground"])

@router.post("/run")
def execute_code(req: CodeRunRequest):
    return CodeExecutionService.execute_code(req.language, req.code, req.test_input or "")
