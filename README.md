# Voice Agent - AI Voice Conversational System

A real-time multi-agent voice conversational system powered by **OpenAI Realtime API**. Talk to specialized AI agents with distinct personalities and voices — get instant voice and text responses.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-Realtime_API-412991?logo=openai&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-Bidirectional-blue)

---

## Features

- **Real-time Voice Conversations** — Push-to-talk with instant AI voice responses
- **Multi-Agent System** — 6 specialized AI agents with unique personalities and voices
- **Live Transcription** — Speech-to-text for both user input and AI responses
- **Agent Switching** — Seamlessly switch between agents mid-conversation
- **Dark UI** — Modern glassmorphism interface with ambient lighting effects

## Architecture

```
Browser (React + Vite)
    |
    | WebSocket
    |
FastAPI Backend (Python)
    |
    | WebSocket
    |
OpenAI Realtime API
```

**Audio Pipeline:** Microphone (48kHz) → Resample to 24kHz PCM16 → WebSocket → OpenAI → PCM16 Audio Response → Browser Playback

## AI Agents

| Agent | Voice | Specialty |
|:------|:-----:|:----------|
| **General Assistant** | `alloy` | Friendly all-purpose helper |
| **Technical Expert** | `echo` | Code, architecture, engineering |
| **Creative Writer** | `ballad` | Stories, poetry, content |
| **Business Advisor** | `sage` | Strategy, planning, market analysis |
| **Learning Coach** | `shimmer` | Teaching, skill development |
| **Health & Wellness** | `alloy` | Fitness, nutrition, mindfulness |

## Quick Start

### Prerequisites

- **Python 3.9+**
- **Node.js 18+**
- **OpenAI API Key** with Realtime API access

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
OPENAI_API_KEY=your-api-key-here
CORS_ORIGINS=http://localhost:3000
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview
```

Start the server:

```bash
python main.py
```

> Backend runs on http://localhost:8000

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

> Frontend runs on http://localhost:3000

### 3. Use It

1. Open http://localhost:3000
2. Pick an agent from the sidebar
3. Hold the mic button and speak
4. Release — the agent responds with voice + text

## Project Structure

```
voice-agent-project/
├── backend/
│   ├── main.py                 # FastAPI server + WebSocket relay
│   ├── requirements.txt
│   ├── .env.example
│   └── agents/
│       ├── agent_config.py     # Agent definitions (name, voice, instructions)
│       └── agent_manager.py    # Agent switching + context management
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main app + WebSocket message handling
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js    # WebSocket connection management
│   │   │   ├── useAudioRecorder.js # Mic capture + PCM16 resampling
│   │   │   └── useAudioPlayer.js   # Audio queue playback
│   │   └── components/
│   │       ├── VoiceInterface.jsx      # Push-to-talk mic button
│   │       ├── ConversationDisplay.jsx # Chat transcript
│   │       ├── AgentSelector.jsx       # Agent sidebar
│   │       └── ConnectionStatus.jsx    # Connection indicator
│   ├── vite.config.js
│   └── package.json
├── .gitignore
└── README.md
```

