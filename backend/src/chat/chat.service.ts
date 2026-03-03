/**
 * Chat Service - Integrates ReAct Agent with Similarity Agent and Profile Management
 * 
 * Provides intelligent conversational interface for:
 * - Scheme discovery and recommendations
 * - Profile viewing and updates
 * - Eligibility checking
 * - Natural language interaction
 */

import { SchemeInformationService } from '../services/scheme-information.service';
import { similarityAgent } from '../agents/similarity-agent';
import { findMatchingIntent, getResponseForIntent } from '../utils/training-data';
import { ReActAgent } from '../react-agent/react-agent';
import { ConversationContext, Tool, ToolResult } from '../react-agent/types';

interface ChatResponse {
  response: string;
  suggestions?: string[];
}

class ChatService {
  private agent: ReActAgent;
  private conversations: Map<string, ConversationContext> = new Map();

  constructor() {
    // Initialize ReAct agent with tools
    this.agent = new ReActAgent([
      this.createSearchSchemesTool(),
      this.createCheckEligibilityTool(),
      this.createGetProfileTool(),
      this.createUpdateProfileTool(),
    ]);
  }

  /**
   * Process a chat message
   */
  async processMessage(
    userId: string,
    message: string,
    userProfile: any,
    conversationHistory: any[] = []
  ): Promise<ChatResponse> {
    try {
      // Get or create conversation context
      let context = this.conversations.get(userId);
      if (!context) {
        context = {
          sessionId: `session_${userId}_${Date.now()}`,
          userId,
          userProfile,
          messageHistory: [],
          toolExecutionHistory: [],
        };
        this.conversations.set(userId, context);
      }

      // Update user profile in context
      context.userProfile = userProfile;

      // Import and sync conversation history from frontend if provided
      if (conversationHistory && conversationHistory.length > 0) {
        console.log(`Syncing ${conversationHistory.length} messages from frontend for user ${userId}`);
        // Convert incoming history to Message objects if needed
        const incomingMessages = conversationHistory.map((msg: any, idx: number) => ({
          messageId: `sync_${idx}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(),
        }));
        
        // Replace message history with incoming history to maintain context
        context.messageHistory = incomingMessages;
      }

      // Check for profile queries and updates first (fast path)
      const quickResponse = await this.handleQuickResponses(message, userProfile);
      if (quickResponse) {
        return quickResponse;
      }

      // Use ReAct agent for complex queries, including conversation history
      const agentResponse = await this.agent.processQuery(message, context);

      return {
        response: agentResponse.content,
        suggestions: agentResponse.suggestions,
      };
    } catch (error: any) {
      console.error('Chat processing error:', error);
      return {
        response: "I'm having trouble processing that request. Could you try rephrasing?",
        suggestions: ['Show my profile', 'Find schemes for me', 'Check eligibility'],
      };
    }
  }

  /**
   * Handle quick responses for common queries
   */
  private async handleQuickResponses(
    message: string,
    userProfile: any
  ): Promise<ChatResponse | null> {
    const lowerMessage = message.toLowerCase();

    // Scheme information queries
    if (
      lowerMessage.includes('tell me about') ||
      lowerMessage.includes('what is') ||
      lowerMessage.includes('info about') ||
      lowerMessage.includes('details about')
    ) {
      // Extract scheme name from message
      const schemeInfo = SchemeInformationService.getSchemeInfo(message);
      if (schemeInfo) {
        return {
          response: schemeInfo.info,
          suggestions: schemeInfo.suggestions,
        };
      }
    }

    // Eligibility check queries
    if (
      lowerMessage.includes('am i eligible') ||
      lowerMessage.includes('can i apply') ||
      lowerMessage.includes('do i qualify')
    ) {
      // Extract scheme name from message
      let schemeName = '';
      const schemeMatch = message.match(/(for|to)\s+(.+?)(?:\?|$)/i);
      if (schemeMatch) {
        schemeName = schemeMatch[2];
      }

      if (schemeName) {
        return {
          response: SchemeInformationService.checkEligibility(userProfile, schemeName),
          suggestions: ['How to apply', 'Required documents', 'Find other schemes'],
        };
      }
    }

    // How to apply queries
    if (
      lowerMessage.includes('how to apply') ||
      lowerMessage.includes('apply for') ||
      lowerMessage.includes('application process')
    ) {
      const schemeMatch = message.match(/(for|to)\s+(.+?)(?:\?|$)/i);
      if (schemeMatch) {
        const schemeName = schemeMatch[2];
        return {
          response: SchemeInformationService.getApplicationInfo(schemeName),
          suggestions: ['Check eligibility', 'Required documents', 'Find more schemes'],
        };
      }
    }

    // Browse all schemes — use database
    if (
      lowerMessage.includes('show all') ||
      lowerMessage.includes('list all') ||
      lowerMessage.includes('available schemes')
    ) {
      return await this.handleSchemeQuery(userProfile, message);
    }

    // Profile viewing
    if (
      lowerMessage.includes('my profile') ||
      lowerMessage.includes('my details') ||
      lowerMessage.includes('my information') ||
      lowerMessage.includes('about me')
    ) {
      return this.formatProfileResponse(userProfile);
    }

    // Greetings
    if (
      lowerMessage.match(/^(hello|hi|hey|good morning|good afternoon|good evening)$/i)
    ) {
      return {
        response: `Hello! 👋 I'm your personalized scheme recommendation assistant. I can help you:\n\n` +
          `• Find government schemes you're eligible for\n` +
          `• View and update your profile\n` +
          `• Answer questions about schemes\n` +
          `• Check eligibility criteria\n\n` +
          `What would you like to know?`,
        suggestions: ['Show my profile', 'Find schemes for me', 'What schemes am I eligible for?'],
      };
    }

    // Profile field queries
    if (lowerMessage.includes('my name')) {
      return {
        response: `Your name is ${userProfile.name || 'not set'}.`,
        suggestions: ['Show full profile', 'Find schemes for me'],
      };
    }

    if (lowerMessage.includes('my age')) {
      return {
        response: userProfile.age
          ? `You are ${userProfile.age} years old.`
          : "Your age is not set. Tell me your age by saying 'my age is 25'",
        suggestions: ['Show full profile', 'Find schemes for me'],
      };
    }

    if (lowerMessage.includes('my income')) {
      return {
        response: userProfile.income
          ? `Your annual income is ₹${userProfile.income}.`
          : "Your income is not set. Tell me by saying 'my income is 500000'",
        suggestions: ['Show full profile', 'Find schemes for me'],
      };
    }

    if (lowerMessage.includes('my state')) {
      return {
        response: userProfile.state
          ? `You are from ${userProfile.state}.`
          : "Your state is not set. Tell me by saying 'I live in Maharashtra'",
        suggestions: ['Show full profile', 'Find schemes for me'],
      };
    }

    // Scheme queries - use training data
    if (
      lowerMessage.includes('scheme') ||
      lowerMessage.includes('eligible') ||
      lowerMessage.includes('recommend') ||
      lowerMessage.includes('find') ||
      lowerMessage.includes('scholarship') ||
      lowerMessage.includes('benefit') ||
      lowerMessage.includes('grant')
    ) {
      return await this.handleSchemeQuery(userProfile, message);
    }

    return null;
  }

  /**
   * Handle scheme-related queries — uses real database via SimilarityAgent
   */
  private async handleSchemeQuery(
    userProfile: any,
    message: string
  ): Promise<ChatResponse> {
    try {
      const lowerMessage = message.toLowerCase();

      // First check if asking about a specific well-known scheme
      const schemeInfo = SchemeInformationService.getSchemeInfo(message);
      if (schemeInfo) {
        return {
          response: schemeInfo.info,
          suggestions: schemeInfo.suggestions,
        };
      }

      // Check if asking for eligibility
      if (lowerMessage.includes('eligible') || lowerMessage.includes('qualify')) {
        const schemeMatch = message.match(/(for|to)\s+(.+?)(?:\?|$)/i);
        if (schemeMatch) {
          const schemeName = schemeMatch[2];
          return {
            response: SchemeInformationService.checkEligibility(userProfile, schemeName),
            suggestions: ['How to apply', 'Find more schemes', 'Check another scheme'],
          };
        }
      }

      // Extract meaningful keywords from the message for search
      const stopWords = new Set(['find', 'me', 'show', 'get', 'list', 'what', 'are', 'the', 'for', 'my', 'i', 'a', 'an', 'to', 'in', 'of', 'and', 'is', 'can', 'please', 'some', 'any', 'all', 'scheme', 'schemes', 'government']);
      const keywords = lowerMessage.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
      const searchQuery = keywords.join(' ');

      // Use real database via SimilarityAgent
      let schemes: any[] = [];
      if (searchQuery.length > 0) {
        schemes = await similarityAgent.searchSchemes(searchQuery, 6);
      }

      // If text search found nothing, try profile-based matching
      if (schemes.length === 0) {
        const profileForMatching = {
          userId: userProfile.userId || 'chat-user',
          employment: userProfile.employment,
          income: userProfile.income ? this.mapIncomeToCategory(userProfile.income) : undefined,
          locality: userProfile.locality || 'Urban',
          socialCategory: userProfile.socialCategory,
          education: userProfile.education,
          povertyLine: userProfile.income ? this.mapIncomeToPovertyLine(userProfile.income) : undefined,
          state: userProfile.state,
          age: userProfile.age,
          interests: keywords.length > 0 ? keywords : ['general'],
        };
        const matches = await similarityAgent.findMatchingSchemes(profileForMatching, 6);
        schemes = matches.map(m => ({
          schemeId: m.schemeId,
          name: m.name,
          description: m.description,
          ministry: m.ministry,
          tags: m.tags,
          eligibilityScore: m.eligibilityScore,
        }));
      }

      if (schemes.length === 0) {
        return {
          response: "I couldn't find any matching schemes right now. Try refining your query or browse the Schemes page.",
          suggestions: ['Browse Schemes', 'Show my profile', 'Find agriculture schemes'],
        };
      }

      // Format the results
      let response = `📚 **Matching Government Schemes** (from ${schemes.length.toLocaleString()} results)\n\n`;
      for (const s of schemes) {
        const name = s.name || s.title || 'Unknown';
        const desc = (s.description || '').substring(0, 120);
        const score = s.eligibilityScore ? ` (Score: ${s.eligibilityScore}%)` : '';
        response += `• **${name}**${score}\n  ${desc}${desc.length >= 120 ? '...' : ''}\n\n`;
      }
      response += `💡 Based on your profile (${userProfile.employment || 'Any'} employment, Age: ${userProfile.age || 'Not specified'}), ask me "am I eligible for [scheme name]?" to check your eligibility!`;

      return {
        response,
        suggestions: ['Tell me more about a scheme', 'Check my eligibility', 'Show my profile'],
      };
    } catch (error: any) {
      console.error('Scheme query error:', error);
      return {
        response:
          "I'm having trouble fetching scheme information. Please try asking about a specific scheme or check the Schemes page.",
        suggestions: ['Browse Schemes', 'Show my profile', 'Try again'],
      };
    }
  }

  /**
   * Format profile response
   */
  private formatProfileResponse(profile: any): ChatResponse {
    const completeness = this.calculateCompleteness(profile);
    
    let response = `📋 Your Profile (${completeness}% complete):\n\n`;
    response += `👤 Name: ${profile.name || 'Not set'}\n`;
    response += `📧 Email: ${profile.email || 'Not set'}\n`;
    response += `🎂 Age: ${profile.age || 'Not set'}\n`;
    response += `💰 Income: ${profile.income ? '₹' + profile.income : 'Not set'}\n`;
    response += `📍 State: ${profile.state || 'Not set'}\n`;
    response += `🏢 Employment: ${profile.employment || 'Not set'}\n`;
    response += `🎓 Education: ${profile.education || 'Not set'}\n\n`;

    if (completeness < 100) {
      response += `💡 Complete your profile to get better recommendations! You can say:\n`;
      response += `• "My age is 25"\n`;
      response += `• "I live in Maharashtra"\n`;
      response += `• "I am unemployed"\n`;
      response += `• "My income is 300000"`;
    } else {
      response += `✅ Your profile is complete! Check the Dashboard for personalized recommendations.`;
    }

    return {
      response,
      suggestions: ['Find schemes for me', 'Update my details', 'Check eligibility'],
    };
  }

  /**
   * Calculate profile completeness
   */
  private calculateCompleteness(profile: any): number {
    const fields = ['name', 'email', 'age', 'income', 'state', 'employment', 'education'];
    const filledFields = fields.filter(
      (field) => profile[field] != null && profile[field] !== ''
    );
    return Math.round((filledFields.length / fields.length) * 100);
  }

  /**
   * Create search schemes tool
   */
  private createSearchSchemesTool(): Tool {
    return {
      name: 'search_schemes',
      description: 'Search for government schemes based on user profile and query',
      parameters: {
        query: { type: 'string', required: false },
        limit: { type: 'number', required: false, default: 5 },
      },
      requiresAuth: true,
      execute: async (params: any, context: ConversationContext): Promise<ToolResult> => {
        try {
          const userProfile = context.userProfile || {};
          const limit = params.limit || 5;

          // Build user profile for similarity matching
          const profileForMatching = {
            userId: context.userId!,
            employment: userProfile.employment,
            income: this.mapIncomeToCategory(userProfile.income),
            locality: userProfile.locality || 'urban',
            socialCategory: userProfile.socialCategory || 'general',
            education: userProfile.education,
            povertyLine: this.mapIncomeToPovertyLine(userProfile.income),
            state: userProfile.state,
            age: userProfile.age,
            interests: params.query ? [params.query] : [],
          };

          // Find matching schemes
          const matches = await similarityAgent.findMatchingSchemes(
            profileForMatching,
            limit
          );

          return {
            success: true,
            data: matches,
            metadata: {
              executionTime: 0,
              cacheHit: false,
              toolVersion: '1.0',
            },
          };
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: 'SEARCH_ERROR',
              message: error.message,
            },
            metadata: {
              executionTime: 0,
              cacheHit: false,
              toolVersion: '1.0',
            },
          };
        }
      },
    };
  }

  /**
   * Create check eligibility tool
   */
  private createCheckEligibilityTool(): Tool {
    return {
      name: 'check_eligibility',
      description: 'Check user eligibility for schemes',
      parameters: {
        schemeId: { type: 'string', required: false },
      },
      requiresAuth: true,
      execute: async (params: any, context: ConversationContext): Promise<ToolResult> => {
        try {
          const userProfile = context.userProfile || {};
          
          // Build profile for matching
          const profileForMatching = {
            userId: context.userId!,
            employment: userProfile.employment,
            income: this.mapIncomeToCategory(userProfile.income),
            locality: userProfile.locality || 'urban',
            socialCategory: userProfile.socialCategory || 'general',
            education: userProfile.education,
            povertyLine: this.mapIncomeToPovertyLine(userProfile.income),
            state: userProfile.state,
            age: userProfile.age,
          };

          // Get top eligible schemes
          const matches = await similarityAgent.findMatchingSchemes(
            profileForMatching,
            10
          );

          return {
            success: true,
            data: {
              eligibleSchemes: matches.filter((m: any) => m.eligibilityScore >= 60),
              totalChecked: matches.length,
            },
            metadata: {
              executionTime: 0,
              cacheHit: false,
              toolVersion: '1.0',
            },
          };
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: 'ELIGIBILITY_ERROR',
              message: error.message,
            },
            metadata: {
              executionTime: 0,
              cacheHit: false,
              toolVersion: '1.0',
            },
          };
        }
      },
    };
  }

  /**
   * Create get profile tool
   */
  private createGetProfileTool(): Tool {
    return {
      name: 'get_profile',
      description: 'Get user profile information',
      parameters: {},
      requiresAuth: true,
      execute: async (_params: any, context: ConversationContext): Promise<ToolResult> => {
        return {
          success: true,
          data: context.userProfile,
          metadata: {
            executionTime: 0,
            cacheHit: true,
            toolVersion: '1.0',
          },
        };
      },
    };
  }

  /**
   * Create update profile tool
   */
  private createUpdateProfileTool(): Tool {
    return {
      name: 'update_profile',
      description: 'Update user profile fields',
      parameters: {
        field: { type: 'string', required: true },
        value: { type: 'any', required: true },
      },
      requiresAuth: true,
      execute: async (params: any, context: ConversationContext): Promise<ToolResult> => {
        try {
          // Update profile in context (actual DB update would happen in the endpoint)
          if (context.userProfile) {
            context.userProfile[params.field] = params.value;
          }

          return {
            success: true,
            data: {
              field: params.field,
              value: params.value,
              message: `Updated ${params.field} successfully`,
            },
            metadata: {
              executionTime: 0,
              cacheHit: false,
              toolVersion: '1.0',
            },
          };
        } catch (error: any) {
          return {
            success: false,
            error: {
              code: 'UPDATE_ERROR',
              message: error.message,
            },
            metadata: {
              executionTime: 0,
              cacheHit: false,
              toolVersion: '1.0',
            },
          };
        }
      },
    };
  }

  /**
   * Map income to category
   */
  private mapIncomeToCategory(income?: number): string {
    if (!income) return 'Any';
    if (income < 100000) return 'Below 1 Lakh';
    if (income < 300000) return '1-3 Lakh';
    if (income < 500000) return '3-5 Lakh';
    if (income < 1000000) return '5-10 Lakh';
    return 'Above 10 Lakh';
  }

  /**
   * Map income to poverty line
   */
  private mapIncomeToPovertyLine(income?: number): string {
    if (!income) return 'Any';
    return income < 100000 ? 'BPL' : 'APL';
  }

  /**
   * Clear conversation history for a user
   */
  clearConversation(userId: string): void {
    this.conversations.delete(userId);
  }
}

export const chatService = new ChatService();
