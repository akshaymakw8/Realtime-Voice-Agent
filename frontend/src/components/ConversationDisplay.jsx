import React, { useEffect, useRef } from 'react';
import './ConversationDisplay.css';

function ConversationDisplay({ conversation, onClear }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="conversation-display">
      <div className="conversation-header">
        <h2>Conversation</h2>
        {conversation.length > 0 && (
          <button className="clear-button" onClick={onClear}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                fill="currentColor"
              />
            </svg>
            Clear
          </button>
        )}
      </div>

      <div className="messages-container">
        {conversation.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <p>No messages yet</p>
            <p className="empty-hint">Start a conversation with an AI agent</p>
          </div>
        ) : (
          conversation.map((message) => (
            <div
              key={message.id}
              className={`message message-${message.role}`}
            >
              <div className="message-header">
                <span className="message-role">
                  {message.role === 'user' ? '👤 You' : 
                   message.role === 'assistant' ? `🤖 ${message.agent || 'AI'}` :
                   '🔔 System'}
                </span>
                <span className="message-time">{formatTime(message.timestamp)}</span>
              </div>
              <div className="message-content">
                {message.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default ConversationDisplay;
