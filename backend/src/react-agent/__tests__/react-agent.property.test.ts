/**
 * Property-based tests for ReAct Agent
 * 
 * These tests verify universal properties that should hold for all inputs
 */

import fc from 'fast-check';
import { ReActAgent } from '../react-agent';
import {
  ConversationContext,
  Tool,
  ToolResult,
  Message,
} from '../types';
import {
  conversationContextArbitrary,
  simpleQueryArbitrary,
  messageArbitrary,
} from '../../test/arbitraries';

// Configure fast-check for faster execution
fc.configureGlobal({ numRuns: 10 });

// Mock tool for testing
const createMockTool = (name: string, requiresAuth: boolean = false): Tool => ({
  name,
  description: `Mock ${name} tool`,
  parameters: {},
  requiresAuth,
  execute: async (params: any, context: ConversationContext): Promise<ToolResult> => {
    return {
      success: true,
      data: { mockData: `Result from ${name}` },
      metadata: {
        executionTime: 100,
        cacheHit: false,
        toolVersion: '1.0',
      },
    };
  },
});

describe('ReAct Agent Property-Based Tests', () => {
  /**
   * Property 8: Conversation Context Preservation
   * 
   * For any sequence of messages within a session, the ReAct agent should 
   * maintain context such that later messages can reference information 
   * from earlier messages without re-specification.
   * 
   * **Validates: Requirements 4.2**
   */
  describe('Property 8: Conversation Context Preservation', () => {
    it('should preserve message history across multiple queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          conversationContextArbitrary(),
          fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 2, maxLength: 3 }),
          async (initialContext, queries) => {
            // Setup
            const tools = [
              createMockTool('search_schemes'),
              createMockTool('check_eligibility', true),
              createMockTool('get_application_info'),
            ];
            const agent = new ReActAgent(tools);

            // Create a fresh context with the session ID
            const context: ConversationContext = {
              sessionId: initialContext.sessionId,
              userId: initialContext.userId,
              messageHistory: [],
              toolExecutionHistory: [],
            };

            // Process queries sequentially
            for (const query of queries) {
              await agent.processQuery(query, context);
            }

            // Verify: Message history should contain all queries and responses
            // Each query generates 1 user message + 1 agent message = 2 messages per query
            const expectedMessageCount = queries.length * 2;
            expect(context.messageHistory.length).toBe(expectedMessageCount);

            // Verify: All user queries are preserved in order
            const userMessages = context.messageHistory.filter((m) => m.role === 'user');
            expect(userMessages.length).toBe(queries.length);
            
            for (let i = 0; i < queries.length; i++) {
              expect(userMessages[i].content).toBe(queries[i]);
            }

            // Verify: Agent responses are preserved
            const agentMessages = context.messageHistory.filter((m) => m.role === 'agent');
            expect(agentMessages.length).toBe(queries.length);

            // Verify: Messages are in chronological order
            for (let i = 1; i < context.messageHistory.length; i++) {
              expect(context.messageHistory[i].timestamp.getTime()).toBeGreaterThanOrEqual(
                context.messageHistory[i - 1].timestamp.getTime()
              );
            }
          }
        )
      );
    });

    it('should preserve tool execution history across queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          conversationContextArbitrary(),
          fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 2 }),
          async (initialContext, queries) => {
            // Setup
            const tools = [
              createMockTool('search_schemes'),
              createMockTool('check_eligibility'),
            ];
            const agent = new ReActAgent(tools);

            const context: ConversationContext = {
              sessionId: initialContext.sessionId,
              userId: initialContext.userId,
              messageHistory: [],
              toolExecutionHistory: [],
            };

            const initialToolExecutionCount = context.toolExecutionHistory.length;

            // Process queries
            for (const query of queries) {
              await agent.processQuery(query, context);
            }

            // Verify: Tool execution history grows (at least one tool per query)
            expect(context.toolExecutionHistory.length).toBeGreaterThanOrEqual(
              initialToolExecutionCount + queries.length
            );

            // Verify: Each tool execution has required fields
            for (const execution of context.toolExecutionHistory) {
              expect(execution.executionId).toBeDefined();
              expect(execution.toolName).toBeDefined();
              expect(execution.parameters).toBeDefined();
              expect(execution.result).toBeDefined();
              expect(execution.timestamp).toBeInstanceOf(Date);
            }
          }
        )
      );
    });

    it('should maintain session ID across all interactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          conversationContextArbitrary(),
          fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 3 }),
          async (initialContext, queries) => {
            const tools = [createMockTool('search_schemes')];
            const agent = new ReActAgent(tools);

            const context: ConversationContext = {
              sessionId: initialContext.sessionId,
              userId: initialContext.userId,
              messageHistory: [],
              toolExecutionHistory: [],
            };

            const originalSessionId = context.sessionId;

            // Process queries
            for (const query of queries) {
              await agent.processQuery(query, context);
            }

            // Verify: Session ID remains unchanged
            expect(context.sessionId).toBe(originalSessionId);
          }
        )
      );
    });
  });
});
