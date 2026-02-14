import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import VoiceInterface from './components/VoiceInterface';
import AgentSelector from './components/AgentSelector';
import ConversationDisplay from './components/ConversationDisplay';
import ConnectionStatus from './components/ConnectionStatus';
import { useWebSocket } from './hooks/useWebSocket';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useAudioPlayer } from './hooks/useAudioPlayer';

function App() {
  const [agents, setAgents] = useState([]);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

  // Stable client ID that persists across renders
  const clientIdRef = useRef(generateClientId());

  // WebSocket connection
  const {
    isConnected,
    connect,
    disconnect,
    sendMessage,
    lastMessage
  } = useWebSocket(`${WS_URL}/ws/${clientIdRef.current}`);

  // Send audio directly via WebSocket callback (bypasses React state batching)
  const sendMessageRef = useRef(sendMessage);
  const isConnectedRef = useRef(isConnected);
  sendMessageRef.current = sendMessage;
  isConnectedRef.current = isConnected;

  const handleAudioData = useCallback((base64) => {
    if (isConnectedRef.current) {
      sendMessageRef.current({ type: 'audio', audio: base64 });
    }
  }, []);

  // Audio recording with direct callback
  const {
    startRecording,
    stopRecording,
    hasAudioData
  } = useAudioRecorder(handleAudioData);

  // Audio playback
  const {
    playAudio,
    stopAudio,
    isPlaying
  } = useAudioPlayer();

  // Generate unique client ID
  function generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Fetch available agents on mount
  useEffect(() => {
    fetchAgents();
  }, []);

  // Ref to track current agent for use in callbacks
  const currentAgentRef = useRef(null);
  currentAgentRef.current = currentAgent;

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const { type, ...data } = lastMessage;

    switch (type) {
      case 'connected':
        setCurrentAgent({
          id: data.agent_id,
          name: data.agent_name
        });
        addToConversation('system', `Connected to ${data.agent_name}`);
        break;

      case 'agent_switched':
        setCurrentAgent({
          id: data.agent_id,
          name: data.agent_name
        });
        addToConversation('system', `Switched to ${data.agent_name}`);
        break;

      case 'audio_delta':
        // Play incoming audio
        if (data.delta) {
          playAudio(data.delta);
          setIsSpeaking(true);
        }
        break;

      case 'transcript_delta':
        // Update conversation with AI transcript
        if (data.delta) {
          updateLastAssistantMessage(data.delta);
        }
        break;

      case 'user_transcript':
        // Update user message with actual transcript
        if (data.transcript) {
          updateLastUserMessage(data.transcript);
        }
        break;

      case 'openai_event':
        handleOpenAIEvent(data.event);
        break;

      case 'error':
        console.error('WebSocket error:', data.error);
        const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || 'Unknown error';
        addToConversation('error', `Error: ${errorMsg}`);
        break;
    }
  }, [lastMessage]);

  async function fetchAgents() {
    try {
      const response = await fetch(`${API_BASE_URL}/agents`);
      const data = await response.json();
      setAgents(data.agents);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  }

  function handleOpenAIEvent(event) {
    if (!event) return;
    const eventType = event.type;

    switch (eventType) {
      case 'conversation.item.created':
        if (event.item?.role === 'user') {
          const content = event.item.content?.[0];
          if (content?.type === 'input_audio') {
            addToConversation('user', '[Listening...]');
          } else if (content?.type === 'input_text') {
            addToConversation('user', content.text);
          }
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // Replace "[Listening...]" with actual transcript
        if (event.transcript) {
          updateLastUserMessage(event.transcript.trim());
        }
        break;

      case 'response.done':
        setIsSpeaking(false);
        break;

      case 'input_audio_buffer.speech_started':
        console.log('User started speaking');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('User stopped speaking');
        break;
    }
  }

  function addToConversation(role, content) {
    setConversation(prev => [...prev, {
      id: Date.now() + Math.random(),
      role,
      content,
      timestamp: new Date().toISOString(),
      agent: currentAgentRef.current?.name
    }]);
  }

  function updateLastAssistantMessage(delta) {
    setConversation(prev => {
      const lastMsg = prev[prev.length - 1];

      if (lastMsg && lastMsg.role === 'assistant') {
        // Create a new object instead of mutating (StrictMode calls updaters twice)
        return [
          ...prev.slice(0, -1),
          { ...lastMsg, content: lastMsg.content + delta }
        ];
      } else {
        return [...prev, {
          id: Date.now() + Math.random(),
          role: 'assistant',
          content: delta,
          timestamp: new Date().toISOString(),
          agent: currentAgentRef.current?.name
        }];
      }
    });
  }

  function updateLastUserMessage(transcript) {
    setConversation(prev => {
      return prev.map(msg =>
        msg === prev.findLast(m => m.role === 'user')
          ? { ...msg, content: transcript }
          : msg
      );
    });
  }

  const pendingAgentRef = useRef(null);

  function handleConnectAgent(agentId) {
    if (!isConnected) {
      pendingAgentRef.current = agentId;
      connect();
    } else {
      sendMessage({
        type: 'connect_agent',
        agent_id: agentId
      });
    }
  }

  // Send pending connect_agent once WebSocket is ready
  useEffect(() => {
    if (isConnected && pendingAgentRef.current) {
      sendMessage({
        type: 'connect_agent',
        agent_id: pendingAgentRef.current
      });
      pendingAgentRef.current = null;
    }
  }, [isConnected]);

  function handleSwitchAgent(agentId) {
    sendMessage({
      type: 'switch_agent',
      agent_id: agentId
    });
  }

  function handleStartRecording() {
    startRecording();
    setIsRecording(true);
  }

  function handleStopRecording() {
    stopRecording();
    setIsRecording(false);

    // Only commit audio buffer if actual audio was captured
    if (hasAudioData.current) {
      sendMessage({
        type: 'commit_audio'
      });
    }
  }

  function handleCancelResponse() {
    if (isSpeaking) {
      sendMessage({
        type: 'cancel'
      });
    }
    stopAudio();
    setIsSpeaking(false);
  }

  function handleClearConversation() {
    setConversation([]);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span className="logo-icon">V</span>
          Voice Agent
        </h1>
        <ConnectionStatus isConnected={isConnected} />
      </header>

      <div className="app-container">
        <aside className="sidebar">
          <AgentSelector
            agents={agents}
            currentAgent={currentAgent}
            onSelectAgent={handleConnectAgent}
            onSwitchAgent={handleSwitchAgent}
            isConnected={isConnected}
          />
        </aside>

        <main className="main-content">
          <ConversationDisplay
            conversation={conversation}
            onClear={handleClearConversation}
          />

          <VoiceInterface
            isRecording={isRecording}
            isSpeaking={isSpeaking}
            isConnected={isConnected && currentAgent !== null}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onCancel={handleCancelResponse}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
