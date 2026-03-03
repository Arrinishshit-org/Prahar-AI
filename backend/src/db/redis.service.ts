/**
 * Redis Caching Service
 *
 * Provides get/set/del with JSON serialization and TTL.
 * Falls back gracefully when Redis is unavailable — the app
 * continues to work, just without caching.
 */

import RedisConnection from '../cache/redis.config';

class RedisService {
  private available = false;

  async init(): Promise<void> {
    try {
      await RedisConnection.connect();
      this.available = true;
      console.log('✅ Redis cache ready');
    } catch (err: any) {
      this.available = false;
      console.warn('⚠️  Redis not available — running without cache:', err.message);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.available) return null;
    try {
      const client = RedisConnection.getClient();
      const raw = await client.get(key);
      if (raw == null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    if (!this.available) return;
    try {
      const client = RedisConnection.getClient();
      await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch { /* silent */ }
  }

  async del(key: string): Promise<void> {
    if (!this.available) return;
    try {
      const client = RedisConnection.getClient();
      await client.del(key);
    } catch { /* silent */ }
  }

  /** Delete all keys matching a pattern (e.g. "schemes:*") */
  async delPattern(pattern: string): Promise<void> {
    if (!this.available) return;
    try {
      const client = RedisConnection.getClient();
      let cursor = 0;
      do {
        const result = await client.scan(cursor, { MATCH: pattern, COUNT: 200 });
        cursor = result.cursor;
        if (result.keys.length > 0) {
          await client.del(result.keys);
        }
      } while (cursor !== 0);
    } catch { /* silent */ }
  }

  async close(): Promise<void> {
    try {
      await RedisConnection.disconnect();
      this.available = false;
      console.log('Redis connection closed');
    } catch { /* silent */ }
  }
}

export const redisService = new RedisService();
