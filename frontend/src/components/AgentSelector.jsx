import React from 'react';
import './AgentSelector.css';

function AgentSelector({ agents, currentAgent, onSelectAgent, onSwitchAgent, isConnected }) {
  const handleAgentClick = (agentId) => {
    if (!currentAgent) {
      onSelectAgent(agentId);
    } else if (currentAgent.id !== agentId) {
      onSwitchAgent(agentId);
    }
  };

  return (
    <div className="agent-selector">
      <h2>AI Agents</h2>
      <p className="agent-selector-description">
        {currentAgent ? 'Switch between agents' : 'Choose an agent to begin'}
      </p>

      <div className="agents-list">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`agent-card ${currentAgent?.id === agent.id ? 'active' : ''}`}
            onClick={() => handleAgentClick(agent.id)}
          >
            <div className="agent-icon">
              {getAgentIcon(agent.id)}
            </div>
            <div className="agent-info">
              <h3>{agent.name}</h3>
              <p>{agent.description}</p>
              <div className="agent-voice">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
                    fill="currentColor"
                  />
                </svg>
                <span>{agent.voice}</span>
              </div>
            </div>
            {currentAgent?.id === agent.id && (
              <div className="active-indicator">
                <span className="pulse-dot"></span>
                Active
              </div>
            )}
          </div>
        ))}
      </div>

      {currentAgent && (
        <div className="current-agent-info">
          <div className="info-badge">
            <strong>Current:</strong> {currentAgent.name}
          </div>
        </div>
      )}
    </div>
  );
}

function getAgentIcon(agentId) {
  const icons = {
    general_assistant: '🤖',
    technical_expert: '💻',
    creative_writer: '✍️',
    business_advisor: '📊',
    learning_coach: '🎓',
    health_wellness: '🧘'
  };
  return icons[agentId] || '🤖';
}

export default AgentSelector;
