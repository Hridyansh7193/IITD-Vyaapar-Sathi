import os

with open('main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def write_file(filename, start, end, extra='', replace_app=False):
    with open(filename, 'w', encoding='utf-8') as out:
        if extra:
            out.write(extra)
        content = "".join(lines[start:end])
        if replace_app:
            content = content.replace("@app.", "@router.")
        out.write(content)

os.makedirs('routers', exist_ok=True)
Path = 'routers/__init__.py'
if not os.path.exists(Path):
    open(Path, 'w').close()

write_file('schemas.py', 0, 0, '''from pydantic import BaseModel

class ChatQuery(BaseModel):
    query: str
    user_id: str
''')

write_file('config.py', 0, 0, '''import os
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
from openai import OpenAI

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

gemini_api_key = os.getenv("GEMINI_API_KEY")
openrouter_api_key = os.getenv("OPENROUTER_API_KEY")

ai_client = None
AI_MODEL = None
model = None

if openrouter_api_key:
    ai_client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=openrouter_api_key,
    )
    AI_MODEL = "google/gemini-2.0-flash-001"
elif gemini_api_key:
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel("gemini-2.0-flash")
    ai_client = "native-gemini"
''')

write_file('analytics.py', 58, 336, 'import pandas as pd\nimport numpy as np\n\n')

write_file('routers/data.py', 342, 522, '''from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd
import io
from config import supabase
from analytics import compute_analytics

router = APIRouter()

''', replace_app=True)

write_file('routers/chat.py', 527, 583, '''from fastapi import APIRouter
import pandas as pd
from schemas import ChatQuery
from config import supabase, gemini_api_key, ai_client, AI_MODEL, model
from analytics import compute_analytics

router = APIRouter()

''', replace_app=True)

write_file('main.py', 0, 0, '''from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import data, chat

app = FastAPI(
    title="VyaaparMitra AI API",
    description="Backend for MSME AI Growth Platform",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data.router)
app.include_router(chat.router)

@app.get("/")
def read_root():
    return {"status": "online", "message": "VyaaparMitra AI Backend v2.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
''')
