"""
Code Spark - Cryptographic Subscription Code Management Utilities
Secure generation, hashing, masking, and validation for subscription codes.
"""

import hashlib
import secrets
import datetime
from typing import Optional, Dict, Any, Tuple

# Cryptographically secure charset excluding ambiguous chars (0, O, 1, I, L)
CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

DURATION_MAP = {
    "1_month": 30,
    "3_months": 90,
    "6_months": 180,
    "1_year": 365,
    "lifetime": -1,
    "custom": 30
}

TYPE_LABELS = {
    "1_month": "اشتراك شهر واحد (30 يوم)",
    "3_months": "اشتراك 3 أشهر (90 يوم)",
    "6_months": "اشتراك 6 أشهر (180 يوم)",
    "1_year": "اشتراك سنة كاملة (365 يوم)",
    "lifetime": "اشتراك مدى الحياة",
    "custom": "اشتراك مخصص"
}

def generate_random_code() -> str:
    """
    Generate cryptographically secure random code in format CS-XXXX-XXXX.
    Example: CS-8F4K-29XM
    """
    p1 = "".join(secrets.choice(CODE_CHARSET) for _ in range(4))
    p2 = "".join(secrets.choice(CODE_CHARSET) for _ in range(4))
    return f"CS-{p1}-{p2}"

def hash_code(code: str) -> str:
    """Normalize and hash subscription code using SHA-256."""
    if not code:
        return ""
    normalized = code.strip().upper().replace(" ", "")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

def mask_code(code: str) -> str:
    """Return masked code for secure display, e.g. CS-8F4K-****."""
    if not code:
        return ""
    clean = code.strip().upper().replace(" ", "")
    parts = clean.split("-")
    if len(parts) == 3:
        return f"{parts[0]}-{parts[1]}-****"
    if len(clean) >= 7:
        return f"{clean[:7]}****"
    return f"{clean}****"

def get_code_prefix(code: str) -> str:
    """Return prefix for indexing/search, e.g. CS-8F4K."""
    if not code:
        return ""
    clean = code.strip().upper().replace(" ", "")
    parts = clean.split("-")
    if len(parts) == 3:
        return f"{parts[0]}-{parts[1]}"
    return clean[:7] if len(clean) >= 7 else clean

def resolve_duration_days(sub_type: str, custom_days: Optional[int] = None) -> int:
    """Resolve duration in days based on subscription type."""
    if sub_type == "lifetime":
        return -1
    if sub_type == "custom":
        if custom_days is not None and custom_days > 0:
            return int(custom_days)
        return 30
    return DURATION_MAP.get(sub_type, 30)

def compute_expiration_date(start_dt: datetime.datetime, duration_days: int) -> Optional[str]:
    """Compute ISO expiration date based on duration. Returns None for lifetime."""
    if duration_days <= 0:
        return None  # Lifetime
    exp_dt = start_dt + datetime.timedelta(days=duration_days)
    return exp_dt.isoformat()

def enrich_user_subscription(user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compute real-time subscription status, days remaining, and lifetime flag.
    Never relies on stale frontend data.
    """
    if not user:
        return user
    
    # Admins are exempt from subscription expiration
    if user.get("role") == "admin":
        user["subscription_status"] = "active"
        user["is_lifetime"] = True
        user["days_remaining"] = -1
        user["subscription_type"] = "admin"
        user["subscription_plan_label"] = "حساب إدارة (غير مقيد)"
        return user
    
    raw_status = user.get("subscription_status") or "active"
    exp_str = user.get("subscription_expires_at")
    duration_days = user.get("subscription_duration_days")
    if duration_days is None:
        duration_days = -1
    
    is_lifetime = (duration_days == -1) or (exp_str is None and raw_status == "active")
    days_remaining = -1
    computed_status = raw_status

    if raw_status == "disabled":
        computed_status = "disabled"
        days_remaining = 0
    elif exp_str:
        try:
            exp_dt = datetime.datetime.fromisoformat(exp_str.replace("Z", "+00:00"))
            now_dt = datetime.datetime.now(datetime.timezone.utc)
            delta = exp_dt - now_dt
            if delta.total_seconds() <= 0:
                computed_status = "expired"
                days_remaining = 0
            else:
                computed_status = "active"
                days_remaining = max(0, delta.days)
        except Exception:
            computed_status = raw_status
    elif is_lifetime:
        computed_status = "active"
        days_remaining = -1
    
    sub_type = user.get("subscription_type") or ("lifetime" if is_lifetime else "1_month")
    plan_label = TYPE_LABELS.get(sub_type, "اشتراك نشط")
    if sub_type == "custom" and duration_days > 0:
        plan_label = f"اشتراك مخصص ({duration_days} يوم)"

    user["subscription_status"] = computed_status
    user["is_lifetime"] = is_lifetime
    user["days_remaining"] = days_remaining
    user["subscription_type"] = sub_type
    user["subscription_plan_label"] = plan_label
    
    return user
