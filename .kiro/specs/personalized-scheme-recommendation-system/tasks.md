# Implementation Plan: Personalized Scheme Recommendation System

## Overview

This implementation plan breaks down the Personalized Scheme Recommendation System into actionable coding tasks. The system combines ReAct agents, MCP integration, ML-based classification, and conversational AI to deliver personalized government scheme recommendations.

**Technology Stack:**
- Backend: TypeScript (Node.js) for API, MCP Server, ReAct Agent
- ML Pipeline: Python for classification, clustering, and eligibility engines
- Frontend: React with TypeScript
- Database: Neo4j (graph database)
- Cache: Redis
- Testing: Jest, fast-check (property-based), Playwright (E2E)

**Implementation Approach:**
- Incremental development with checkpoints
- Property-based tests for universal correctness
- Unit tests for specific examples and edge cases
- Each task references specific requirements for traceability

## Tasks

### Phase 1: Project Setup & Infrastructure

- [x] 1. Initialize project structure and development environment
  - Create monorepo structure with backend, ml-pipeline, and frontend workspaces
  - Set up TypeScript configuration for backend and frontend
  - Set up Python virtual environment for ML pipeline
  - Configure ESLint, Prettier, and code quality tools
  - Create .env.example files with required environment variables
  - Set up Git hooks for pre-commit linting and testing
  - _Requirements: 13.1, 14.1_

- [x] 2. Set up Neo4j graph database
  - Install and configure Neo4j database (Docker or local)
  - Create database schema with node types (User, Scheme, UserGroup, Nudge, Category)
  - Create indexes for userId, email, schemeId, categoryId
  - Create full-text search index for scheme search
  - Write database initialization scripts
  - Configure connection pooling and authentication
  - _Requirements: 14.1, 14.2, 14.3_

- [x] 3. Set up Redis cache service
  - Install and configure Redis (Docker or local)
  - Create cache service wrapper with get/set/delete operations
  - Implement multi-level caching (in-memory L1 + Redis L2)
  - Configure TTL policies for different data types
  - Implement cache key naming conventions
  - _Requirements: 7.2, 7.3, 13.5_

- [x] 4. Configure testing frameworks
  - Set up Jest for unit and integration tests
  - Install and configure fast-check for property-based testing
  - Set up Playwright for E2E tests
  - Install Hypothesis for Python property-based tests
  - Create test utilities and fixtures
  - Configure test coverage reporting
  - _Requirements: All (testing infrastructure)_


### Phase 2: Core Backend Services

- [x] 5. Implement authentication service with JWT
  - [x] 5.1 Create JWT token generation and verification functions
    - Implement RS256 asymmetric encryption for tokens
    - Create access token (15-min expiry) and refresh token (7-day expiry)
    - Store refresh tokens in database
    - _Requirements: 19.3_
  
  - [x] 5.2 Implement password hashing and validation
    - Use bcrypt with cost factor 12 for password hashing
    - Create password strength validation (min 8 chars, uppercase, lowercase, number, special char)
    - _Requirements: 19.1_
  
  - [x] 5.3 Create registration endpoint
    - Validate user input and check for duplicate emails
    - Hash password and create user profile
    - Generate JWT tokens and return to client
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 5.4 Write property test for registration round trip
    - **Property 1: Registration Round Trip**
    - **Validates: Requirements 1.1, 1.3**
  
  - [x] 5.5 Write property test for registration validation
    - **Property 2: Registration Validation Rejects Invalid Profiles**
    - **Validates: Requirements 1.2, 1.5**
  
  - [x] 5.6 Write property test for user ID uniqueness
    - **Property 3: User ID Uniqueness**
    - **Validates: Requirements 1.4**
  
  - [x] 5.7 Create login endpoint
    - Verify email and password
    - Generate and return JWT tokens
    - Update lastLoginAt timestamp
    - _Requirements: 10.5_
  
  - [x] 5.8 Create token refresh endpoint
    - Verify refresh token validity
    - Generate new access token
    - _Requirements: 10.5_
  
  - [x] 5.9 Write property test for session persistence
    - **Property 28: Session Persistence**
    - **Validates: Requirements 10.5**

- [x] 6. Implement user profile management service
  - [x] 6.1 Create user profile data models and interfaces
    - Define UserProfile TypeScript interface
    - Create Neo4j User node schema
    - Implement profile validation functions
    - _Requirements: 1.1, 1.2_
  
  - [x] 6.2 Implement profile CRUD operations
    - Create getProfile, updateProfile, deleteProfile functions
    - Use Neo4j parameterized queries to prevent injection
    - Implement database transactions for consistency
    - _Requirements: 14.3, 14.4_
  
  - [x] 6.3 Write property test for database transaction consistency
    - **Property 35: Database Transaction Consistency**
    - **Validates: Requirements 14.3**
  
  - [x] 6.4 Write property test for database write retry
    - **Property 36: Database Write Retry**
    - **Validates: Requirements 14.5**
  
  - [x] 6.5 Implement profile completeness calculation
    - Calculate percentage of filled required fields
    - Store completeness score with profile
    - _Requirements: 1.2_
  
  - [x] 6.6 Create profile update endpoint with reclassification trigger
    - Validate profile updates
    - Update profile in database
    - Trigger user reclassification
    - Invalidate cached recommendations
    - _Requirements: 8.5_
  
  - [x] 6.7 Write property test for recommendation invalidation on profile update
    - **Property 22: Recommendation Invalidation on Profile Update**
    - **Validates: Requirements 8.5**

- [x] 7. Implement encryption service for sensitive data
  - [x] 7.1 Create AES-256-GCM encryption functions
    - Implement encrypt and decrypt functions
    - Use secure key management (environment variables or KMS)
    - Generate random IVs for each encryption
    - _Requirements: 19.1_
  
  - [x] 7.2 Implement profile encryption/decryption
    - Encrypt sensitive fields (email, name, DOB, income, pincode)
    - Decrypt fields when retrieving profiles
    - _Requirements: 19.1_
  
  - [x] 7.3 Write property test for profile data encryption at rest
    - **Property 48: Profile Data Encryption at Rest**
    - **Validates: Requirements 19.1**
  
  - [x] 7.4 Implement TLS 1.3 configuration for data in transit
    - Configure HTTPS with TLS 1.3
    - Set up certificate management
    - _Requirements: 19.2_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


### Phase 3: ML Pipeline (Python)

- [x] 9. Implement feature extraction for user classification
  - [x] 9.1 Create FeatureExtractor class
    - Extract numerical features (age, income, family size)
    - Normalize numerical features to 0-1 range
    - One-hot encode categorical features (gender, marital status, employment, education, caste)
    - Encode location features (state, district, rural/urban)
    - Return feature vector of ~50 dimensions
    - _Requirements: 2.2_
  
  - [x] 9.2 Write unit tests for feature extraction
    - Test normalization ranges
    - Test one-hot encoding correctness
    - Test feature vector dimensions
    - _Requirements: 2.2_
  
  - [x] 9.3 Write property test for classification feature sensitivity
    - **Property 5: Classification Feature Sensitivity**
    - **Validates: Requirements 2.2**

- [x] 10. Implement K-Means clustering for user grouping
  - [x] 10.1 Create UserClassifier class with K-Means
    - Initialize K-Means with 25 clusters
    - Implement train method to fit on user profiles
    - Use StandardScaler for feature standardization
    - Store cluster centroids and characteristics
    - _Requirements: 2.1, 2.2_
  
  - [x] 10.2 Implement user classification method
    - Extract and scale user features
    - Predict cluster assignment
    - Calculate confidence based on distance to centroid
    - Assign to default group if confidence < 70%
    - Support multi-group assignment for nearby clusters
    - _Requirements: 2.1, 2.5_
  
  - [x] 10.3 Write property test for user classification assignment
    - **Property 4: User Classification Assignment**
    - **Validates: Requirements 2.1, 2.3, 2.4**
  
  - [x] 10.4 Write property test for low confidence default assignment
    - **Property 6: Low Confidence Default Assignment**
    - **Validates: Requirements 2.5**
  
  - [x] 10.5 Implement cluster analysis and characterization
    - Analyze cluster member profiles
    - Compute typical profile for each cluster
    - Store cluster metadata (size, age range, income range, common occupations)
    - _Requirements: 2.1_
  
  - [x] 10.6 Create model training script
    - Load user profiles from database
    - Train K-Means classifier
    - Evaluate clustering quality (silhouette score)
    - Save trained model to disk
    - _Requirements: 2.1_

- [x] 11. Implement user classification engine
  - [x] 11.1 Create classification service API
    - Expose classifyUser endpoint
    - Expose reclassifyAllUsers batch endpoint
    - Load trained K-Means model
    - _Requirements: 2.1, 2.3_
  
  - [x] 11.2 Implement user group assignment storage
    - Create BELONGS_TO relationships in Neo4j
    - Store confidence scores and feature vectors
    - Update user groups on reclassification
    - _Requirements: 2.4_
  
  - [x] 11.3 Implement classification performance monitoring
    - Ensure classification completes within 5 seconds
    - Log classification times and confidence scores
    - _Requirements: 2.3_

- [x] 12. Implement eligibility engine with cosine similarity
  - [x] 12.1 Create EligibilityEngine class
    - Implement calculateEligibility method
    - Compute cosine similarity between user and scheme vectors
    - Convert similarity to 0-100% score
    - Categorize as highly_eligible (≥80%), potentially_eligible (50-80%), low_eligibility (<50%)
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6_
  
  - [x] 12.2 Write property test for eligibility score range
    - **Property 24: Eligibility Score Range**
    - **Validates: Requirements 9.2**
  
  - [x] 12.3 Write property test for eligibility score categorization
    - **Property 25: Eligibility Score Categorization**
    - **Validates: Requirements 9.4, 9.5, 9.6**
  
  - [x] 12.4 Implement criteria analysis
    - Compare user profile with scheme requirements
    - Identify met criteria (age, income, location, occupation, etc.)
    - Identify unmet criteria with explanations
    - _Requirements: 9.3_
  
  - [x] 12.5 Write property test for eligibility explanation completeness
    - **Property 26: Eligibility Explanation Completeness**
    - **Validates: Requirements 9.3**
  
  - [x] 12.6 Implement batch eligibility calculation
    - Calculate eligibility for multiple schemes efficiently
    - Reuse user vector across calculations
    - Cache eligibility results for 24 hours
    - _Requirements: 9.1_
  
  - [x] 12.7 Create eligibility explanation generator
    - Generate natural language explanations
    - Highlight top 3 matching criteria
    - Explain gaps for unmet criteria
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [x] 12.8 Write property test for top matching criteria display
    - **Property 43: Top Matching Criteria Display**
    - **Validates: Requirements 17.3**

- [x] 13. Implement recommendation engine
  - [x] 13.1 Create RecommendationEngine class
    - Retrieve schemes for user's groups
    - Calculate eligibility scores for candidate schemes
    - Combine group relevance (40%) and eligibility (60%) scores
    - Rank schemes by combined score
    - Return top 5-20 recommendations
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 13.2 Write property test for recommendation generation on login
    - **Property 19: Recommendation Generation on Login**
    - **Validates: Requirements 8.1, 8.2**
  
  - [x] 13.3 Write property test for recommendation ranking order
    - **Property 20: Recommendation Ranking Order**
    - **Validates: Requirements 8.3**
  
  - [x] 13.4 Write property test for recommendation count bounds
    - **Property 21: Recommendation Count Bounds**
    - **Validates: Requirements 8.4**
  
  - [x] 13.5 Write property test for recommendation generation performance
    - **Property 23: Recommendation Generation Performance**
    - **Validates: Requirements 8.6**
  
  - [x] 13.6 Implement recommendation explanation generation
    - Generate explanations for each recommendation
    - Highlight matching user profile attributes
    - _Requirements: 17.1, 17.2_
  
  - [x] 13.7 Write property test for recommendation explanation presence
    - **Property 42: Recommendation Explanation Presence**
    - **Validates: Requirements 17.1, 17.2**
  
  - [x] 13.8 Implement recommendation caching
    - Cache recommendations per user
    - Invalidate cache on profile update
    - Set cache TTL to 24 hours
    - _Requirements: 8.5_

- [x] 14. Checkpoint - Ensure all ML pipeline tests pass
  - Ensure all tests pass, ask the user if questions arise.


### Phase 4: MCP Server Implementation

- [ ] 15. Set up MCP server with FastMCP
  - [ ] 15.1 Initialize MCP server project
    - Install FastMCP or MCP SDK dependencies
    - Create MCP server entry point
    - Configure WebSocket server on port 3001
    - Set up connection handling and session management
    - _Requirements: 6.1, 6.2_
  
  - [ ] 15.2 Implement session and context management
    - Create ContextManager class
    - Implement createSession, getSession, updateContext methods
    - Store session data (userId, userProfile, conversationHistory, toolResults)
    - Implement session expiration (24 hours)
    - _Requirements: 6.6_
  
  - [ ] 15.3 Write property test for MCP context wiring
    - **Property 15: MCP Context Wiring**
    - **Validates: Requirements 6.6**
  
  - [ ] 15.4 Write property test for WebSocket reconnection
    - **Property 40: WebSocket Reconnection**
    - **Validates: Requirements 16.3**

- [ ] 16. Implement MCP tool registry and 8 tools
  - [ ] 16.1 Create Tool interface and registry
    - Define Tool interface (name, description, parameters, execute, requiresAuth)
    - Create ToolRegistry class to store and retrieve tools
    - Implement tool validation and parameter schema checking
    - _Requirements: 6.2, 15.1_
  
  - [ ] 16.2 Implement search_schemes tool
    - Accept query, category, state, limit parameters
    - Search schemes using Neo4j full-text search or myscheme API
    - Return list of matching schemes
    - _Requirements: 3.3, 7.1_
  
  - [ ] 16.3 Implement get_scheme_details tool
    - Accept schemeId and includeEligibility parameters
    - Fetch scheme from cache or myscheme API
    - Calculate eligibility if user authenticated and requested
    - Return comprehensive scheme details
    - _Requirements: 12.1, 12.2, 12.4, 12.5_
  
  - [ ] 16.4 Write property test for scheme detail completeness
    - **Property 32: Scheme Detail Completeness**
    - **Validates: Requirements 12.2, 12.5**
  
  - [ ] 16.5 Write property test for personalized eligibility display
    - **Property 33: Personalized Eligibility Display**
    - **Validates: Requirements 12.4**
  
  - [ ] 16.6 Implement check_eligibility tool
    - Accept schemeId and explainResult parameters
    - Require authentication
    - Calculate eligibility score using EligibilityEngine
    - Generate explanation of met/unmet criteria
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [ ] 16.7 Implement get_recommendations tool
    - Accept limit, refresh, category parameters
    - Require authentication
    - Retrieve cached recommendations or generate new ones
    - Apply category filter if specified
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 16.8 Implement update_profile tool
    - Accept profile updates object
    - Require authentication
    - Validate and update user profile
    - Trigger reclassification
    - Invalidate cached recommendations
    - _Requirements: 1.2, 8.5_
  
  - [ ] 16.9 Implement get_application_info tool
    - Accept schemeId parameter
    - Fetch application process details
    - Return steps, documents, URLs, helpline
    - _Requirements: 12.2_
  
  - [ ] 16.10 Implement check_deadlines tool
    - Accept daysAhead and onlyEligible parameters
    - Query schemes with deadlines in timeframe
    - Filter by user eligibility if requested
    - Return sorted by deadline
    - _Requirements: 4.5_
  
  - [ ] 16.11 Implement configure_nudges tool
    - Accept nudge preferences object
    - Require authentication
    - Validate and update user nudge preferences
    - _Requirements: 11.6_
  
  - [ ] 16.12 Write property test for tool selection from intent
    - **Property 37: Tool Selection from Intent**
    - **Validates: Requirements 15.1**
  
  - [ ] 16.13 Write property test for context passing to tools
    - **Property 38: Context Passing to Tools**
    - **Validates: Requirements 15.3**
  
  - [ ] 16.14 Write property test for tool execution logging
    - **Property 39: Tool Execution Logging**
    - **Validates: Requirements 15.5**

- [ ] 17. Implement myscheme.gov.in API adapter
  - [ ] 17.1 Create MySchemeAPIAdapter class
    - Configure base URL and authentication
    - Implement fetchSchemes method with filters
    - Implement fetchSchemeDetails method
    - _Requirements: 7.1, 7.4_
  
  - [ ] 17.2 Implement caching layer for API responses
    - Cache scheme list for 24 hours
    - Cache scheme details indefinitely (rarely change)
    - Check cache before API calls
    - _Requirements: 7.2, 7.3_
  
  - [ ] 17.3 Write property test for scheme data caching
    - **Property 16: Scheme Data Caching**
    - **Validates: Requirements 7.2**
  
  - [ ] 17.4 Write property test for cache expiration and refresh
    - **Property 17: Cache Expiration and Refresh**
    - **Validates: Requirements 7.3**
  
  - [ ] 17.5 Implement circuit breaker for API resilience
    - Track API call success/failure rates
    - Open circuit breaker at 50% failure rate over 10 requests
    - Attempt recovery after 60 seconds
    - _Requirements: 18.4, 18.5_
  
  - [ ] 17.6 Write property test for circuit breaker threshold
    - **Property 46: Circuit Breaker Threshold**
    - **Validates: Requirements 18.4**
  
  - [ ] 17.7 Write property test for circuit breaker recovery
    - **Property 47: Circuit Breaker Recovery**
    - **Validates: Requirements 18.5**
  
  - [ ] 17.8 Implement retry logic with exponential backoff
    - Retry failed API calls up to 3 times
    - Use exponential backoff (1s, 2s, 4s)
    - Log all retry attempts
    - _Requirements: 7.5_
  
  - [ ] 17.9 Write property test for API retry with exponential backoff
    - **Property 18: API Retry with Exponential Backoff**
    - **Validates: Requirements 7.5**
  
  - [ ] 17.10 Implement fallback to cached data on API failure
    - Serve stale cache when API unavailable
    - Display data freshness notice
    - _Requirements: 18.1_
  
  - [ ] 17.11 Write property test for cached data fallback on API failure
    - **Property 44: Cached Data Fallback on API Failure**
    - **Validates: Requirements 18.1**

- [ ] 18. Implement MCP tool execution with performance monitoring
  - [ ] 18.1 Create tool execution wrapper
    - Validate tool parameters
    - Check authentication requirements
    - Execute tool with context
    - Handle errors gracefully
    - Return ToolResult with metadata
    - _Requirements: 6.3, 6.4_
  
  - [ ] 18.2 Write property test for MCP tool execution performance
    - **Property 13: MCP Tool Execution Performance**
    - **Validates: Requirements 6.3**
  
  - [ ] 18.3 Write property test for MCP fallback on API unavailability
    - **Property 14: MCP Fallback on API Unavailability**
    - **Validates: Requirements 6.5**
  
  - [ ] 18.4 Implement performance logging
    - Log execution time for each tool call
    - Track cache hit rates
    - Store metrics in time-series database or logs
    - _Requirements: 20.1, 20.3_
  
  - [ ] 18.5 Write property test for performance metrics collection
    - **Property 51: Performance Metrics Collection**
    - **Validates: Requirements 20.1, 20.3**

- [ ] 19. Checkpoint - Ensure all MCP server tests pass
  - Ensure all tests pass, ask the user if questions arise.


### Phase 5: ReAct Agent Implementation

- [x] 20. Implement intent classifier (BERT/DistilBERT)
  - [x] 20.1 Set up intent classification model
    - Choose base model (BERT or DistilBERT)
    - Define intent categories (scheme_search, eligibility_check, application_info, deadline_query, profile_update, general_question, nudge_preferences)
    - Create training data format
    - _Requirements: 5.2_
  
  - [x] 20.2 Implement IntentClassifier class
    - Load pre-trained model
    - Implement classify method
    - Extract entities (location, income, occupation, age, scheme_name)
    - Return primary intent, secondary intents, confidence, entities
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [x] 20.3 Write property test for intent classification coverage
    - **Property 10: Intent Classification Coverage**
    - **Validates: Requirements 4.5, 5.2**
  
  - [x] 20.4 Train intent classifier
    - Prepare labeled training dataset
    - Fine-tune model on intent classification task
    - Evaluate on test set (target ≥85% accuracy)
    - Save trained model
    - _Requirements: 5.3_
  
  - [x] 20.5 Write property test for intent classification accuracy
    - **Property 11: Intent Classification Accuracy**
    - **Validates: Requirements 5.3**
  
  - [x] 20.6 Implement intent to tool routing
    - Map intents to appropriate MCP tools
    - Route within 500ms of classification
    - _Requirements: 5.5_
  
  - [x] 20.7 Write property test for intent to tool routing performance
    - **Property 12: Intent to Tool Routing Performance**
    - **Validates: Requirements 5.5**

- [x] 21. Implement ReAct agent reasoning loop
  - [x] 21.1 Create ReActAgent class
    - Implement processQuery method
    - Implement reasoning loop (Thought → Action → Observation → Decision)
    - Maintain conversation context
    - _Requirements: 4.1, 4.2_
  
  - [x] 21.2 Write property test for conversation context preservation
    - **Property 8: Conversation Context Preservation**
    - **Validates: Requirements 4.2**
  
  - [x] 21.3 Implement thought generation
    - Analyze query and conversation history
    - Determine user intent and required information
    - Generate reasoning explanation
    - _Requirements: 4.1_
  
  - [x] 21.4 Implement action selection
    - Select appropriate tools from MCP server
    - Determine tool parameters from context
    - Handle multi-step reasoning
    - _Requirements: 15.1, 15.2_
  
  - [x] 21.5 Implement observation processing
    - Interpret tool execution results
    - Determine if more information needed
    - Decide next steps (continue reasoning, ask clarification, generate response)
    - _Requirements: 4.1, 4.4_
  
  - [x] 21.6 Implement response generation
    - Generate natural language response
    - Include citations and explanations
    - Provide next step suggestions
    - _Requirements: 4.1, 4.5_
  
  - [x] 21.7 Write property test for agent response time for simple queries
    - **Property 9: Agent Response Time for Simple Queries**
    - **Validates: Requirements 4.3**

- [x] 22. Implement tool selection and execution
  - [x] 22.1 Create tool selection logic
    - Map intents to tools
    - Handle multi-tool workflows
    - Pass user context to tools requiring personalization
    - _Requirements: 15.1, 15.3_
  
  - [x] 22.2 Implement tool execution orchestration
    - Execute tools in correct sequence
    - Handle tool failures with fallbacks
    - Log all tool executions
    - _Requirements: 15.4, 15.5_
  
  - [x] 22.3 Implement clarification question generation
    - Detect ambiguous queries
    - Generate clarifying questions
    - _Requirements: 4.4_

- [x] 23. Implement conversation context management
  - [x] 23.1 Create ConversationSession data model
    - Store sessionId, userId, messages, toolExecutions, entities
    - Implement session creation and retrieval
    - _Requirements: 4.2_
  
  - [x] 23.2 Implement message history management
    - Store user and agent messages
    - Maintain conversation context across turns
    - Implement context window management (last N messages)
    - _Requirements: 4.2_
  
  - [x] 23.3 Implement session persistence
    - Store sessions in Redis with 24-hour TTL
    - Restore session on reconnection
    - _Requirements: 4.2_

- [x] 24. Checkpoint - Ensure all ReAct agent tests pass
  - Ensure all tests pass, ask the user if questions arise.


### Phase 6: REST API Implementation

- [x] 25. Implement authentication endpoints
  - [x] 25.1 Create POST /api/auth/register endpoint
    - Validate request body
    - Check for duplicate email
    - Create user profile with encryption
    - Generate JWT tokens
    - Return user profile and tokens
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 25.2 Create POST /api/auth/login endpoint
    - Validate credentials
    - Verify password hash
    - Generate JWT tokens
    - Update lastLoginAt
    - Return user profile and tokens
    - _Requirements: 10.5_
  
  - [x] 25.3 Create POST /api/auth/refresh endpoint
    - Verify refresh token
    - Generate new access token
    - Return new tokens
    - _Requirements: 10.5_
  
  - [x] 25.4 Create POST /api/auth/logout endpoint
    - Invalidate refresh token
    - Clear session data
    - _Requirements: 10.5_

- [x] 26. Implement user management endpoints
  - [x] 26.1 Create GET /api/users/:userId/profile endpoint
    - Require authentication
    - Check ownership or admin role
    - Decrypt and return user profile
    - _Requirements: 1.3_
  
  - [x] 26.2 Create PUT /api/users/:userId/profile endpoint
    - Require authentication
    - Validate profile updates
    - Update profile with encryption
    - Trigger reclassification
    - Invalidate recommendation cache
    - _Requirements: 1.2, 8.5_
  
  - [x] 26.3 Create DELETE /api/users/:userId endpoint
    - Require authentication
    - Delete user profile and all associated data
    - Log deletion for audit
    - _Requirements: 19.5_
  
  - [x] 26.4 Write property test for data deletion completeness
    - **Property 49: Data Deletion Completeness**
    - **Validates: Requirements 19.5**
  
  - [x] 26.5 Write property test for profile access audit logging
    - **Property 50: Profile Access Audit Logging**
    - **Validates: Requirements 19.6**

- [x] 27. Implement scheme discovery endpoints
  - [x] 27.1 Create GET /api/schemes endpoint
    - Support query parameters (category, state, search, limit, offset)
    - Allow anonymous access
    - Return paginated scheme list
    - _Requirements: 3.1, 3.2, 3.5_
  
  - [x] 27.2 Write property test for anonymous access to general information
    - **Property 7: Anonymous Access to General Information**
    - **Validates: Requirements 3.1, 3.2, 3.5**
  
  - [x] 27.3 Create GET /api/schemes/:schemeId endpoint
    - Allow anonymous access
    - Fetch scheme details from cache or API
    - Include eligibility score if user authenticated
    - _Requirements: 3.3, 12.1, 12.4_
  
  - [x] 27.4 Create POST /api/schemes/search endpoint
    - Accept search query and filters
    - Use Neo4j full-text search
    - Return matching schemes
    - _Requirements: 3.3_

- [x] 28. Implement recommendation endpoints
  - [x] 28.1 Create GET /api/users/:userId/recommendations endpoint
    - Require authentication
    - Support query parameters (limit, refresh, category)
    - Retrieve cached or generate new recommendations
    - Return recommendations with explanations
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [x] 28.2 Write property test for profile processing performance
    - **Property 27: Profile Processing Performance**
    - **Validates: Requirements 10.3**
  
  - [x] 28.3 Create GET /api/users/:userId/eligibility/:schemeId endpoint
    - Require authentication
    - Calculate eligibility score
    - Generate explanation
    - Return eligibility result
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 28.4 Create POST /api/users/:userId/eligibility/batch endpoint
    - Require authentication
    - Accept array of schemeIds
    - Calculate eligibility for all schemes
    - Return array of eligibility results
    - _Requirements: 9.1_

- [x] 29. Implement nudge management endpoints
  - [x] 29.1 Create GET /api/users/:userId/nudges endpoint
    - Require authentication
    - Support query parameters (status, limit)
    - Return user's nudges
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [x] 29.2 Create PUT /api/users/:userId/nudges/:nudgeId/view endpoint
    - Require authentication
    - Mark nudge as viewed
    - Update viewedAt timestamp
    - _Requirements: 11.1_
  
  - [x] 29.3 Create PUT /api/users/:userId/nudges/:nudgeId/dismiss endpoint
    - Require authentication
    - Mark nudge as dismissed
    - Update dismissedAt timestamp
    - _Requirements: 11.1_
  
  - [x] 29.4 Create GET /api/users/:userId/nudge-preferences endpoint
    - Require authentication
    - Return user's nudge preferences
    - _Requirements: 11.6_
  
  - [x] 29.5 Create PUT /api/users/:userId/nudge-preferences endpoint
    - Require authentication
    - Validate preferences
    - Update user's nudge preferences
    - _Requirements: 11.6_

- [x] 30. Implement API middleware and security
  - [x] 30.1 Create authentication middleware
    - Verify JWT tokens
    - Attach user to request object
    - Handle token expiration
    - _Requirements: 19.3_
  
  - [x] 30.2 Create authorization middleware
    - Check user permissions
    - Verify resource ownership
    - _Requirements: 19.3_
  
  - [x] 30.3 Implement rate limiting middleware
    - Anonymous users: 10 req/min
    - Registered users: 60 req/min
    - Admin users: 300 req/min
    - Use Redis for rate limit tracking
    - _Requirements: 13.1_
  
  - [x] 30.4 Implement input validation middleware
    - Validate request bodies against schemas
    - Sanitize inputs to prevent injection
    - _Requirements: 19.3_
  
  - [x] 30.5 Implement error handling middleware
    - Catch and format errors
    - Log errors with context
    - Return user-friendly error messages
    - _Requirements: 18.3_
  
  - [x] 30.6 Implement audit logging middleware
    - Log all profile access
    - Log authentication events
    - Log data modifications
    - _Requirements: 19.6_

- [x] 31. Checkpoint - Ensure all REST API tests pass
  - Ensure all tests pass, ask the user if questions arise.


### Phase 7: Nudge Service Implementation

- [ ] 32. Implement new scheme detection
  - [ ] 32.1 Create scheme polling service
    - Poll myscheme API every 6 hours for new schemes
    - Compare with existing schemes in database
    - Identify truly new schemes (not updates)
    - _Requirements: 11.1_
  
  - [ ] 32.2 Store new schemes in database
    - Create Scheme nodes in Neo4j
    - Compute eligibility vectors
    - Create category relationships
    - _Requirements: 11.1_

- [ ] 33. Implement user matching and eligibility filtering
  - [ ] 33.1 Create nudge candidate identification
    - For each new scheme, calculate eligibility for all users
    - Filter users with eligibility score ≥ 70%
    - Check user nudge preferences (enabled, categories, min score)
    - _Requirements: 11.2_
  
  - [ ] 33.2 Write property test for nudge eligibility filtering
    - **Property 29: Nudge Eligibility Filtering**
    - **Validates: Requirements 11.2**
  
  - [ ] 33.3 Implement nudge prioritization
    - High priority: eligibility ≥ 90%, deadline within 30 days
    - Medium priority: eligibility 80-90%
    - Low priority: eligibility 70-80%
    - _Requirements: 11.2_
  
  - [ ] 33.4 Implement rate limiting for nudges
    - Track nudges sent per user per week
    - Limit to maximum 3 nudges per user per week
    - Enforce minimum 24 hours between nudges
    - _Requirements: 11.4_
  
  - [ ] 33.5 Write property test for nudge rate limiting
    - **Property 30: Nudge Rate Limiting**
    - **Validates: Requirements 11.4**

- [ ] 34. Implement deadline monitoring
  - [ ] 34.1 Create deadline reminder service
    - Query schemes with deadlines in next 7 days
    - Find users who viewed scheme but haven't applied
    - Generate reminder nudges
    - _Requirements: 11.5_
  
  - [ ] 34.2 Write property test for deadline reminder nudges
    - **Property 31: Deadline Reminder Nudges**
    - **Validates: Requirements 11.5**
  
  - [ ] 34.3 Schedule deadline checks
    - Run daily at midnight
    - Process all schemes with upcoming deadlines
    - _Requirements: 11.5_

- [ ] 35. Implement notification delivery
  - [ ] 35.1 Create Nudge data model
    - Define Nudge interface and Neo4j schema
    - Store nudge content, priority, delivery status
    - _Requirements: 11.1_
  
  - [ ] 35.2 Implement nudge creation
    - Create Nudge nodes in Neo4j
    - Create RECEIVED relationship to User
    - Create ABOUT relationship to Scheme
    - _Requirements: 11.1_
  
  - [ ] 35.3 Implement in-app notification delivery
    - Store nudges in database
    - Mark as unread
    - Return via GET /api/users/:userId/nudges endpoint
    - _Requirements: 11.1_
  
  - [ ] 35.4 Implement email notification delivery (optional)
    - Send email via SMTP or email service
    - Track delivery status
    - Handle delivery failures
    - _Requirements: 11.1_
  
  - [ ] 35.5 Implement nudge delivery within 24 hours
    - Queue nudges for delivery
    - Process queue with priority ordering
    - Ensure delivery within 24 hours of scheme discovery
    - _Requirements: 11.3_

- [ ] 36. Checkpoint - Ensure all nudge service tests pass
  - Ensure all tests pass, ask the user if questions arise.


### Phase 8: Frontend Implementation (React)

- [x] 37. Set up React project with use-mcp
  - [x] 37.1 Initialize React project with TypeScript
    - Create React app with TypeScript template
    - Install dependencies (React Router, Redux Toolkit, use-mcp)
    - Configure TypeScript and ESLint
    - _Requirements: 16.1_
  
  - [x] 37.2 Set up MCP client integration
    - Install @modelcontextprotocol/use-mcp
    - Create useMCP hook wrapper
    - Configure WebSocket connection to MCP server
    - Implement reconnection logic
    - _Requirements: 16.1, 16.2_
  
  - [x] 37.3 Write property test for message serialization round trip
    - **Property 41: Message Serialization Round Trip**
    - **Validates: Requirements 16.5**
  
  - [x] 37.4 Set up Redux store
    - Create store with slices (auth, chat, scheme, nudge)
    - Configure Redux DevTools
    - _Requirements: 16.1_
  
  - [x] 37.5 Set up React Router
    - Configure routes (home, schemes, chat, dashboard, profile, nudges)
    - Implement protected routes for authenticated users
    - _Requirements: 10.1, 10.2_

- [x] 38. Implement chat interface components
  - [x] 38.1 Create ChatInterface component
    - Render message list, input, and thinking indicator
    - Display connection status
    - _Requirements: 4.1, 16.4_
  
  - [x] 38.2 Create MessageList component
    - Display user and agent messages
    - Show reasoning steps and tools used
    - Auto-scroll to latest message
    - _Requirements: 4.1, 4.2_
  
  - [x] 38.3 Create MessageInput component
    - Text input with send button
    - Disable when disconnected or thinking
    - Support Enter key to send
    - _Requirements: 4.1_
  
  - [x] 38.4 Create ThinkingIndicator component
    - Show animated indicator when agent is processing
    - Display reasoning steps in real-time
    - _Requirements: 4.1_
  
  - [x] 38.5 Create SuggestionChips component
    - Display quick action suggestions
    - Pre-fill input on click
    - _Requirements: 4.1_
  
  - [x] 38.6 Implement useChat hook
    - Manage chat state (messages, isThinking)
    - Send queries to MCP server
    - Handle responses and errors
    - _Requirements: 4.1, 4.2_

- [x] 39. Implement scheme browsing components
  - [x] 39.1 Create SchemeList component
    - Display paginated list of schemes
    - Support filtering by category and state
    - Show loading and error states
    - _Requirements: 3.1, 3.2_
  
  - [x] 39.2 Create SchemeCard component
    - Display scheme preview (name, description, category)
    - Show eligibility badge for authenticated users
    - Handle click to view details
    - _Requirements: 3.1, 3.2, 12.4_
  
  - [x] 39.3 Create SchemeDetail component
    - Display comprehensive scheme information
    - Show eligibility score and explanation for authenticated users
    - Provide application link
    - _Requirements: 12.1, 12.2, 12.4, 12.5_
  
  - [x] 39.4 Create EligibilityBadge component
    - Display eligibility percentage
    - Color-code by category (green: highly, yellow: potentially, red: low)
    - _Requirements: 9.2, 9.4, 9.5, 9.6_
  
  - [x] 39.5 Create RecommendationExplanation component
    - Display why scheme is recommended
    - Highlight matching criteria
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [x] 39.6 Implement useSchemes hook
    - Fetch schemes from API
    - Manage scheme state and caching
    - Handle pagination
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 40. Implement profile management components
  - [x] 40.1 Create ProfileForm component
    - Multi-section form (personal, economic, location, categorical)
    - Validate inputs client-side
    - Handle form submission
    - _Requirements: 1.1, 1.2_
  
  - [x] 40.2 Create ProfileSummary component
    - Display user profile overview
    - Show profile completeness indicator
    - Provide edit button
    - _Requirements: 1.3_
  
  - [x] 40.3 Create ProfileCompleteness component
    - Display progress bar
    - List missing required fields
    - _Requirements: 1.2_
  
  - [x] 40.4 Implement useProfile hook
    - Fetch and update user profile
    - Manage profile state
    - Handle validation errors
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 41. Implement nudge management components
  - [x] 41.1 Create NudgeList component
    - Display list of nudges
    - Filter by status (unread, read, all)
    - Show unread count badge
    - _Requirements: 11.1_
  
  - [x] 41.2 Create NudgeCard component
    - Display nudge title, message, and scheme
    - Show priority indicator
    - Provide view and dismiss actions
    - _Requirements: 11.1_
  
  - [x] 41.3 Create NudgePreferences component
    - Form to configure nudge settings
    - Enable/disable nudges
    - Set max per week and min eligibility score
    - Select preferred channels and categories
    - _Requirements: 11.6_
  
  - [x] 41.4 Implement useNudges hook
    - Fetch user nudges
    - Mark nudges as viewed/dismissed
    - Update nudge preferences
    - _Requirements: 11.1, 11.6_

- [x] 42. Implement authentication and routing
  - [x] 42.1 Create LoginPage component
    - Email and password form
    - Handle login submission
    - Redirect to dashboard on success
    - _Requirements: 10.5_
  
  - [x] 42.2 Create RegisterPage component
    - Multi-step registration form
    - Show processing message after submission
    - Redirect to dashboard after classification
    - _Requirements: 1.1, 10.2, 10.3_
  
  - [x] 42.3 Create DashboardPage component
    - Display personalized recommendations
    - Show recent nudges
    - Provide quick actions
    - _Requirements: 10.4_
  
  - [x] 42.4 Implement useAuth hook
    - Manage authentication state
    - Handle login, register, logout
    - Store tokens securely
    - _Requirements: 10.5_
  
  - [x] 42.5 Implement protected route wrapper
    - Check authentication before rendering
    - Redirect to login if not authenticated
    - _Requirements: 10.1_

- [x] 43. Implement common UI components
  - [x] 43.1 Create Header component
    - Navigation menu
    - User profile dropdown
    - Login/register buttons for anonymous users
    - _Requirements: 10.1_
  
  - [x] 43.2 Create Sidebar component
    - Navigation links
    - Scheme categories
    - _Requirements: 3.1_
  
  - [x] 43.3 Create LoadingSpinner component
    - Animated loading indicator
    - _Requirements: General UI_
  
  - [x] 43.4 Create ErrorBoundary component
    - Catch React errors
    - Display error message
    - Provide retry option
    - _Requirements: 18.3_
  
  - [x] 43.5 Create ConnectionStatus component
    - Display MCP connection status
    - Show reconnection attempts
    - _Requirements: 16.3, 16.4_

- [x] 44. Checkpoint - Ensure all frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.


### Phase 9: Caching & Performance Optimization

- [ ] 45. Implement multi-level caching
  - [ ] 45.1 Create CacheService class
    - Implement L1 in-memory cache (Map)
    - Implement L2 Redis cache
    - Implement get, set, delete methods with TTL
    - _Requirements: 7.2, 13.5_
  
  - [ ] 45.2 Configure cache TTLs
    - Scheme data: 24 hours
    - User recommendations: 24 hours
    - User classifications: Until profile update
    - Eligibility scores: 24 hours
    - Session data: 24 hours
    - _Requirements: 7.2, 7.3_
  
  - [ ] 45.3 Implement cache warming
    - Pre-populate cache with popular schemes
    - Pre-compute recommendations for active users
    - _Requirements: 13.3_

- [ ] 46. Implement cache invalidation logic
  - [ ] 46.1 Create CacheInvalidationService
    - Invalidate user recommendations on profile update
    - Invalidate scheme cache on scheme update
    - Invalidate eligibility scores on profile or scheme update
    - _Requirements: 8.5_
  
  - [ ] 46.2 Implement cache invalidation patterns
    - Tag-based invalidation (invalidate by user, by scheme)
    - Time-based expiration
    - Event-driven invalidation
    - _Requirements: 8.5_

- [ ] 47. Implement connection pooling
  - [ ] 47.1 Configure Neo4j connection pool
    - Set max pool size (50 connections)
    - Set connection timeout (30 seconds)
    - Implement connection health checks
    - _Requirements: 13.5_
  
  - [ ] 47.2 Configure Redis connection pool
    - Set max pool size (20 connections)
    - Implement connection retry logic
    - _Requirements: 13.5_
  
  - [ ] 47.3 Configure HTTP client connection pool
    - Set max connections for myscheme API (10)
    - Set connection timeout (10 seconds)
    - _Requirements: 13.5_

- [ ] 48. Implement background job queue
  - [ ] 48.1 Set up job queue (Bull or similar)
    - Configure Redis as job queue backend
    - Create job processors
    - _Requirements: 11.1_
  
  - [ ] 48.2 Implement user classification job
    - Queue classification on registration
    - Process asynchronously
    - Update user groups on completion
    - _Requirements: 2.3, 10.3_
  
  - [ ] 48.3 Implement scheme polling job
    - Schedule every 6 hours
    - Fetch new schemes from API
    - Queue nudge generation
    - _Requirements: 11.1_
  
  - [ ] 48.4 Implement nudge generation job
    - Process new schemes
    - Calculate eligibility for all users
    - Create and deliver nudges
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [ ] 48.5 Implement deadline reminder job
    - Schedule daily at midnight
    - Check schemes with upcoming deadlines
    - Generate reminder nudges
    - _Requirements: 11.5_

- [ ] 49. Implement performance optimizations
  - [ ] 49.1 Optimize database queries
    - Add indexes for frequently queried fields
    - Use query result caching
    - Implement query batching
    - _Requirements: 13.3_
  
  - [ ] 49.2 Optimize API responses
    - Implement response compression (gzip)
    - Use pagination for large result sets
    - Implement field selection (return only requested fields)
    - _Requirements: 13.3_
  
  - [ ] 49.3 Implement request queuing for high load
    - Queue requests when load exceeds 80%
    - Set max wait time to 5 seconds
    - _Requirements: 13.2_
  
  - [ ] 49.4 Write property test for concurrent user support
    - **Property 34: Concurrent User Support**
    - **Validates: Requirements 13.1, 13.3**

- [ ] 50. Checkpoint - Ensure all performance tests pass
  - Ensure all tests pass, ask the user if questions arise.


### Phase 10: Security Implementation

- [ ] 51. Implement rate limiting
  - [ ] 51.1 Create RateLimiter class
    - Use Redis to track request counts
    - Implement sliding window algorithm
    - Return rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
    - _Requirements: 13.1_
  
  - [ ] 51.2 Apply rate limits to API endpoints
    - Anonymous users: 10 req/min
    - Registered users: 60 req/min
    - Admin users: 300 req/min
    - _Requirements: 13.1_

- [ ] 52. Implement input validation
  - [ ] 52.1 Create ValidationService class
    - Validate email format
    - Validate password strength
    - Validate profile fields (age range, income range, etc.)
    - Sanitize string inputs
    - _Requirements: 1.2, 19.3_
  
  - [ ] 52.2 Apply validation to all API endpoints
    - Validate request bodies against schemas
    - Return descriptive error messages
    - _Requirements: 1.5, 19.3_

- [ ] 53. Implement audit logging
  - [ ] 53.1 Create AuditLogger class
    - Log authentication events (login, logout, token refresh)
    - Log profile access and modifications
    - Log data deletion requests
    - Store logs in secure, append-only storage
    - _Requirements: 19.6_
  
  - [ ] 53.2 Implement suspicious activity detection
    - Detect multiple failed login attempts
    - Detect unusual access patterns
    - Trigger alerts for suspicious activity
    - _Requirements: 19.6_

- [ ] 54. Implement privacy controls
  - [ ] 54.1 Create PrivacyService class
    - Implement exportUserData (right to access)
    - Implement deleteUserData (right to deletion)
    - Implement updateConsent (consent management)
    - _Requirements: 19.4, 19.5_
  
  - [ ] 54.2 Create data export endpoint
    - Export all user data in JSON format
    - Include profile, view history, recommendations, nudges
    - _Requirements: 19.4_
  
  - [ ] 54.3 Implement consent management
    - Store user consent preferences
    - Respect consent in data processing
    - _Requirements: 19.4_

- [ ] 55. Checkpoint - Ensure all security tests pass
  - Ensure all tests pass, ask the user if questions arise.


### Phase 11: Testing & Quality Assurance

- [ ] 56. Implement unit tests for core components
  - [ ] 56.1 Write unit tests for authentication service
    - Test password hashing and verification
    - Test JWT token generation and validation
    - Test registration validation
    - _Requirements: 1.1, 1.2, 19.3_
  
  - [ ] 56.2 Write unit tests for user profile service
    - Test CRUD operations
    - Test profile validation
    - Test encryption/decryption
    - _Requirements: 1.1, 1.2, 19.1_
  
  - [ ] 56.3 Write unit tests for cache service
    - Test get/set/delete operations
    - Test TTL expiration
    - Test multi-level caching
    - _Requirements: 7.2, 7.3_
  
  - [ ] 56.4 Write unit tests for eligibility engine
    - Test cosine similarity calculation
    - Test score categorization
    - Test criteria analysis
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6_
  
  - [ ] 56.5 Write unit tests for recommendation engine
    - Test recommendation generation
    - Test ranking logic
    - Test explanation generation
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 57. Implement property-based tests for all 52 properties
  - [ ] 57.1 Write property tests for authentication (Properties 1-3)
    - Property 1: Registration Round Trip
    - Property 2: Registration Validation Rejects Invalid Profiles
    - Property 3: User ID Uniqueness
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 57.2 Write property tests for classification (Properties 4-6)
    - Property 4: User Classification Assignment
    - Property 5: Classification Feature Sensitivity
    - Property 6: Low Confidence Default Assignment
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 57.3 Write property tests for anonymous access (Property 7)
    - Property 7: Anonymous Access to General Information
    - _Requirements: 3.1, 3.2, 3.5_
  
  - [ ] 57.4 Write property tests for ReAct agent (Properties 8-10)
    - Property 8: Conversation Context Preservation
    - Property 9: Agent Response Time for Simple Queries
    - Property 10: Intent Classification Coverage
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 5.2_
  
  - [ ] 57.5 Write property tests for intent classification (Properties 11-12)
    - Property 11: Intent Classification Accuracy
    - Property 12: Intent to Tool Routing Performance
    - _Requirements: 5.3, 5.5_
  
  - [ ] 57.6 Write property tests for MCP server (Properties 13-15)
    - Property 13: MCP Tool Execution Performance
    - Property 14: MCP Fallback on API Unavailability
    - Property 15: MCP Context Wiring
    - _Requirements: 6.3, 6.5, 6.6_
  
  - [ ] 57.7 Write property tests for caching (Properties 16-18)
    - Property 16: Scheme Data Caching
    - Property 17: Cache Expiration and Refresh
    - Property 18: API Retry with Exponential Backoff
    - _Requirements: 7.2, 7.3, 7.5_
  
  - [ ] 57.8 Write property tests for recommendations (Properties 19-23)
    - Property 19: Recommendation Generation on Login
    - Property 20: Recommendation Ranking Order
    - Property 21: Recommendation Count Bounds
    - Property 22: Recommendation Invalidation on Profile Update
    - Property 23: Recommendation Generation Performance
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [ ] 57.9 Write property tests for eligibility (Properties 24-26)
    - Property 24: Eligibility Score Range
    - Property 25: Eligibility Score Categorization
    - Property 26: Eligibility Explanation Completeness
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 57.10 Write property tests for user experience (Properties 27-28)
    - Property 27: Profile Processing Performance
    - Property 28: Session Persistence
    - _Requirements: 10.3, 10.5_
  
  - [ ] 57.11 Write property tests for nudges (Properties 29-31)
    - Property 29: Nudge Eligibility Filtering
    - Property 30: Nudge Rate Limiting
    - Property 31: Deadline Reminder Nudges
    - _Requirements: 11.2, 11.4, 11.5_
  
  - [ ] 57.12 Write property tests for scheme details (Properties 32-33)
    - Property 32: Scheme Detail Completeness
    - Property 33: Personalized Eligibility Display
    - _Requirements: 12.2, 12.4, 12.5_
  
  - [ ] 57.13 Write property tests for concurrency (Property 34)
    - Property 34: Concurrent User Support
    - _Requirements: 13.1, 13.3_
  
  - [ ] 57.14 Write property tests for database (Properties 35-36)
    - Property 35: Database Transaction Consistency
    - Property 36: Database Write Retry
    - _Requirements: 14.3, 14.5_
  
  - [ ] 57.15 Write property tests for tool execution (Properties 37-39)
    - Property 37: Tool Selection from Intent
    - Property 38: Context Passing to Tools
    - Property 39: Tool Execution Logging
    - _Requirements: 15.1, 15.3, 15.5_
  
  - [ ] 57.16 Write property tests for WebSocket (Properties 40-41)
    - Property 40: WebSocket Reconnection
    - Property 41: Message Serialization Round Trip
    - _Requirements: 16.3, 16.5_
  
  - [ ] 57.17 Write property tests for explanations (Properties 42-43)
    - Property 42: Recommendation Explanation Presence
    - Property 43: Top Matching Criteria Display
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [ ] 57.18 Write property tests for error handling (Properties 44-47)
    - Property 44: Cached Data Fallback on API Failure
    - Property 45: Classification Engine Fallback
    - Property 46: Circuit Breaker Threshold
    - Property 47: Circuit Breaker Recovery
    - _Requirements: 18.1, 18.2, 18.4, 18.5_
  
  - [ ] 57.19 Write property tests for security (Properties 48-50)
    - Property 48: Profile Data Encryption at Rest
    - Property 49: Data Deletion Completeness
    - Property 50: Profile Access Audit Logging
    - _Requirements: 19.1, 19.5, 19.6_
  
  - [ ] 57.20 Write property tests for monitoring (Properties 51-52)
    - Property 51: Performance Metrics Collection
    - Property 52: Performance Alert Triggering
    - _Requirements: 20.1, 20.3, 20.5_


- [ ] 58. Implement integration tests
  - [ ] 58.1 Write integration test for user registration and classification flow
    - Register user → Wait for classification → Verify groups assigned → Generate recommendations
    - _Requirements: 1.1, 2.1, 8.1_
  
  - [ ] 58.2 Write integration test for ReAct agent with MCP server
    - Send query → Verify intent classification → Verify tool execution → Verify response
    - _Requirements: 4.1, 5.1, 6.3, 15.1_
  
  - [ ] 58.3 Write integration test for scheme discovery flow
    - Anonymous user → Browse schemes → View details → See registration prompt
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ] 58.4 Write integration test for nudge generation flow
    - New scheme added → Calculate eligibility → Generate nudges → Deliver to users
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [ ] 58.5 Write integration test for profile update flow
    - Update profile → Trigger reclassification → Invalidate cache → Generate new recommendations
    - _Requirements: 1.2, 2.1, 8.5_

- [ ] 59. Implement E2E tests with Playwright
  - [ ] 59.1 Write E2E test for anonymous user browsing
    - Visit homepage → Browse schemes → View scheme details → See registration prompt
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ] 59.2 Write E2E test for user registration and onboarding
    - Register → Fill profile → Wait for processing → View dashboard with recommendations
    - _Requirements: 1.1, 10.2, 10.3, 10.4_
  
  - [ ] 59.3 Write E2E test for personalized recommendations
    - Login → View dashboard → See recommendations with eligibility scores → Click scheme → View details
    - _Requirements: 8.1, 9.2, 10.4, 12.4_
  
  - [ ] 59.4 Write E2E test for chat interface
    - Open chat → Send query → See thinking indicator → Receive response → Verify scheme information
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 59.5 Write E2E test for nudge management
    - View nudges → Mark as viewed → Dismiss nudge → Configure preferences
    - _Requirements: 11.1, 11.6_

- [ ] 60. Implement performance and load testing
  - [ ] 60.1 Write load test for API endpoints
    - Simulate 1000 concurrent users
    - Verify 95% of requests complete within 3 seconds
    - Verify error rate < 1%
    - _Requirements: 13.1, 13.3_
  
  - [ ] 60.2 Write load test for MCP server
    - Simulate 500 concurrent WebSocket connections
    - Send queries and verify responses
    - _Requirements: 13.1_
  
  - [ ] 60.3 Write performance test for classification engine
    - Classify 1000 users
    - Verify average time < 5 seconds per user
    - _Requirements: 2.3_
  
  - [ ] 60.4 Write performance test for recommendation engine
    - Generate recommendations for 1000 users
    - Verify average time < 3 seconds per user
    - _Requirements: 8.6_

- [ ] 61. Checkpoint - Ensure all tests pass and coverage goals met
  - Ensure all tests pass, ask the user if questions arise.
  - Verify unit test coverage ≥ 80%
  - Verify all 52 property tests implemented and passing
  - Verify integration tests cover major workflows
  - Verify E2E tests cover critical user journeys


### Phase 12: Deployment & Monitoring

- [ ] 62. Create Docker configuration
  - [ ] 62.1 Create Dockerfile for backend service
    - Multi-stage build for TypeScript compilation
    - Install production dependencies only
    - Configure health check endpoint
    - _Requirements: 13.4_
  
  - [ ] 62.2 Create Dockerfile for ML pipeline service
    - Python base image with ML dependencies
    - Install trained models
    - Configure health check endpoint
    - _Requirements: 13.4_
  
  - [ ] 62.3 Create Dockerfile for frontend
    - Build React app
    - Serve with nginx
    - Configure nginx for SPA routing
    - _Requirements: 13.4_
  
  - [ ] 62.4 Create docker-compose.yml for local development
    - Define services (backend, ml-pipeline, frontend, neo4j, redis)
    - Configure networking and volumes
    - Set environment variables
    - _Requirements: 13.4_

- [ ] 63. Create Kubernetes deployment configuration
  - [ ] 63.1 Create Kubernetes manifests
    - Deployments for backend, ml-pipeline, frontend
    - Services for internal and external access
    - ConfigMaps for configuration
    - Secrets for sensitive data
    - _Requirements: 13.4_
  
  - [ ] 63.2 Configure horizontal pod autoscaling
    - Scale backend based on CPU/memory usage
    - Scale when load exceeds 70%
    - _Requirements: 13.4_
  
  - [ ] 63.3 Configure ingress for external access
    - Set up ingress controller
    - Configure TLS certificates
    - Set up routing rules
    - _Requirements: 19.2_
  
  - [ ] 63.4 Configure persistent volumes
    - Neo4j data volume
    - Redis data volume
    - ML model storage
    - _Requirements: 14.4_

- [ ] 64. Implement performance monitoring
  - [ ] 64.1 Set up application performance monitoring (APM)
    - Install APM agent (e.g., New Relic, Datadog, or open-source alternative)
    - Track API response times
    - Track database query times
    - Track tool execution times
    - _Requirements: 20.1, 20.3_
  
  - [ ] 64.2 Create performance dashboards
    - Dashboard for API metrics (response times, error rates, throughput)
    - Dashboard for database metrics (query times, connection pool usage)
    - Dashboard for ML metrics (classification accuracy, recommendation relevance)
    - Dashboard for cache metrics (hit rates, eviction rates)
    - _Requirements: 20.2, 20.4_
  
  - [ ] 64.3 Configure performance alerts
    - Alert when API response time p95 > 3 seconds
    - Alert when database query time p95 > 1 second
    - Alert when error rate > 1%
    - Alert when cache hit rate < 70%
    - _Requirements: 20.5_
  
  - [ ] 64.4 Write property test for performance alert triggering
    - **Property 52: Performance Alert Triggering**
    - **Validates: Requirements 20.5**

- [ ] 65. Implement error tracking and logging
  - [ ] 65.1 Set up centralized logging
    - Configure log aggregation (e.g., ELK stack, Loki, or cloud logging)
    - Structure logs with consistent format (JSON)
    - Include request IDs for tracing
    - _Requirements: 18.3_
  
  - [ ] 65.2 Set up error tracking
    - Install error tracking service (e.g., Sentry)
    - Capture and report errors with context
    - Group similar errors
    - _Requirements: 18.3_
  
  - [ ] 65.3 Configure log retention
    - Retain application logs for 30 days
    - Retain audit logs for 1 year
    - Archive old logs to cold storage
    - _Requirements: 19.6_

- [ ] 66. Create deployment scripts and CI/CD pipeline
  - [ ] 66.1 Create CI/CD pipeline configuration
    - Run tests on every commit
    - Build Docker images on merge to main
    - Deploy to staging automatically
    - Deploy to production with manual approval
    - _Requirements: Testing infrastructure_
  
  - [ ] 66.2 Create database migration scripts
    - Version control database schema changes
    - Create migration scripts for Neo4j
    - Test migrations on staging before production
    - _Requirements: 14.1_
  
  - [ ] 66.3 Create deployment runbook
    - Document deployment process
    - Document rollback procedures
    - Document troubleshooting steps
    - _Requirements: Operations_

- [ ] 67. Final checkpoint - System integration and deployment verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all services start successfully
  - Verify health check endpoints respond
  - Verify monitoring and alerting configured
  - Verify logging and error tracking working
  - Perform smoke tests on deployed system


## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript for backend/API/MCP server and Python for ML pipeline
- All 52 correctness properties from the design document are covered by property-based tests
- Testing strategy employs a comprehensive approach: unit tests (80% coverage), property tests (all 52 properties), integration tests (major workflows), E2E tests (critical journeys), and performance tests (1000 concurrent users)

## Implementation Order Rationale

1. **Phase 1-2**: Foundation (infrastructure, database, authentication) enables all subsequent work
2. **Phase 3**: ML pipeline provides core intelligence for personalization
3. **Phase 4**: MCP server creates universal adapter layer for tools
4. **Phase 5**: ReAct agent orchestrates conversational AI experience
5. **Phase 6**: REST API exposes functionality to frontend
6. **Phase 7**: Nudge service adds proactive engagement
7. **Phase 8**: Frontend brings everything together for users
8. **Phase 9**: Performance optimization ensures scalability
9. **Phase 10**: Security hardens the system
10. **Phase 11**: Comprehensive testing validates correctness
11. **Phase 12**: Deployment makes system production-ready

## Success Criteria

- All 67 top-level tasks completed
- All 52 property-based tests passing
- Unit test coverage ≥ 80%
- Integration tests cover all major workflows
- E2E tests cover critical user journeys
- Performance tests validate 1000 concurrent users with <3s response time
- Security audit passes
- System deployed and monitored in production

