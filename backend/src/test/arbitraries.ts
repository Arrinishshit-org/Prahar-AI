/**
 * fast-check arbitraries for property-based testing
 * These generators create random valid test data
 */

import fc from 'fast-check';
import type { UserProfile, Scheme, Nudge } from '../types';

/**
 * Generate random valid user profiles
 */
export function userProfileArbitrary(): fc.Arbitrary<Omit<UserProfile, 'userId' | 'passwordHash' | 'emailVerified' | 'userGroups' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'profileCompleteness'>> {
  return fc
    .record({
      email: fc.emailAddress(),
      firstName: fc.string({ minLength: 2, maxLength: 50 }),
      lastName: fc.string({ minLength: 2, maxLength: 50 }),
      dateOfBirth: fc.date({ min: new Date('1924-01-01'), max: new Date('2006-01-01') }),
      gender: fc.constantFrom<'male' | 'female' | 'other' | 'prefer_not_to_say'>('male', 'female', 'other', 'prefer_not_to_say'),
      maritalStatus: fc.constantFrom<'single' | 'married' | 'divorced' | 'widowed'>('single', 'married', 'divorced', 'widowed'),
      familySize: fc.integer({ min: 1, max: 10 }),
      annualIncome: fc.integer({ min: 0, max: 10000000 }),
      employmentStatus: fc.constantFrom<'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired'>('employed', 'self_employed', 'unemployed', 'student', 'retired'),
      occupation: fc.string({ minLength: 3, maxLength: 50 }),
      occupationCategory: fc.string({ minLength: 2, maxLength: 30 }),
      state: fc.constantFrom(
        'Maharashtra',
        'Karnataka',
        'Tamil Nadu',
        'Delhi',
        'Gujarat',
        'Rajasthan',
        'Uttar Pradesh',
        'West Bengal'
      ),
      district: fc.string({ minLength: 3, maxLength: 50 }),
      pincode: fc.stringMatching(/^[1-9][0-9]{5}$/),
      ruralUrban: fc.constantFrom<'rural' | 'urban' | 'semi_urban'>('rural', 'urban', 'semi_urban'),
      educationLevel: fc.constantFrom<'no_formal' | 'primary' | 'secondary' | 'higher_secondary' | 'graduate' | 'postgraduate'>(
        'no_formal',
        'primary',
        'secondary',
        'higher_secondary',
        'graduate',
        'postgraduate'
      ),
      caste: fc.constantFrom<'general' | 'obc' | 'sc' | 'st' | 'other'>('general', 'obc', 'sc', 'st', 'other'),
      religion: fc.option(fc.constantFrom('Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'), { nil: undefined }),
      disability: fc.boolean(),
      disabilityType: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
    })
    .map((profile) => {
      // Calculate age from date of birth
      const today = new Date();
      const birthDate = new Date(profile.dateOfBirth);
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const adjustedAge =
        monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

      // Determine income level based on annual income
      let incomeLevel: 'below_poverty' | 'low' | 'middle' | 'high';
      if (profile.annualIncome <= 200000) {
        incomeLevel = 'below_poverty';
      } else if (profile.annualIncome <= 500000) {
        incomeLevel = 'low';
      } else if (profile.annualIncome <= 2000000) {
        incomeLevel = 'middle';
      } else {
        incomeLevel = 'high';
      }

      return {
        ...profile,
        age: adjustedAge,
        incomeLevel,
      };
    });
}

/**
 * Generate random valid schemes
 */
export function schemeArbitrary(): fc.Arbitrary<Partial<Scheme>> {
  return fc.record({
    schemeName: fc.string({ minLength: 10, maxLength: 100 }),
    shortDescription: fc.string({ minLength: 20, maxLength: 200 }),
    fullDescription: fc.string({ minLength: 50, maxLength: 1000 }),
    category: fc.constantFrom(
      'education',
      'healthcare',
      'agriculture',
      'employment',
      'housing',
      'social_welfare'
    ),
    subCategory: fc.string({ minLength: 5, maxLength: 50 }),
    sponsoredBy: fc.string({ minLength: 10, maxLength: 100 }),
    eligibility: fc.record({
      ageMin: fc.option(fc.integer({ min: 0, max: 100 })),
      ageMax: fc.option(fc.integer({ min: 0, max: 100 })),
      gender: fc.option(fc.array(fc.constantFrom('male', 'female', 'other'), { minLength: 1, maxLength: 3 })),
      incomeMax: fc.option(fc.integer({ min: 0, max: 10000000 })),
      states: fc.option(fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 1, maxLength: 10 })),
      districts: fc.option(fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 1, maxLength: 10 })),
      ruralUrban: fc.option(fc.array(fc.constantFrom('rural', 'urban', 'semi_urban'), { minLength: 1, maxLength: 3 })),
      occupations: fc.option(fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 1, maxLength: 10 })),
      educationLevels: fc.option(fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 1, maxLength: 6 })),
      castes: fc.option(fc.array(fc.constantFrom('general', 'obc', 'sc', 'st', 'other'), { minLength: 1, maxLength: 5 })),
      disability: fc.option(fc.boolean()),
    }),
    isActive: fc.boolean(),
    launchDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
    applicationDeadline: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })),
  });
}

/**
 * Generate random valid messages
 */
export function messageArbitrary() {
  return fc.record({
    messageId: fc.uuid(),
    role: fc.constantFrom('user', 'agent', 'system'),
    content: fc.string({ minLength: 1, maxLength: 500 }),
    timestamp: fc.date(),
    metadata: fc.option(fc.dictionary(fc.string(), fc.anything())),
  });
}

/**
 * Generate random valid nudges
 */
export function nudgeArbitrary(): fc.Arbitrary<Partial<Nudge>> {
  return fc.record({
    type: fc.constantFrom('new_scheme', 'deadline_reminder', 'profile_update_suggestion'),
    title: fc.string({ minLength: 10, maxLength: 100 }),
    message: fc.string({ minLength: 20, maxLength: 500 }),
    actionUrl: fc.webUrl(),
    priority: fc.constantFrom('high', 'medium', 'low'),
    eligibilityScore: fc.option(fc.integer({ min: 0, max: 100 })),
    channels: fc.array(fc.constantFrom('email', 'sms', 'push', 'in_app'), { minLength: 1, maxLength: 4 }),
  });
}

/**
 * Generate random valid intent classifications
 */
export function intentArbitrary() {
  return fc.constantFrom(
    'scheme_search',
    'eligibility_check',
    'application_info',
    'deadline_query',
    'profile_update',
    'general_question',
    'nudge_preferences'
  );
}

/**
 * Generate random valid entities
 */
export function entityArbitrary() {
  return fc.record({
    type: fc.constantFrom('location', 'income', 'occupation', 'age', 'scheme_name'),
    value: fc.string({ minLength: 1, maxLength: 100 }),
    confidence: fc.double({ min: 0, max: 1 }),
  });
}

/**
 * Generate random valid tool execution results
 */
export function toolResultArbitrary() {
  return fc.record({
    success: fc.boolean(),
    data: fc.option(fc.anything()),
    error: fc.option(
      fc.record({
        code: fc.string({ minLength: 3, maxLength: 50 }),
        message: fc.string({ minLength: 10, maxLength: 200 }),
      })
    ),
    metadata: fc.record({
      executionTime: fc.integer({ min: 0, max: 5000 }),
      cacheHit: fc.boolean(),
      toolVersion: fc.string({ minLength: 3, maxLength: 10 }),
    }),
  });
}

/**
 * Generate random valid eligibility scores
 */
export function eligibilityScoreArbitrary() {
  return fc.record({
    rawScore: fc.double({ min: 0, max: 1 }),
    percentage: fc.integer({ min: 0, max: 100 }),
    category: fc.constantFrom('highly_eligible', 'potentially_eligible', 'low_eligibility'),
  });
}

/**
 * Generate random valid feature vectors
 */
export function featureVectorArbitrary() {
  return fc.array(fc.double({ min: 0, max: 1 }), { minLength: 10, maxLength: 50 });
}

/**
 * Generate random valid conversation context
 */
export function conversationContextArbitrary() {
  return fc.record({
    sessionId: fc.uuid(),
    userId: fc.option(fc.uuid()),
    messageHistory: fc.array(messageArbitrary(), { minLength: 0, maxLength: 10 }),
    toolExecutionHistory: fc.array(
      fc.record({
        executionId: fc.uuid(),
        toolName: fc.string({ minLength: 5, maxLength: 30 }),
        parameters: fc.dictionary(fc.string(), fc.anything()),
        result: toolResultArbitrary(),
        timestamp: fc.date(),
      }),
      { minLength: 0, maxLength: 5 }
    ),
  });
}

/**
 * Generate random simple queries (for testing response time)
 */
export function simpleQueryArbitrary() {
  return fc.constantFrom(
    'What schemes are available?',
    'Tell me about education schemes',
    'Show me healthcare programs',
    'What is the PM-KISAN scheme?',
    'How can I apply for schemes?',
    'What are the eligibility criteria?',
    'When is the deadline?',
    'List all schemes',
    'Help me find schemes',
    'What benefits are available?'
  );
}
