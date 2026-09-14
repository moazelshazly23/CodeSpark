from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class AssignmentQuestionItem(BaseModel):
    question_id: str
    order_index: int
    marks: float

class AssignmentCreate(BaseModel):
    lesson_id: str
    title: str
    description: Optional[str] = ""
    due_date: Optional[str] = None
    total_marks: float = 10.0
    is_published: bool = True
    questions: Optional[List[AssignmentQuestionItem]] = []

class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    total_marks: Optional[float] = None
    is_published: Optional[bool] = None
    questions: Optional[List[AssignmentQuestionItem]] = None

class AssignmentAutosave(BaseModel):
    answers: Dict[str, Any]

class AssignmentSubmit(BaseModel):
    answers: Dict[str, Any]

class AssignmentGradeRequest(BaseModel):
    score: float
    feedback: Optional[str] = None
