# Requirements Document

## Introduction

The Personalized Scheme Recommendation System is an AI-powered platform that provides citizens with personalized government scheme recommendations through conversational AI. The system uses ReAct (Reasoning + Acting) agents, MCP (Model Context Protocol) integration, and ML-based classification to match users with relevant government schemes from myscheme.gov.in. The platform supports both first-time visitors with general information and registered users with personalized recommendations, eligibility checking, and proactive nudges about relevant opportunities.

## Glossary

- **System**: The Personalized Scheme Recommendation System
- **User**: A citizen accessing the platform to discover government schemes
- **ReAct_Agent**: The conversational AI agent that uses Reasoning and Acting loops to process user queries
- **Intent_Classifier**: The ML component that analyzes user queries to determine required actions
- **MCP_Server**: The Model Context Protocol server that provides standardized access to external tools and data sources
- **Scheme**: A government program or benefit available to citizens
- **User_Profile**: The collection of user demographic, income, location, and occupation data
- **User_Group**: A classification category that groups users with similar characteristics
- **Eligibility_Score**: A cosine similarity score indicating how well a user matches scheme requirements
- **Nudge**: A proactive notification about relevant schemes sent to users
- **Classification_Engine**: The ML component that maps users to relevant schemes
- **myscheme_API**: The government API at myscheme.gov.in providing scheme data
- **Registered_User**: A user who has completed the signup process and provided detailed information
- **Anonymous_User**: A first-time visitor who has not yet registered

## Requirements

### Requirement 1: User Registration and Profile Creation

**User Story:** As a citizen, I want to create a profile with my personal details, so that I can receive personalized scheme recommendations.

#### Acceptance Criteria

1. WHEN an Anonymous_User initiates registration, THE System SHALL collect demographic data, income information, location, and occupation
2. THE System SHALL validate all required profile fields before accepting registration
3. WHEN registration is complete, THE System SHALL store the User_Profile in the database
4. THE System SHALL assign a unique identifier to each Registered_User
5. IF any required field is missing, THEN THE System SHALL display a descriptive error message indicating which fields are incomplete

### Requirement 2: User Classification and Grouping

**User Story:** As the system, I want to classify users into groups based on their profiles, so that I can provide relevant scheme recommendations efficiently.

#### Acceptance Criteria

1. WHEN a User_Profile is created or updated, THE Classification_Engine SHALL assign the user to one or more User_Groups
2. THE Classification_Engine SHALL use demographic data, income level, location, and occupation as classification features
3. THE System SHALL complete user classification within 5 seconds of profile submission
4. THE System SHALL store User_Group assignments with the User_Profile
5. WHEN classification confidence is below 70%, THE System SHALL assign the user to a default broad category

### Requirement 3: Anonymous User Access

**User Story:** As a first-time visitor, I want to access general scheme information without registering, so that I can explore the platform before committing.

#### Acceptance Criteria

1. THE System SHALL allow Anonymous_Users to view general scheme information without authentication
2. THE System SHALL display non-personalized scheme listings to Anonymous_Users
3. WHEN an Anonymous_User requests scheme details, THE System SHALL fetch data from the myscheme_API
4. THE System SHALL provide a registration prompt to Anonymous_Users viewing scheme details
5. THE System SHALL not require authentication for browsing general scheme categories

### Requirement 4: ReAct Agent Conversational Interface

**User Story:** As a user, I want to ask questions about schemes in natural language, so that I can easily find relevant information.

#### Acceptance Criteria

1. WHEN a user submits a natural language query, THE ReAct_Agent SHALL process the query using a Reasoning and Acting loop
2. THE ReAct_Agent SHALL maintain conversation context across multiple user messages within a session
3. THE ReAct_Agent SHALL generate responses within 3 seconds for simple queries
4. WHEN the ReAct_Agent cannot understand a query, THE System SHALL ask clarifying questions
5. THE ReAct_Agent SHALL support queries about scheme eligibility, application processes, deadlines, and benefits

### Requirement 5: Intent Classification

**User Story:** As the system, I want to classify user intents from their queries, so that I can route them to appropriate tools and actions.

#### Acceptance Criteria

1. WHEN a user query is received, THE Intent_Classifier SHALL analyze the query and determine the primary intent
2. THE Intent_Classifier SHALL classify intents into categories including scheme_search, eligibility_check, application_info, deadline_query, and general_question
3. THE Intent_Classifier SHALL achieve at least 85% accuracy on intent classification
4. WHEN multiple intents are detected, THE Intent_Classifier SHALL identify the primary intent and secondary intents
5. THE System SHALL route the query to appropriate tools based on the classified intent within 500 milliseconds

### Requirement 6: MCP Server Integration

**User Story:** As the system, I want to use MCP Server as a universal adapter for external tools, so that I can access government APIs and data sources consistently.

#### Acceptance Criteria

1. THE MCP_Server SHALL provide a standardized interface for accessing the myscheme_API
2. THE MCP_Server SHALL expose tools for fetching scheme details, searching schemes, and checking eligibility
3. WHEN the ReAct_Agent requests a tool, THE MCP_Server SHALL execute the tool and return results within 2 seconds
4. THE MCP_Server SHALL handle API authentication and rate limiting transparently
5. IF the myscheme_API is unavailable, THEN THE MCP_Server SHALL return cached data when available or an error message
6. THE MCP_Server SHALL automatically wire context between tool calls within a conversation session

### Requirement 7: Government Scheme Data Integration

**User Story:** As the system, I want to fetch up-to-date scheme information from myscheme.gov.in, so that users receive accurate and current data.

#### Acceptance Criteria

1. WHEN scheme data is requested, THE System SHALL query the myscheme_API through the MCP_Server
2. THE System SHALL cache scheme data for 24 hours to reduce API calls
3. WHEN cached data is older than 24 hours, THE System SHALL refresh the data from the myscheme_API
4. THE System SHALL parse and store scheme eligibility criteria in a structured format
5. IF the myscheme_API returns an error, THEN THE System SHALL log the error and retry up to 3 times with exponential backoff

### Requirement 8: ML-Based Scheme Recommendation

**User Story:** As a registered user, I want to receive personalized scheme recommendations based on my profile, so that I can discover relevant opportunities.

#### Acceptance Criteria

1. WHEN a Registered_User logs in, THE Classification_Engine SHALL generate personalized scheme recommendations
2. THE Classification_Engine SHALL use User_Group assignments and User_Profile features to match schemes
3. THE System SHALL rank recommendations by relevance score in descending order
4. THE System SHALL display at least 5 and at most 20 scheme recommendations per user
5. THE System SHALL update recommendations when the User_Profile is modified
6. THE Classification_Engine SHALL complete recommendation generation within 3 seconds

### Requirement 9: Eligibility Matching Using Cosine Similarity

**User Story:** As a user, I want to know how well I match scheme eligibility criteria, so that I can prioritize which schemes to apply for.

#### Acceptance Criteria

1. WHEN a user views a scheme, THE System SHALL calculate an Eligibility_Score using cosine similarity between the User_Profile and scheme requirements
2. THE System SHALL display the Eligibility_Score as a percentage from 0% to 100%
3. THE System SHALL provide an explanation of which criteria the user meets and which they do not
4. WHEN the Eligibility_Score is above 80%, THE System SHALL mark the scheme as "Highly Eligible"
5. WHEN the Eligibility_Score is between 50% and 80%, THE System SHALL mark the scheme as "Potentially Eligible"
6. WHEN the Eligibility_Score is below 50%, THE System SHALL mark the scheme as "Low Eligibility" and explain missing criteria

### Requirement 10: Personalized User Experience Flow

**User Story:** As a user, I want different experiences based on whether I'm registered, so that I get immediate value while being encouraged to register for personalization.

#### Acceptance Criteria

1. WHEN an Anonymous_User first visits, THE System SHALL display general scheme information immediately without requiring login
2. WHEN a user completes registration, THE System SHALL display a processing message indicating profile analysis is in progress
3. THE System SHALL complete initial profile processing and User_Group assignment within 10 seconds of registration
4. WHEN a Registered_User returns to the platform, THE System SHALL display personalized recommendations immediately upon login
5. THE System SHALL persist user session for 7 days to avoid repeated logins

### Requirement 11: Proactive Nudge System

**User Story:** As a registered user, I want to receive notifications about new relevant schemes, so that I don't miss opportunities.

#### Acceptance Criteria

1. WHEN a new scheme is added to the myscheme_API, THE System SHALL evaluate it against all Registered_User profiles
2. THE Classification_Engine SHALL identify users with Eligibility_Score above 70% for the new scheme
3. THE System SHALL send a Nudge notification to eligible users within 24 hours of scheme discovery
4. THE System SHALL limit Nudge notifications to a maximum of 3 per user per week
5. WHEN a scheme application deadline is within 7 days, THE System SHALL send a reminder Nudge to users who viewed the scheme but have not applied
6. THE System SHALL allow users to configure Nudge frequency preferences

### Requirement 12: Scheme Detail Retrieval

**User Story:** As a user, I want to view comprehensive details about a scheme, so that I can understand benefits, eligibility, and application process.

#### Acceptance Criteria

1. WHEN a user selects a scheme, THE System SHALL fetch complete scheme details from the myscheme_API via the MCP_Server
2. THE System SHALL display scheme name, description, benefits, eligibility criteria, application process, required documents, and deadlines
3. THE System SHALL format scheme details in a user-friendly layout
4. WHERE the user is a Registered_User, THE System SHALL display the personalized Eligibility_Score alongside scheme details
5. THE System SHALL provide a direct link to the official scheme application page

### Requirement 13: Concurrent User Support

**User Story:** As the platform operator, I want the system to handle multiple concurrent users, so that the service remains responsive during peak usage.

#### Acceptance Criteria

1. THE System SHALL support at least 1000 concurrent users without performance degradation
2. WHEN system load exceeds 80% capacity, THE System SHALL implement request queuing with a maximum wait time of 5 seconds
3. THE System SHALL maintain response times under 3 seconds for 95% of requests under normal load
4. THE System SHALL scale horizontally by adding instances when load exceeds 70% capacity
5. THE System SHALL use connection pooling for database and API connections

### Requirement 14: Data Persistence and Management

**User Story:** As the system, I want to persist user profiles and scheme data reliably, so that users have consistent experiences across sessions.

#### Acceptance Criteria

1. THE System SHALL store User_Profiles in the Neo4j database
2. THE System SHALL store User_Group assignments and scheme relationships as graph edges in Neo4j
3. THE System SHALL implement database transactions to ensure data consistency
4. THE System SHALL back up user data daily
5. WHEN a database write fails, THE System SHALL retry the operation up to 3 times before returning an error

### Requirement 15: ReAct Agent Tool Selection

**User Story:** As the ReAct Agent, I want to select appropriate tools from the MCP Server based on user intent, so that I can provide accurate responses.

#### Acceptance Criteria

1. WHEN the Intent_Classifier identifies an intent, THE ReAct_Agent SHALL select one or more tools from the MCP_Server tool registry
2. THE ReAct_Agent SHALL execute tools in the correct sequence when multiple tools are required
3. THE ReAct_Agent SHALL pass relevant context from the User_Profile to tools that require personalization
4. WHEN a tool execution fails, THE ReAct_Agent SHALL attempt an alternative tool or inform the user of the limitation
5. THE ReAct_Agent SHALL log all tool selections and executions for debugging and improvement

### Requirement 16: Frontend MCP Integration

**User Story:** As a frontend developer, I want to integrate the React frontend with the MCP Server, so that users can interact with the conversational agent.

#### Acceptance Criteria

1. THE System SHALL use the use-mcp library to establish connection between React frontend and MCP_Server
2. THE System SHALL maintain a persistent WebSocket connection for real-time communication
3. WHEN the connection is lost, THE System SHALL automatically reconnect within 5 seconds
4. THE System SHALL display connection status to users
5. THE System SHALL handle message serialization and deserialization transparently

### Requirement 17: Explainable Recommendations

**User Story:** As a user, I want to understand why schemes are recommended to me, so that I can trust the system's suggestions.

#### Acceptance Criteria

1. WHEN displaying a recommendation, THE System SHALL provide an explanation of why the scheme matches the user
2. THE System SHALL highlight which User_Profile attributes contributed to the recommendation
3. THE System SHALL display the top 3 matching criteria between the user and the scheme
4. THE System SHALL use plain language explanations without technical jargon
5. THE System SHALL allow users to provide feedback on recommendation relevance

### Requirement 18: Error Handling and Resilience

**User Story:** As a user, I want the system to handle errors gracefully, so that I can continue using the platform even when issues occur.

#### Acceptance Criteria

1. WHEN the myscheme_API is unavailable, THE System SHALL serve cached scheme data and display a notice about data freshness
2. WHEN the Classification_Engine fails, THE System SHALL fall back to rule-based recommendations
3. IF the ReAct_Agent encounters an error, THEN THE System SHALL log the error and display a user-friendly message
4. THE System SHALL implement circuit breakers for external API calls with a failure threshold of 50% over 10 requests
5. WHEN a circuit breaker opens, THE System SHALL attempt recovery after 60 seconds

### Requirement 19: Security and Privacy

**User Story:** As a user, I want my personal information to be secure and private, so that I can trust the platform with sensitive data.

#### Acceptance Criteria

1. THE System SHALL encrypt User_Profile data at rest using AES-256 encryption
2. THE System SHALL encrypt all data in transit using TLS 1.3 or higher
3. THE System SHALL implement authentication using secure token-based mechanisms
4. THE System SHALL not share User_Profile data with external services without explicit user consent
5. THE System SHALL allow users to delete their profiles and all associated data
6. THE System SHALL log all access to User_Profile data for audit purposes

### Requirement 20: Performance Monitoring and Optimization

**User Story:** As a system administrator, I want to monitor system performance, so that I can identify and resolve bottlenecks.

#### Acceptance Criteria

1. THE System SHALL log response times for all API calls and database queries
2. THE System SHALL track Classification_Engine accuracy and recommendation relevance metrics
3. THE System SHALL monitor MCP_Server tool execution times
4. THE System SHALL generate performance reports daily
5. WHEN response times exceed thresholds, THE System SHALL trigger alerts to administrators
