import React from 'react';

export const ThinkingIndicator: React.FC = () => {
  return (
    <div className="thinking-indicator">
      <div className="thinking-dots">
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </div>
      <span>Agent is thinking...</span>
    </div>
  );
};
