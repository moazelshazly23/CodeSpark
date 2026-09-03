from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union

# Roles Definition
class Role:
    SUPER_ADMIN = "SUPER_ADMIN"
    ASSISTANT = "ASSISTANT"
    STUDENT = "STUDENT"
    DEMO = "DEMO"

    @classmethod
    def is_super_admin(cls, role: Optional[str]) -> bool:
        if not role:
            return False
        return role.upper() in ("SUPER_ADMIN", "ADMIN")

    @classmethod
    def is_assistant(cls, role: Optional[str]) -> bool:
        if not role:
            return False
        return role.upper() == "ASSISTANT"

    @classmethod
    def is_staff(cls, role: Optional[str]) -> bool:
        return cls.is_super_admin(role) or cls.is_assistant(role)

    @classmethod
    def is_student(cls, role: Optional[str]) -> bool:
        if not role:
            return False
        return role.upper() in ("STUDENT", "DEMO")

    @classmethod
    def normalize(cls, role: Optional[str]) -> str:
        if not role:
            return cls.STUDENT
        r = role.strip().upper()
        if r in ("SUPER_ADMIN", "ADMIN"):
            return cls.SUPER_ADMIN
        if r == "ASSISTANT":
            return cls.ASSISTANT
        if r == "DEMO":
            return cls.DEMO
        return cls.STUDENT

# Auth Models
class LoginRequest(BaseModel):
    identifier: str
    password: str
    remember: bool = True

class RegisterRequest(BaseModel):
    name: str
    phone: str
    parent_phone: str
    password: str
    confirm_password: Optional[str] = None
    email: Optional[str] = None
    grade: Optional[str] = "الصف الأول الثانوي"
    section: Optional[str] = None
    class_name: Optional[str] = None
    subscription_code: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: Optional[str] = None
    phone_or_email: Optional[str] = None

class VerifyOtpRequest(BaseModel):
    email: Optional[str] = None
    phone_or_email: Optional[str] = None
    otp: str

class ResendOtpRequest(BaseModel):
    email: Optional[str] = None
    phone_or_email: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    reset_token: Optional[str] = None
    token_or_phone: Optional[str] = None
    code: Optional[str] = None
    token: Optional[str] = None
    new_password: str
    confirm_password: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    parent_phone: Optional[str] = None
    grade: Optional[str] = None
    section: Optional[str] = None
    class_name: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

# Assistant Models (New & Comprehensive)
class AssistantCreateRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    status: Optional[str] = "active"

class AssistantUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None

class AssistantStatusUpdateRequest(BaseModel):
    status: str

class AssistantResetPasswordRequest(BaseModel):
    password: str

# Activity Log Models (New)
class ActivityLogQueryRequest(BaseModel):
    limit: Optional[int] = 50
    offset: Optional[int] = 0
    action: Optional[str] = None
    user_id: Optional[str] = None
    target_type: Optional[str] = None
    search: Optional[str] = None

# Unit Models
class UnitCreateRequest(BaseModel):
    number: Optional[int] = None
    title: str
    description: Optional[str] = ""
    icon: Optional[str] = "code"
    status: Optional[str] = "in-progress"
    published: Optional[bool] = True
    is_published: Optional[bool] = True
    order_index: Optional[int] = None

class UnitUpdateRequest(BaseModel):
    number: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    status: Optional[str] = None
    published: Optional[bool] = None
    is_published: Optional[bool] = None
    order_index: Optional[int] = None

# Lesson Models (Enhanced with Flexible Video Metadata)
class LessonCreateRequest(BaseModel):
    unit_id: str
    number: Optional[int] = None
    title: str
    description: Optional[str] = ""
    duration: Optional[str] = "20 دقيقة"
    type: Optional[str] = "video"
    video_source: Optional[str] = "youtube" # 'youtube', 'upload', or None
    video_provider: Optional[str] = "youtube" # 'youtube', 'local', 'supabase'
    video_id: Optional[str] = None
    video_url: Optional[str] = ""
    storage_path: Optional[str] = None
    thumbnail_url: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    content: Optional[str] = ""
    content_html: Optional[str] = ""
    code_example: Optional[str] = ""
    code_solution: Optional[str] = ""
    exercise_title: Optional[str] = ""
    exercise_description: Optional[str] = ""
    exercise_starter_code: Optional[str] = ""
    exercise_solution_code: Optional[str] = ""
    exercise_test_cases: Optional[List[Dict[str, Any]]] = None
    published: Optional[bool] = True
    is_published: Optional[bool] = True
    order_index: Optional[int] = None

class LessonUpdateRequest(BaseModel):
    unit_id: Optional[str] = None
    number: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    type: Optional[str] = None
    video_source: Optional[str] = None
    video_provider: Optional[str] = None
    video_id: Optional[str] = None
    video_url: Optional[str] = None
    storage_path: Optional[str] = None
    thumbnail_url: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    content: Optional[str] = None
    content_html: Optional[str] = None
    code_example: Optional[str] = None
    code_solution: Optional[str] = None
    exercise_title: Optional[str] = None
    exercise_description: Optional[str] = None
    exercise_starter_code: Optional[str] = None
    exercise_solution_code: Optional[str] = None
    exercise_test_cases: Optional[List[Dict[str, Any]]] = None
    published: Optional[bool] = None
    is_published: Optional[bool] = None
    order_index: Optional[int] = None

# Progress Models
class LessonProgressUpdateRequest(BaseModel):
    lesson_id: Optional[str] = None
    progress: int = 100
    completed: bool = True
    last_position: Optional[int] = 0

class VideoProgressUpdateRequest(BaseModel):
    lesson_id: str
    last_position: int
    progress: Optional[int] = None

# Question Models
class QuestionOptionItem(BaseModel):
    id: Optional[str] = None
    option_key: str
    option_text: str
    is_correct: Optional[bool] = False

class QuestionCreateRequest(BaseModel):
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    question: Optional[str] = None
    text: Optional[str] = None
    code_snippet: Optional[str] = None
    explanation: Optional[str] = None
    score: Optional[int] = 10
    points: Optional[int] = None
    difficulty: Optional[str] = "medium"
    type: Optional[str] = "mcq"
    correct_answer: Optional[Union[str, int]] = "0"
    is_published: Optional[bool] = True
    published: Optional[bool] = True
    tags: Optional[Union[str, List[str]]] = None
    options: List[Union[str, Dict[str, Any], QuestionOptionItem]]

class QuestionUpdateRequest(BaseModel):
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    question: Optional[str] = None
    text: Optional[str] = None
    code_snippet: Optional[str] = None
    explanation: Optional[str] = None
    score: Optional[int] = None
    points: Optional[int] = None
    difficulty: Optional[str] = None
    type: Optional[str] = None
    correct_answer: Optional[Union[str, int]] = None
    is_published: Optional[bool] = None
    published: Optional[bool] = None
    tags: Optional[Union[str, List[str]]] = None
    options: Optional[List[Union[str, Dict[str, Any], QuestionOptionItem]]] = None

# Exam Models
class ExamCreateRequest(BaseModel):
    unit_id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    duration_minutes: Optional[int] = 30
    passing_score: Optional[int] = 60
    total_questions: Optional[int] = 10
    attempts_allowed: Optional[int] = 3
    randomize_questions: Optional[bool] = False
    random_questions: Optional[bool] = False
    is_published: Optional[bool] = True
    published: Optional[bool] = True
    questions: Optional[List[Dict[str, Any]]] = None

class ExamUpdateRequest(BaseModel):
    unit_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    passing_score: Optional[int] = None
    total_questions: Optional[int] = None
    attempts_allowed: Optional[int] = None
    randomize_questions: Optional[bool] = None
    random_questions: Optional[bool] = None
    is_published: Optional[bool] = None
    published: Optional[bool] = None
    questions: Optional[List[Dict[str, Any]]] = None

class ExamSubmitRequest(BaseModel):
    exam_id: str
    answers: Dict[str, Any]
    time_spent: Optional[int] = 0
    time_spent_seconds: Optional[int] = 0

# Student Administration Models
class StudentCreateRequest(BaseModel):
    name: str
    phone: str
    parent_phone: Optional[str] = ""
    subscription_code: Optional[str] = "SPARK-ADMIN"
    grade: Optional[str] = "الصف الأول الثانوي"
    section: Optional[str] = None
    class_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    status: Optional[str] = "active"

class StudentUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    parent_phone: Optional[str] = None
    grade: Optional[str] = None
    section: Optional[str] = None
    class_name: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None

class StudentSoftDeleteRequest(BaseModel):
    reason: Optional[str] = "إلغاء الاشتراك"

class ResetPasswordAdminRequest(BaseModel):
    password: str

class AnnouncementCreateRequest(BaseModel):
    title: str
    content: str
    type: Optional[str] = "info"
    badge: Optional[str] = "تنبيه"
    is_published: Optional[bool] = True

class SupportTicketCreateRequest(BaseModel):
    subject: str
    message: str
    category: Optional[str] = "academic"
    priority: Optional[str] = "medium"

class SupportReplyRequest(BaseModel):
    reply: str

class StudentStatusUpdateRequest(BaseModel):
    status: str

class AnnouncementUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[str] = None
    badge: Optional[str] = None
    is_published: Optional[bool] = None

class SupportTicketReplyRequest(BaseModel):
    reply: str

class CodeExecutionRequest(BaseModel):
    code: str
    inputs: Optional[Union[List[str], str]] = None
    input_data: Optional[str] = None
    timeout: Optional[int] = 5

class CodeGenerationRequest(BaseModel):
    topic: Optional[str] = None
    level: Optional[str] = "beginner"
    type: Optional[str] = "exercise" # 'exercise', 'quiz', 'explanation', 'starter_code'
    description: Optional[str] = None

# Quiz Models
class QuizCreateRequest(BaseModel):
    lesson_id: Optional[str] = None
    unit_id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    duration_minutes: Optional[int] = 10
    duration: Optional[int] = None
    passing_score: Optional[int] = 60
    is_published: Optional[bool] = True
    published: Optional[bool] = True
    question_ids: Optional[List[str]] = None

class QuizUpdateRequest(BaseModel):
    lesson_id: Optional[str] = None
    unit_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    duration: Optional[int] = None
    passing_score: Optional[int] = None
    is_published: Optional[bool] = None
    published: Optional[bool] = None
    question_ids: Optional[List[str]] = None

class QuizSubmitRequest(BaseModel):
    quiz_id: Optional[str] = None
    lesson_id: Optional[str] = None
    answers: Dict[str, Any]
    time_spent_seconds: Optional[int] = 0

class ExerciseSubmitRequest(BaseModel):
    lesson_id: str
    code: str

# Subscription Models
class SubscriptionGenerateRequest(BaseModel):
    type: Optional[str] = "1_month" # '1_month', '3_months', '6_months', '1_year', 'custom', 'lifetime'
    duration_days: Optional[int] = None
    count: Optional[int] = 1
    max_uses: Optional[int] = 1
    notes: Optional[str] = None

class SubscriptionVerifyRequest(BaseModel):
    code: str

class SubscriptionStatusUpdateRequest(BaseModel):
    status: str

# Super Admin Self-Credential Management Models
class SuperAdminChangeEmailRequest(BaseModel):
    current_email: str
    new_email: str
    confirm_new_email: str
    current_password: str

class SuperAdminChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str

# Bookmark / Favorites Models
class BookmarkCreateRequest(BaseModel):
    item_type: str  # 'lesson', 'question', 'code'
    item_id: str
    title: str
    metadata: Optional[Dict[str, Any]] = None

# Student Notes Models
class StudentNoteRequest(BaseModel):
    lesson_id: str
    note_text: str

# Code Drafts & History Models
class CodeDraftRequest(BaseModel):
    lesson_id: Optional[str] = None
    code_type: Optional[str] = "playground"
    code: str

# Educational Resources / PDF Files Models
class EducationalResourceCreateRequest(BaseModel):
    title: str
    file_url: str
    description: Optional[str] = ""
    file_type: Optional[str] = "pdf"
    file_size_label: Optional[str] = None
    category: Optional[str] = "مذكرات شرح"
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    is_active: Optional[bool] = True
    status: Optional[str] = "active"
    display_order: Optional[int] = 0

class EducationalResourceUpdateRequest(BaseModel):
    title: Optional[str] = None
    file_url: Optional[str] = None
    description: Optional[str] = None
    file_type: Optional[str] = None
    file_size_label: Optional[str] = None
    category: Optional[str] = None
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None
    display_order: Optional[int] = None

class EducationalResourceStatusUpdateRequest(BaseModel):
    status: str

# Subscription Offers / Packages Models
class SubscriptionOfferCreateRequest(BaseModel):
    name: Optional[str] = None
    title: str
    duration_type: str = "1_month" # '1_month', '3_months', '6_months', '1_year', 'custom', 'lifetime'
    duration_days: Optional[int] = 30
    price: float = 99.0
    currency: Optional[str] = "EGP"
    description: Optional[str] = ""
    badge: Optional[str] = None
    features: Optional[List[str]] = None
    features_json: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = True
    display_order: Optional[int] = 0

class SubscriptionOfferUpdateRequest(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    duration_type: Optional[str] = None
    duration_days: Optional[int] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    badge: Optional[str] = None
    features: Optional[List[str]] = None
    features_json: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

# Generic Content Files Models
class ContentFileCreateRequest(BaseModel):
    name: str
    title: Optional[str] = None
    source_type: str = "UPLOAD" # 'UPLOAD', 'GOOGLE_DRIVE', 'EXTERNAL_URL'
    file_url: Optional[str] = None
    storage_path: Optional[str] = None
    file_type: Optional[str] = "file" # 'video', 'pdf', 'code', 'file', 'image', 'attachment'
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    category: Optional[str] = None
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    is_paid: Optional[bool] = False
    is_active: Optional[bool] = True
    display_order: Optional[int] = 0

class ContentFileUpdateRequest(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    source_type: Optional[str] = None
    file_url: Optional[str] = None
    storage_path: Optional[str] = None
    file_type: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    category: Optional[str] = None
    unit_id: Optional[str] = None
    lesson_id: Optional[str] = None
    is_paid: Optional[bool] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

# Certificate Models
class CertificateCreateRequest(BaseModel):
    student_id: str
    course_name: Optional[str] = "مسار البرمجة الشامل - CodeSpark"
    grade: Optional[str] = "ممتاز"
    completion_percentage: Optional[int] = 100


class SubscriptionRedeemRequest(BaseModel):
    code: str
