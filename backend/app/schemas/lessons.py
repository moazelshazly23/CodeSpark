from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class VideoCreate(BaseModel):
    title: str
    video_type: str  # 'youtube' or 'upload'
    url: Optional[str] = None
    storage_path: Optional[str] = None
    duration_seconds: Optional[int] = 0
    file_size_bytes: Optional[int] = 0
    thumbnail_url: Optional[str] = None

class VideoResponse(BaseModel):
    id: str
    lesson_id: str
    title: str
    video_type: str
    url: Optional[str]
    duration_seconds: int
    created_at: str

class LessonCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    content: Optional[str] = ""
    order_index: Optional[int] = 0
    is_published: Optional[bool] = False
    video: Optional[VideoCreate] = None

class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    order_index: Optional[int] = None
    is_published: Optional[bool] = None

class LessonProgressUpdate(BaseModel):
    last_video_position_seconds: float
    watch_percentage: float
    is_completed: Optional[bool] = False

class LessonProgressResponse(BaseModel):
    student_id: str
    lesson_id: str
    is_completed: bool
    completed_at: Optional[str]
    last_video_position_seconds: float
    watch_percentage: float
    last_accessed_at: str
