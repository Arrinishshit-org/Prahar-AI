/**
 * Test fixtures and mock data generators
 */

import type {
  UserProfile,
  Scheme,
  EligibilityScore,
  Nudge,
  ConversationSession,
} from '../types';

/**
 * Generate a valid user profile for testing
 */
export function createMockUserProfile(overrides?: Partial<UserProfile>): UserProfile {
  const baseProfile: UserProfile = {
    userId: 'test-user-' + Math.random().toString(36).substring(7),
    email: `test${Math.random().toString(36).substring(7)}@example.com`,
    passwordHash: '$2b$10$test.hash.value',
    emailVerified: true,
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: new Date('1990-01-01'),
    age: 34,
    gender: 'male',
    maritalStatus: 'single',
    familySize: 1,
    annualIncome: 500000,
    incomeLevel: 'middle',
    employmentStatus: 'employed',
    occupation: 'Software Engineer',
    occupationCategory: 'IT',
    state: 'Maharashtra',
    district: 'Mumbai',
    pincode: '400001',
    ruralUrban: 'urban',
    educationLevel: 'graduate',
    caste: 'general',
    disability: false,
    userGroups: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    profileCompleteness: 100,
  };

  return { ...baseProfile, ...overrides };
}

/**
 * Generate a valid scheme for testing
 */
export function createMockScheme(overrides?: Partial<Scheme>): Scheme {
  const baseScheme: Scheme = {
    schemeId: 'scheme-' + Math.random().toString(36).substring(7),
    schemeName: 'Test Scheme',
    shortDescription: 'A test scheme for unit testing',
    fullDescription: 'This is a comprehensive test scheme with all required fields',
    category: 'education',
    subCategory: 'scholarship',
    sponsoredBy: 'Ministry of Education',
    eligibility: {
      ageMin: 18,
      ageMax: 35,
      gender: ['male', 'female', 'other'],
      incomeMax: 800000,
      states: ['Maharashtra', 'Karnataka'],
      educationLevels: ['graduate', 'postgraduate'],
    },
    benefits: [
      {
        type: 'financial',
        amount: 50000,
        description: 'Annual scholarship of ₹50,000',
        duration: '1 year',
      },
    ],
    applicationProcess: {
      steps: ['Register online', 'Upload documents', 'Submit application'],
      requiredDocuments: ['Aadhaar', 'Income Certificate', 'Education Certificate'],
      applicationUrl: 'https://example.com/apply',
      helplineNumber: '1800-123-4567',
      processingTime: '30 days',
    },
    launchDate: new Date('2024-01-01'),
    applicationDeadline: new Date('2024-12-31'),
    isActive: true,
    sourceUrl: 'https://myscheme.gov.in/test-scheme',
    lastUpdated: new Date(),
    viewCount: 0,
    applicationCount: 0,
    eligibilityVector: [],
  };

  return { ...baseScheme, ...overrides };
}

/**
 * Generate a valid eligibility score for testing
 */
export function createMockEligibilityScore(
  overrides?: Partial<EligibilityScore>
): EligibilityScore {
  const baseScore: EligibilityScore = {
    scoreId: 'score-' + Math.random().toString(36).substring(7),
    userId: 'test-user-123',
    schemeId: 'test-scheme-123',
    rawScore: 0.85,
    percentage: 85,
    category: 'highly_eligible',
    metCriteria: [
      {
        criterionName: 'age',
        weight: 0.2,
        contribution: 0.2,
      },
      {
        criterionName: 'income',
        weight: 0.3,
        contribution: 0.3,
      },
    ],
    unmetCriteria: [],
    calculatedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    version: '1.0',
  };

  return { ...baseScore, ...overrides };
}

/**
 * Generate a valid nudge for testing
 */
export function createMockNudge(overrides?: Partial<Nudge>): Nudge {
  const baseNudge: Nudge = {
    nudgeId: 'nudge-' + Math.random().toString(36).substring(7),
    userId: 'test-user-123',
    type: 'new_scheme',
    schemeId: 'test-scheme-123',
    title: 'New Scheme Available',
    message: 'A new scheme matching your profile is now available',
    actionUrl: '/schemes/test-scheme-123',
    priority: 'high',
    eligibilityScore: 85,
    channels: ['in_app', 'email'],
    deliveryStatus: [],
    viewed: false,
    clicked: false,
    dismissed: false,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  return { ...baseNudge, ...overrides };
}

/**
 * Generate a valid conversation session for testing
 */
export function createMockConversationSession(
  overrides?: Partial<ConversationSession>
): ConversationSession {
  const baseSession: ConversationSession = {
    sessionId: 'session-' + Math.random().toString(36).substring(7),
    userId: 'test-user-123',
    messages: [],
    toolExecutions: [],
    extractedEntities: [],
    createdAt: new Date(),
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    isActive: true,
  };

  return { ...baseSession, ...overrides };
}

/**
 * Sleep utility for testing async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock Redis client for testing
 */
export function createMockRedisClient() {
  const store = new Map<string, { value: string; expiry?: number }>();

  return {
    get: jest.fn(async (key: string) => {
      const item = store.get(key);
      if (!item) return null;
      if (item.expiry && Date.now() > item.expiry) {
        store.delete(key);
        return null;
      }
      return item.value;
    }),
    set: jest.fn(async (key: string, value: string, options?: any) => {
      const expiry = options?.EX ? Date.now() + options.EX * 1000 : undefined;
      store.set(key, { value, expiry });
      return 'OK';
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key);
      return 1;
    }),
    flushAll: jest.fn(async () => {
      store.clear();
      return 'OK';
    }),
    quit: jest.fn(async () => 'OK'),
  };
}

/**
 * Mock Neo4j session for testing
 */
export function createMockNeo4jSession() {
  return {
    run: jest.fn(async () => ({
      records: [],
      summary: {},
    })),
    close: jest.fn(async () => {}),
  };
}

/**
 * Mock Neo4j driver for testing
 */
export function createMockNeo4jDriver() {
  return {
    session: jest.fn(() => createMockNeo4jSession()),
    close: jest.fn(async () => {}),
  };
}
