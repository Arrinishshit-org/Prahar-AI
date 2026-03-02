import React, { useState, useEffect } from 'react';

export const ConnectionStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    // Placeholder for MCP connection monitoring
    const checkConnection = () => {
      // This would check actual MCP WebSocket connection
      setIsConnected(navigator.onLine);
    };

    window.addEventListener('online', () => setIsConnected(true));
    window.addEventListener('offline', () => setIsConnected(false));

    return () => {
      window.removeEventListener('online', () => setIsConnected(true));
      window.removeEventListener('offline', () => setIsConnected(false));
    };
  }, []);

  if (isConnected) return null;

  return (
    <div className="connection-status offline">
      <span>Disconnected</span>
      {reconnectAttempts > 0 && <span>Reconnecting... (Attempt {reconnectAttempts})</span>}
    </div>
  );
};
