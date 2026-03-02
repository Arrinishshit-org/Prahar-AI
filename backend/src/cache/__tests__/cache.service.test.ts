import { CacheService } from '../cache.service';
import {
  schemeKey,
  recommendationsKey,
  eligibilityKey,
  CacheTTL,
  CachePatterns,
} from '../cache-keys';

describe('CacheService', () => {
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

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      const key = 'test:key';
      const value = { data: 'test value' };

      await cache.set(key, value, 60);
      const result = await cache.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await cache.get('non:existent');
      expect(result).toBeNull();
    });

    it('should delete a value', async () => {
      const key = 'test:delete';
      await cache.set(key, { data: 'value' }, 60);

      await cache.delete(key);
      const result = await cache.get(key);

      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      const key = 'test:exists';
      await cache.set(key, { data: 'value' }, 60);

      const exists = await cache.exists(key);
      expect(exists).toBe(true);

      await cache.delete(key);
      const notExists = await cache.exists(key);
      expect(notExists).toBe(false);
    });

    it('should get TTL for a key', async () => {
      const key = 'test:ttl';
      const ttl = 120;
      await cache.set(key, { data: 'value' }, ttl);

      const remainingTtl = await cache.ttl(key);
      expect(remainingTtl).toBeGreaterThan(0);
      expect(remainingTtl).toBeLessThanOrEqual(ttl);
    });
  });

  describe('Multi-Level Caching', () => {
    it('should serve from L1 cache on second access', async () => {
      const key = 'test:l1';
      const value = { data: 'test' };

      await cache.set(key, value, 60);

      // First access - from L2
      await cache.get(key);

      // Second access - should be from L1
      const result = await cache.get(key);
      expect(result).toEqual(value);

      const stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    it('should handle L1 cache eviction', async () => {
      // This test would require setting many keys to trigger eviction
      // For now, we'll just verify the basic functionality
      const keys = Array.from({ length: 10 }, (_, i) => `test:evict:${i}`);

      for (const key of keys) {
        await cache.set(key, { data: key }, 60);
      }

      // All keys should still be accessible from L2
      for (const key of keys) {
        const result = await cache.get(key);
        expect(result).toEqual({ data: key });
      }
    });
  });

  describe('Pattern-Based Operations', () => {
    it('should delete keys matching a pattern', async () => {
      await cache.set('user:123:data', { id: 123 }, 60);
      await cache.set('user:123:profile', { name: 'Test' }, 60);
      await cache.set('user:456:data', { id: 456 }, 60);

      const deleted = await cache.deletePattern('user:123:*');
      expect(deleted).toBeGreaterThanOrEqual(2);

      const result1 = await cache.get('user:123:data');
      const result2 = await cache.get('user:123:profile');
      const result3 = await cache.get('user:456:data');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toEqual({ id: 456 });
    });

    it('should delete user-specific recommendations', async () => {
      const userId = 'user-123';
      await cache.set(recommendationsKey(userId), [{ id: 1 }], 60);
      await cache.set(recommendationsKey(userId, { category: 'health' }), [{ id: 2 }], 60);

      await cache.deletePattern(CachePatterns.USER_RECOMMENDATIONS(userId));

      const result1 = await cache.get(recommendationsKey(userId));
      const result2 = await cache.get(recommendationsKey(userId, { category: 'health' }));

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('Cache Key Helpers', () => {
    it('should generate correct scheme key', () => {
      const key = schemeKey('scheme-123');
      expect(key).toBe('scheme:scheme-123');
    });

    it('should generate correct recommendations key', () => {
      const key = recommendationsKey('user-123');
      expect(key).toBe('recommendations:user-123');
    });

    it('should generate correct eligibility key', () => {
      const key = eligibilityKey('user-123', 'scheme-456');
      expect(key).toBe('eligibility:user-123:scheme-456');
    });

    it('should generate consistent keys for same filters', () => {
      const key1 = recommendationsKey('user-123', { category: 'health', state: 'CA' });
      const key2 = recommendationsKey('user-123', { state: 'CA', category: 'health' });
      expect(key1).toBe(key2);
    });
  });

  describe('TTL Policies', () => {
    it('should use correct TTL for scheme details', async () => {
      const key = schemeKey('scheme-123');
      await cache.set(key, { name: 'Test Scheme' }, CacheTTL.SCHEME_DETAILS);

      const ttl = await cache.ttl(key);
      // -1 means no expiry
      expect(ttl).toBe(-1);
    });

    it('should use correct TTL for recommendations', async () => {
      const key = recommendationsKey('user-123');
      await cache.set(key, [{ id: 1 }], CacheTTL.RECOMMENDATIONS);

      const ttl = await cache.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(CacheTTL.RECOMMENDATIONS);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      const key = 'test:stats';

      // Miss
      await cache.get(key);

      // Set and hit
      await cache.set(key, { data: 'value' }, 60);
      await cache.get(key);

      const stats = cache.getStats();
      expect(stats.misses).toBeGreaterThan(0);
      expect(stats.hits).toBeGreaterThan(0);
    });

    it('should calculate hit rate correctly', async () => {
      const key = 'test:hitrate';

      await cache.set(key, { data: 'value' }, 60);

      // 3 hits
      await cache.get(key);
      await cache.get(key);
      await cache.get(key);

      // 1 miss
      await cache.get('non:existent');

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(0.75, 2); // 3 hits / 4 total
    });

    it('should reset statistics', async () => {
      await cache.get('test:key');
      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle serialization of complex objects', async () => {
      const key = 'test:complex';
      const value = {
        id: 123,
        nested: {
          array: [1, 2, 3],
          date: new Date().toISOString(),
        },
        nullValue: null,
        boolValue: true,
      };

      await cache.set(key, value, 60);
      const result = await cache.get(key);

      expect(result).toEqual(value);
    });

    it('should handle empty objects', async () => {
      const key = 'test:empty';
      const value = {};

      await cache.set(key, value, 60);
      const result = await cache.get(key);

      expect(result).toEqual(value);
    });

    it('should handle arrays', async () => {
      const key = 'test:array';
      const value = [1, 2, 3, { id: 4 }];

      await cache.set(key, value, 60);
      const result = await cache.get(key);

      expect(result).toEqual(value);
    });
  });

  describe('Cache Invalidation Scenarios', () => {
    it('should invalidate user cache on profile update', async () => {
      const userId = 'user-123';

      // Set user-related cache
      await cache.set(recommendationsKey(userId), [{ id: 1 }], 60);
      await cache.set(eligibilityKey(userId, 'scheme-1'), { score: 85 }, 60);
      await cache.set(eligibilityKey(userId, 'scheme-2'), { score: 90 }, 60);

      // Simulate profile update - invalidate caches
      await cache.deletePattern(CachePatterns.USER_RECOMMENDATIONS(userId));
      await cache.deletePattern(CachePatterns.USER_ELIGIBILITY(userId));

      // Verify caches are cleared
      const recs = await cache.get(recommendationsKey(userId));
      const elig1 = await cache.get(eligibilityKey(userId, 'scheme-1'));
      const elig2 = await cache.get(eligibilityKey(userId, 'scheme-2'));

      expect(recs).toBeNull();
      expect(elig1).toBeNull();
      expect(elig2).toBeNull();
    });

    it('should invalidate scheme cache on scheme update', async () => {
      const schemeId = 'scheme-123';

      await cache.set(schemeKey(schemeId), { name: 'Old Name' }, CacheTTL.SCHEME_DETAILS);

      // Simulate scheme update
      await cache.delete(schemeKey(schemeId));

      const result = await cache.get(schemeKey(schemeId));
      expect(result).toBeNull();
    });
  });
});
