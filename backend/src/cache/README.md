# Cache Service

Multi-level caching implementation with in-memory L1 cache and Redis L2 cache for the Personalized Scheme Recommendation System.

## Architecture

### Two-Level Caching Strategy

1. **L1 Cache (In-Memory)**
   - Fast access for hot data
   - Limited size (1000 entries max)
   - Short TTL (max 5 minutes)
   - LRU eviction policy

2. **L2 Cache (Redis)**
   - Distributed caching across instances
   - Larger capacity
   - Configurable TTL per data type
   - Persistent across restarts

### Cache Flow

```
Request → L1 Cache (hit) → Return data
       ↓
       L1 Cache (miss) → L2 Cache (hit) → Populate L1 → Return data
                      ↓
                      L2 Cache (miss) → Fetch from source → Cache in L1 & L2 → Return data
```

## Usage

### Initialize Cache Service

```typescript
import { getCacheService } from './cache';

const cache = getCacheService();
await cache.initialize();
```

### Basic Operations

```typescript
// Set value with TTL
await cache.set('key', { data: 'value' }, 3600); // 1 hour

// Get value
const value = await cache.get<MyType>('key');

// Delete value
await cache.delete('key');

// Check existence
const exists = await cache.exists('key');

// Get TTL
const ttl = await cache.ttl('key');
```

### Using Cache Keys

```typescript
import { schemeKey, recommendationsKey, CacheTTL } from './cache';

// Cache scheme details
const key = schemeKey('scheme-123');
await cache.set(key, schemeData, CacheTTL.SCHEME_DETAILS);

// Cache user recommendations
const recKey = recommendationsKey('user-456');
await cache.set(recKey, recommendations, CacheTTL.RECOMMENDATIONS);
```

### Pattern-Based Operations

```typescript
import { CachePatterns } from './cache';

// Delete all user recommendations
await cache.deletePattern(CachePatterns.USER_RECOMMENDATIONS('user-123'));

// Delete all eligibility scores for a user
await cache.deletePattern(CachePatterns.USER_ELIGIBILITY('user-123'));
```

### Cache Statistics

```typescript
const stats = cache.getStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`Hits: ${stats.hits}, Misses: ${stats.misses}`);

// Reset statistics
cache.resetStats();
```

## Cache Key Naming Conventions

| Data Type | Key Pattern | TTL | Example |
|-----------|-------------|-----|---------|
| Scheme list | `schemes:{hash}` | 24h | `schemes:a1b2c3d4` |
| Scheme details | `scheme:{id}` | Indefinite | `scheme:PM-KISAN-2024` |
| Recommendations | `recommendations:{userId}` | 24h | `recommendations:user-123` |
| Eligibility | `eligibility:{userId}:{schemeId}` | 24h | `eligibility:user-123:scheme-456` |
| User groups | `user_groups:{userId}` | Indefinite | `user_groups:user-123` |
| Classification | `classification:{userId}` | Indefinite | `classification:user-123` |
| Session | `session:{sessionId}` | 15m | `session:sess-abc123` |
| API response | `api:{endpoint}:{hash}` | 1h | `api:schemes:search:a1b2c3d4` |

## TTL Policies

Different data types have different TTL policies based on their characteristics:

- **Scheme Details**: Indefinite (schemes rarely change)
- **Scheme Lists**: 24 hours (may have new schemes)
- **Recommendations**: 24 hours (based on user profile)
- **Eligibility Scores**: 24 hours (based on user profile)
- **User Groups**: Indefinite (invalidated on profile update)
- **Sessions**: 15 minutes (short-lived)
- **API Responses**: 1 hour (external data)

## Cache Invalidation

### On User Profile Update

```typescript
import { CachePatterns } from './cache';

async function onProfileUpdate(userId: string) {
  // Invalidate user-specific cached data
  await cache.deletePattern(CachePatterns.USER_RECOMMENDATIONS(userId));
  await cache.deletePattern(CachePatterns.USER_ELIGIBILITY(userId));
  await cache.delete(userGroupsKey(userId));
  await cache.delete(classificationKey(userId));
}
```

### On Scheme Update

```typescript
async function onSchemeUpdate(schemeId: string) {
  // Invalidate scheme cache
  await cache.delete(schemeKey(schemeId));
  
  // Invalidate scheme lists
  await cache.deletePattern('schemes:*');
  
  // Invalidate all recommendations (they may include this scheme)
  await cache.deletePattern(CachePatterns.ALL_RECOMMENDATIONS);
}
```

## Configuration

Environment variables for Redis configuration:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# TTL values (in seconds)
CACHE_TTL_SCHEMES=86400
CACHE_TTL_RECOMMENDATIONS=86400
CACHE_TTL_ELIGIBILITY=86400
```

## Docker Setup

### Using Docker Compose

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

### Using Docker CLI

```bash
# Run Redis container
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine redis-server --appendonly yes

# Check Redis status
docker exec -it redis redis-cli ping
```

## Local Installation

### Install Redis

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Windows:**
Download from https://github.com/microsoftarchive/redis/releases

### Verify Installation

```bash
redis-cli ping
# Should return: PONG
```

## Monitoring

### Redis CLI Commands

```bash
# Connect to Redis
redis-cli

# Check memory usage
INFO memory

# Get all keys (use with caution in production)
KEYS *

# Get key count
DBSIZE

# Monitor commands in real-time
MONITOR

# Get cache hit/miss stats
INFO stats
```

### Application Metrics

```typescript
// Get cache statistics
const stats = cache.getStats();
console.log('Cache Statistics:', {
  hits: stats.hits,
  misses: stats.misses,
  hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
});
```

## Best Practices

1. **Always use cache key helpers** - Use functions from `cache-keys.ts` for consistent naming
2. **Set appropriate TTLs** - Use `CacheTTL` constants for standard data types
3. **Invalidate on updates** - Clear related cache entries when data changes
4. **Monitor hit rates** - Track cache effectiveness with statistics
5. **Handle cache failures gracefully** - Always have fallback to source data
6. **Use pattern deletion carefully** - Pattern matching can be expensive

## Error Handling

The cache service handles errors gracefully:

- Redis connection failures: Operations return null/false
- Serialization errors: Logged and thrown
- Network timeouts: Automatic retry with exponential backoff

Always wrap cache operations in try-catch blocks:

```typescript
try {
  const data = await cache.get('key');
  if (data) {
    return data;
  }
} catch (error) {
  console.error('Cache error:', error);
}

// Fallback to source
return await fetchFromSource();
```

## Testing

See `__tests__/cache.service.test.ts` for comprehensive test examples.

```bash
# Run cache tests
npm test -- cache.service.test.ts

# Run with coverage
npm test -- --coverage cache.service.test.ts
```
