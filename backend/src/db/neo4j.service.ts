/**
 * Neo4j Service
 * Provides a simple interface for executing queries against Neo4j
 * Falls back gracefully when Neo4j is not available
 */

import { getNeo4jConnection } from './neo4j.config';

class Neo4jService {
  private _available: boolean | null = null; // null = not yet checked

  /**
   * Check availability (cached after first check)
   */
  async isAvailable(): Promise<boolean> {
    if (this._available !== null) return this._available;
    try {
      const connection = getNeo4jConnection();
      await connection.getDriver().verifyConnectivity();
      this._available = true;
      console.log('✅ Neo4j is available');
      return true;
    } catch {
      this._available = false;
      console.log('ℹ️  Neo4j is not available — all data will be served from in-memory cache');
      return false;
    }
  }

  /** Mark as unavailable (called on first connection failure) */
  markUnavailable(): void {
    if (this._available !== false) {
      this._available = false;
      console.log('ℹ️  Neo4j marked unavailable — switching to in-memory cache');
    }
  }

  /**
   * Execute a write query against Neo4j
   */
  async executeWriteQuery(
    query: string,
    parameters: Record<string, any> = {}
  ): Promise<any> {
    if (this._available === false) {
      throw new Error('Neo4j not available');
    }
    try {
      const connection = getNeo4jConnection();
      const session = connection.getWriteSession();
      try {
        const result = await session.run(query, parameters);
        return result;
      } finally {
        await session.close();
      }
    } catch (error) {
      this.markUnavailable();
      throw error;
    }
  }

  /**
   * Execute a query against Neo4j (auto-detects read/write)
   */
  async executeQuery(
    query: string,
    parameters: Record<string, any> = {}
  ): Promise<any> {
    if (this._available === false) {
      throw new Error('Neo4j not available');
    }

    const trimmedQuery = query.trim().toUpperCase();
    const isWrite =
      trimmedQuery.startsWith('CREATE') ||
      trimmedQuery.startsWith('MERGE') ||
      trimmedQuery.startsWith('SET') ||
      trimmedQuery.startsWith('DELETE') ||
      trimmedQuery.startsWith('REMOVE') ||
      trimmedQuery.includes('MERGE') ||
      trimmedQuery.includes(' SET ') ||
      trimmedQuery.includes(' DELETE ') ||
      trimmedQuery.includes(' CREATE ');

    if (isWrite) {
      return this.executeWriteQuery(query, parameters);
    }

    try {
      const connection = getNeo4jConnection();
      const session = connection.getReadSession();
      try {
        const result = await session.run(query, parameters);
        return result;
      } finally {
        await session.close();
      }
    } catch (error) {
      this.markUnavailable();
      throw error;
    }
  }
}

export const neo4jService = new Neo4jService();
