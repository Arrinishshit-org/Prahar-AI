import crypto from 'crypto';

/**
 * Cache key naming conventions and TTL policies
 */

// TTL values in seconds
export const CacheTTL = {
  // Scheme data - 24 hours (rarely changes)
  SCHEMES: 86400,
  SCHEME_DETAILS: -1, // Indefinite (schemes rarely change)
  SCHEME_CATEGORIES: 86400,

  // User recommendations - 24 hours
  RECOMMENDATIONS: 86400,

  // Eligibility scores - 24 hours
  ELIGIBILITY: 86400,

  // User classification - until profile update
  USER_GROUPS: -1,
  CLASSIFICATION: -1,

  // Session data - 15 minutes
  SESSION: 900,

  // API responses - 1 hour
  API_RESPONSE: 3600,

  // Popular/trending data - 1 hour
  POPULAR_SCHEMES: 3600,
  TRENDING_SCHEMES: 3600,
} as const;

/**
 * Generate cache key for scheme list with filters
 */
export const schemesKey = (filters?: Record<string, any>): string => {
  if (!filters || Object.keys(filters).length === 0) {
    return 'schemes:all';
  }
  const hash = hashObject(filters);
  return `schemes:${hash}`;
};

/**
 * Generate cache key for individual scheme
 */
export const schemeKey = (schemeId: string): string => {
  return `scheme:${schemeId}`;
};

/**
 * Generate cache key for user recommendations
 */
export const recommendationsKey = (userId: string, filters?: Record<string, any>): string => {
  if (!filters || Object.keys(filters).length === 0) {
    return `recommendations:${userId}`;
  }
  const hash = hashObject(filters);
  return `recommendations:${userId}:${hash}`;
};

/**
 * Generate cache key for eligibility score
 */
export const eligibilityKey = (userId: string, schemeId: string): string => {
  return `eligibility:${userId}:${schemeId}`;
};

/**
 * Generate cache key for user groups
 */
export const userGroupsKey = (userId: string): string => {
  return `user_groups:${userId}`;
};

/**
 * Generate cache key for user classification
 */
export const classificationKey = (userId: string): string => {
  return `classification:${userId}`;
};

/**
 * Generate cache key for session data
 */
export const sessionKey = (sessionId: string): string => {
  return `session:${sessionId}`;
};

/**
 * Generate cache key for API response
 */
export const apiResponseKey = (endpoint: string, params?: Record<string, any>): string => {
  if (!params || Object.keys(params).length === 0) {
    return `api:${endpoint}`;
  }
  const hash = hashObject(params);
  return `api:${endpoint}:${hash}`;
};

/**
 * Generate cache key for popular schemes
 */
export const popularSchemesKey = (limit: number = 10): string => {
  return `popular_schemes:${limit}`;
};

/**
 * Generate cache key for trending schemes
 */
export const trendingSchemesKey = (limit: number = 10): string => {
  return `trending_schemes:${limit}`;
};

/**
 * Generate cache key for scheme categories
 */
export const schemeCategoriesKey = (): string => {
  return 'scheme_categories:all';
};

/**
 * Generate cache key for user profile
 */
export const userProfileKey = (userId: string): string => {
  return `user_profile:${userId}`;
};

/**
 * Generate cache key for nudges
 */
export const userNudgesKey = (userId: string, status?: string): string => {
  if (status) {
    return `nudges:${userId}:${status}`;
  }
  return `nudges:${userId}:all`;
};

/**
 * Cache key patterns for bulk operations
 */
export const CachePatterns = {
  // All user-specific data
  USER_DATA: (userId: string) => `*:${userId}*`,

  // All recommendations
  ALL_RECOMMENDATIONS: 'recommendations:*',

  // All eligibility scores
  ALL_ELIGIBILITY: 'eligibility:*',

  // All schemes
  ALL_SCHEMES: 'scheme*',

  // All sessions
  ALL_SESSIONS: 'session:*',

  // All API responses
  ALL_API_RESPONSES: 'api:*',

  // User-specific recommendations
  USER_RECOMMENDATIONS: (userId: string) => `recommendations:${userId}*`,

  // User-specific eligibility
  USER_ELIGIBILITY: (userId: string) => `eligibility:${userId}:*`,

  // User-specific nudges
  USER_NUDGES: (userId: string) => `nudges:${userId}*`,
} as const;

/**
 * Helper function to hash objects for consistent cache keys
 */
function hashObject(obj: Record<string, any>): string {
  // Sort keys for consistent hashing
  const sorted = Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {} as Record<string, any>);

  const str = JSON.stringify(sorted);
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

/**
 * Get TTL for a specific cache key type
 */
export const getTTLForKey = (key: string): number => {
  if (key.startsWith('scheme:')) return CacheTTL.SCHEME_DETAILS;
  if (key.startsWith('schemes:')) return CacheTTL.SCHEMES;
  if (key.startsWith('recommendations:')) return CacheTTL.RECOMMENDATIONS;
  if (key.startsWith('eligibility:')) return CacheTTL.ELIGIBILITY;
  if (key.startsWith('user_groups:')) return CacheTTL.USER_GROUPS;
  if (key.startsWith('classification:')) return CacheTTL.CLASSIFICATION;
  if (key.startsWith('session:')) return CacheTTL.SESSION;
  if (key.startsWith('api:')) return CacheTTL.API_RESPONSE;
  if (key.startsWith('popular_schemes:')) return CacheTTL.POPULAR_SCHEMES;
  if (key.startsWith('trending_schemes:')) return CacheTTL.TRENDING_SCHEMES;
  if (key.startsWith('scheme_categories:')) return CacheTTL.SCHEME_CATEGORIES;

  // Default TTL
  return 3600; // 1 hour
};
