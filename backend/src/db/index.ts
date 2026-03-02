/**
 * Database Module Exports
 * 
 * Central export point for all database-related functionality.
 */

// Connection management
export {
  Neo4jConnection,
  Neo4jConfig,
  initializeNeo4j,
  getNeo4jConnection,
  closeNeo4j,
} from './neo4j.config';

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
