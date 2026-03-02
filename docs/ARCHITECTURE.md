# Architecture Overview

## System Architecture

The Personalized Scheme Recommendation System follows a microservices architecture with three main components:

### 1. Backend (TypeScript/Node.js)
- **REST API Server**: Handles HTTP requests for user management, scheme discovery, and recommendations
- **MCP Server**: WebSocket-based server implementing Model Context Protocol for tool execution
- **ReAct Agent**: Conversational AI agent using Reasoning + Acting loops

### 2. ML Pipeline (Python)
- **Classification Engine**: K-Means clustering for user grouping
- **Eligibility Engine**: Cosine similarity calculation for scheme matching
- **Intent Classifier**: BERT/DistilBERT model for query intent classification
- **Recommendation Engine**: Generates personalized scheme recommendations

### 3. Frontend (React/TypeScript)
- **User Interface**: React-based SPA for user interaction
- **MCP Client**: WebSocket client for real-time communication with MCP Server
- **State Management**: React Query for server state management

## Data Flow

1. **User Registration Flow**
   - User submits profile → Backend validates → Stores in Neo4j
   - Triggers ML classification → Assigns user groups → Caches recommendations

2. **Conversational Query Flow**
   - User sends query → MCP Server → ReAct Agent
   - Intent Classifier determines intent → Agent selects tools
   - Tools execute (fetch schemes, check eligibility) → Agent generates response

3. **Recommendation Flow**
   - User logs in → Backend checks cache
   - If cache miss → ML Pipeline generates recommendations
   - Recommendations ranked by relevance → Cached → Returned to user

## Technology Choices

### Neo4j (Graph Database)
- **Why**: Natural fit for modeling relationships between users, schemes, and eligibility criteria
- **Benefits**: Efficient graph traversal for recommendation generation

### Redis (Cache)
- **Why**: Fast in-memory storage for frequently accessed data
- **Benefits**: Reduces database load, improves response times

### MCP (Model Context Protocol)
- **Why**: Standardized interface for tool execution and context management
- **Benefits**: Decouples agent logic from tool implementation, enables context wiring

### ReAct Agent Pattern
- **Why**: Combines reasoning and acting for transparent decision-making
- **Benefits**: Explainable AI, handles multi-step queries, maintains conversation context

## Security Considerations

- **Encryption at Rest**: AES-256-GCM for sensitive user data
- **Encryption in Transit**: TLS 1.3 for all network communication
- **Authentication**: JWT with RS256 asymmetric encryption
- **Authorization**: Role-based access control
- **Audit Logging**: All profile access logged for compliance

## Scalability

- **Horizontal Scaling**: Stateless backend services can scale horizontally
- **Database Sharding**: Neo4j can be sharded by user ID
- **Cache Distribution**: Redis cluster for distributed caching
- **Load Balancing**: Nginx or cloud load balancer for traffic distribution

## Monitoring and Observability

- **Metrics**: Response times, error rates, cache hit rates
- **Logging**: Structured logging with correlation IDs
- **Tracing**: Distributed tracing for request flows
- **Alerting**: Automated alerts for performance degradation
