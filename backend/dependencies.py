"""
dependencies.py
===============
FastAPI reusable dependencies, primarily JWT authentication.
Use `Depends(get_current_user)` on any route that requires authentication.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from database import get_db
from models.user import User
from config.settings import get_settings

settings = get_settings()

# Extracts Bearer token from the Authorization header
bearer_scheme = HTTPBearer()


def decode_token(token: str) -> dict:
    """Decodes and validates a JWT access token. Raises 401 on failure."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency injected into protected routes.
    Validates JWT and returns the authenticated User object.

    Usage:
        @router.get("/me")
        def me(user: User = Depends(get_current_user)):
            ...
    """
    payload = decode_token(credentials.credentials)
    user_id: str = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload invalid",
        )

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account deactivated",
        )

    return user
