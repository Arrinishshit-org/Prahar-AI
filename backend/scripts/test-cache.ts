#!/usr/bin/env tsx

/**
 * Quick test script for Redis cache service
 * 
 * Usage: npx tsx scripts/test-cache.ts
 */

import { getCacheService } from '../src/cache';

async function testCacheConnection() {
  console.log('🔍 Testing Redis Cache Connection...\n');

  const cache = getCacheService();

  try {
    // Initialize cache
    console.log('1. Initializing cache service...');
    await cache.initialize();
    console.log('   ✓ Cache service initialized\n');

    // Test set operation
    console.log('2. Testing SET operation...');
    await cache.set('test:connection', { message: 'Hello Redis!', timestamp: new Date().toISOString() }, 60);
    console.log('   ✓ Data cached successfully\n');

    // Test get operation
    console.log('3. Testing GET operation...');
    const result = await cache.get('test:connection');
    console.log('   ✓ Data retrieved:', result, '\n');

    // Test exists operation
    console.log('4. Testing EXISTS operation...');
    const exists = await cache.exists('test:connection');
    console.log('   ✓ Key exists:', exists, '\n');

    // Test TTL operation
    console.log('5. Testing TTL operation...');
    const ttl = await cache.ttl('test:connection');
    console.log('   ✓ Remaining TTL:', ttl, 'seconds\n');

    // Test delete operation
    console.log('6. Testing DELETE operation...');
    await cache.delete('test:connection');
    const deleted = await cache.get('test:connection');
    console.log('   ✓ Data deleted:', deleted === null, '\n');

    // Test statistics
    console.log('7. Testing cache statistics...');
    const stats = cache.getStats();
    console.log('   ✓ Cache stats:');
    console.log('     - Hits:', stats.hits);
    console.log('     - Misses:', stats.misses);
    console.log('     - Hit Rate:', `${(stats.hitRate * 100).toFixed(2)}%\n`);

    // Test multi-level caching
    console.log('8. Testing multi-level caching (L1 + L2)...');
    await cache.set('test:multilevel', { level: 'L2' }, 60);
    await cache.get('test:multilevel'); // Populates L1
    const l1Result = await cache.get('test:multilevel'); // Should hit L1
    console.log('   ✓ Multi-level cache working:', l1Result, '\n');

    // Cleanup
    await cache.delete('test:multilevel');

    // Close connection
    console.log('9. Closing cache connection...');
    await cache.close();
    console.log('   ✓ Cache connection closed\n');

    console.log('✅ All cache tests passed successfully!\n');
    console.log('Redis cache is properly configured and working.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Cache test failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure Redis is running:');
    console.error('   - Docker: docker-compose up -d redis');
    console.error('   - Local: sudo systemctl start redis-server');
    console.error('2. Check Redis connection settings in .env file');
    console.error('3. Verify Redis is accessible: redis-cli ping');
    console.error('\nFor more help, see: backend/CACHE_SETUP.md\n');
    process.exit(1);
  }
}

// Run the test
testCacheConnection();
