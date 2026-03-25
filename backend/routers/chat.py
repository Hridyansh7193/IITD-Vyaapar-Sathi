from fastapi import APIRouter
import pandas as pd
from schemas import ChatQuery
from config import supabase, gemini_api_key, ai_client, AI_MODEL, model
from analytics import compute_analytics

router = APIRouter()

@router.post("/chat-query")
def chat_query(query: ChatQuery):
    """Context-aware generative AI endpoint using actual user data."""
    try:
        if not gemini_api_key:
            return {"response": "I am the intelligence curator. Please configure your GEMINI_API_KEY to activate full AI features."}

        # 1. Fetch user data context
        response = supabase.table("sales_data").select("*").eq("user_id", query.user_id).execute()
        
        if not response.data:
            summary_stats = "The user has not uploaded any sales data yet. Tell them to upload a CSV."
        else:
            df = pd.DataFrame(response.data)
            analytics = compute_analytics(df)
            summary_stats = str(analytics.get("stats"))
            top_products = str(analytics.get("top_products"))
            categories = str(analytics.get("category_data"))
        
        # 2. Inject context into Prompt
        system_prompt = (
            f"You are VyaaparMitra AI, an expert business analyst for MSMEs. "
            f"Using ONLY this user's data provided below, accurately answer their question. "
            f"Be concise, actionable, and professional. "
            f"\n\nUSER'S DATA SUMMARY:\n{summary_stats}\n\nTOP PRODUCTS:\n{top_products}\n\nCATEGORIES:\n{categories}\n\n"
            f"USER'S QUESTION: {query.query}"
        )
        
        # 3. Call AI
        try:
            if ai_client == "native-gemini":
                # Fallback to older native implementation
                response = model.generate_content(system_prompt)
                return {"response": response.text}
            elif ai_client:
                # Use OpenRouter via OpenAI client
                response = ai_client.chat.completions.create(
                    model=AI_MODEL,
                    messages=[
                        {"role": "user", "content": system_prompt}
                    ],
                    extra_headers={
                        "HTTP-Referer": "https://vyaaparmitra-ai.vercel.app",  # Optional website name
                        "X-Title": "VyaaparMitra AI", # Optional
                    }
                )
                return {"response": response.choices[0].message.content}
            else:
                 return {"response": "The intelligence engine is currently offline. Please provide an AI API key (OpenRouter or Gemini) to activate."}
        except Exception as e:
            print(f"AI API Error: {str(e)}")
            return {"response": "The AI is currently processing and cannot answer. Please try again in 10 seconds or check your OpenRouter/Gemini API key."}

    except Exception as e:
        print(f"Chat Error: {str(e)}")
        return {"response": "I encountered an error while analyzing your data. Please ensure you have uploaded a CSV file."}
