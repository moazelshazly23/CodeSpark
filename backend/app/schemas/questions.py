from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class QuestionOption(BaseModel):
    id: str
    text: str
    is_correct: bool

class QuestionCreate(BaseModel):
    question_type: str  # multiple_choice, true_false, essay, code
    question_text: str
    options: Optional[List[Dict[str, Any]]] = []
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    marks: float = 1.0
    difficulty: str = "medium"  # easy, medium, hard
    lesson_id: Optional[str] = None
    code_metadata: Optional[Dict[str, Any]] = None

class QuestionUpdate(BaseModel):
    question_type: Optional[str] = None
    question_text: Optional[str] = None
    options: Optional[List[Dict[str, Any]]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    marks: Optional[float] = None
    difficulty: Optional[str] = None
    lesson_id: Optional[str] = None
    code_metadata: Optional[Dict[str, Any]] = None
