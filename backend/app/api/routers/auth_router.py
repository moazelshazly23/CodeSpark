"""
Code Spark - Authentication Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from app.api.deps import get_current_user
from app.services.core_services import AuthService
from app.schemas.all_schemas import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest):
    try:
        user = AuthService.register(req.dict())
        res = AuthService.login(req.username, req.password)
        if not res:
            raise HTTPException(status_code=500, detail="فشل تسجيل الدخول التلقائي بعد إنشاء الحساب")
        logged_user, access_token, _ = res
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": logged_user["id"],
            "username": logged_user["username"],
            "full_name": logged_user["full_name"],
            "role": logged_user["role"],
            "permissions": []
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    try:
        res = AuthService.login(req.username_or_email, req.password)
        if not res:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="بيانات الدخول غير صحيحة")
        user, access_token, _ = res
        permissions = user.get("permissions", [])
        if user["role"] == "admin":
            permissions = ["all"]
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user["id"],
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"],
            "permissions": permissions
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me")
def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    return AuthService.get_me(user["id"])
