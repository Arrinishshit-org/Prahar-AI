/**
 * Type definitions for ReAct Agent
 */

export interface ConversationContext {
  sessionId: string;
  userId?: string;
  userProfile?: any; // UserProfile type from profile module
  messageHistory: Message[];
  toolExecutionHistory: ToolExecution[];
}

export interface Message {
  messageId: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ToolExecution {
  executionId: string;
  toolName: string;
  parameters: Record<string, any>;
  result: ToolResult;
  timestamp: Date;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: ErrorInfo;
  metadata: {
    executionTime: number;
    cacheHit: boolean;
    toolVersion: string;
  };
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface Thought {
  reasoning: string;
  confidence: number;
  requiredInformation: string[];
}

export interface Action {
  toolName: string;
  parameters: Record<string, any>;
  reasoning: string;
}

export interface Observation {
  toolResult: ToolResult;
  interpretation: string;
  nextSteps: string[];
}

export interface AgentResponse {
  content: string;
  reasoning: Thought[];
  toolsUsed: string[];
  suggestions: string[];
  timestamp: Date;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any, context: ConversationContext) => Promise<ToolResult>;
  requiresAuth: boolean;
}
