export { CacheService, getCacheService } from './cache.service';
export { RedisConnection } from './redis.config';
export {
  CacheTTL,
  CachePatterns,
  schemesKey,
  schemeKey,
  recommendationsKey,
  eligibilityKey,
  userGroupsKey,
  classificationKey,
  sessionKey,
  apiResponseKey,
  popularSchemesKey,
  trendingSchemesKey,
  schemeCategoriesKey,
  userProfileKey,
  userNudgesKey,
  getTTLForKey,
} from './cache-keys';

export type { CacheOptions, CacheStats } from './cache.service';
export type { RedisConfig } from './redis.config';
