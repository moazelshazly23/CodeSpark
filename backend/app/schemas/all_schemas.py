"""
Code Spark - Pydantic Request & Response Schemas
Compatible with Pydantic v1 and v2
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

# Auth Schemas
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

# User Schemas
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

class AdminUpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

# Subscription Schemas
class SubscriptionCodeCreateRequest(BaseModel):
    duration_type: str  # 1_MONTH, 3_MONTHS, 6_MONTHS, 12_MONTHS, LIFETIME
    duration_days: Optional[int] = None
    batch_name: Optional[str] = None
    custom_code: Optional[str] = None

class SubscriptionActivateRequest(BaseModel):
    code: str

class SubscriptionPlanCreate(BaseModel):
    id: Optional[str] = None
    name: str
    duration_months: int
    price: float
    is_active: bool = True
    order_index: int = 0
    features: List[str] = []

class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    duration_months: Optional[int] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None
    order_index: Optional[int] = None
    features: Optional[List[str]] = None

class SubscriptionRequestCreate(BaseModel):
    plan_id: Optional[str] = None
    package_name: Optional[str] = None
    duration_months: Optional[int] = 1
    amount: Optional[float] = 0.0
    payment_method: str = "InstaPay"
    payment_number: Optional[str] = None
    payment_reference: str
    phone: str
    transfer_date: Optional[str] = None
    proof_file_url: Optional[str] = None

class SubscriptionRequestReview(BaseModel):
    action: str  # approve or reject
    admin_notes: Optional[str] = None

# Curriculum Schemas
class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    thumbnail_url: Optional[str] = None
    order_index: int = 0
    academic_term: Optional[str] = "الفصل الأول"
    is_published: bool = True

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    order_index: Optional[int] = None
    academic_term: Optional[str] = None
    is_published: Optional[bool] = None

class UnitCreate(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = ""
    order_index: int = 0
    is_published: bool = True

class UnitUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    is_published: Optional[bool] = None

class LessonCreate(BaseModel):
    unit_id: str
    title: str
    content_markdown: Optional[str] = ""
    video_url: Optional[str] = None
    video_type: Optional[str] = "embed"
    duration_minutes: Optional[int] = 0
    order_index: Optional[int] = 0
    is_free: bool = False
    is_published: bool = True

class LessonUpdate(BaseModel):
    unit_id: Optional[str] = None
    title: Optional[str] = None
    content_markdown: Optional[str] = None
    video_url: Optional[str] = None
    video_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    order_index: Optional[int] = None
    is_free: Optional[bool] = None
    is_published: Optional[bool] = None

class LessonProgressUpdate(BaseModel):
    watch_time_seconds: int = 0
    is_completed: bool = False

# Study Files Schemas
class StudyFileCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    source_type: str = "upload"  # upload or google_drive
    external_url: Optional[str] = None
    course_id: Optional[str] = None
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    visibility: str = "PUBLIC"  # PUBLIC or SUBSCRIBERS_ONLY
    is_published: bool = True

class StudyFileUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    external_url: Optional[str] = None
    course_id: Optional[str] = None
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    visibility: Optional[str] = None
    is_published: Optional[bool] = None

# Assessment Schemas
class QuestionOption(BaseModel):
    id: str
    text: str

class QuestionCreate(BaseModel):
    lesson_id: Optional[str] = None
    question_type: str = "multiple_choice"  # multiple_choice, true_false, essay, code
    question_text: str
    options: Optional[List[QuestionOption]] = []
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 1
    difficulty: str = "medium"
    is_active: bool = True

class QuestionUpdate(BaseModel):
    lesson_id: Optional[str] = None
    question_type: Optional[str] = None
    question_text: Optional[str] = None
    options: Optional[List[QuestionOption]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    points: Optional[int] = None
    difficulty: Optional[str] = None
    is_active: Optional[bool] = None

class CodeRunRequest(BaseModel):
    language: str = "python"
    code: str
    test_input: Optional[str] = ""

# Support & Announcements
class SupportTicketCreate(BaseModel):
    subject: str
    message: str
    priority: str = "normal"

class SupportMessageCreate(BaseModel):
    message: str

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    is_urgent: bool = False
    is_published: bool = True

class PlatformSettingsUpdate(BaseModel):
    platform_name: Optional[str] = None
    payment_phone: Optional[str] = None
    instapay_phone: Optional[str] = None
    contact_phone: Optional[str] = None
    instapay_link: Optional[str] = None
    allow_registration: Optional[bool] = None
