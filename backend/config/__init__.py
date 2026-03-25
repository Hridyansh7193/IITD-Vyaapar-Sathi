"""
config/__init__.py
==================
Exposes the main configuration settings and shared API clients.
"""

from .settings import get_settings
from .clients import (
    supabase, 
    openai_client, 
    genai, 
    gemini_model,
    # Legacy aliases
    gemini_api_key,
    ai_client,
    AI_MODEL,
    model
)

__all__ = [
    "get_settings", 
    "supabase", 
    "openai_client", 
    "genai", 
    "gemini_model",
    "gemini_api_key",
    "ai_client",
    "AI_MODEL",
    "model"
]
