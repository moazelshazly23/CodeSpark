"""
Code Spark - Pydantic Request & Response Schemas
Validation and serialization models
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Auth
class UserRegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None

class UserLoginRequest(BaseModel):
    username_or_email: str
    password: str

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None

# Subscription
class CodeGenerateRequest(BaseModel):
    duration_type: str = "1_MONTH" # 1_MONTH, 3_MONTHS, 6_MONTHS, 12_MONTHS, LIFETIME, CUSTOM
    duration_days: Optional[int] = None
    custom_code: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class CodeValidateRequest(BaseModel):
    code: str

class CodeActivateRequest(BaseModel):
    code: str

# Curriculum
class CourseCreateRequest(BaseModel):
    title: str
    slug: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    order_index: int = 0
    is_published: bool = True
    access_type: str = "PUBLIC" # PUBLIC or SUBSCRIBERS_ONLY

class UnitCreateRequest(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = None
    order_index: int = 0
    is_published: bool = True
    access_type: str = "PUBLIC"

class LessonCreateRequest(BaseModel):
    unit_id: str
    title: str
    slug: str
    description: Optional[str] = None
    content_markdown: Optional[str] = None
    video_type: str = "youtube" # youtube, uploaded, none
    video_url: Optional[str] = None
    video_id: Optional[str] = None
    duration_seconds: float = 0.0
    order_index: int = 0
    is_published: bool = True
    access_type: str = "PUBLIC"

class LessonProgressRequest(BaseModel):
    last_video_position_seconds: float = 0.0
    watch_percentage: float = 0.0
    is_completed: bool = False

# Resources
class ResourceCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    resource_type: str = "drive_link" # drive_link, uploaded_file
    file_url: str
    file_size_bytes: Optional[int] = 0
    file_format: Optional[str] = "pdf"
    access_type: str = "PUBLIC"
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    is_published: bool = True

# Exercises & Playground
class ExerciseCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    starter_code: Optional[str] = None
    expected_output: Optional[str] = None
    test_cases_json: Optional[str] = None
    language: str = "python"
    difficulty: str = "easy"
    solution_code: Optional[str] = None
    access_type: str = "PUBLIC"
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    is_published: bool = True

class ExerciseSubmitRequest(BaseModel):
    code: str

class CodeRunRequest(BaseModel):
    language: str = "python"
    code: str
    user_input: Optional[str] = ""

# Assessments
class QuestionCreateRequest(BaseModel):
    question_text: str
    question_type: str = "multiple_choice" # multiple_choice, true_false, code, essay
    options_json: Optional[str] = "[]"
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: str = "easy"
    topic: Optional[str] = None
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    tags_json: Optional[str] = "[]"

class ExamCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    duration_minutes: int = 45
    passing_score: float = 75.0
    max_attempts: int = 1
    is_randomized: bool = False
    access_type: str = "SUBSCRIBERS_ONLY"
    is_published: bool = True
    questions: Optional[List[Dict[str, Any]]] = None # [{"question_id": "...", "points": 1.0}]

class ExamAutosaveRequest(BaseModel):
    answers: Dict[str, Any]

class ExamSubmitRequest(BaseModel):
    answers: Optional[Dict[str, Any]] = None

class QuizCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    passing_score: float = 70.0
    time_limit_minutes: int = 15
    access_type: str = "PUBLIC"
    lesson_id: Optional[str] = None
    unit_id: Optional[str] = None
    is_published: bool = True
    questions: Optional[List[Dict[str, Any]]] = None

class QuizSubmitRequest(BaseModel):
    answers: Dict[str, Any]

# Support
class TicketCreateRequest(BaseModel):
    subject: str
    category: str = "general"
    priority: str = "MEDIUM" # LOW, MEDIUM, HIGH, URGENT
    message: str

class TicketMessageRequest(BaseModel):
    message: str

class TicketStatusRequest(BaseModel):
    status: str # OPEN, IN_PROGRESS, WAITING, RESOLVED, CLOSED

# Announcements
class AnnouncementCreateRequest(BaseModel):
    title: str
    content: str
    target_audience: str = "ALL" # ALL, STUDENTS, SUBSCRIBERS, ASSISTANTS
    expiration_date: Optional[str] = None

# Assistants
class AssistantCreateRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    permissions: List[str]

class PermissionsUpdateRequest(BaseModel):
    permissions: List[str]

# Bookmarks
class BookmarkRequest(BaseModel):
    item_type: str # lesson, resource, exercise
    item_id: str
