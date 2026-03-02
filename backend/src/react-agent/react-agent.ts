/**
 * ReAct Agent - Implements Reasoning + Acting loop for conversational AI
 * 
 * The agent follows a Thought → Action → Observation → Decision cycle:
 * 1. Thought: Analyze query and context to understand intent
 * 2. Action: Select and execute appropriate tools
 * 3. Observation: Interpret tool results
 * 4. Decision: Continue reasoning, ask clarification, or generate response
 */

import {
  ConversationContext,
  Message,
  Thought,
  Action,
  Observation,
  AgentResponse,
  Tool,
  ToolResult,
  ToolExecution,
} from './types';

export class ReActAgent {
  private tools: Map<string, Tool> = new Map();
  private maxReasoningSteps: number = 5;

  constructor(tools: Tool[] = []) {
    tools.forEach((tool) => this.registerTool(tool));
  }

  /**
   * Register a tool for the agent to use
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Main entry point - Process a user query through the ReAct loop
   */
  async processQuery(
    query: string,
    context: ConversationContext
  ): Promise<AgentResponse> {
    // Add user message to history
    const userMessage: Message = {
      messageId: this.generateId(),
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    context.messageHistory.push(userMessage);

    const thoughts: Thought[] = [];
    const toolsUsed: string[] = [];
    let stepCount = 0;

    // ReAct reasoning loop
    while (stepCount < this.maxReasoningSteps) {
      stepCount++;

      // THOUGHT: Analyze query and context
      const thought = await this.generateThought(query, context.messageHistory);
      thoughts.push(thought);

      // Check if we have enough information to respond
      if (thought.requiredInformation.length === 0) {
        break;
      }

      // ACTION: Select and execute tool
      const action = await this.selectAction(thought, Array.from(this.tools.values()));
      
      // Check if tool requires auth
      const tool = this.tools.get(action.toolName);
      if (tool?.requiresAuth && !context.userId) {
        // Cannot execute authenticated tool without user
        break;
      }

      const toolResult = await this.executeTool(action, context);
      toolsUsed.push(action.toolName);

      // Record tool execution
      const execution: ToolExecution = {
        executionId: this.generateId(),
        toolName: action.toolName,
        parameters: action.parameters,
        result: toolResult,
        timestamp: new Date(),
      };
      context.toolExecutionHistory.push(execution);

      // OBSERVATION: Process tool result
      const observation = await this.processObservation(toolResult);

      // DECISION: Determine next steps
      if (observation.nextSteps.includes('generate_response')) {
        break;
      }

      if (observation.nextSteps.includes('ask_clarification')) {
        break;
      }
    }

    // Generate final response
    const response = await this.generateResponse(context, thoughts, toolsUsed);

    // Add agent message to history
    const agentMessage: Message = {
      messageId: this.generateId(),
      role: 'agent',
      content: response.content,
      timestamp: new Date(),
    };
    context.messageHistory.push(agentMessage);

    return response;
  }

  /**
   * THOUGHT: Generate reasoning about the query
   */
  async generateThought(query: string, history: Message[]): Promise<Thought> {
    // Simple implementation - in production would use LLM
    const reasoning = `Analyzing query: "${query}"`;
    
    // Determine what information is needed
    const requiredInformation: string[] = [];
    
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('scheme') || lowerQuery.includes('program')) {
      requiredInformation.push('scheme_information');
    }
    
    if (lowerQuery.includes('eligible') || lowerQuery.includes('qualify')) {
      requiredInformation.push('eligibility_check');
    }
    
    if (lowerQuery.includes('apply') || lowerQuery.includes('application')) {
      requiredInformation.push('application_info');
    }
    
    if (lowerQuery.includes('deadline') || lowerQuery.includes('when')) {
      requiredInformation.push('deadline_info');
    }

    // If no specific information needed, we can respond directly
    const confidence = requiredInformation.length > 0 ? 0.8 : 0.9;

    return {
      reasoning,
      confidence,
      requiredInformation,
    };
  }

  /**
   * ACTION: Select appropriate tool based on thought
   */
  async selectAction(thought: Thought, availableTools: Tool[]): Promise<Action> {
    // Simple rule-based selection - in production would use LLM
    let toolName = 'search_schemes'; // default
    const parameters: Record<string, any> = {};

    if (thought.requiredInformation.includes('eligibility_check')) {
      toolName = 'check_eligibility';
    } else if (thought.requiredInformation.includes('application_info')) {
      toolName = 'get_application_info';
    } else if (thought.requiredInformation.includes('deadline_info')) {
      toolName = 'check_deadlines';
    } else if (thought.requiredInformation.includes('scheme_information')) {
      toolName = 'search_schemes';
      parameters.limit = 5;
    }

    return {
      toolName,
      parameters,
      reasoning: `Selected ${toolName} to gather required information`,
    };
  }

  /**
   * Execute a tool with given parameters
   */
  private async executeTool(
    action: Action,
    context: ConversationContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(action.toolName);

    if (!tool) {
      return {
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool ${action.toolName} not found`,
        },
        metadata: {
          executionTime: 0,
          cacheHit: false,
          toolVersion: '1.0',
        },
      };
    }

    const startTime = Date.now();
    try {
      const result = await tool.execute(action.parameters, context);
      result.metadata.executionTime = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TOOL_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: false,
          toolVersion: '1.0',
        },
      };
    }
  }

  /**
   * OBSERVATION: Process and interpret tool results
   */
  async processObservation(toolResult: ToolResult): Promise<Observation> {
    if (!toolResult.success) {
      return {
        toolResult,
        interpretation: 'Tool execution failed',
        nextSteps: ['generate_response'],
      };
    }

    // Interpret the result
    const interpretation = 'Tool executed successfully';
    
    // Determine next steps
    const nextSteps: string[] = [];
    
    if (toolResult.data) {
      // We have data, can generate response
      nextSteps.push('generate_response');
    } else {
      // Need more information
      nextSteps.push('continue_reasoning');
    }

    return {
      toolResult,
      interpretation,
      nextSteps,
    };
  }

  /**
   * Generate final natural language response
   */
  async generateResponse(
    context: ConversationContext,
    thoughts: Thought[],
    toolsUsed: string[]
  ): Promise<AgentResponse> {
    // Simple implementation - in production would use LLM
    let content = 'I can help you with government schemes. ';

    // Get last tool execution result
    if (context.toolExecutionHistory.length > 0) {
      const lastExecution = context.toolExecutionHistory[context.toolExecutionHistory.length - 1];
      
      if (lastExecution.result.success && lastExecution.result.data) {
        content += `Based on my search, I found relevant information. `;
      } else {
        content += `I encountered an issue while searching. `;
      }
    }

    const suggestions = [
      'Ask about specific schemes',
      'Check your eligibility',
      'Learn about application process',
    ];

    return {
      content,
      reasoning: thoughts,
      toolsUsed,
      suggestions,
      timestamp: new Date(),
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
