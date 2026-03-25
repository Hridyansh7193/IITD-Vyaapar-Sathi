"""
schemas/user.py
===============
Pydantic schemas for request/response validation on auth endpoints.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    name: Optional[str] = Field(None, max_length=100)

    class Config:
        json_schema_extra = {
            "example": {
                "email": "ramesh@shop.com",
                "password": "securepass123",
                "name": "Ramesh Sharma"
            }
        }


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

    class Config:
        json_schema_extra = {
            "example": {
                "email": "ramesh@shop.com",
                "password": "securepass123"
            }
        }


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserProfile(BaseModel):
    id: str
    email: str
    name: Optional[str]
    is_active: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
