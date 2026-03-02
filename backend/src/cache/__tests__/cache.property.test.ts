import * as fc from 'fast-check';
import { CacheService } from '../cache.service';
import {
  schemeKey,
  recommendationsKey,
  eligibilityKey,
  schemesKey,
} from '../cache-keys';

/**
 * Property-Based Tests for Cache Service
 * 
 * **Validates: Requirements 7.2, 7.3, 13.5**
 */

describe('CacheService - Property-Based Tests', () => {
  let cache: CacheService;

  beforeAll(async () => {
    cache = new CacheService();
    await cache.initialize();
  });

  afterAll(async () => {
    await cache.close();
  });

  beforeEach(async () => {
    await cache.clear();
    cache.resetStats();
  });

  /**
   * Property: Cache Round Trip
   * For any valid key-value pair, setting and then getting should return the same value
   * 
   * **Validates: Requirements 7.2**
   */
  it('should preserve data through set-get round trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.oneof(
          fc.record({
            id: fc.integer(),
            name: fc.string(),
          }),
          fc.array(fc.integer()),
          fc.string(),
          fc.integer(),
          fc.boolean()
        ),
        fc.integer({ min: 1, max: 3600 }),
        async (key, value, ttl) => {
          await cache.set(key, value, ttl);
          const result = await cache.get(key);
          expect(result).toEqual(value);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Key Uniqueness
   * Different keys should store independent values
   * 
   * **Validates: Requirements 7.2**
   */
  it('should maintain independence between different keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.record({ data: fc.string() }),
        fc.record({ data: fc.string() }),
        async (key1, key2, value1, value2) => {
          fc.pre(key1 !== key2); // Ensure keys are different

          await cache.set(key1, value1, 60);
          await cache.set(key2, value2, 60);

          const result1 = await cache.get(key1);
          const result2 = await cache.get(key2);

          expect(result1).toEqual(value1);
          expect(result2).toEqual(value2);
          expect(result1).not.toEqual(result2);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Delete Idempotence
   * Deleting a key multiple times should be safe
   * 
   * **Validates: Requirements 7.2**
   */
  it('should handle multiple deletes idempotently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.record({ data: fc.string() }),
        async (key, value) => {
          await cache.set(key, value, 60);

          // Delete multiple times
          await cache.delete(key);
          await cache.delete(key);
          await cache.delete(key);

          const result = await cache.get(key);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Cache Key Consistency
   * Same input parameters should generate the same cache key
   * 
   * **Validates: Requirements 7.2**
   */
  it('should generate consistent keys for same inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.record({
          category: fc.string(),
          state: fc.string(),
        }),
        async (userId, filters) => {
          const key1 = recommendationsKey(userId, filters);
          const key2 = recommendationsKey(userId, filters);
          expect(key1).toBe(key2);

          // Keys should also work for cache operations
          await cache.set(key1, { data: 'test' }, 60);
          const result = await cache.get(key2);
          expect(result).toEqual({ data: 'test' });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Filter Order Independence
   * Cache keys should be the same regardless of filter property order
   * 
   * **Validates: Requirements 7.2**
   */
  it('should generate same key regardless of filter order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          category: fc.string(),
          state: fc.string(),
          income: fc.integer(),
        }),
        async (filters) => {
          // Create different orderings of the same filters
          const filters1 = { category: filters.category, state: filters.state, income: filters.income };
          const filters2 = { state: filters.state, income: filters.income, category: filters.category };
          const filters3 = { income: filters.income, category: filters.category, state: filters.state };

          const key1 = schemesKey(filters1);
          const key2 = schemesKey(filters2);
          const key3 = schemesKey(filters3);

          expect(key1).toBe(key2);
          expect(key2).toBe(key3);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: TTL Bounds
   * TTL should always be within valid range
   * 
   * **Validates: Requirements 7.3**
   */
  it('should respect TTL bounds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.record({ data: fc.string() }),
        fc.integer({ min: 1, max: 86400 }),
        async (key, value, ttl) => {
          await cache.set(key, value, ttl);

          const remainingTtl = await cache.ttl(key);

          // TTL should be positive and not exceed the set value
          expect(remainingTtl).toBeGreaterThan(0);
          expect(remainingTtl).toBeLessThanOrEqual(ttl);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Exists Consistency
   * exists() should return true if and only if get() returns non-null
   * 
   * **Validates: Requirements 7.2**
   */
  it('should have consistent exists and get behavior', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.record({ data: fc.string() }),
        fc.boolean(),
        async (key, value, shouldSet) => {
          if (shouldSet) {
            await cache.set(key, value, 60);
          }

          const exists = await cache.exists(key);
          const result = await cache.get(key);

          if (exists) {
            expect(result).not.toBeNull();
          } else {
            expect(result).toBeNull();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Pattern Matching Correctness
   * Pattern deletion should only delete keys matching the pattern
   * 
   * **Validates: Requirements 7.2**
   */
  it('should only delete keys matching the pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
        async (prefix, suffixes) => {
          // Set keys with the prefix
          for (const suffix of suffixes) {
            await cache.set(`${prefix}:${suffix}`, { data: suffix }, 60);
          }

          // Set a key that doesn't match
          const otherKey = `other:key`;
          await cache.set(otherKey, { data: 'other' }, 60);

          // Delete pattern
          await cache.deletePattern(`${prefix}:*`);

          // Check that matching keys are deleted
          for (const suffix of suffixes) {
            const result = await cache.get(`${prefix}:${suffix}`);
            expect(result).toBeNull();
          }

          // Check that non-matching key still exists
          const otherResult = await cache.get(otherKey);
          expect(otherResult).toEqual({ data: 'other' });
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Cache Statistics Monotonicity
   * Cache hits and misses should only increase, never decrease
   * 
   * **Validates: Requirements 13.5**
   */
  it('should have monotonically increasing statistics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 20 }),
            shouldSet: fc.boolean(),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        async (operations) => {
          cache.resetStats();
          let previousHits = 0;
          let previousMisses = 0;

          for (const op of operations) {
            if (op.shouldSet) {
              await cache.set(op.key, { data: 'value' }, 60);
            }
            await cache.get(op.key);

            const stats = cache.getStats();
            expect(stats.hits).toBeGreaterThanOrEqual(previousHits);
            expect(stats.misses).toBeGreaterThanOrEqual(previousMisses);

            previousHits = stats.hits;
            previousMisses = stats.misses;
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Hit Rate Bounds
   * Hit rate should always be between 0 and 1
   * 
   * **Validates: Requirements 13.5**
   */
  it('should maintain hit rate within valid bounds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 20 }),
            shouldSet: fc.boolean(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (operations) => {
          cache.resetStats();

          for (const op of operations) {
            if (op.shouldSet) {
              await cache.set(op.key, { data: 'value' }, 60);
            }
            await cache.get(op.key);
          }

          const stats = cache.getStats();
          expect(stats.hitRate).toBeGreaterThanOrEqual(0);
          expect(stats.hitRate).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Concurrent Operations Safety
   * Multiple concurrent operations should not corrupt data
   * 
   * **Validates: Requirements 13.5**
   */
  it('should handle concurrent operations safely', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 20 }),
            value: fc.integer(),
          }),
          { minLength: 5, maxLength: 10 }
        ),
        async (operations) => {
          // Execute all operations concurrently
          await Promise.all(
            operations.map(op => cache.set(op.key, { value: op.value }, 60))
          );

          // Verify all values are correctly stored
          const results = await Promise.all(
            operations.map(op => cache.get<{ value: number }>(op.key))
          );

          results.forEach((result, index) => {
            expect(result).toEqual({ value: operations[index].value });
          });
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Scheme Key Format
   * Scheme keys should always follow the correct format
   * 
   * **Validates: Requirements 7.2**
   */
  it('should generate correctly formatted scheme keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (schemeId) => {
          const key = schemeKey(schemeId);
          expect(key).toMatch(/^scheme:.+$/);
          expect(key).toBe(`scheme:${schemeId}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Eligibility Key Format
   * Eligibility keys should always follow the correct format
   * 
   * **Validates: Requirements 7.2**
   */
  it('should generate correctly formatted eligibility keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (userId, schemeId) => {
          const key = eligibilityKey(userId, schemeId);
          expect(key).toMatch(/^eligibility:.+:.+$/);
          expect(key).toBe(`eligibility:${userId}:${schemeId}`);
        }
      ),
      { numRuns: 100 }
    );
  });
});
