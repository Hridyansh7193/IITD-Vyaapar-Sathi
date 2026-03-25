import google.generativeai as genai
import os
from dotenv import load_dotenv
import sys

load_dotenv()

key = os.getenv("GEMINI_API_KEY")
print(f"Using Key Prefix: {key[:5]}... (Length: {len(key) if key else 0})")

try:
    genai.configure(api_key=key)
    print("Listing models...")
    found = False
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ {m.name}")
            found = True
    if not found:
        print("❌ No models supporting generateContent found.")
except Exception as e:
    print(f"CRITICAL ERROR: {e}")
    sys.exit(1)
