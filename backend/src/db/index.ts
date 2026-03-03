/**
 * Database Module Exports
 * 
 * Central export point for all database-related functionality.
 */

// Neo4j connection management
export {
  Neo4jConnection,
  Neo4jConfig,
  initializeNeo4j,
  getNeo4jConnection,
  closeNeo4j,
} from './neo4j.config';

// Main database service (Neo4j graph + Redis cache)
export {
  neo4jService,
  dbService,
  SchemeRow,
  CategoryMapping,
  SyncMeta,
} from './neo4j.service';

// Redis caching
export { redisService } from './redis.service';

// Schema management
export {
  initializeSchema,
  dropSchema,
  verifySchema,
  SchemaInitResult,
} from './schema';

// Seed data
export {
  seedCategories,
  seedUserGroups,
  clearAllData,
  getDatabaseStats,
} from './seed-data';
