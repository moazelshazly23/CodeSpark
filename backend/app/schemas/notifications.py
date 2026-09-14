from pydantic import BaseModel
from typing import Optional

class NotificationCreate(BaseModel):
    user_id: str
    type: str  # lesson, exam, assignment, grade, announcement, system
    title: str
    message: str
    link: Optional[str] = None

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    target_audience: str = "all"  # all, students, teachers, specific
    start_date: Optional[str] = None
    expiration_date: Optional[str] = None
