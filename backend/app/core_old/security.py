"""
Code Spark - Security & Cryptographic Utilities
- NIST SP 800-63B Compliant PBKDF2-HMAC-SHA256 password hashing & verification
- RFC 7519 compliant HS256 JSON Web Token (JWT) creation & verification
"""

import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from app.core.config import settings

class SecurityError(Exception):
    """Base exception for security operations."""
    pass

class TokenExpiredError(SecurityError):
    """Raised when a JWT token has expired."""
    pass

class InvalidTokenError(SecurityError):
    """Raised when a JWT token signature or payload is invalid."""
    pass

PBKDF2_ALGORITHM = "sha256"
PBKDF2_ITERATIONS = 100_000  # NIST SP 800-63B & OWASP recommended baseline
SALT_SIZE = 16  # 128-bit cryptographic salt

def get_password_hash(password: str) -> str:
    """
    Hash a plaintext password using NIST SP 800-63B compliant PBKDF2-HMAC-SHA256.
    Returns format: pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>
    """
    if not isinstance(password, str):
        raise ValueError("Password must be a string")
    salt = secrets.token_bytes(SALT_SIZE)
    key = hashlib.pbkdf2_hmac(
        PBKDF2_ALGORITHM,
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
        dklen=32,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a PBKDF2-HMAC-SHA256 hash in constant time.
    """
    if not isinstance(plain_password, str) or not isinstance(hashed_password, str):
        return False
    parts = hashed_password.split("$")
    if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
        return False
    try:
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_hash = bytes.fromhex(parts[3])
    except (ValueError, IndexError):
        return False

    computed_key = hashlib.pbkdf2_hmac(
        PBKDF2_ALGORITHM,
        plain_password.encode("utf-8"),
        salt,
        iterations,
        dklen=len(expected_hash),
    )
    return hmac.compare_digest(computed_key, expected_hash)

def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _base64url_decode(input_str: str) -> bytes:
    rem = len(input_str) % 4
    if rem > 0:
        input_str += "=" * (4 - rem)
    return base64.urlsafe_b64decode(input_str.encode("utf-8"))

def _generate_jwt(payload: Dict[str, Any], secret_key: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _base64url_encode(
        json.dumps(header, separators=(",", ":")).encode("utf-8")
    )
    payload_b64 = _base64url_encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    )
    signing_input = f"{header_b64}.{payload_b64}"
    signature = hmac.new(
        secret_key.encode("utf-8"),
        signing_input.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    signature_b64 = _base64url_encode(signature)
    return f"{signing_input}.{signature_b64}"

def _verify_jwt(token: str, secret_key: str) -> Dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise InvalidTokenError("Invalid token structure")
    header_b64, payload_b64, signature_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}"

    expected_sig = hmac.new(
        secret_key.encode("utf-8"),
        signing_input.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    expected_sig_b64 = _base64url_encode(expected_sig)

    if not hmac.compare_digest(signature_b64, expected_sig_b64):
        raise InvalidTokenError("Invalid token signature")

    try:
        header = json.loads(_base64url_decode(header_b64).decode("utf-8"))
        if header.get("alg") != "HS256":
            raise InvalidTokenError(f"Unsupported algorithm: {header.get('alg')}")
        payload = json.loads(_base64url_decode(payload_b64).decode("utf-8"))
    except Exception as e:
        raise InvalidTokenError(f"Malformed token JSON: {str(e)}")

    exp = payload.get("exp")
    if exp is not None:
        now_ts = int(datetime.now(timezone.utc).timestamp())
        if now_ts > exp:
            raise TokenExpiredError("Token has expired")

    return payload

def create_access_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "token_type": "access",
    })
    return _generate_jwt(to_encode, settings.SECRET_KEY)

def create_refresh_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "token_type": "refresh",
    })
    return _generate_jwt(to_encode, settings.SECRET_KEY)

def decode_access_token(token: str) -> Dict[str, Any]:
    payload = _verify_jwt(token, settings.SECRET_KEY)
    if payload.get("token_type") != "access":
        raise InvalidTokenError("Expected access token")
    return payload

def decode_refresh_token(token: str) -> Dict[str, Any]:
    payload = _verify_jwt(token, settings.SECRET_KEY)
    if payload.get("token_type") != "refresh":
        raise InvalidTokenError("Expected refresh token")
    return payload
