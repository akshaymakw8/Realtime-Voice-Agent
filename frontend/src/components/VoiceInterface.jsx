import React from 'react';
import './VoiceInterface.css';

function VoiceInterface({
  isRecording,
  isSpeaking,
  isConnected,
  onStartRecording,
  onStopRecording,
  onCancel
}) {
  return (
    <div className="voice-interface">
      <div className="voice-controls">
        {!isConnected ? (
          <div className="connection-prompt">
            <p>Select an agent to start</p>
          </div>
        ) : (
          <>
            <button
              className={`record-button ${isRecording ? 'recording' : ''}`}
              onMouseDown={onStartRecording}
              onMouseUp={onStopRecording}
              onTouchStart={onStartRecording}
              onTouchEnd={onStopRecording}
              disabled={isSpeaking}
            >
              <div className="record-button-inner">
                {isRecording ? (
                  <>
                    <span className="pulse"></span>
                    <svg viewBox="0 0 24 24" width="48" height="48">
                      <rect x="6" y="4" width="12" height="16" rx="2" fill="currentColor" />
                    </svg>
                    <span className="record-text">Recording...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="48" height="48">
                      <path
                        d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
                        fill="currentColor"
                      />
                      <path
                        d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
                        fill="currentColor"
                      />
                    </svg>
                    <span className="record-text">Hold to Talk</span>
                  </>
                )}
              </div>
            </button>

            {isSpeaking && (
              <button
                className="cancel-button"
                onClick={onCancel}
              >
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                    fill="currentColor"
                  />
                </svg>
                Stop Response
              </button>
            )}
          </>
        )}
      </div>

      {isSpeaking && (
        <div className="speaking-indicator">
          <div className="wave">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>AI is speaking...</p>
        </div>
      )}

      <div className="voice-tips">
        <p>💡 Hold the microphone button to speak, release when done</p>
      </div>
    </div>
  );
}

export default VoiceInterface;
