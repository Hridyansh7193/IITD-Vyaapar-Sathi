from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import json
import uuid
import datetime
from starlette.concurrency import run_in_threadpool

from database import get_db
from config.clients import openai_client, supabase
from config.settings import get_settings
from models.product import Product
from profit_engine.models import InventoryLog

router = APIRouter()

# --- Schemas ---

class AIInventoryInput(BaseModel):
    user_id: str
    raw_text: str

class AIInventoryItem(BaseModel):
    product_name: str
    quantity: int
    cost_price: float
    selling_price: float
    category: Optional[str] = "General"
    confidence: float

class AIInventoryResponse(BaseModel):
    intent: str
    items: List[AIInventoryItem]

# --- Prompt ---

SYSTEM_PROMPT = """
You are a professional inventory assistant for MSMEs. 
Convert natural language input into structured JSON for inventory addition.

STRICT RULES:
1. ONLY return valid JSON. No text, no markdown backticks, no explanation.
2. If the input is ambiguous or doesn't look like inventory addition, return intent: "UNKNOWN".
3. If specific prices aren't mentioned, set them to 0.0.
4. "cost_price" is what the merchant pays. "selling_price" is what the customer pays.
5. If only one price is mentioned and it's not clear which, assume it's cost_price.

OUTPUT FORMAT:
{
  "intent": "ADD_INVENTORY",
  "items": [
    {
      "product_name": "string",
      "quantity": number,
      "cost_price": number,
      "selling_price": number,
      "category": "string",
      "confidence": number
    }
  ]
}

EXAMPLES:
- "Add 20 Maggi at 12 rupees": { "product_name": "Maggi", "quantity": 20, "cost_price": 12, "selling_price": 0, "category": "Food", "confidence": 0.95 }
- "Bought 5 soaps for 30 each, selling at 40": { "product_name": "Soap", "quantity": 5, "cost_price": 30, "selling_price": 40, "category": "General", "confidence": 0.98 }
"""

# --- Implementation ---

@router.post("/ai/parse-inventory", response_model=AIInventoryResponse)
async def parse_inventory_ai(data: AIInventoryInput):
    """
    Parses natural language into structured inventory items using OpenRouter/OpenAI provider.
    This bypasses the 'Native SDK' name conflicts and is much more stable.
    """
    if not data.raw_text.strip():
        raise HTTPException(status_code=400, detail="Empty input text")

    try:
        settings = get_settings()

        # 1. AI Call (Using OpenRouter/OpenAI Client via Threadpool)
        # Using settings.AI_MODEL which is "google/gemini-2.0-flash-001"
        def call_ai():
            return openai_client.chat.completions.create(
                model=settings.AI_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"USER INPUT: {data.raw_text}"}
                ],
                temperature=0.1
            )

        response = await run_in_threadpool(call_ai)
        ai_text = response.choices[0].message.content
        
        # 2. Extract JSON (Robust cleaning to find the { } block)
        raw_json = ai_text.strip()
        print(f"--- AI RAW RESPONSE ---\n{raw_json}\n--- END ---")
        
        start_idx = raw_json.find('{')
        end_idx = raw_json.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            raw_json = raw_json[start_idx:end_idx+1]
        
        try:
            parsed = json.loads(raw_json)
        except json.JSONDecodeError as jde:
            print(f"JSON Decode Error: {jde}. Raw string: {raw_json}")
            return {"intent": "UNKNOWN", "items": []}
        
        # 3. Validation Logic
        items = parsed.get("items", [])
        intent = parsed.get("intent", "UNKNOWN")
        validated_items = []
        
        for item in items:
            q = item.get("quantity", 0)
            cp = item.get("cost_price", 0)
            name = item.get("product_name", "")
            conf = item.get("confidence", 0)

            if q <= 0 or cp < 0 or not name or conf < 0.5:
                continue
                 
            validated_items.append(item)

        # 4. Log to Supabase for auditing
        log_payload = {
            "user_id": data.user_id,
            "raw_input": data.raw_text,
            "ai_response": ai_text,
            "parsed_json": parsed,
            "status": "VALIDATED" if validated_items else "FAILED"
        }
        try:
             supabase.table("ai_log_history").insert(log_payload).execute()
        except Exception as e:
            print(f"Supabase Logging failed: {e}")

        return {
            "intent": intent,
            "items": validated_items
        }

    except Exception as e:
        print(f"CRITICAL AI Parsing Error: {e}")
        return {"intent": "UNKNOWN", "items": []}
