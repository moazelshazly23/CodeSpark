from pydantic import BaseModel
from typing import Optional

class StudyFileCreate(BaseModel):
    lesson_id: str
    name: str
    description: Optional[str] = ""
    file_type: str
    file_source: str = "upload"  # upload, google_drive
    file_path: Optional[str] = None
    external_url: Optional[str] = None
    file_size_bytes: int = 0
    is_public: bool = True
