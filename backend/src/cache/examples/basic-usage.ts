/**
 * Basic Cache Service Usage Examples
 * 
 * This file demonstrates common cache service patterns
 */

import {
  getCacheService,
  schemeKey,
  recommendationsKey,
  eligibilityKey,
  CacheTTL,
  CachePatterns,
} from '../index';

// Example 1: Caching Scheme Data
async function cacheSchemeExample() {
  const cache = getCacheService();
  await cache.initialize();

  const schemeId = 'PM-KISAN-2024';
  const schemeData = {
    schemeId,
    schemeName: 'PM-KISAN',
    description: 'Income support for farmers',
    benefits: { amount: 6000, frequency: 'annual' },
  };

  // Cache scheme details (indefinite TTL)
  const key = schemeKey(schemeId);
  await cache.set(key, schemeData, CacheTTL.SCHEME_DETAILS);

  // Retrieve from cache
  const cached = await cache.get(key);
  console.log('Cached scheme:', cached);
}

// Example 2: Caching User Recommendations
async function cacheRecommendationsExample() {
  const cache = getCacheService();
  await cache.initialize();

  const userId = 'user-123';
  const recommendations = [
    { schemeId: 'scheme-1', relevanceScore: 0.95 },
    { schemeId: 'scheme-2', relevanceScore: 0.87 },
    { schemeId: 'scheme-3', relevanceScore: 0.82 },
  ];

  // Cache recommendations (24 hour TTL)
  const key = recommendationsKey(userId);
  await cache.set(key, recommendations, CacheTTL.RECOMMENDATIONS);

  // Retrieve from cache
  const cached = await cache.get(key);
  console.log('Cached recommendations:', cached);
}

// Example 3: Caching Eligibility Scores
async function cacheEligibilityExample() {
  const cache = getCacheService();
  await cache.initialize();

  const userId = 'user-123';
  const schemeId = 'scheme-456';
  const eligibilityData = {
    score: 0.85,
    percentage: 85,
    category: 'highly_eligible',
    metCriteria: ['age', 'income', 'location'],
    unmetCriteria: [],
  };

  // Cache eligibility score (24 hour TTL)
  const key = eligibilityKey(userId, schemeId);
  await cache.set(key, eligibilityData, CacheTTL.ELIGIBILITY);

  // Retrieve from cache
  const cached = await cache.get(key);
  console.log('Cached eligibility:', cached);
}

// Example 4: Cache Invalidation on Profile Update
async function profileUpdateExample() {
  const cache = getCacheService();
  await cache.initialize();

  const userId = 'user-123';

  // Simulate profile update - invalidate related caches
  console.log('User profile updated, invalidating caches...');

  // Delete user recommendations
  await cache.deletePattern(CachePatterns.USER_RECOMMENDATIONS(userId));

  // Delete user eligibility scores
  await cache.deletePattern(CachePatterns.USER_ELIGIBILITY(userId));

  // Delete user groups
  await cache.delete(`user_groups:${userId}`);

  console.log('Cache invalidation complete');
}

// Example 5: Fetching with Cache Fallback
async function fetchWithCacheExample() {
  const cache = getCacheService();
  await cache.initialize();

  const schemeId = 'scheme-789';

  // Try to get from cache first
  const key = schemeKey(schemeId);
  let scheme = await cache.get(key);

  if (scheme) {
    console.log('Cache hit! Returning cached data');
    return scheme;
  }

  console.log('Cache miss! Fetching from API');

  // Simulate API call
  scheme = await fetchSchemeFromAPI(schemeId);

  // Cache the result
  await cache.set(key, scheme, CacheTTL.SCHEME_DETAILS);

  return scheme;
}

// Mock API function
async function fetchSchemeFromAPI(schemeId: string) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    schemeId,
    schemeName: 'Example Scheme',
    description: 'Fetched from API',
  };
}

// Example 6: Batch Operations
async function batchOperationsExample() {
  const cache = getCacheService();
  await cache.initialize();

  const userId = 'user-123';
  const schemeIds = ['scheme-1', 'scheme-2', 'scheme-3'];

  // Cache multiple eligibility scores
  const eligibilityPromises = schemeIds.map(schemeId => {
    const key = eligibilityKey(userId, schemeId);
    const data = { score: Math.random(), schemeId };
    return cache.set(key, data, CacheTTL.ELIGIBILITY);
  });

  await Promise.all(eligibilityPromises);
  console.log('Cached eligibility scores for', schemeIds.length, 'schemes');

  // Retrieve all eligibility scores
  const retrievePromises = schemeIds.map(schemeId => {
    const key = eligibilityKey(userId, schemeId);
    return cache.get(key);
  });

  const results = await Promise.all(retrievePromises);
  console.log('Retrieved eligibility scores:', results);
}

// Example 7: Cache Statistics
async function cacheStatsExample() {
  const cache = getCacheService();
  await cache.initialize();

  // Perform some operations
  await cache.set('key1', { data: 'value1' }, 60);
  await cache.get('key1'); // Hit
  await cache.get('key2'); // Miss
  await cache.get('key1'); // Hit

  // Get statistics
  const stats = cache.getStats();
  console.log('Cache Statistics:');
  console.log('  Hits:', stats.hits);
  console.log('  Misses:', stats.misses);
  console.log('  Hit Rate:', `${(stats.hitRate * 100).toFixed(2)}%`);

  // Reset statistics
  cache.resetStats();
  console.log('Statistics reset');
}

// Example 8: TTL Management
async function ttlManagementExample() {
  const cache = getCacheService();
  await cache.initialize();

  const key = 'test:ttl';

  // Set with 60 second TTL
  await cache.set(key, { data: 'value' }, 60);

  // Check remaining TTL
  const ttl = await cache.ttl(key);
  console.log('Remaining TTL:', ttl, 'seconds');

  // Check if key exists
  const exists = await cache.exists(key);
  console.log('Key exists:', exists);

  // Wait for expiration (in real code, you wouldn't do this)
  // await new Promise(resolve => setTimeout(resolve, 61000));
  // const expired = await cache.exists(key);
  // console.log('Key exists after expiration:', expired);
}

// Example 9: Error Handling
async function errorHandlingExample() {
  const cache = getCacheService();
  await cache.initialize();

  try {
    // Try to get data from cache
    const data = await cache.get('some:key');

    if (data) {
      console.log('Using cached data');
      return data;
    }

    // Fetch from source
    const freshData = await fetchFromSource();

    // Try to cache it
    try {
      await cache.set('some:key', freshData, 3600);
    } catch (cacheError) {
      // Log but don't fail - caching is not critical
      console.error('Failed to cache data:', cacheError);
    }

    return freshData;
  } catch (error) {
    console.error('Error in cache operation:', error);
    // Fallback to source without cache
    return await fetchFromSource();
  }
}

async function fetchFromSource() {
  return { data: 'from source' };
}

// Example 10: Complete Workflow
async function completeWorkflowExample() {
  const cache = getCacheService();

  try {
    // Initialize cache
    await cache.initialize();
    console.log('✓ Cache initialized');

    // Cache some data
    await cache.set('workflow:step1', { status: 'complete' }, 300);
    console.log('✓ Data cached');

    // Retrieve data
    const data = await cache.get('workflow:step1');
    console.log('✓ Data retrieved:', data);

    // Get statistics
    const stats = cache.getStats();
    console.log('✓ Cache stats:', stats);

    // Cleanup
    await cache.delete('workflow:step1');
    console.log('✓ Data cleaned up');

    // Close connection
    await cache.close();
    console.log('✓ Cache closed');
  } catch (error) {
    console.error('✗ Workflow failed:', error);
    throw error;
  }
}

// Run examples
if (require.main === module) {
  (async () => {
    console.log('=== Cache Service Examples ===\n');

    try {
      console.log('1. Caching Scheme Data');
      await cacheSchemeExample();
      console.log();

      console.log('2. Caching Recommendations');
      await cacheRecommendationsExample();
      console.log();

      console.log('3. Caching Eligibility Scores');
      await cacheEligibilityExample();
      console.log();

      console.log('4. Cache Statistics');
      await cacheStatsExample();
      console.log();

      console.log('5. Complete Workflow');
      await completeWorkflowExample();
      console.log();

      console.log('=== All examples completed successfully ===');
    } catch (error) {
      console.error('Example failed:', error);
      process.exit(1);
    }
  })();
}

export {
  cacheSchemeExample,
  cacheRecommendationsExample,
  cacheEligibilityExample,
  profileUpdateExample,
  fetchWithCacheExample,
  batchOperationsExample,
  cacheStatsExample,
  ttlManagementExample,
  errorHandlingExample,
  completeWorkflowExample,
};
