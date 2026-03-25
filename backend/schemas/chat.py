"""
schemas/chat.py
===============
Schemas for the chatbot query interface.
"""

from pydantic import BaseModel
from typing import Optional


class ChatQuery(BaseModel):
    query: str
    user_id: str
