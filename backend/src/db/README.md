# Neo4j Database Setup

This directory contains the Neo4j database configuration, schema initialization, and seed data scripts for the Personalized Scheme Recommendation System.

## Overview

The system uses Neo4j as a graph database to model complex relationships between:
- **Users**: Citizens with demographic and profile information
- **Schemes**: Government schemes with eligibility criteria
- **UserGroups**: Demographic segments for classification
- **Nudges**: Proactive notifications for users
- **Categories**: Scheme categorization

## Files

- `neo4j.config.ts` - Database connection configuration with connection pooling
- `schema.ts` - Schema initialization (constraints, indexes, full-text search)
- `seed-data.ts` - Seed data for categories and user groups
- `init-db.ts` - CLI script for database initialization

## Quick Start

### 1. Start Neo4j

Using Docker (recommended):
```bash
# From project root
docker-compose up -d neo4j
```

Or install Neo4j locally:
- Download from https://neo4j.com/download/
- Start Neo4j Desktop or Community Edition

### 2. Configure Environment

Copy and update the environment file:
```bash
cp backend/.env.example backend/.env
```

Update Neo4j credentials in `.env`:
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_secure_password
NEO4J_DATABASE=neo4j
```

### 3. Initialize Database

Install dependencies:
```bash
cd backend
npm install
```

Initialize schema:
```bash
npm run db:init
```

Initialize with seed data:
```bash
npm run db:init:seed
```

## Database Schema

### Node Types

#### User
Stores citizen profile information including demographics, economic status, and location.

**Properties:**
- `userId` (unique) - User identifier
- `email` (unique) - Email address
- `passwordHash` - Hashed password
- Demographics: `firstName`, `lastName`, `age`, `gender`, `maritalStatus`, `familySize`
- Economic: `annualIncome`, `incomeLevel`, `employmentStatus`, `occupation`
- Geographic: `state`, `district`, `pincode`, `ruralUrban`
- Categorical: `educationLevel`, `caste`, `disability`
- System: `createdAt`, `updatedAt`, `lastLoginAt`, `profileCompleteness`

**Indexes:**
- `userId` (unique constraint)
- `email` (unique constraint)
- `state`, `incomeLevel`, `occupation`, `age`

#### Scheme
Government schemes with eligibility criteria and benefits.

**Properties:**
- `schemeId` (unique) - Scheme identifier
- `schemeName` - Scheme name
- `shortDescription`, `fullDescription` - Descriptions
- `category`, `subCategory` - Categorization
- `sponsoredBy` - Ministry/Department
- Eligibility: `ageMin`, `ageMax`, `incomeMax`, `states`
- Benefits: `benefitType`, `benefitAmount`
- Application: `applicationUrl`, `applicationDeadline`, `isActive`
- ML: `eligibilityVector` - Pre-computed vector for cosine similarity

**Indexes:**
- `schemeId` (unique constraint)
- `category`, `isActive`, `applicationDeadline`
- Full-text search on `schemeName`, `shortDescription`, `fullDescription`

#### UserGroup
Demographic segments for user classification.

**Properties:**
- `groupId` (unique) - Group identifier
- `groupName`, `description` - Group details
- Cluster: `centroid`, `radius`, `memberCount`
- Typical profile: `ageRangeMin`, `ageRangeMax`, `incomeRangeMin`, `incomeRangeMax`
- `commonOccupations`, `commonLocations`

**Indexes:**
- `groupId` (unique constraint)

#### Nudge
Proactive notifications for users.

**Properties:**
- `nudgeId` (unique) - Nudge identifier
- `type`, `title`, `message`, `actionUrl`
- `priority`, `eligibilityScore`
- Delivery: `channels`, `delivered`, `deliveredAt`
- Interaction: `viewed`, `clicked`, `dismissed`
- Lifecycle: `createdAt`, `expiresAt`

**Indexes:**
- `nudgeId` (unique constraint)
- `userId`, `viewed`, `createdAt`

#### Category
Scheme categories for organization.

**Properties:**
- `categoryId` (unique) - Category identifier
- `categoryName`, `description`, `iconUrl`

**Indexes:**
- `categoryId` (unique constraint)

### Relationships

- `(User)-[:BELONGS_TO]->(UserGroup)` - User classification
- `(User)-[:VIEWED]->(Scheme)` - Scheme views
- `(User)-[:APPLIED_TO]->(Scheme)` - Applications
- `(User)-[:ELIGIBLE_FOR]->(Scheme)` - Eligibility scores
- `(UserGroup)-[:RELEVANT_TO]->(Scheme)` - Group-scheme relevance
- `(User)-[:RECEIVED]->(Nudge)` - Nudge delivery
- `(Nudge)-[:ABOUT]->(Scheme)` - Nudge-scheme link
- `(Scheme)-[:BELONGS_TO]->(Category)` - Categorization

## CLI Commands

### Initialize Schema
```bash
npm run db:init
```
Creates constraints, indexes, and full-text search indexes.

### Initialize with Seed Data
```bash
npm run db:init:seed
```
Creates schema and seeds categories and user groups.

### Drop and Reinitialize
```bash
npm run db:init:drop
```
⚠️ **Warning:** Drops all existing schema and data, then reinitializes.

### Verify Schema
```bash
npm run db:verify
```
Verifies that all required constraints and indexes exist.

## Connection Pooling

The Neo4j driver is configured with connection pooling for optimal performance:

- **Max Pool Size**: 50 connections
- **Connection Timeout**: 30 seconds
- **Max Transaction Retry Time**: 30 seconds
- **Access Modes**: Separate read and write sessions

## Usage in Code

### Basic Usage

```typescript
import { initializeNeo4j, getNeo4jConnection } from './db/neo4j.config';

// Initialize connection
const connection = initializeNeo4j({
  uri: process.env.NEO4J_URI!,
  username: process.env.NEO4J_USERNAME!,
  password: process.env.NEO4J_PASSWORD!,
});

await connection.connect();

// Execute read query
const users = await connection.executeRead<User>(
  'MATCH (u:User) WHERE u.state = $state RETURN u',
  { state: 'Maharashtra' }
);

// Execute write query
await connection.executeWrite(
  'CREATE (u:User {userId: $userId, email: $email})',
  { userId: '123', email: 'user@example.com' }
);

// Close connection
await connection.close();
```

### Transaction with Retry

```typescript
const result = await connection.executeTransaction(async (tx) => {
  // Multiple operations in a transaction
  await tx.run('CREATE (u:User {userId: $userId})', { userId: '123' });
  await tx.run('CREATE (s:Scheme {schemeId: $schemeId})', { schemeId: 'abc' });
  await tx.run('MATCH (u:User {userId: $userId}), (s:Scheme {schemeId: $schemeId}) CREATE (u)-[:VIEWED]->(s)', 
    { userId: '123', schemeId: 'abc' });
  
  return { success: true };
});
```

## Full-Text Search

The database includes a full-text search index on schemes:

```typescript
// Search schemes by keywords
const results = await connection.executeRead(
  `
  CALL db.index.fulltext.queryNodes('scheme_search_index', $query)
  YIELD node, score
  RETURN node AS scheme, score
  ORDER BY score DESC
  LIMIT 10
  `,
  { query: 'education scholarship' }
);
```

## Performance Optimization

### Indexes
All frequently queried fields have indexes for fast lookups:
- User: `userId`, `email`, `state`, `incomeLevel`, `occupation`, `age`
- Scheme: `schemeId`, `category`, `isActive`, `applicationDeadline`
- Nudge: `nudgeId`, `userId`, `viewed`, `createdAt`

### Connection Pooling
The driver maintains a pool of connections to handle concurrent requests efficiently.

### Parameterized Queries
All queries use parameterized inputs to prevent injection and enable query plan caching.

## Troubleshooting

### Connection Refused
```
Error: Could not connect to Neo4j
```
**Solution:**
1. Ensure Neo4j is running: `docker-compose ps`
2. Check Neo4j logs: `docker-compose logs neo4j`
3. Verify credentials in `.env`
4. Ensure port 7687 is not blocked

### Schema Already Exists
```
Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists
```
**Solution:** This is normal if running initialization multiple times. The script handles this gracefully.

### Authentication Failed
```
Neo.ClientError.Security.Unauthorized
```
**Solution:**
1. Verify credentials in `.env`
2. Reset Neo4j password if needed
3. Check Neo4j authentication is enabled

### Database Locked
```
Neo.TransientError.Transaction.LockClientStopped
```
**Solution:**
1. Wait for ongoing transactions to complete
2. Restart Neo4j if needed: `docker-compose restart neo4j`

## Backup and Recovery

### Backup
```bash
# Using Docker
docker exec scheme-recommender-neo4j neo4j-admin database dump neo4j --to-path=/backups

# Copy backup from container
docker cp scheme-recommender-neo4j:/backups/neo4j.dump ./backups/
```

### Restore
```bash
# Stop Neo4j
docker-compose stop neo4j

# Copy backup to container
docker cp ./backups/neo4j.dump scheme-recommender-neo4j:/backups/

# Restore
docker exec scheme-recommender-neo4j neo4j-admin database load neo4j --from-path=/backups

# Start Neo4j
docker-compose start neo4j
```

## Neo4j Browser

Access the Neo4j Browser at http://localhost:7474

**Default Credentials:**
- Username: `neo4j`
- Password: (as configured in `.env`)

**Useful Queries:**

View all node types:
```cypher
CALL db.labels()
```

View all relationship types:
```cypher
CALL db.relationshipTypes()
```

View schema:
```cypher
CALL db.schema.visualization()
```

Count nodes:
```cypher
MATCH (n) RETURN labels(n) AS label, count(n) AS count
```

## References

- [Neo4j Documentation](https://neo4j.com/docs/)
- [Neo4j Driver for Node.js](https://neo4j.com/docs/javascript-manual/current/)
- [Cypher Query Language](https://neo4j.com/docs/cypher-manual/current/)
