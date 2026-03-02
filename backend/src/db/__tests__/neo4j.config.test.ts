/**
 * Neo4j Configuration Tests
 * 
 * Tests for database connection, pooling, and basic operations.
 */

import { Neo4jConnection } from '../neo4j.config';

describe('Neo4jConnection', () => {
  let connection: Neo4jConnection;

  beforeAll(() => {
    // Use test database configuration
    connection = new Neo4jConnection({
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'test_password',
      database: process.env.NEO4J_TEST_DATABASE || 'neo4j',
    });
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('Connection Management', () => {
    it('should connect to Neo4j successfully', async () => {
      await expect(connection.connect()).resolves.not.toThrow();
    });

    it('should handle multiple connect calls gracefully', async () => {
      await connection.connect();
      await expect(connection.connect()).resolves.not.toThrow();
    });

    it('should get read session', () => {
      const session = connection.getReadSession();
      expect(session).toBeDefined();
      session.close();
    });

    it('should get write session', () => {
      const session = connection.getWriteSession();
      expect(session).toBeDefined();
      session.close();
    });

    it('should throw error when getting session before connect', () => {
      const newConnection = new Neo4jConnection({
        uri: 'bolt://localhost:7687',
        username: 'neo4j',
        password: 'test',
      });

      expect(() => newConnection.getReadSession()).toThrow(
        'Neo4j driver not initialized'
      );
    });
  });

  describe('Query Execution', () => {
    beforeAll(async () => {
      await connection.connect();
    });

    it('should execute read query', async () => {
      const result = await connection.executeRead<{ value: number }>(
        'RETURN 1 AS value'
      );

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(1);
    });

    it('should execute read query with parameters', async () => {
      const result = await connection.executeRead<{ sum: number }>(
        'RETURN $a + $b AS sum',
        { a: 5, b: 3 }
      );

      expect(result).toHaveLength(1);
      expect(result[0].sum).toBe(8);
    });

    it('should execute write query', async () => {
      const testId = `test-${Date.now()}`;
      
      await connection.executeWrite(
        'CREATE (n:TestNode {id: $id}) RETURN n',
        { id: testId }
      );

      // Verify node was created
      const result = await connection.executeRead<{ id: string }>(
        'MATCH (n:TestNode {id: $id}) RETURN n.id AS id',
        { id: testId }
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testId);

      // Cleanup
      await connection.executeWrite(
        'MATCH (n:TestNode {id: $id}) DELETE n',
        { id: testId }
      );
    });
  });

  describe('Transaction Handling', () => {
    beforeAll(async () => {
      await connection.connect();
    });

    it('should execute transaction successfully', async () => {
      const testId = `test-tx-${Date.now()}`;

      const result = await connection.executeTransaction(async (tx) => {
        await tx.run('CREATE (n:TestNode {id: $id})', { id: testId });
        const queryResult = await tx.run(
          'MATCH (n:TestNode {id: $id}) RETURN n.id AS id',
          { id: testId }
        );
        return queryResult.records[0].get('id');
      });

      expect(result).toBe(testId);

      // Cleanup
      await connection.executeWrite(
        'MATCH (n:TestNode {id: $id}) DELETE n',
        { id: testId }
      );
    });

    it('should rollback transaction on error', async () => {
      const testId = `test-rollback-${Date.now()}`;

      await expect(
        connection.executeTransaction(async (tx) => {
          await tx.run('CREATE (n:TestNode {id: $id})', { id: testId });
          throw new Error('Simulated error');
        })
      ).rejects.toThrow('Simulated error');

      // Verify node was not created (transaction rolled back)
      const result = await connection.executeRead<{ count: number }>(
        'MATCH (n:TestNode {id: $id}) RETURN count(n) AS count',
        { id: testId }
      );

      expect(result[0].count).toBe(0);
    });
  });

  describe('Connection Pooling', () => {
    it('should handle concurrent queries', async () => {
      await connection.connect();

      const queries = Array.from({ length: 10 }, (_, i) =>
        connection.executeRead<{ value: number }>(
          'RETURN $value AS value',
          { value: i }
        )
      );

      const results = await Promise.all(queries);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result[0].value).toBe(i);
      });
    });
  });
});
