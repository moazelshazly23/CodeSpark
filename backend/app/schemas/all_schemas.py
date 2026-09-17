"""
CodeSpark - Pydantic Request & Response Data Transfer Objects (DTOs)
Strict type validation, input sanitization, and response serialization.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

# -----------------------------------------------------------------------------
# Auth Schemas
# -----------------------------------------------------------------------------
class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    full_name: str
    role: str
    permissions: List[str] = []

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool = True
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class AdminResetPasswordRequest(BaseModel):
    new_password: str

# -----------------------------------------------------------------------------
# Assistant Schemas
# -----------------------------------------------------------------------------
class AssistantCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None
    permissions: List[str] = []

class AssistantUpdatePermissions(BaseModel):
    permissions: List[str]

# -----------------------------------------------------------------------------
# Curriculum: Course, Unit, Lesson Schemas
# -----------------------------------------------------------------------------
class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    thumbnail_url: Optional[str] = "/assets/branding/codespark-icon.svg"
    academic_term: Optional[str] = "العام الدراسي الكامل"
    order_index: Optional[int] = 0
    is_published: Optional[bool] = True

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    academic_term: Optional[str] = None
    order_index: Optional[int] = None
    is_published: Optional[bool] = None

class UnitCreate(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = ""
    order_index: Optional[int] = 0
    is_published: Optional[bool] = True

class UnitUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    is_published: Optional[bool] = None

class LessonCreate(BaseModel):
    unit_id: str
    title: str
    description: Optional[str] = ""
    content_markdown: Optional[str] = ""
    video_type: Optional[str] = "youtube"
    video_url: Optional[str] = ""
    duration_minutes: Optional[int] = 15
    order_index: Optional[int] = 0
    is_free: Optional[bool] = False
    is_published: Optional[bool] = True

class LessonUpdate(BaseModel):
    unit_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    content_markdown: Optional[str] = None
    video_type: Optional[str] = None
    video_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    order_index: Optional[int] = None
    is_free: Optional[bool] = None
    is_published: Optional[bool] = None

class LessonProgressUpdate(BaseModel):
    lesson_id: str
    is_completed: Optional[bool] = None
    last_position_seconds: Optional[float] = None
    watch_percentage: Optional[float] = None

# -----------------------------------------------------------------------------
# Study Files ("الملفات الدراسية")
# -----------------------------------------------------------------------------
class StudyFileCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    source_type: str = "google_drive"
    external_url: Optional[str] = ""
    file_name: Optional[str] = None
    mime_type: Optional[str] = "application/pdf"
    file_size: Optional[int] = 0
    course_id: Optional[str] = None
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    visibility: Optional[str] = "PUBLIC"
    is_published: Optional[bool] = True

class StudyFileUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    source_type: Optional[str] = None
    external_url: Optional[str] = None
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    course_id: Optional[str] = None
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    visibility: Optional[str] = None
    is_published: Optional[bool] = None

# -----------------------------------------------------------------------------
# Question Bank & Exams
# -----------------------------------------------------------------------------
class QuestionCreate(BaseModel):
    lesson_id: Optional[str] = None
    unit_id: Optional[str] = None
    question_type: str = "multiple_choice"
    question_text: str
    options: List[Dict[str, Any]] = []
    correct_answer: str
    explanation: Optional[str] = ""
    points: Optional[float] = 5.0
    difficulty: Optional[str] = "easy"
    is_active: Optional[bool] = True

class QuestionUpdate(BaseModel):
    lesson_id: Optional[str] = None
    unit_id: Optional[str] = None
    question_type: Optional[str] = None
    question_text: Optional[str] = None
    options: Optional[List[Dict[str, Any]]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    points: Optional[float] = None
    difficulty: Optional[str] = None
    is_active: Optional[bool] = None

class ExamCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    course_id: Optional[str] = None
    unit_id: Optional[str] = None
    duration_minutes: Optional[int] = 45
    passing_score: Optional[float] = 70.0
    question_ids: List[str] = []
    is_published: Optional[bool] = True

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    course_id: Optional[str] = None
    unit_id: Optional[str] = None
    duration_minutes: Optional[int] = None
    passing_score: Optional[float] = None
    question_ids: Optional[List[str]] = None
    is_published: Optional[bool] = None

class ExamSubmitRequest(BaseModel):
    answers: Dict[str, str]

# -----------------------------------------------------------------------------
# Exercises & Coding Practice
# -----------------------------------------------------------------------------
class ExerciseCreate(BaseModel):
    lesson_id: str
    title: str
    instructions_markdown: Optional[str] = ""
    starter_code: Optional[str] = ""
    solution_code: Optional[str] = ""
    test_cases: Optional[List[Dict[str, Any]]] = []
    expected_output: Optional[str] = ""
    language: Optional[str] = "python"
    points: Optional[int] = 10
    difficulty: Optional[str] = "easy"
    order_index: Optional[int] = 0
    is_published: Optional[bool] = True

class ExerciseUpdate(BaseModel):
    title: Optional[str] = None
    instructions_markdown: Optional[str] = None
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    test_cases: Optional[List[Dict[str, Any]]] = None
    expected_output: Optional[str] = None
    language: Optional[str] = None
    points: Optional[int] = None
    difficulty: Optional[str] = None
    order_index: Optional[int] = None
    is_published: Optional[bool] = None

class CodeRunRequest(BaseModel):
    language: str
    code: str
    test_input: Optional[str] = ""

class ExerciseSubmitRequest(BaseModel):
    submitted_code: str

# -----------------------------------------------------------------------------
# Subscription Plans & Codes
# -----------------------------------------------------------------------------
class SubscriptionPlanCreate(BaseModel):
    name: str
    duration_months: int
    price: float
    features: List[str] = []
    is_active: Optional[bool] = True
    order_index: Optional[int] = 0

class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    duration_months: Optional[int] = None
    price: Optional[float] = None
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None
    order_index: Optional[int] = None

class SubscriptionCodeGenerate(BaseModel):
    count: Optional[int] = 1
    duration_type: str = "1_MONTH"
    duration_days: Optional[int] = 30
    batch_name: Optional[str] = "دفعة أكواد جديدة"

class CodeRedeemRequest(BaseModel):
    code: str

class SubscriptionRequestCreate(BaseModel):
    plan_id: str
    payment_method: str
    payment_number: str
    payment_reference: Optional[str] = ""
    screenshot_url: Optional[str] = ""
    notes: Optional[str] = ""

class SubscriptionRequestReview(BaseModel):
    status: str
    admin_notes: Optional[str] = ""

# -----------------------------------------------------------------------------
# Payment Settings & Platform Config
# -----------------------------------------------------------------------------
class PaymentSettingsUpdate(BaseModel):
    vodafone_cash: Optional[str] = None
    payment_phone: Optional[str] = None
    instapay_phone: Optional[str] = None
    instapay_link: Optional[str] = None
    contact_phone: Optional[str] = None
    offer_banner_text: Optional[str] = None
    offers_visible: Optional[bool] = None
    special_offers: Optional[str] = None

    class Config:
        extra = "allow"

# -----------------------------------------------------------------------------
# Announcements & Notifications
# -----------------------------------------------------------------------------
class AnnouncementCreate(BaseModel):
    title: str
    content: str
    is_urgent: Optional[bool] = False
    is_published: Optional[bool] = True

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_urgent: Optional[bool] = None
    is_published: Optional[bool] = None

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: Optional[str] = "info"
    action_url: Optional[str] = ""
