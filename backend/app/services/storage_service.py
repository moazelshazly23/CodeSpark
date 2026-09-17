"""
Code Spark - File & Video Storage Service
Secure file handling, sanitization, validation, and storage.
"""
import os
import re
import uuid
import mimetypes
from typing import Dict, Any, Tuple
from app.core.config import settings

class StorageService:
    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        base = os.path.basename(filename)
        clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', base)
        return clean

    @classmethod
    def save_upload(cls, original_filename: str, file_bytes: bytes, subfolder: str = "files") -> Tuple[str, str, int, str]:
        ext = original_filename.split(".")[-1].lower() if "." in original_filename else ""
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise ValueError(f"نوع الملف غير مسموح: .{ext}")
        file_size = len(file_bytes)
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise ValueError(f"حجم الملف يتجاوز الحد الأقصى المسموح ({settings.MAX_UPLOAD_SIZE_MB} ميجابايت)")
        safe_name = cls.sanitize_filename(original_filename)
        unique_name = f"{uuid.uuid4().hex}_{safe_name}"
        target_dir = os.path.join(settings.STORAGE_DIR, subfolder)
        os.makedirs(target_dir, exist_ok=True)
        target_path = os.path.join(target_dir, unique_name)
        with open(target_path, "wb") as f:
            f.write(file_bytes)
        rel_path = f"/storage/{subfolder}/{unique_name}"
        mime_type, _ = mimetypes.guess_type(original_filename)
        return rel_path, target_path, file_size, mime_type or "application/octet-stream"
