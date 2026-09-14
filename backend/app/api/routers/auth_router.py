from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from app.schemas.all_schemas import UserRegisterRequest, UserLoginRequest
from app.services.core_services import AuthService
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(req: UserRegisterRequest):
    try:
        user = AuthService.register(req.dict())
        return {"success": True, "message": "تم إنشاء الحساب بنجاح", "user_id": user["id"]}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/login")
def login(req: UserLoginRequest):
    try:
        res = AuthService.login(req.username_or_email, req.password)
        if not res:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="اسم المستخدم أو كلمة المرور غير صحيحة")
        user, access_token, refresh_token = res
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user_id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "full_name": user["full_name"]
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

@router.get("/me")
def get_current_user_profile(user: Dict[str, Any] = Depends(get_current_user)):
    return AuthService.get_me(user["id"])

@router.post("/logout")
def logout(user: Dict[str, Any] = Depends(get_current_user)):
    return {"success": True, "message": "تم تسجيل الخروج بنجاح"}
