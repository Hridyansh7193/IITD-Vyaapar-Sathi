"""
routes/auth.py
==============
Authentication endpoints:
  POST /api/v1/auth/signup  → Register a new user
  POST /api/v1/auth/login   → Login and receive JWT
  GET  /api/v1/auth/me      → Get current user profile (protected)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.user import SignupRequest, LoginRequest, TokenResponse, UserProfile
from schemas.response import success_response
from services.auth_service import register_user, authenticate_user, create_access_token
from config.settings import get_settings

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", summary="Register a new user account")
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    """
    Creates a new user account.
    - Returns JWT access_token on success.
    - Returns 409 if email already exists.
    """
    user = register_user(db, payload.email, payload.password, payload.name)
    token = create_access_token(user.id, user.email)
    return success_response(
        data={
            "access_token": token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": UserProfile.model_validate(user).model_dump(),
        },
        message="Account created successfully",
    )


@router.post("/login", summary="Login and receive access token")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates credentials and returns a JWT.
    - Use the returned `access_token` as `Authorization: Bearer <token>`
    - Returns 401 on invalid credentials.
    """
    user = authenticate_user(db, payload.email, payload.password)
    token = create_access_token(user.id, user.email)
    return success_response(
        data={
            "access_token": token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": UserProfile.model_validate(user).model_dump(),
        },
        message="Login successful",
    )


@router.get("/me", summary="Get current authenticated user's profile")
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the profile of the currently authenticated user.
    **Requires:** `Authorization: Bearer <token>`
    """
    return success_response(
        data=UserProfile.model_validate(current_user).model_dump(),
        message="User profile retrieved",
    )
