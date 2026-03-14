import React from 'react';

/**
 * A full-screen overlay with a spinner and loading message.
 * Used when the backend is not yet ready.
 */
const LoadingOverlay: React.FC = () => {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="spinner"></div>
        <h2>Initializing Backend...</h2>
        <p>Connecting to TTS Audio Generation System</p>
      </div>
      <style>{`
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(10, 10, 10, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          color: white;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .loading-content {
          text-align: center;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-left-color: #646cff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        h2 {
          margin: 0 0 10px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }
        p {
          margin: 0;
          opacity: 0.6;
          font-size: 0.9em;
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;
