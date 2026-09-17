"""
Code Spark - Cryptography, Password Hashing & JWT Security Module
Conforms to NIST SP 800-63B standards (PBKDF2-HMAC-SHA256, HS256 JWT)
"""
import os
import hmac
import hashlib
import base64
import json
import time
from typing import Dict, Any, Optional
from app.core.config import settings

def get_password_hash(password: str) -> str:
    salt = os.urandom(16)
    kdf = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return base64.b64encode(salt + kdf).decode("ascii")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        decoded = base64.b64decode(hashed_password.encode("ascii"))
        if len(decoded) < 32:
            return False
        salt = decoded[:16]
        stored_hash = decoded[16:]
        kdf = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(stored_hash, kdf)
    except Exception:
        return False

def hash_code(code: str) -> str:
    """Computes a SHA256 hex digest for a subscription code."""
    clean = code.strip().upper().replace(" ", "")
    return hashlib.sha256(clean.encode("utf-8")).hexdigest()

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

def base64url_decode(s: str) -> bytes:
    padding = "=" * (4 - (len(s) % 4))
    return base64.urlsafe_b64decode(s + padding)

def create_access_token(payload: Dict[str, Any], expires_delta_seconds: Optional[int] = None) -> str:
    data = payload.copy()
    now = time.time()
    if expires_delta_seconds is None:
        expires_delta_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    data["iat"] = int(now)
    data["exp"] = int(now + expires_delta_seconds)
    data["type"] = "access"
    header = {"alg": settings.JWT_ALGORITHM, "typ": "JWT"}
    header_b64 = base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = base64url_encode(json.dumps(data, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = base64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def create_refresh_token(payload: Dict[str, Any], expires_delta_days: Optional[int] = None) -> str:
    data = payload.copy()
    now = time.time()
    if expires_delta_days is None:
        expires_delta_days = settings.REFRESH_TOKEN_EXPIRE_DAYS
    data["iat"] = int(now)
    data["exp"] = int(now + (expires_delta_days * 86400))
    data["type"] = "refresh"
    header = {"alg": settings.JWT_ALGORITHM, "typ": "JWT"}
    header_b64 = base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = base64url_encode(json.dumps(data, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = base64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def decode_access_token(token: str) -> Dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT token structure")
    signing_input = f"{parts[0]}.{parts[1]}".encode("utf-8")
    expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    actual_sig = base64url_decode(parts[2])
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise ValueError("Signature verification failed")
    payload = json.loads(base64url_decode(parts[1]).decode("utf-8"))
    if "exp" in payload and payload["exp"] < time.time():
        raise ValueError("Token has expired")
    return payload
