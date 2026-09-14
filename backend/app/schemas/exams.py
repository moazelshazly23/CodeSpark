from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ExamQuestionItem(BaseModel):
    question_id: str
    order_index: int
    marks: float

class ExamCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    exam_type: str  # 'weekly', 'monthly', 'custom'
    duration_minutes: int
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    passing_marks: float = 50.0
    max_attempts: int = 1
    allow_retake: bool = False
    is_published: bool = False
    questions: Optional[List[ExamQuestionItem]] = []

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    exam_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    passing_marks: Optional[float] = None
    max_attempts: Optional[int] = None
    allow_retake: Optional[bool] = None
    is_published: Optional[bool] = None
    questions: Optional[List[ExamQuestionItem]] = None

class ExamAttemptAutosave(BaseModel):
    answers: Dict[str, Any]

class ExamAttemptSubmit(BaseModel):
    answers: Dict[str, Any]

class GradeEssayItem(BaseModel):
    question_id: str
    awarded_marks: float
    comment: Optional[str] = None

class ManualGradeExamRequest(BaseModel):
    grades: List[GradeEssayItem]
    general_feedback: Optional[str] = None
