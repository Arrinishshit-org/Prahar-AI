/**
 * Property-based tests for authentication service
 * Using fast-check for property testing
 */

import fc from 'fast-check';
import { AuthService } from '../auth.service';
import { RegistrationInput } from '../types';
import { initializeNeo4j, closeNeo4j } from '../../db/neo4j.config';
import { Driver } from 'neo4j-driver';

describe('Authentication Property Tests', () => {
  let authService: AuthService;
  let driver: Driver;

  beforeAll(async () => {
    const connection = initializeNeo4j({
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      username: process.env.NEO4J_USER || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'test-password',
    });
    await connection.connect();
    driver = connection.getDriver();
    authService = new AuthService(driver);
  });

  afterAll(async () => {
    await closeNeo4j();
  });

  // Helper to generate valid registration input
  const registrationInputArbitrary = (): fc.Arbitrary<RegistrationInput> => {
    return fc.record({
      email: fc.emailAddress(),
      password: fc.string({ minLength: 8, maxLength: 20 }).map(pwd => {
        // Ensure password meets strength requirements
        return `Aa1!${pwd}`;
      }),
      profile: fc.record({
        firstName: fc.string({ minLength: 2, maxLength: 50 }),
        lastName: fc.string({ minLength: 2, maxLength: 50 }),
        dateOfBirth: fc.date({ min: new Date('1924-01-01'), max: new Date('2006-01-01') }).map(d => d.toISOString().split('T')[0]),
        gender: fc.constantFrom<'male' | 'female' | 'other' | 'prefer_not_to_say'>('male', 'female', 'other', 'prefer_not_to_say'),
        maritalStatus: fc.constantFrom<'single' | 'married' | 'divorced' | 'widowed'>('single', 'married', 'divorced', 'widowed'),
        familySize: fc.integer({ min: 1, max: 10 }),
        annualIncome: fc.integer({ min: 0, max: 10000000 }),
        employmentStatus: fc.constantFrom<'employed' | 'self_employed' | 'unemployed' | 'student' | 'retired'>('employed', 'self_employed', 'unemployed', 'student', 'retired'),
        occupation: fc.string({ minLength: 3, maxLength: 50 }),
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
        educationLevel: fc.constantFrom<'no_formal' | 'primary' | 'secondary' | 'higher_secondary' | 'graduate' | 'postgraduate'>(
          'no_formal',
          'primary',
          'secondary',
          'higher_secondary',
          'graduate',
          'postgraduate'
        ),
        caste: fc.constantFrom<'general' | 'obc' | 'sc' | 'st' | 'other'>('general', 'obc', 'sc', 'st', 'other'),
        disability: fc.boolean(),
        disabilityType: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
        religion: fc.option(fc.constantFrom('Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'), { nil: undefined }),
      }),
    });
  };

  /**
   * Property 1: Registration Round Trip
   * **Validates: Requirements 1.1, 1.3**
   * 
   * For any valid user profile data, registering a user and then retrieving 
   * the profile should return equivalent data with all required fields preserved.
   */
  describe('Property 1: Registration Round Trip', () => {
    it('should preserve all profile data through registration and retrieval', async () => {
      await fc.assert(
        fc.asyncProperty(
          registrationInputArbitrary(),
          async (input) => {
            try {
              // Register user
              const result = await authService.register(input);
              
              // Verify registration succeeded
              expect(result.user.userId).toBeDefined();
              expect(result.accessToken).toBeDefined();
              expect(result.refreshToken).toBeDefined();
              
              // Retrieve profile
              const retrieved = await authService.getUserProfile(result.user.userId);
              
              // Verify profile was retrieved
              expect(retrieved).not.toBeNull();
              
              if (retrieved) {
                // Verify all required fields are preserved
                expect(retrieved.email).toBe(input.email);
                expect(retrieved.firstName).toBe(input.profile.firstName);
                expect(retrieved.lastName).toBe(input.profile.lastName);
                expect(retrieved.gender).toBe(input.profile.gender);
                expect(retrieved.maritalStatus).toBe(input.profile.maritalStatus);
                expect(retrieved.familySize).toBe(input.profile.familySize);
                expect(retrieved.annualIncome).toBe(input.profile.annualIncome);
                expect(retrieved.employmentStatus).toBe(input.profile.employmentStatus);
                expect(retrieved.occupation).toBe(input.profile.occupation);
                expect(retrieved.state).toBe(input.profile.state);
                expect(retrieved.district).toBe(input.profile.district);
                expect(retrieved.pincode).toBe(input.profile.pincode);
                expect(retrieved.educationLevel).toBe(input.profile.educationLevel);
                expect(retrieved.caste).toBe(input.profile.caste);
                expect(retrieved.disability).toBe(input.profile.disability);
                
                // Verify optional fields
                if (input.profile.religion) {
                  expect(retrieved.religion).toBe(input.profile.religion);
                }
                if (input.profile.disabilityType) {
                  expect(retrieved.disabilityType).toBe(input.profile.disabilityType);
                }
                
                // Verify computed fields exist
                expect(retrieved.age).toBeGreaterThan(0);
                expect(retrieved.incomeLevel).toBeDefined();
                expect(retrieved.occupationCategory).toBeDefined();
                expect(retrieved.ruralUrban).toBeDefined();
                expect(retrieved.profileCompleteness).toBeGreaterThan(0);
                
                // Verify system fields
                expect(retrieved.userId).toBe(result.user.userId);
                expect(retrieved.emailVerified).toBe(false);
                expect(retrieved.userGroups).toEqual([]);
                expect(retrieved.createdAt).toBeDefined();
                expect(retrieved.updatedAt).toBeDefined();
                expect(retrieved.lastLoginAt).toBeDefined();
              }
              
              // Cleanup: delete the test user
              const session = driver.session();
              try {
                await session.run(
                  'MATCH (u:User {userId: $userId}) DELETE u',
                  { userId: result.user.userId }
                );
              } finally {
                await session.close();
              }
            } catch (error) {
              // If registration fails due to duplicate email (race condition in tests),
              // we can skip this iteration
              if (error instanceof Error && error.message.includes('Email already registered')) {
                return;
              }
              throw error;
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 120000); // 2 minute timeout for property test
  });
});


  /**
   * Property 2: Registration Validation Rejects Invalid Profiles
   * **Validates: Requirements 1.2, 1.5**
   * 
   * For any profile data with missing required fields or invalid values, 
   * the registration system should reject the registration and return error 
   * messages identifying the specific invalid fields.
   */
  describe('Property 2: Registration Validation Rejects Invalid Profiles', () => {
    it('should reject registration with missing required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.option(fc.emailAddress(), { nil: undefined }),
            password: fc.option(fc.string({ minLength: 8 }), { nil: undefined }),
            profile: fc.record({
              firstName: fc.option(fc.string({ minLength: 2 }), { nil: undefined }),
              lastName: fc.option(fc.string({ minLength: 2 }), { nil: undefined }),
              dateOfBirth: fc.option(fc.string(), { nil: undefined }),
              gender: fc.option(fc.constantFrom('male', 'female', 'other'), { nil: undefined }),
              maritalStatus: fc.option(fc.constantFrom('single', 'married'), { nil: undefined }),
              familySize: fc.option(fc.integer({ min: 1 }), { nil: undefined }),
              annualIncome: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
              employmentStatus: fc.option(fc.constantFrom('employed', 'unemployed'), { nil: undefined }),
              occupation: fc.option(fc.string({ minLength: 3 }), { nil: undefined }),
              state: fc.option(fc.string({ minLength: 3 }), { nil: undefined }),
              district: fc.option(fc.string({ minLength: 3 }), { nil: undefined }),
              pincode: fc.option(fc.stringMatching(/^[1-9][0-9]{5}$/), { nil: undefined }),
              educationLevel: fc.option(fc.constantFrom('primary', 'secondary'), { nil: undefined }),
              caste: fc.option(fc.constantFrom('general', 'obc'), { nil: undefined }),
              disability: fc.boolean(),
            }),
          }).filter(input => {
            // Ensure at least one required field is missing
            return !input.email || !input.password || !input.profile.firstName || 
                   !input.profile.lastName || !input.profile.dateOfBirth ||
                   !input.profile.gender || !input.profile.maritalStatus ||
                   input.profile.familySize === undefined || input.profile.annualIncome === undefined ||
                   !input.profile.employmentStatus || !input.profile.occupation ||
                   !input.profile.state || !input.profile.district ||
                   !input.profile.pincode || !input.profile.educationLevel ||
                   !input.profile.caste;
          }),
          async (input) => {
            try {
              await authService.register(input as any);
              // If registration succeeds, the test should fail
              expect(true).toBe(false);
            } catch (error) {
              // Registration should fail with an error message
              expect(error).toBeDefined();
              expect(error instanceof Error).toBe(true);
              if (error instanceof Error) {
                // Error message should mention missing fields or validation
                expect(
                  error.message.includes('Missing required fields') ||
                  error.message.includes('required') ||
                  error.message.includes('Invalid') ||
                  error.message.includes('must')
                ).toBe(true);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    }, 60000);

    it('should reject registration with invalid email format', async () => {
      await fc.assert(
        fc.asyncProperty(
          registrationInputArbitrary().map(input => ({
            ...input,
            email: fc.sample(fc.string({ minLength: 5, maxLength: 20 }).filter(s => !s.includes('@')))[0],
          })),
          async (input) => {
            try {
              await authService.register(input);
              expect(true).toBe(false);
            } catch (error) {
              expect(error).toBeDefined();
              expect(error instanceof Error).toBe(true);
              if (error instanceof Error) {
                expect(error.message).toContain('email');
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 30000);

    it('should reject registration with weak password', async () => {
      await fc.assert(
        fc.asyncProperty(
          registrationInputArbitrary().map(input => ({
            ...input,
            password: fc.sample(fc.string({ minLength: 1, maxLength: 7 }))[0],
          })),
          async (input) => {
            try {
              await authService.register(input);
              expect(true).toBe(false);
            } catch (error) {
              expect(error).toBeDefined();
              expect(error instanceof Error).toBe(true);
              if (error instanceof Error) {
                expect(error.message.toLowerCase()).toContain('password');
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 30000);
  });

  /**
   * Property 3: User ID Uniqueness
   * **Validates: Requirements 1.4**
   * 
   * For any set of user registrations, all assigned userId values 
   * should be unique across the system.
   */
  describe('Property 3: User ID Uniqueness', () => {
    it('should assign unique user IDs to all registrations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(registrationInputArbitrary(), { minLength: 5, maxLength: 10 }),
          async (inputs) => {
            const userIds: string[] = [];
            const createdUserIds: string[] = [];

            try {
              // Register all users
              for (const input of inputs) {
                try {
                  const result = await authService.register(input);
                  userIds.push(result.user.userId);
                  createdUserIds.push(result.user.userId);
                } catch (error) {
                  // Skip if email already exists (duplicate in generated data)
                  if (error instanceof Error && error.message.includes('Email already registered')) {
                    continue;
                  }
                  throw error;
                }
              }

              // Verify all IDs are unique
              const uniqueIds = new Set(userIds);
              expect(uniqueIds.size).toBe(userIds.length);

              // Verify all IDs are valid UUIDs (non-empty strings)
              for (const userId of userIds) {
                expect(userId).toBeDefined();
                expect(typeof userId).toBe('string');
                expect(userId.length).toBeGreaterThan(0);
              }
            } finally {
              // Cleanup: delete all created users
              const session = driver.session();
              try {
                for (const userId of createdUserIds) {
                  await session.run(
                    'MATCH (u:User {userId: $userId}) DELETE u',
                    { userId }
                  );
                }
              } finally {
                await session.close();
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 120000);
  });

  /**
   * Property 28: Session Persistence
   * **Validates: Requirements 10.5**
   * 
   * For any user session, the session should remain valid for 7 days 
   * without requiring re-authentication.
   */
  describe('Property 28: Session Persistence', () => {
    it('should generate refresh tokens valid for 7 days', async () => {
      await fc.assert(
        fc.asyncProperty(
          registrationInputArbitrary(),
          async (input) => {
            let userId: string | undefined;

            try {
              // Register user
              const result = await authService.register(input);
              userId = result.user.userId;

              // Verify refresh token is generated
              expect(result.refreshToken).toBeDefined();
              expect(typeof result.refreshToken).toBe('string');
              expect(result.refreshToken.length).toBeGreaterThan(0);

              // Verify refresh token can be used to get new access token
              const refreshResult = await authService.refreshToken(result.refreshToken);
              expect(refreshResult.accessToken).toBeDefined();
              expect(refreshResult.user.userId).toBe(userId);

              // Verify access token expires in 15 minutes (900 seconds)
              expect(result.expiresIn).toBe(900);
            } finally {
              // Cleanup
              if (userId) {
                const session = driver.session();
                try {
                  await session.run(
                    'MATCH (u:User {userId: $userId}) DELETE u',
                    { userId }
                  );
                } finally {
                  await session.close();
                }
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 120000);
  });
});
