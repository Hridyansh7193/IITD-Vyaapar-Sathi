"""
config/clients.py
=================
Singletons for external API clients: Supabase, OpenRouter (OpenAI), and Gemini.
"""

import warnings
warnings.filterwarnings("ignore", message="All support for the `google.generativeai` package has ended.*")

import google.generativeai as genai
from supabase import create_client
from openai import OpenAI
from .settings import get_settings

settings = get_settings()

# ── Supabase Client ──────────────────────────────────────────────────────────
supabase = create_client(
    settings.SUPABASE_URL or "https://placeholder.supabase.co",
    settings.SUPABASE_KEY or "placeholder_key"
)

# ── AI Clients ────────────────────────────────────────────────────────────────

# 1. OpenRouter (OpenAI SDK wrapper)
openai_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY or "placeholder",
)

# 2. Google Generative AI (Native)
genai.configure(api_key=settings.GEMINI_API_KEY or "placeholder")
_native_model_name = settings.AI_MODEL.replace("google/", "") if "/" in settings.AI_MODEL else settings.AI_MODEL
gemini_model = genai.GenerativeModel(_native_model_name)

# ── Old Logic Aliases (for legacy routers) ──────────────────────────────────
gemini_api_key = settings.GEMINI_API_KEY
ai_client = openai_client
AI_MODEL = settings.AI_MODEL
model = gemini_model
