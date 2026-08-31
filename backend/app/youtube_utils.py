"""
Code Spark - YouTube Utility & Validation Helper
Handles YouTube URL parsing, video ID extraction, and embed URL generation.
Compliant with standard official YouTube Embed & privacy-enhanced nocookie domain.
"""

import re
from typing import Optional, Tuple, Dict, Any

# Regex patterns covering watch URLs, short URLs, embed URLs, and shorts
YOUTUBE_PATTERNS = [
    r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})',
    r'(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})',
    r'(?:https?:\/\/)?(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})',
    r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})',
    r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})',
    r'(?:https?:\/\/)?m\.youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})',
    r'^([a-zA-Z0-9_-]{11})$'  # Raw 11-char video ID
]

def extract_youtube_id(url_or_id: Optional[str]) -> Optional[str]:
    """
    Extract 11-character YouTube video ID from various YouTube URL formats.
    Returns None if URL is invalid.
    """
    if not url_or_id:
        return None
    
    clean_str = url_or_id.strip()
    for pattern in YOUTUBE_PATTERNS:
        match = re.search(pattern, clean_str)
        if match:
            return match.group(1)
    return None

def get_youtube_embed_url(video_id_or_url: Optional[str], use_nocookie: bool = True) -> Optional[str]:
    """
    Generate privacy-enhanced official YouTube embed URL.
    Example: https://www.youtube-nocookie.com/embed/kqtD5dpn9C8
    """
    video_id = extract_youtube_id(video_id_or_url)
    if not video_id:
        return None
    
    domain = "https://www.youtube-nocookie.com" if use_nocookie else "https://www.youtube.com"
    return f"{domain}/embed/{video_id}"

def get_youtube_watch_url(video_id_or_url: Optional[str]) -> Optional[str]:
    """Generate standard canonical YouTube watch URL."""
    video_id = extract_youtube_id(video_id_or_url)
    if not video_id:
        return None
    return f"https://www.youtube.com/watch?v={video_id}"

def get_youtube_thumbnail_url(video_id_or_url: Optional[str], quality: str = "hqdefault") -> Optional[str]:
    """
    Generate official YouTube thumbnail URL without needing YouTube Data API key.
    Qualities: default (120x90), mqdefault (320x180), hqdefault (480x360), maxresdefault (1280x720)
    """
    video_id = extract_youtube_id(video_id_or_url)
    if not video_id:
        return None
    return f"https://img.youtube.com/vi/{video_id}/{quality}.jpg"

def validate_and_format_youtube(url_or_id: Optional[str]) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """
    Validates YouTube input and returns standardized metadata dict or error message.
    """
    if not url_or_id or not url_or_id.strip():
        return False, None, "رابط الفيديو مطلوب"
    
    video_id = extract_youtube_id(url_or_id)
    if not video_id:
        return False, None, "رابط YouTube غير صالح. يرجى التأكد من صحة الرابط (watch, youtu.be, shorts)"
    
    metadata = {
        "video_source": "youtube",
        "video_provider": "youtube",
        "video_id": video_id,
        "video_url": get_youtube_embed_url(video_id),
        "watch_url": get_youtube_watch_url(video_id),
        "thumbnail_url": get_youtube_thumbnail_url(video_id)
    }
    return True, metadata, None
