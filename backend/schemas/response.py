"""
schemas/response.py
===================
Standardised JSON response wrapper used by every endpoint.
Mobile app developers always receive a consistent shape:
{
  "success": true | false,
  "data": {} | [] | null,
  "message": "Human-readable description"
}
"""

from pydantic import BaseModel
from typing import Any, Optional


class APIResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    message: str = ""


def success_response(data: Any = None, message: str = "OK") -> dict:
    return {"success": True, "data": data, "message": message}


def error_response(message: str = "An error occurred", data: Any = None) -> dict:
    return {"success": False, "data": data, "message": message}
