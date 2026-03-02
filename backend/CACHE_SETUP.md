# Redis Cache Setup Guide

This guide explains how to set up Redis for the Personalized Scheme Recommendation System.

## Prerequisites

- Docker and Docker Compose (recommended) OR
- Redis installed locally

## Option 1: Using Docker Compose (Recommended)

### Start Redis

The project includes a `docker-compose.yml` file with Redis pre-configured.

```bash
# Start Redis (and Neo4j)
docker-compose up -d redis

# Verify Redis is running
docker-compose ps

# Check Redis logs
docker-compose logs redis

# Test Redis connection
docker exec -it scheme-recommender-redis redis-cli ping
# Should return: PONG
```

### Stop Redis

```bash
# Stop Redis
docker-compose stop redis

# Stop and remove containers
docker-compose down

# Stop and remove containers with volumes (clears all data)
docker-compose down -v
```

## Option 2: Using Docker CLI

```bash
# Run Redis container
docker run -d \
  --name scheme-recommender-redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7.2-alpine redis-server --appendonly yes

# Verify Redis is running
docker ps | grep redis

# Test connection
docker exec -it scheme-recommender-redis redis-cli ping
# Should return: PONG

# Stop Redis
docker stop scheme-recommender-redis

# Remove container
docker rm scheme-recommender-redis
```

## Option 3: Local Installation

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server

# Enable Redis to start on boot
sudo systemctl enable redis-server

# Check status
sudo systemctl status redis-server

# Test connection
redis-cli ping
# Should return: PONG
```

### macOS

```bash
# Install Redis using Homebrew
brew install redis

# Start Redis
brew services start redis

# Test connection
redis-cli ping
# Should return: PONG

# Stop Redis
brew services stop redis
```

### Windows

1. Download Redis from: https://github.com/microsoftarchive/redis/releases
2. Extract and run `redis-server.exe`
3. Test connection: `redis-cli.exe ping`

## Configuration

### Environment Variables

Update your `.env` file in the `backend` directory:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Cache TTL values (in seconds)
CACHE_TTL_SCHEMES=86400          # 24 hours
CACHE_TTL_RECOMMENDATIONS=86400  # 24 hours
CACHE_TTL_ELIGIBILITY=86400      # 24 hours
```

### Docker Compose Configuration

If using Docker Compose, Redis is configured in `docker-compose.yml`:

```yaml
redis:
  image: redis:7.2-alpine
  container_name: scheme-recommender-redis
  ports:
    - "6379:6379"
  command: redis-server --appendonly yes
  volumes:
    - redis_data:/data
  networks:
    - scheme-recommender-network
```

## Verify Setup

### 1. Check Redis Connection

```bash
# Using redis-cli
redis-cli ping

# Or using Docker
docker exec -it scheme-recommender-redis redis-cli ping
```

### 2. Test Cache Service

Create a test file `test-cache.ts`:

```typescript
import { getCacheService } from './src/cache';

async function testCache() {
  const cache = getCacheService();
  
  try {
    await cache.initialize();
    console.log('✓ Cache service initialized');

    // Test set/get
    await cache.set('test:key', { message: 'Hello Redis!' }, 60);
    const result = await cache.get('test:key');
    console.log('✓ Cache set/get works:', result);

    // Test delete
    await cache.delete('test:key');
    const deleted = await cache.get('test:key');
    console.log('✓ Cache delete works:', deleted === null);

    // Get stats
    const stats = cache.getStats();
    console.log('✓ Cache stats:', stats);

    await cache.close();
    console.log('✓ All tests passed!');
  } catch (error) {
    console.error('✗ Cache test failed:', error);
    process.exit(1);
  }
}

testCache();
```

Run the test:

```bash
npx tsx test-cache.ts
```

### 3. Run Unit Tests

```bash
# Run all cache tests
npm test -- cache

# Run with coverage
npm test -- --coverage cache

# Run property-based tests
npm test -- cache.property.test.ts
```

## Monitoring Redis

### Using Redis CLI

```bash
# Connect to Redis
redis-cli

# Or with Docker
docker exec -it scheme-recommender-redis redis-cli

# Common commands:
INFO                    # Server information
INFO memory             # Memory usage
DBSIZE                  # Number of keys
KEYS *                  # List all keys (use with caution in production)
GET key                 # Get value
TTL key                 # Get remaining TTL
MONITOR                 # Monitor commands in real-time (Ctrl+C to exit)
```

### Memory Usage

```bash
# Check memory usage
redis-cli INFO memory | grep used_memory_human

# Or with Docker
docker exec -it scheme-recommender-redis redis-cli INFO memory | grep used_memory_human
```

### Key Statistics

```bash
# Count keys by pattern
redis-cli --scan --pattern 'scheme:*' | wc -l

# Get all keys (use carefully)
redis-cli KEYS '*'
```

## Troubleshooting

### Connection Refused

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solutions:**
1. Check if Redis is running: `docker ps` or `systemctl status redis-server`
2. Verify port 6379 is not in use: `netstat -an | grep 6379`
3. Check firewall settings
4. Verify `REDIS_HOST` and `REDIS_PORT` in `.env`

### Out of Memory

**Problem:** Redis runs out of memory

**Solutions:**
1. Increase Docker memory limit in `docker-compose.yml`
2. Configure Redis maxmemory policy:
   ```bash
   redis-cli CONFIG SET maxmemory 256mb
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```
3. Clear cache: `redis-cli FLUSHDB`

### Slow Performance

**Problem:** Cache operations are slow

**Solutions:**
1. Check Redis memory usage: `redis-cli INFO memory`
2. Monitor slow queries: `redis-cli SLOWLOG GET 10`
3. Verify network latency
4. Check if Redis is swapping: `redis-cli INFO stats | grep swap`

### Data Persistence Issues

**Problem:** Data lost after restart

**Solutions:**
1. Verify AOF is enabled: `redis-cli CONFIG GET appendonly`
2. Check AOF file: `docker exec -it scheme-recommender-redis ls -lh /data`
3. Enable persistence in docker-compose.yml (already configured)

## Production Considerations

### Security

1. **Set a password:**
   ```yaml
   # docker-compose.yml
   redis:
     command: redis-server --appendonly yes --requirepass your_secure_password
   ```

   ```env
   # .env
   REDIS_PASSWORD=your_secure_password
   ```

2. **Bind to localhost only:**
   ```yaml
   redis:
     command: redis-server --appendonly yes --bind 127.0.0.1
   ```

3. **Disable dangerous commands:**
   ```yaml
   redis:
     command: redis-server --appendonly yes --rename-command FLUSHDB "" --rename-command FLUSHALL ""
   ```

### High Availability

For production, consider:

1. **Redis Sentinel** for automatic failover
2. **Redis Cluster** for horizontal scaling
3. **Redis Enterprise** for managed solution

### Backup and Recovery

```bash
# Manual backup
docker exec scheme-recommender-redis redis-cli BGSAVE

# Copy backup file
docker cp scheme-recommender-redis:/data/dump.rdb ./backup/

# Restore from backup
docker cp ./backup/dump.rdb scheme-recommender-redis:/data/
docker restart scheme-recommender-redis
```

### Monitoring

Set up monitoring with:
- Redis Exporter + Prometheus + Grafana
- Redis Insight (GUI tool)
- CloudWatch (AWS)
- Azure Monitor (Azure)

## Next Steps

1. Start Redis using one of the methods above
2. Update `.env` with Redis configuration
3. Run the cache service tests
4. Integrate cache service into your application

For more information, see:
- [Cache Service README](./src/cache/README.md)
- [Redis Documentation](https://redis.io/documentation)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
