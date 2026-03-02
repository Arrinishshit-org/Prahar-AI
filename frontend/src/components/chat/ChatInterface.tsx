import React from 'react';
import { useChat } from '../../hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ThinkingIndicator } from './ThinkingIndicator';

export const ChatInterface: React.FC = () => {
  const { messages, isThinking, error, sendMessage } = useChat();

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>Chat Assistant</h2>
      </div>
      <MessageList messages={messages} />
      {isThinking && <ThinkingIndicator />}
      {error && <div className="error">{error}</div>}
      <MessageInput onSend={sendMessage} disabled={isThinking} />
    </div>
  );
};
