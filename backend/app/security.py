import hashlib
import os
import hmac
import json
import base64
import time
from typing import Dict, Any, Optional
from .config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

# In-memory Rate Limiter to protect authentication endpoints
_RATE_LIMIT_STORE: Dict[str, list] = {}

def check_rate_limit(key: str, max_requests: int = 20, window_seconds: int = 60) -> bool:
    """Simple sliding-window rate limiter per IP or identifier."""
    now = time.time()
    if key not in _RATE_LIMIT_STORE:
        _RATE_LIMIT_STORE[key] = []
    
    # Prune old timestamps
    _RATE_LIMIT_STORE[key] = [ts for ts in _RATE_LIMIT_STORE[key] if now - ts < window_seconds]
    
    if len(_RATE_LIMIT_STORE[key]) >= max_requests:
        return False
    
    _RATE_LIMIT_STORE[key].append(now)
    return True

def clear_rate_limits():
    """Clear all stored rate limits (used during test suites)."""
    global _RATE_LIMIT_STORE
    _RATE_LIMIT_STORE.clear()

def hash_password(password: str) -> str:
    """
    Hash a password using PBKDF2-HMAC-SHA256 with 100,000 iterations and a 16-byte random salt.
    Format: pbkdf2_sha256$100000$salt_hex$hash_hex
    """
    salt = os.urandom(16)
    iterations = 100000
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${derived.hex()}"

def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plain password against a stored PBKDF2 hash using constant-time comparison."""
    if not plain_password or not password_hash:
        return False
    try:
        parts = password_hash.split("$")
        # 1. CodeSpark standard format: pbkdf2_sha256
        if len(parts) == 4 and parts[0] == "pbkdf2_sha256":
            try:
                iterations = int(parts[1])
                salt = bytes.fromhex(parts[2])
                expected_derived = bytes.fromhex(parts[3])
                calculated_derived = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
                if hmac.compare_digest(calculated_derived, expected_derived):
                    return True
            except Exception:
                pass

        # 2. Django-compatible PBKDF2 format: pbkdf2_sha256
        if len(parts) == 4 and parts[0] in ("pbkdf2_sha256", "pbkdf2_sha512"):
            try:
                algo = "sha256" if parts[0] == "pbkdf2_sha256" else "sha512"
                iterations = int(parts[1])
                salt_bytes = parts[2].encode("utf-8")
                calc = hashlib.pbkdf2_hmac(algo, plain_password.encode("utf-8"), salt_bytes, iterations)
                calc_b64 = base64.b64encode(calc).decode("ascii")
                if hmac.compare_digest(calc_b64, parts[3]):
                    return True
            except Exception:
                pass

        # 3. Plain SHA256 hex digest fallback
        calc_sha256 = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        if hmac.compare_digest(calc_sha256.lower(), password_hash.lower()):
            return True

        # 4. Direct constant-time string comparison (for legacy/raw seed plaintext)
        if hmac.compare_digest(plain_password, password_hash):
            return True

        return False
    except Exception:
        return False
def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _b64url_decode(data: str) -> bytes:
    padding = "=" * (4 - len(data) % 4) if len(data) % 4 != 0 else ""
    return base64.urlsafe_b64decode((data + padding).encode("utf-8"))

def create_access_token(data: Dict[str, Any], expires_delta_seconds: Optional[int] = None) -> str:
    """Create a signed JWT token with standard HMAC-SHA256 signature and expiration."""
    to_encode = data.copy()
    now = int(time.time())
    expire = now + (expires_delta_seconds or (ACCESS_TOKEN_EXPIRE_MINUTES * 60))
    to_encode.update({"iat": now, "exp": expire})
    
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(to_encode).encode("utf-8"))
    
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)
    
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a signed JWT token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = _b64url_decode(sig_b64)
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        
        payload_json = _b64url_decode(payload_b64).decode("utf-8")
        payload = json.loads(payload_json)
        
        if "exp" in payload and payload["exp"] < int(time.time()):
            return None
        
        return payload
    except Exception:
        return None
