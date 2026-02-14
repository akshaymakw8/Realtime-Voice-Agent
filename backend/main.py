"""
FastAPI backend for OpenAI Realtime Voice Agent with multi-agent support
"""
import asyncio
import json
import os
import logging
from typing import Dict, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import websockets
from contextlib import asynccontextmanager

from agents.agent_manager import AgentManager
from agents.agent_config import AGENTS

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    logger.info("Starting Voice Conversational Agent API")
    yield
    logger.info("Shutting down Voice Conversational Agent API")


app = FastAPI(
    title="Voice Conversational Agent API",
    description="Multi-agent voice conversational system using OpenAI Realtime API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    """Manages WebSocket connections and OpenAI Realtime API sessions"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.openai_connections: Dict[str, websockets.WebSocketClientProtocol] = {}
        self.agent_managers: Dict[str, AgentManager] = {}
        self.audio_buffer_has_data: Dict[str, bool] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.agent_managers[client_id] = AgentManager()
        logger.info(f"Client {client_id} connected")
    
    async def disconnect(self, client_id: str):
        """Clean up connection and resources"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        
        if client_id in self.openai_connections:
            await self.openai_connections[client_id].close()
            del self.openai_connections[client_id]
        
        if client_id in self.agent_managers:
            del self.agent_managers[client_id]

        if client_id in self.audio_buffer_has_data:
            del self.audio_buffer_has_data[client_id]

        logger.info(f"Client {client_id} disconnected")
    
    async def connect_to_openai(self, client_id: str, agent_id: str) -> bool:
        """Establish connection to OpenAI Realtime API"""
        try:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                logger.error("OPENAI_API_KEY not found in environment variables")
                return False
            
            model = os.getenv("OPENAI_REALTIME_MODEL", "gpt-4o-realtime-preview")
            url = f"wss://api.openai.com/v1/realtime?model={model}"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "OpenAI-Beta": "realtime=v1"
            }
            
            # Close existing connection if any
            if client_id in self.openai_connections:
                await self.openai_connections[client_id].close()
            
            # Establish new connection
            ws = await websockets.connect(url, extra_headers=headers)
            self.openai_connections[client_id] = ws
            
            # Configure session with agent settings
            agent_config = self.agent_managers[client_id].get_agent_config(agent_id)
            instructions = (
                "Always respond in English. The user is speaking English. "
                "Never switch to another language unless the user explicitly asks.\n\n"
                + agent_config["instructions"]
            )
            await self.send_to_openai(client_id, {
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "instructions": instructions,
                    "voice": agent_config["voice"],
                    "input_audio_format": "pcm16",
                    "output_audio_format": "pcm16",
                    "input_audio_transcription": {
                        "model": "gpt-4o-transcribe",
                        "language": "en"
                    },
                    "turn_detection": None,
                    "temperature": 0.8,
                    "max_response_output_tokens": 4096
                }
            })
            
            logger.info(f"Connected to OpenAI Realtime API for client {client_id} with agent {agent_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to OpenAI: {str(e)}")
            return False
    
    async def send_to_openai(self, client_id: str, message: dict):
        """Send message to OpenAI Realtime API"""
        if client_id in self.openai_connections:
            try:
                await self.openai_connections[client_id].send(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending to OpenAI: {str(e)}")
    
    async def send_to_client(self, client_id: str, message: dict):
        """Send message to client WebSocket"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to client: {str(e)}")


manager = ConnectionManager()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Voice Conversational Agent API",
        "version": "1.0.0"
    }


@app.get("/agents")
async def get_agents():
    """Get list of available agents"""
    return {
        "agents": [
            {
                "id": agent_id,
                "name": config["name"],
                "description": config["description"],
                "voice": config["voice"]
            }
            for agent_id, config in AGENTS.items()
        ]
    }


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for client connections"""
    await manager.connect(websocket, client_id)
    
    # Start listening to OpenAI responses
    async def listen_to_openai():
        """Listen for messages from OpenAI and forward to client"""
        logger.info(f"OpenAI listener started for {client_id}")
        try:
            while client_id in manager.openai_connections:
                ws = manager.openai_connections[client_id]
                message = await ws.recv()
                data = json.loads(message)

                # Handle specific events
                event_type = data.get("type")
                logger.debug(f"OpenAI event: {event_type}")

                if event_type == "session.created":
                    logger.info(f"OpenAI session created for {client_id}")
                elif event_type == "session.updated":
                    logger.info(f"OpenAI session updated for {client_id}")
                elif event_type == "error":
                    logger.error(f"OpenAI error: {data}")
                    await manager.send_to_client(client_id, {
                        "type": "error",
                        "error": data.get("error")
                    })
                elif event_type == "response.audio.delta":
                    # Forward audio chunks
                    await manager.send_to_client(client_id, {
                        "type": "audio_delta",
                        "delta": data.get("delta")
                    })
                elif event_type == "response.audio_transcript.delta":
                    # Forward transcript chunks
                    await manager.send_to_client(client_id, {
                        "type": "transcript_delta",
                        "delta": data.get("delta")
                    })
                elif event_type == "conversation.item.input_audio_transcription.completed":
                    transcript = data.get("transcript", "")
                    logger.info(f"User transcript for {client_id}: {transcript[:50]}...")
                    await manager.send_to_client(client_id, {
                        "type": "user_transcript",
                        "transcript": transcript
                    })
                elif event_type == "conversation.item.input_audio_transcription.failed":
                    error_info = data.get("error", {})
                    logger.error(f"Transcription failed for {client_id}: {error_info}")
                elif event_type == "response.done":
                    logger.info(f"OpenAI response completed for {client_id}")
                elif event_type == "input_audio_buffer.speech_started":
                    logger.info(f"VAD detected speech start for {client_id}")
                elif event_type == "input_audio_buffer.speech_stopped":
                    logger.info(f"VAD detected speech stop for {client_id}")

                # Forward remaining events to client (skip those already sent via dedicated handlers)
                if event_type not in (
                    "response.audio.delta",
                    "response.audio_transcript.delta",
                    "conversation.item.input_audio_transcription.completed",
                    "error"
                ):
                    await manager.send_to_client(client_id, {
                        "type": "openai_event",
                        "event": data
                    })

        except websockets.exceptions.ConnectionClosed:
            logger.info(f"OpenAI connection closed for {client_id}")
        except Exception as e:
            logger.error(f"Error in OpenAI listener: {str(e)}", exc_info=True)
    
    openai_listener_task = None
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "connect_agent":
                # Connect to OpenAI with specific agent
                agent_id = data.get("agent_id", "general_assistant")
                success = await manager.connect_to_openai(client_id, agent_id)
                
                if success:
                    # Start OpenAI listener task
                    if openai_listener_task:
                        openai_listener_task.cancel()
                    openai_listener_task = asyncio.create_task(listen_to_openai())
                    
                    await manager.send_to_client(client_id, {
                        "type": "connected",
                        "agent_id": agent_id,
                        "agent_name": AGENTS[agent_id]["name"]
                    })
                else:
                    await manager.send_to_client(client_id, {
                        "type": "error",
                        "error": "Failed to connect to OpenAI"
                    })
            
            elif message_type == "switch_agent":
                # Switch to a different agent
                agent_id = data.get("agent_id")
                if agent_id:
                    success = await manager.connect_to_openai(client_id, agent_id)
                    if success:
                        # Restart listener for the new OpenAI connection
                        if openai_listener_task:
                            openai_listener_task.cancel()
                        openai_listener_task = asyncio.create_task(listen_to_openai())

                        await manager.send_to_client(client_id, {
                            "type": "agent_switched",
                            "agent_id": agent_id,
                            "agent_name": AGENTS[agent_id]["name"]
                        })
            
            elif message_type == "audio":
                # Forward audio to OpenAI
                audio_data = data.get("audio")
                if audio_data:
                    if not manager.audio_buffer_has_data.get(client_id, False):
                        logger.info(f"First audio chunk received from {client_id}")
                    manager.audio_buffer_has_data[client_id] = True
                    await manager.send_to_openai(client_id, {
                        "type": "input_audio_buffer.append",
                        "audio": audio_data
                    })
                else:
                    logger.warning(f"Empty audio data received from {client_id}")

            elif message_type == "commit_audio":
                # Only commit if audio was actually buffered
                if manager.audio_buffer_has_data.get(client_id, False):
                    logger.info(f"Committing audio buffer for {client_id}")
                    await manager.send_to_openai(client_id, {
                        "type": "input_audio_buffer.commit"
                    })
                    await manager.send_to_openai(client_id, {
                        "type": "response.create"
                    })
                    manager.audio_buffer_has_data[client_id] = False
                else:
                    logger.warning(f"Skipping commit for {client_id}: no audio data in buffer")
            
            elif message_type == "cancel":
                # Cancel ongoing response
                await manager.send_to_openai(client_id, {
                    "type": "response.cancel"
                })
            
            elif message_type == "text":
                # Send text message
                text_content = data.get("text")
                await manager.send_to_openai(client_id, {
                    "type": "conversation.item.create",
                    "item": {
                        "type": "message",
                        "role": "user",
                        "content": [
                            {
                                "type": "input_text",
                                "text": text_content
                            }
                        ]
                    }
                })
                await manager.send_to_openai(client_id, {
                    "type": "response.create"
                })
    
    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        if openai_listener_task:
            openai_listener_task.cancel()
        await manager.disconnect(client_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
