# Vyaapar Mitra AI 🏢🤖

Vyaapar Mitra AI is an advanced, AI-driven business intelligence and inventory management platform specifically designed for MSMEs (Micro, Small, and Medium Enterprises) in India. It empowers small business owners with real-time analytics, automated inventory tracking, and an AI business assistant.

## 🌟 Key Features
- **AI Business Desk**: A smart chatbot assistant that analyzes your sales momentum and answers business queries.
- **Intelligent Dashboard**: Beautiful charts visualizing revenue dynamics, inventory spread (PostgreSQL-backed), and top-selling store items.
- **Advanced Scanner**: High-speed barcode scanning for both Checkout (Sales) and Restock (Inventory).
- **Automated Reports**: Generate PDF reports for GST compliance and business performance.
- **Smart Forecasts**: Predictive analytics for inventory reorder levels.

## 🛠 Tech Stack
- **Frontend**: Next.js 16+, TypeScript, TailwindCSS, Framer Motion, Lucide React, Recharts.
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL (Supabase), Uvicorn.
- **AI Engine**: Google Gemini API, OpenRouter (OpenAI SDK).
- **ORM**: Prisma (Frontend Audit Logs) & SQLAlchemy (Backend Inventory).

## 🚀 Quick Start

### 1. Prerequisite Settings
Copy `.env.example` to `.env` in both `frontend` and `backend` directories and fill in your keys (Supabase, Gemini).

### 2. Backend (FastAPI)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 3. Frontend (Next.js)
```powershell
cd frontend
npm install
npm run dev
```

## 🐋 Docker Deployment
You can run the entire backend via Docker:
```bash
docker build -t vyaapar-api .
docker run -p 8000:8000 --env-file .env vyaapar-api
```

## 📄 License
MIT License. Developed for the IITD Hackathon.
