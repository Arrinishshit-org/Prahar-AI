/**
 * Global test setup and configuration
 */

import fc from 'fast-check';

// Configure fast-check globally for faster test execution
fc.configureGlobal({ numRuns: 10 });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.NEO4J_URI = 'bolt://localhost:7687';
process.env.NEO4J_USER = 'neo4j';
process.env.NEO4J_PASSWORD = 'test-password';

// Reduce timeout for faster test execution
jest.setTimeout(5000);

// Global test lifecycle hooks
beforeAll(async () => {
  // Setup code that runs once before all tests
});

afterAll(async () => {
  // Cleanup code that runs once after all tests
});

beforeEach(() => {
  // Setup code that runs before each test
});

afterEach(() => {
  // Cleanup code that runs after each test
  jest.clearAllMocks();
});
