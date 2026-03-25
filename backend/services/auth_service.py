"""
services/auth_service.py
========================
Business logic for authentication: hashing, token generation, user creation.
"""

from datetime import datetime, timedelta, timezone
from jose import jwt
import bcrypt
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.user import User
from config.settings import get_settings

settings = get_settings()


# ── Password Utilities ─────────────────────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    """Hashes a plain-text password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed: str) -> bool:
    """Verifies plain password against stored bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT Token ─────────────────────────────────────────────────────────────────

def create_access_token(user_id: str, email: str) -> str:
    """Creates a signed JWT access token embedding user_id as `sub`."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ── User Operations ────────────────────────────────────────────────────────────

def register_user(db: Session, email: str, password: str, name: str = None) -> User:
    """
    Creates a new user. Raises 409 if email already exists.
    """
    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        email=email.lower(),
        name=name,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    """
    Validates credentials. Raises 401 on invalid email or password.
    """
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support.",
        )
    return user
