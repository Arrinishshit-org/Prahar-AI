import { RedisClientType } from 'redis';
import redisConnection from './redis.config';

/**
 * Cache key naming conventions:
 * - schemes:{filter_hash} - List of schemes with filters
 * - scheme:{schemeId} - Individual scheme details
 * - recommendations:{userId} - User recommendations
 * - eligibility:{userId}:{schemeId} - Eligibility score
 * - user_groups:{userId} - User group assignments
 * - classification:{userId} - User classification data
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds, -1 for no expiry
  allowStale?: boolean; // Allow returning stale data
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

/**
 * Multi-level cache service with in-memory L1 and Redis L2
 */
export class CacheService {
  private redisClient: RedisClientType | null = null;
  private l1Cache: Map<string, { value: any; expiresAt: number }> = new Map();
  private l1MaxSize: number = 1000; // Maximum L1 cache entries
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };

  constructor() {}

  /**
   * Initialize the cache service
   */
  async initialize(): Promise<void> {
    try {
      this.redisClient = await redisConnection.connect();
      console.log('Cache service initialized');
    } catch (error) {
      console.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  /**
   * Get value from cache (checks L1 first, then L2)
   */
  async get<T>(key: string, _options: CacheOptions = {}): Promise<T | null> {
    // Check L1 cache first
    const l1Result = this.getFromL1<T>(key);
    if (l1Result !== null) {
      this.stats.hits++;
      return l1Result;
    }

    // Check L2 (Redis) cache
    if (!this.redisClient) {
      this.stats.misses++;
      return null;
    }

    try {
      const value = await this.redisClient.get(key);
      if (value === null) {
        this.stats.misses++;
        return null;
      }

      const parsed = JSON.parse(value) as T;

      // Populate L1 cache for hot data
      this.setInL1(key, parsed, 300); // 5 minutes in L1

      this.stats.hits++;
      return parsed;
    } catch (error) {
      console.error(`Error getting key ${key} from Redis:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache (both L1 and L2)
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    const serialized = JSON.stringify(value);

    // Set in L2 (Redis)
    if (this.redisClient) {
      try {
        if (ttl === -1) {
          // No expiry
          await this.redisClient.set(key, serialized);
        } else {
          await this.redisClient.setEx(key, ttl, serialized);
        }
      } catch (error) {
        console.error(`Error setting key ${key} in Redis:`, error);
        throw error;
      }
    }

    // Set in L1 cache with shorter TTL
    const l1Ttl = ttl === -1 ? 3600 : Math.min(ttl, 300); // Max 5 minutes in L1
    this.setInL1(key, value, l1Ttl);
  }

  /**
   * Delete value from cache (both L1 and L2)
   */
  async delete(key: string): Promise<void> {
    // Delete from L1
    this.l1Cache.delete(key);

    // Delete from L2 (Redis)
    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.error(`Error deleting key ${key} from Redis:`, error);
        throw error;
      }
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    let deletedCount = 0;

    // Delete from L1
    for (const key of this.l1Cache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        this.l1Cache.delete(key);
        deletedCount++;
      }
    }

    // Delete from L2 (Redis)
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          deletedCount += await this.redisClient.del(keys);
        }
      } catch (error) {
        console.error(`Error deleting pattern ${pattern} from Redis:`, error);
        throw error;
      }
    }

    return deletedCount;
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    // Check L1 first
    if (this.l1Cache.has(key)) {
      const entry = this.l1Cache.get(key)!;
      if (entry.expiresAt > Date.now()) {
        return true;
      }
      this.l1Cache.delete(key);
    }

    // Check L2 (Redis)
    if (this.redisClient) {
      try {
        const exists = await this.redisClient.exists(key);
        return exists === 1;
      } catch (error) {
        console.error(`Error checking existence of key ${key}:`, error);
        return false;
      }
    }

    return false;
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    if (this.redisClient) {
      try {
        return await this.redisClient.ttl(key);
      } catch (error) {
        console.error(`Error getting TTL for key ${key}:`, error);
        return -2; // Key doesn't exist
      }
    }
    return -2;
  }

  /**
   * Clear all cache (both L1 and L2)
   */
  async clear(): Promise<void> {
    // Clear L1
    this.l1Cache.clear();

    // Clear L2 (Redis) - use with caution in production
    if (this.redisClient) {
      try {
        await this.redisClient.flushDb();
      } catch (error) {
        console.error('Error clearing Redis cache:', error);
        throw error;
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Close cache connections
   */
  async close(): Promise<void> {
    await redisConnection.disconnect();
    this.l1Cache.clear();
  }

  // L1 Cache methods

  private getFromL1<T>(key: string): T | null {
    const entry = this.l1Cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt <= Date.now()) {
      this.l1Cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  private setInL1(key: string, value: any, ttl: number): void {
    // Evict oldest entries if cache is full
    if (this.l1Cache.size >= this.l1MaxSize) {
      const firstKey = this.l1Cache.keys().next().value as string | undefined;
      if (firstKey) {
        this.l1Cache.delete(firstKey);
      }
    }

    const expiresAt = Date.now() + ttl * 1000;
    this.l1Cache.set(key, { value, expiresAt });
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(key);
  }
}

// Singleton instance
let cacheServiceInstance: CacheService | null = null;

export const getCacheService = (): CacheService => {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService();
  }
  return cacheServiceInstance;
};

export default getCacheService();
