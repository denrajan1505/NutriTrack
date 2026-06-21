# Nutries – AI Nutrition Tracker

> Snap. Speak. Track. — AI-powered nutrition tracking without manual calorie counting.

## Project Structure

```
NutriTrack/
├── backend/          # FastAPI Python backend
├── frontend/         # React + Tailwind CSS frontend
└── supabase/         # Database schema
```

## Setup Guide

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL editor
3. Note your Project URL and anon key

### 2. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt

cp .env.example .env
# Fill in your API keys in .env

python run.py
# API runs at http://localhost:8000
```

**Required .env values:**
- `SUPABASE_URL` — from Supabase project settings
- `SUPABASE_KEY` — anon key
- `SUPABASE_SERVICE_KEY` — service role key
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com)
- `OPENAI_API_KEY` — from [OpenAI](https://platform.openai.com) (for voice/Whisper)
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` — for WhatsApp (optional)

### 3. Frontend Setup

```bash
cd frontend
npm install

cp .env.example .env.local
# Fill in your Supabase URL and anon key

npm run dev
# App runs at http://localhost:5173
```

## Features

| Feature | How to use |
|---------|-----------|
| **Photo Analysis** | Upload or drag food photo → AI identifies items + nutrition |
| **Voice Logging** | Tap mic, say what you ate → Whisper transcribes → Gemini analyzes |
| **Text Logging** | Type meal description → instant AI nutrition breakdown |
| **Dashboard** | See calorie/macro rings, water intake, today's meals |
| **AI Suggestions** | Get personalized food suggestions to hit your goals |
| **Weekly Report** | AI-generated nutrition summary with consistency score |
| **Goal Setting** | Set weight/muscle goals → auto-calculated daily targets |
| **WhatsApp Agent** | Send food photos/text on WhatsApp → auto-logged (Premium) |

## Tech Stack

- **Frontend**: React 18, Tailwind CSS, Vite, React Router, Recharts
- **Backend**: FastAPI, Python 3.11+
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: Gemini 1.5 Flash (vision + text), OpenAI Whisper (voice)
- **WhatsApp**: Twilio WhatsApp API
- **Storage**: Supabase Storage

## API Endpoints

```
POST /api/v1/meals/analyze/photo   — Analyze food image
POST /api/v1/meals/analyze/text    — Analyze text description
POST /api/v1/meals/analyze/voice   — Transcribe + analyze voice
POST /api/v1/meals/log/photo       — Log meal from photo
POST /api/v1/meals/log/text        — Log meal from text
POST /api/v1/meals/log/voice       — Log meal from voice
GET  /api/v1/meals/history         — Get meal history

GET  /api/v1/dashboard/today       — Today's nutrition summary
GET  /api/v1/dashboard/weekly      — Weekly report with AI summary
GET  /api/v1/dashboard/suggestions — AI meal suggestions
POST /api/v1/dashboard/water       — Log water intake

POST /api/v1/goals/                — Set nutrition goal
GET  /api/v1/goals/                — Get current goal
PUT  /api/v1/goals/                — Update goal

POST /api/v1/whatsapp/webhook      — WhatsApp message handler
POST /api/v1/whatsapp/link-phone   — Link phone to account
```

## Pricing

| Plan | Price | Features |
|------|-------|---------|
| Free | ₹0 | 20 meal logs/month, basic tracking |
| Pro | ₹199/mo | Unlimited logs, AI recommendations, weekly reports |
| Premium | ₹499/mo | WhatsApp agent, advanced analytics, coaching |
