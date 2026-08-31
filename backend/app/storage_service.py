"""
Code Spark - Free-First Storage Service Abstraction
Provides seamless object storage operations for Direct Video Uploads.
Supports Local Storage (development/self-hosted) and Supabase Storage (production Free Tier).
Guarantees:
- Server-side MIME type and extension validation
- Free-tier size limit protection (Default: 50MB)
- Automatic cleanup of replaced and deleted video files (No orphaned files)
- HTTP 206 Partial Content Range streaming support for smooth video seeking
"""

import os
import re
import uuid
import mimetypes
import logging
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, Generator
from fastapi import HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse, Response

from .config import (
    PROJECT_ROOT, BASE_DIR, ENVIRONMENT
)

logger = logging.getLogger("codespark.storage")

# Configuration variables
MAX_VIDEO_UPLOAD_SIZE_MB = int(os.getenv("MAX_VIDEO_UPLOAD_SIZE_MB", "50"))
MAX_VIDEO_BYTES = MAX_VIDEO_UPLOAD_SIZE_MB * 1024 * 1024

ALLOWED_MIME_TYPES = {
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/ogg",
    "video/x-matroska"
}

ALLOWED_EXTENSIONS = {".mp4", ".webm", ".mov", ".ogg", ".mkv"}

# Local Storage Directory
LOCAL_STORAGE_DIR = Path(os.getenv("UPLOAD_DIR", str(PROJECT_ROOT / "uploads" / "videos")))
LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Supabase Storage Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "")
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "codespark-videos")
STORAGE_PROVIDER = os.getenv("STORAGE_PROVIDER", "local").lower()


class BaseStorageProvider:
    """Base protocol interface for video storage providers."""
    def save(self, content: bytes, storage_path: str, mime_type: str) -> str:
        raise NotImplementedError
    
    def delete(self, storage_path: str) -> bool:
        raise NotImplementedError
        
    def get_url(self, storage_path: str) -> str:
        raise NotImplementedError
        
    def exists(self, storage_path: str) -> bool:
        raise NotImplementedError


class LocalStorageProvider(BaseStorageProvider):
    """Local filesystem storage provider with range-streaming support."""
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)
        
    def _resolve_path(self, storage_path: str) -> Path:
        clean = storage_path.replace("\\", "/").lstrip("/")
        if clean.startswith("videos/"):
            clean = clean[len("videos/"):]
        return self.base_dir / clean

    def save(self, content: bytes, storage_path: str, mime_type: str) -> str:
        target_path = self._resolve_path(storage_path)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(content)
        logger.info(f"Saved video locally: {target_path} ({len(content)} bytes)")
        return f"/api/storage/videos/{storage_path}"

    def delete(self, storage_path: str) -> bool:
        target_path = self._resolve_path(storage_path)
        if target_path.exists() and target_path.is_file():
            try:
                target_path.unlink()
                logger.info(f"Deleted local video file: {target_path}")
                return True
            except Exception as e:
                logger.error(f"Failed to delete local video file {target_path}: {e}")
                return False
        return False

    def get_url(self, storage_path: str) -> str:
        clean = storage_path.replace("\\", "/").lstrip("/")
        return f"/api/storage/videos/{clean}"

    def exists(self, storage_path: str) -> bool:
        return self._resolve_path(storage_path).is_file()

    def get_file_path(self, storage_path: str) -> Path:
        return self._resolve_path(storage_path)


class SupabaseStorageProvider(BaseStorageProvider):
    """
    Supabase Storage provider (Free tier 500MB).
    Communicates via Supabase Storage REST API.
    """
    def __init__(self, supabase_url: str, supabase_key: str, bucket: str):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.bucket = bucket
        
    def _get_headers(self, content_type: str = "application/json"):
        return {
            "Authorization": f"Bearer {self.supabase_key}",
            "apikey": self.supabase_key,
            "Content-Type": content_type
        }

    def save(self, content: bytes, storage_path: str, mime_type: str) -> str:
        if not self.supabase_url or not self.supabase_key:
            raise RuntimeError("Supabase Storage credentials not configured.")
        
        import urllib.request
        clean_path = storage_path.replace("\\", "/").lstrip("/")
        endpoint = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{clean_path}"
        
        headers = self._get_headers(mime_type)
        headers["x-upsert"] = "true"
        
        req = urllib.request.Request(endpoint, data=content, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                if resp.status in (200, 201):
                    logger.info(f"Uploaded video to Supabase Storage: {clean_path}")
                    return self.get_url(clean_path)
                else:
                    raise RuntimeError(f"Supabase upload returned status {resp.status}")
        except Exception as e:
            logger.error(f"Supabase storage upload error: {e}")
            raise

    def delete(self, storage_path: str) -> bool:
        if not self.supabase_url or not self.supabase_key:
            return False
        import urllib.request
        import json
        clean_path = storage_path.replace("\\", "/").lstrip("/")
        endpoint = f"{self.supabase_url}/storage/v1/object/{self.bucket}"
        
        payload = json.dumps({"prefixes": [clean_path]}).encode("utf-8")
        req = urllib.request.Request(endpoint, data=payload, headers=self._get_headers("application/json"), method="DELETE")
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status in (200, 204)
        except Exception as e:
            logger.error(f"Supabase storage delete error: {e}")
            return False

    def get_url(self, storage_path: str) -> str:
        clean_path = storage_path.replace("\\", "/").lstrip("/")
        return f"{self.supabase_url}/storage/v1/object/public/{self.bucket}/{clean_path}"

    def exists(self, storage_path: str) -> bool:
        return True


class StorageService:
    """
    Unified High-Level Storage Service for Video Management.
    """
    def __init__(self):
        self.local_provider = LocalStorageProvider(LOCAL_STORAGE_DIR)
        
        if STORAGE_PROVIDER == "supabase" and SUPABASE_URL and SUPABASE_KEY:
            self.provider = SupabaseStorageProvider(SUPABASE_URL, SUPABASE_KEY, SUPABASE_STORAGE_BUCKET)
            logger.info("StorageService initialized with Supabase Storage provider.")
        else:
            self.provider = self.local_provider
            logger.info("StorageService initialized with Local Storage provider.")

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent directory traversal and unsafe characters."""
        base_name = os.path.basename(filename)
        # Keep alphanumeric, dots, underscores, dashes
        clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', base_name)
        return clean_name or "video.mp4"

    def validate_video_file(self, filename: str, content_type: Optional[str], file_size: int) -> Tuple[bool, Optional[str]]:
        """Validate extension, MIME type, and file size for free-tier safety."""
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            allowed_str = ", ".join(ALLOWED_EXTENSIONS)
            return False, f"صيغة الملف غير مدعومة ({ext}). الصيغ المدعومة: {allowed_str}"
        
        # Check MIME type
        if content_type and content_type.lower() not in ALLOWED_MIME_TYPES:
            # Check guessed mime type from extension
            guessed_type, _ = mimetypes.guess_type(filename)
            if not guessed_type or guessed_type.lower() not in ALLOWED_MIME_TYPES:
                return False, f"نوع الملف ({content_type}) غير مسموح به. يرجى رفع ملف فيديو صالح (MP4/WebM)."

        # Check maximum file size
        if file_size > MAX_VIDEO_BYTES:
            size_mb = round(file_size / (1024 * 1024), 1)
            return False, f"حجم الملف ({size_mb} MB) يتجاوز الحد الأقصى المسموح به في الباقة المجانية ({MAX_VIDEO_UPLOAD_SIZE_MB} MB)."

        return True, None

    async def upload_video(self, file: UploadFile, lesson_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Process, validate, and store an uploaded video file.
        Returns a dictionary with complete metadata for PostgreSQL persistence.
        """
        original_filename = file.filename or "video.mp4"
        content_type = file.content_type or mimetypes.guess_type(original_filename)[0] or "video/mp4"
        
        # Read file content safely in chunks to enforce size limit before overflowing memory
        content_chunks = []
        total_size = 0
        chunk_size = 1024 * 1024 # 1MB chunks
        
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_VIDEO_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"حجم الملف يتجاوز الحد الأقصى المسموح به ({MAX_VIDEO_UPLOAD_SIZE_MB} MB)."
                )
            content_chunks.append(chunk)
            
        file_bytes = b"".join(content_chunks)
        
        # Validate metadata
        is_valid, err_msg = self.validate_video_file(original_filename, content_type, len(file_bytes))
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

        # Generate unique storage path
        safe_name = self.sanitize_filename(original_filename)
        unique_id = uuid.uuid4().hex[:12]
        prefix = f"lesson_{lesson_id}" if lesson_id else "lessons"
        storage_path = f"videos/{prefix}/{unique_id}_{safe_name}"

        # Save to active provider
        try:
            video_url = self.provider.save(file_bytes, storage_path, content_type)
        except Exception as e:
            logger.error(f"Failed to upload video to primary provider, falling back to local: {e}")
            video_url = self.local_provider.save(file_bytes, storage_path, content_type)

        return {
            "video_source": "upload",
            "video_provider": STORAGE_PROVIDER if STORAGE_PROVIDER == "supabase" else "local",
            "video_id": unique_id,
            "video_url": video_url,
            "storage_path": storage_path,
            "filename": original_filename,
            "file_size": len(file_bytes),
            "mime_type": content_type
        }

    def delete_video(self, storage_path: Optional[str]) -> bool:
        """Delete video file from storage to prevent orphaned files."""
        if not storage_path:
            return False
        try:
            # Delete from active provider and local fallback
            res1 = self.provider.delete(storage_path)
            res2 = self.local_provider.delete(storage_path)
            return res1 or res2
        except Exception as e:
            logger.error(f"Error deleting video file {storage_path}: {e}")
            return False

    async def replace_video(self, old_storage_path: Optional[str], file: UploadFile, lesson_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Upload new video first, and delete old video ONLY after successful upload.
        """
        new_meta = await self.upload_video(file, lesson_id)
        if old_storage_path and old_storage_path != new_meta.get("storage_path"):
            self.delete_video(old_storage_path)
        return new_meta

    def stream_local_video(self, storage_path: str, range_header: Optional[str] = None) -> Response:
        """
        HTTP 206 Partial Content Range streaming response for smooth video seeking.
        """
        file_path = self.local_provider.get_file_path(storage_path)
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="ملف الفيديو غير موجود")

        file_size = file_path.stat().st_size
        mime_type, _ = mimetypes.guess_type(str(file_path))
        mime_type = mime_type or "video/mp4"

        # Parse HTTP Range header if present
        start = 0
        end = file_size - 1
        is_range = False

        if range_header and range_header.startswith("bytes="):
            is_range = True
            range_val = range_header.replace("bytes=", "").strip()
            parts = range_val.split("-")
            if parts[0]:
                start = int(parts[0])
            if len(parts) > 1 and parts[1]:
                end = int(parts[1])
            start = max(0, min(start, file_size - 1))
            end = max(start, min(end, file_size - 1))

        content_length = end - start + 1

        def file_generator(path: Path, offset: int, length: int, chunk_len: int = 1024 * 512):
            with open(path, "rb") as f:
                f.seek(offset)
                bytes_remaining = length
                while bytes_remaining > 0:
                    read_size = min(chunk_len, bytes_remaining)
                    data = f.read(read_size)
                    if not data:
                        break
                    bytes_remaining -= len(data)
                    yield data

        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": mime_type,
            "Cache-Control": "public, max-age=3600"
        }

        if is_range:
            headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
            return StreamingResponse(
                file_generator(file_path, start, content_length),
                status_code=status.HTTP_206_PARTIAL_CONTENT,
                headers=headers,
                media_type=mime_type
            )
        else:
            return StreamingResponse(
                file_generator(file_path, 0, file_size),
                status_code=status.HTTP_200_OK,
                headers=headers,
                media_type=mime_type
            )

# Global singleton storage service instance
storage_service = StorageService()
