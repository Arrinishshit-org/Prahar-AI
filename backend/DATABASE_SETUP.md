# Neo4j Database Setup Guide

Complete guide for setting up and configuring the Neo4j graph database for the Personalized Scheme Recommendation System.

## Prerequisites

- Docker and Docker Compose (recommended) OR
- Neo4j Desktop/Community Edition (local installation)
- Node.js >= 18.0.0
- npm >= 8.0.0

## Option 1: Docker Setup (Recommended)

### Step 1: Start Neo4j Container

From the project root directory:

```bash
docker-compose up -d neo4j
```

This will:
- Pull the Neo4j 5.15.0 image
- Start Neo4j on ports 7474 (HTTP) and 7687 (Bolt)
- Create persistent volumes for data and logs
- Configure APOC plugin support
- Set up health checks

### Step 2: Verify Neo4j is Running

Check container status:
```bash
docker-compose ps neo4j
```

View logs:
```bash
docker-compose logs -f neo4j
```

Wait for the message: `Started.`

### Step 3: Access Neo4j Browser

Open http://localhost:7474 in your browser.

**First-time login:**
- Username: `neo4j`
- Password: `your_neo4j_password` (as configured in docker-compose.yml)

**Change default password:**
After first login, Neo4j will prompt you to change the password. Update your `.env` file with the new password.

### Step 4: Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and update Neo4j credentials:
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_new_password
NEO4J_DATABASE=neo4j
```

### Step 5: Install Backend Dependencies

```bash
npm install
```

### Step 6: Initialize Database Schema

Initialize schema with constraints and indexes:
```bash
npm run db:init
```

Or initialize with seed data (categories and user groups):
```bash
npm run db:init:seed
```

Expected output:
```
============================================================
Neo4j Database Initialization
============================================================

Connecting to Neo4j...
  URI: bolt://localhost:7687
  Database: neo4j

✓ Neo4j connection established successfully

Creating database schema...
  ✓ Created constraint: user_userId_unique
  ✓ Created constraint: user_email_unique
  ✓ Created constraint: scheme_schemeId_unique
  ...
  ✓ Created index: user_state_index
  ...
  ✓ Created full-text index: scheme_search_index

✓ Schema initialization completed successfully

Verifying schema...
  - Found 6 constraints
  - Found 13 indexes
✓ Schema verification passed

============================================================
Database initialization completed successfully!
============================================================
```

### Step 7: Verify Setup

Run verification:
```bash
npm run db:verify
```

Or check in Neo4j Browser:
```cypher
// View all constraints
SHOW CONSTRAINTS

// View all indexes
SHOW INDEXES

// View schema visualization
CALL db.schema.visualization()
```

## Option 2: Local Neo4j Installation

### Step 1: Install Neo4j

Download and install Neo4j Desktop or Community Edition:
- https://neo4j.com/download/

### Step 2: Create Database

1. Open Neo4j Desktop
2. Create a new project
3. Add a local DBMS
4. Set password
5. Start the database

### Step 3: Configure Connection

Update `backend/.env`:
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j
```

### Step 4: Initialize Schema

Follow steps 5-7 from Docker setup above.

## Database Schema Overview

### Node Types

The database includes 5 main node types:

1. **User** - Citizen profiles with demographics and preferences
2. **Scheme** - Government schemes with eligibility criteria
3. **UserGroup** - Demographic segments for classification
4. **Nudge** - Proactive notifications
5. **Category** - Scheme categories

### Indexes Created

**Unique Constraints (with indexes):**
- User: `userId`, `email`
- Scheme: `schemeId`
- UserGroup: `groupId`
- Nudge: `nudgeId`
- Category: `categoryId`

**Performance Indexes:**
- User: `state`, `incomeLevel`, `occupation`, `age`
- Scheme: `category`, `isActive`, `applicationDeadline`
- Nudge: `userId`, `viewed`, `createdAt`

**Full-Text Search:**
- Scheme: `schemeName`, `shortDescription`, `fullDescription`

## Seed Data

When using `npm run db:init:seed`, the following data is created:

### Categories (8)
- Education
- Healthcare
- Agriculture
- Employment
- Housing
- Social Welfare
- Women & Child Development
- Financial Assistance

### User Groups (9)
- Farmers
- Students
- Senior Citizens
- Low Income Workers
- Women
- MSME / Self-employed
- Persons with Disabilities
- Rural Household
- Urban Below Poverty Line

## Common Operations

### Reset Database

Drop all data and reinitialize:
```bash
npm run db:init:drop
```

⚠️ **Warning:** This will delete all data!

### Backup Database

```bash
# Create backup
docker exec scheme-recommender-neo4j neo4j-admin database dump neo4j --to-path=/backups

# Copy backup from container
docker cp scheme-recommender-neo4j:/backups/neo4j.dump ./backups/neo4j-$(date +%Y%m%d).dump
```

### Restore Database

```bash
# Stop Neo4j
docker-compose stop neo4j

# Copy backup to container
docker cp ./backups/neo4j-20240115.dump scheme-recommender-neo4j:/backups/neo4j.dump

# Restore
docker exec scheme-recommender-neo4j neo4j-admin database load neo4j --from-path=/backups --overwrite-destination=true

# Start Neo4j
docker-compose start neo4j
```

### View Database Statistics

In Neo4j Browser:
```cypher
// Count all nodes by type
MATCH (n)
RETURN labels(n) AS NodeType, count(n) AS Count
ORDER BY Count DESC

// Count all relationships by type
MATCH ()-[r]->()
RETURN type(r) AS RelationshipType, count(r) AS Count
ORDER BY Count DESC

// Database size
CALL apoc.meta.stats()
```

## Troubleshooting

### Issue: Connection Refused

**Error:**
```
Error: Could not connect to Neo4j
```

**Solutions:**
1. Check if Neo4j is running:
   ```bash
   docker-compose ps neo4j
   ```

2. Check Neo4j logs:
   ```bash
   docker-compose logs neo4j
   ```

3. Verify port 7687 is not in use:
   ```bash
   netstat -an | grep 7687
   ```

4. Restart Neo4j:
   ```bash
   docker-compose restart neo4j
   ```

### Issue: Authentication Failed

**Error:**
```
Neo.ClientError.Security.Unauthorized
```

**Solutions:**
1. Verify credentials in `.env` match Neo4j password
2. Reset password in Neo4j Browser
3. Update `.env` with new password

### Issue: Schema Already Exists

**Warning:**
```
Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists
```

**Solution:** This is normal when running initialization multiple times. The script handles this gracefully and skips existing constraints/indexes.

### Issue: Out of Memory

**Error:**
```
java.lang.OutOfMemoryError: Java heap space
```

**Solutions:**
1. Increase heap size in `docker-compose.yml`:
   ```yaml
   environment:
     - NEO4J_dbms_memory_heap_max__size=4G
   ```

2. Restart Neo4j:
   ```bash
   docker-compose restart neo4j
   ```

### Issue: Slow Queries

**Solutions:**
1. Verify indexes are created:
   ```cypher
   SHOW INDEXES
   ```

2. Use EXPLAIN to analyze query:
   ```cypher
   EXPLAIN MATCH (u:User {userId: $userId}) RETURN u
   ```

3. Use PROFILE for detailed execution plan:
   ```cypher
   PROFILE MATCH (u:User)-[:BELONGS_TO]->(g:UserGroup) RETURN u, g
   ```

## Performance Tuning

### Connection Pool Settings

The default configuration in `neo4j.config.ts`:
```typescript
{
  maxConnectionPoolSize: 50,
  connectionTimeout: 30000,
  maxTransactionRetryTime: 30000
}
```

Adjust based on your workload:
- **High concurrency**: Increase `maxConnectionPoolSize` to 100
- **Slow network**: Increase `connectionTimeout` to 60000
- **Long transactions**: Increase `maxTransactionRetryTime` to 60000

### Memory Configuration

For production, adjust in `docker-compose.yml`:
```yaml
environment:
  - NEO4J_dbms_memory_heap_initial__size=1G
  - NEO4J_dbms_memory_heap_max__size=4G
  - NEO4J_dbms_memory_pagecache_size=2G
```

Guidelines:
- **Heap**: 1-4GB for typical workloads
- **Page Cache**: 50% of available RAM minus heap
- **Total**: Should not exceed 80% of system RAM

## Security Best Practices

1. **Change Default Password**
   - Never use default password in production
   - Use strong passwords (16+ characters)

2. **Enable TLS/SSL**
   - Configure TLS for production deployments
   - Use valid certificates

3. **Network Security**
   - Restrict Neo4j ports to backend only
   - Use firewall rules
   - Consider VPN for remote access

4. **Authentication**
   - Use environment variables for credentials
   - Never commit credentials to version control
   - Rotate passwords regularly

5. **Backup**
   - Schedule daily backups
   - Test restore procedures
   - Store backups securely off-site

## Next Steps

After successful setup:

1. **Start Backend Server**
   ```bash
   npm run dev
   ```

2. **Run Tests**
   ```bash
   npm test
   ```

3. **Explore Neo4j Browser**
   - http://localhost:7474
   - Try sample queries
   - Visualize graph relationships

4. **Read Documentation**
   - `backend/src/db/README.md` - Detailed database documentation
   - `docs/ARCHITECTURE.md` - System architecture
   - `docs/QUICKSTART.md` - Quick start guide

## Support

For issues or questions:
- Check Neo4j logs: `docker-compose logs neo4j`
- Review Neo4j documentation: https://neo4j.com/docs/
- Check project issues on GitHub

## References

- [Neo4j Documentation](https://neo4j.com/docs/)
- [Neo4j Docker Guide](https://neo4j.com/docs/operations-manual/current/docker/)
- [Cypher Query Language](https://neo4j.com/docs/cypher-manual/current/)
- [Neo4j Driver for Node.js](https://neo4j.com/docs/javascript-manual/current/)
