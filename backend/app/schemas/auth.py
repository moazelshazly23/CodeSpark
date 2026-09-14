from pydantic import BaseModel, validator
from typing import Optional, List
import re

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None
    role: Optional[str] = "student"

    @validator("email")
    def validate_email_format(cls, v):
        pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
        if not re.match(pattern, v):
            raise ValueError("Invalid email format")
        return v.lower().strip()

    @validator("username")
    def validate_username(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("Username must be at least 3 characters")
        return v.strip().lower()

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    full_name: str
    role: str
    permissions: List[str] = []

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    phone: Optional[str] = None
    created_at: str

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None
