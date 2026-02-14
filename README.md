# Voice Agent

Multi-agent voice conversational system using OpenAI Realtime API.

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```
OPENAI_API_KEY=your-api-key
CORS_ORIGINS=http://localhost:3000
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview
```

Start the server:

```bash
python main.py
```

Backend runs on `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

## Agents

| Agent | Voice | Description |
|-------|-------|-------------|
| General Assistant | alloy | Friendly general-purpose assistant |
| Technical Expert | echo | Coding and system architecture |
| Creative Writer | ballad | Stories and content creation |
| Business Advisor | sage | Business strategy consulting |
| Learning Coach | shimmer | Educational coaching |
| Health & Wellness | alloy | Fitness, nutrition, mindfulness |

## How It Works

1. Select an agent from the sidebar
2. Hold the mic button to speak
3. Release to send — the agent responds with voice and text
