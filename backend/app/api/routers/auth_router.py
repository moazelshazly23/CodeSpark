"""
CodeSpark - Authentication Router
Handles student registration, user login, and identity retrieval.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from app.api.deps import get_current_user
from app.services.auth_service import AuthService
from app.schemas.all_schemas import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest):
    try:
        user = AuthService.register(req.dict())
        login_res = AuthService.login(req.username, req.password)
        if not login_res:
            raise HTTPException(status_code=500, detail="فشل تسجيل الدخول التلقائي بعد التسجيل")
        logged_user, token = login_res
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": logged_user["id"],
            "username": logged_user["username"],
            "full_name": logged_user["full_name"],
            "role": logged_user["role"],
            "permissions": logged_user.get("permissions", [])
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    try:
        res = AuthService.login(req.username_or_email, req.password)
        if not res:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="بيانات الدخول غير صحيحة. يرجى التأكد من اسم المستخدم وكلمة المرور"
            )
        user, token = res
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": user["id"],
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"],
            "permissions": user.get("permissions", [])
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me")
def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    user_copy = user.copy()
    user_copy.pop("hashed_password", None)
    return user_copy
