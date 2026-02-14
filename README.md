<div align="center">

# Voice Agent

**Real-time multi-agent voice conversational system built on OpenAI Realtime API**

[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-Realtime_API-412991?style=flat-square&logo=openai&logoColor=white)](https://platform.openai.com/docs/guides/realtime)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![WebSocket](https://img.shields.io/badge/Protocol-WebSocket-blue?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

*Talk to specialized AI agents with distinct voices and personalities.*
*Push-to-talk interface with real-time voice + text streaming.*

</div>

## Overview

Voice Agent is a full-stack application that enables real-time voice conversations with multiple AI personas. It leverages OpenAI's Realtime API over WebSocket for low-latency, bidirectional audio streaming — no REST polling, no batch processing.

The system implements a **relay architecture**: the browser captures audio, streams it through a FastAPI backend (which manages sessions and agent context), and forwards it to OpenAI's Realtime API. Responses stream back through the same path — audio chunks play immediately while transcript deltas render in real-time.

### Key Capabilities

- **Sub-second voice responses** via WebSocket streaming (no HTTP request/response overhead)
- **6 specialized agents** with unique system prompts, voices, and behavioral profiles
- **Live transcription** for both user speech (input) and AI responses (output)
- **Hot agent switching** — change personas mid-conversation without dropping the session
- **Audio resampling pipeline** — browser-native sample rate (48kHz) downsampled to 24kHz PCM16 for API compatibility
- **Push-to-talk with commit control** — audio buffer only commits when speech is detected

## Architecture

```
                                    Voice Agent Architecture

    ┌─────────────────┐         WebSocket          ┌──────────────────┐         WebSocket
    │                 │  ◄──── JSON + PCM16 ────►  │                  │  ◄──── JSON + PCM16 ────►
    │   React Client  │                            │  FastAPI Server  │
    │   (Port 3000)   │   audio chunks (base64)    │   (Port 8000)   │   input_audio_buffer
    │                 │   transcript deltas         │                  │   response.audio.delta
    └────────┬────────┘                            └────────┬─────────┘
             │                                              │
    ┌────────┴────────┐                            ┌────────┴─────────┐
    │  Web Audio API  │                            │  Agent Manager   │
    │  - Mic capture  │                            │  - Session state │
    │  - 48k → 24k   │                            │  - Agent configs │
    │  - PCM16 encode │                            │  - Context mgmt  │
    │  - Queue player │                            │  - Switch logic  │
    └─────────────────┘                            └──────────────────┘
```

### Audio Pipeline

```
Mic Input (48kHz Float32)
    │
    ├── ScriptProcessorNode (4096 samples/buffer)
    │
    ├── Linear Interpolation Resample → 24kHz
    │
    ├── Float32 → Int16 PCM conversion
    │
    ├── ArrayBuffer → Base64 encoding
    │
    └── WebSocket → Backend → OpenAI input_audio_buffer.append

OpenAI Response
    │
    ├── response.audio.delta (Base64 PCM16)
    │
    ├── Base64 → Int16 → Float32 decode
    │
    ├── AudioBufferSourceNode (24kHz)
    │
    └── Queue-based sequential playback
```

## Agents

| ID | Agent | Voice | Description |
|:---|:------|:-----:|:------------|
| `general_assistant` | **General Assistant** | `alloy` | Conversational all-purpose helper |
| `technical_expert` | **Technical Expert** | `echo` | Software engineering, architecture, DevOps |
| `creative_writer` | **Creative Writer** | `ballad` | Storytelling, poetry, content creation |
| `business_advisor` | **Business Advisor** | `sage` | Strategy, market analysis, operations |
| `learning_coach` | **Learning Coach** | `shimmer` | Adaptive teaching, skill development |
| `health_wellness` | **Health & Wellness** | `alloy` | Fitness, nutrition, mindfulness |

Each agent is defined in `backend/agents/agent_config.py` with a system prompt, voice selection, and behavioral instructions. Adding a new agent is a single dictionary entry.

## Getting Started

### Prerequisites

| Requirement | Version |
|:------------|:--------|
| Python | 3.9+ |
| Node.js | 18+ |
| OpenAI API Key | With Realtime API access |

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and add your API key:

```env
OPENAI_API_KEY=your-openai-api-key
CORS_ORIGINS=http://localhost:3000
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview
```

```bash
python main.py
```

> Server starts at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

> App starts at `http://localhost:3000`

## Project Structure

```
voice-agent-project/
│
├── backend/
│   ├── main.py                        # FastAPI app, WebSocket endpoint, OpenAI relay
│   ├── requirements.txt               # Python dependencies
│   ├── .env.example                   # Environment template
│   └── agents/
│       ├── __init__.py
│       ├── agent_config.py            # Agent definitions (prompts, voices)
│       └── agent_manager.py           # Runtime agent state + switching
│
├── frontend/
│   ├── vite.config.js                 # Vite dev server config
│   ├── package.json
│   └── src/
│       ├── App.jsx                    # Root component, message routing
│       ├── App.css
│       ├── index.css                  # Global styles, CSS variables
│       ├── main.jsx                   # React entry point
│       ├── hooks/
│       │   ├── useWebSocket.js        # Connection, reconnect, send/receive
│       │   ├── useAudioRecorder.js    # Mic capture, resample, PCM16 encode
│       │   └── useAudioPlayer.js      # Decode, buffer queue, playback
│       └── components/
│           ├── VoiceInterface.jsx     # Push-to-talk button + speaking indicator
│           ├── ConversationDisplay.jsx # Streaming transcript renderer
│           ├── AgentSelector.jsx      # Agent cards + active state
│           └── ConnectionStatus.jsx   # WebSocket status pill
│
├── .gitignore
└── README.md
```

## Tech Stack

| Layer | Tech | Role |
|:------|:-----|:-----|
| **Frontend** | React 18, Vite | UI rendering, state management |
| **Styling** | CSS3, Custom Properties | Dark theme, glassmorphism, animations |
| **Audio Capture** | Web Audio API, ScriptProcessorNode | Mic input, resampling, PCM16 encoding |
| **Audio Playback** | AudioBufferSourceNode | Queue-based sequential chunk playback |
| **Transport** | WebSocket (native) | Bidirectional real-time streaming |
| **Backend** | FastAPI, Python 3.9+ | WebSocket relay, session management |
| **AI Engine** | OpenAI Realtime API | Voice generation, speech recognition, LLM |
| **Audio Format** | PCM16, 24kHz, mono | OpenAI Realtime API standard format |

## API Reference

### WebSocket Endpoint

```
ws://localhost:8000/ws/{client_id}
```

### Client → Server Messages

| Type | Payload | Description |
|:-----|:--------|:------------|
| `connect_agent` | `{ agent_id }` | Connect to an agent and start OpenAI session |
| `switch_agent` | `{ agent_id }` | Switch to a different agent |
| `audio` | `{ audio: base64 }` | Stream audio chunk |
| `commit_audio` | `{}` | Commit audio buffer and trigger response |
| `cancel` | `{}` | Cancel in-progress response |
| `text` | `{ text }` | Send text message |

### Server → Client Messages

| Type | Payload | Description |
|:-----|:--------|:------------|
| `connected` | `{ agent_id, agent_name }` | Agent session established |
| `agent_switched` | `{ agent_id, agent_name }` | Agent switch confirmed |
| `audio_delta` | `{ delta: base64 }` | Audio response chunk |
| `transcript_delta` | `{ delta }` | AI transcript chunk |
| `user_transcript` | `{ transcript }` | Finalized user speech transcript |
| `error` | `{ error }` | Error message |

### REST Endpoints

| Method | Path | Description |
|:-------|:-----|:------------|
| `GET` | `/` | Health check |
| `GET` | `/agents` | List available agents |

## License

MIT
