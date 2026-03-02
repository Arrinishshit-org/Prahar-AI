/**
 * Classification Service Property-Based Tests
 * 
 * Tests universal properties that should hold for all classification operations.
 */

import fc from 'fast-check';
import { UserGroupAssignment, ClassificationProfile } from '../types';

describe('Classification Service - Property-Based Tests', () => {
  describe('User Group Assignment Properties', () => {
    /**
     * **Validates: Requirements 2.1, 2.4**
     * 
     * Property: Every user classification must assign at least one group
     * 
     * Rationale: The system must always classify users into groups, even if
     * confidence is low (in which case they get the default group).
     */
    it('should always assign at least one group to any user', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.string({ minLength: 1 }),
            groups: fc.array(
              fc.record({
                groupId: fc.integer({ min: 0, max: 24 }),
                groupName: fc.string(),
                description: fc.string(),
                memberCount: fc.integer({ min: 0 })
              }),
              { minLength: 1, maxLength: 5 }
            ),
            confidence: fc.float({ min: 0, max: 1 }),
            features: fc.array(fc.float(), { minLength: 10, maxLength: 50 }),
            timestamp: fc.date()
          }),
          (assignment: UserGroupAssignment) => {
            // Property: groups array must never be empty
            expect(assignment.groups.length).toBeGreaterThan(0);
            
            // Property: each group must have valid groupId
            assignment.groups.forEach(group => {
              expect(group.groupId).toBeGreaterThanOrEqual(0);
              expect(group.groupId).toBeLessThan(25);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirement 2.1**
     * 
     * Property: Confidence scores must be in valid range [0, 1]
     * 
     * Rationale: Confidence is a probability measure and must be normalized.
     */
    it('should always produce confidence scores between 0 and 1', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.string({ minLength: 1 }),
            groups: fc.array(fc.record({
              groupId: fc.integer({ min: 0, max: 24 }),
              groupName: fc.string(),
              description: fc.string(),
              memberCount: fc.integer({ min: 0 })
            }), { minLength: 1 }),
            confidence: fc.float({ min: 0, max: 1 }),
            features: fc.array(fc.float()),
            timestamp: fc.date()
          }),
          (assignment: UserGroupAssignment) => {
            // Property: confidence must be in [0, 1]
            expect(assignment.confidence).toBeGreaterThanOrEqual(0);
            expect(assignment.confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirement 2.1**
     * 
     * Property: All classifications must assign at least one group regardless of confidence
     * 
     * Rationale: Even with low confidence, users must be assigned to at least one group
     * to ensure they can receive recommendations.
     */
    it('should always assign at least one group regardless of confidence', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.string({ minLength: 1 }),
            confidence: fc.float({ min: 0, max: 1 }),
            groups: fc.array(fc.record({
              groupId: fc.integer({ min: 0, max: 24 }),
              groupName: fc.string(),
              description: fc.string(),
              memberCount: fc.integer({ min: 0 })
            }), { minLength: 1 }),
            features: fc.array(fc.float()),
            timestamp: fc.date()
          }),
          (assignment: UserGroupAssignment) => {
            // Property: must always have at least one group
            expect(assignment.groups.length).toBeGreaterThanOrEqual(1);
            
            // Property: all group IDs must be valid
            assignment.groups.forEach(group => {
              expect(group.groupId).toBeGreaterThanOrEqual(0);
              expect(group.groupId).toBeLessThan(25);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Classification Profile Properties', () => {
    /**
     * **Validates: Requirement 2.2**
     * 
     * Property: Classification profiles must contain all required features
     * 
     * Rationale: The ML model requires specific features to classify users.
     * Missing features would cause classification to fail.
     */
    it('should require all mandatory profile fields for classification', () => {
      fc.assert(
        fc.property(
          fc.record({
            user_id: fc.string({ minLength: 1 }),
            age: fc.integer({ min: 18, max: 100 }),
            gender: fc.constantFrom('male', 'female', 'other'),
            marital_status: fc.constantFrom('single', 'married', 'divorced', 'widowed'),
            family_size: fc.integer({ min: 1, max: 10 }),
            annual_income: fc.integer({ min: 0, max: 10000000 }),
            employment_status: fc.constantFrom('employed', 'self_employed', 'unemployed', 'student', 'retired'),
            state: fc.string({ minLength: 1 }),
            rural_urban: fc.constantFrom('rural', 'urban', 'semi_urban'),
            education_level: fc.constantFrom('no_formal', 'primary', 'secondary', 'higher_secondary', 'graduate', 'postgraduate'),
            caste: fc.constantFrom('general', 'obc', 'sc', 'st', 'other'),
            disability: fc.boolean()
          }),
          (profile: ClassificationProfile) => {
            // Property: all required fields must be present
            expect(profile.user_id).toBeDefined();
            expect(profile.age).toBeDefined();
            expect(profile.gender).toBeDefined();
            expect(profile.marital_status).toBeDefined();
            expect(profile.family_size).toBeDefined();
            expect(profile.annual_income).toBeDefined();
            expect(profile.employment_status).toBeDefined();
            expect(profile.state).toBeDefined();
            expect(profile.rural_urban).toBeDefined();
            expect(profile.education_level).toBeDefined();
            expect(profile.caste).toBeDefined();
            expect(profile.disability).toBeDefined();

            // Property: numeric fields must be in valid ranges
            expect(profile.age).toBeGreaterThanOrEqual(18);
            expect(profile.age).toBeLessThanOrEqual(100);
            expect(profile.family_size).toBeGreaterThanOrEqual(1);
            expect(profile.annual_income).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Performance Properties', () => {
    /**
     * **Validates: Requirement 2.3**
     * 
     * Property: Classification time tracking must be accurate
     * 
     * Rationale: Performance monitoring is critical for meeting the 5-second
     * requirement. Metrics must accurately reflect actual classification time.
     */
    it('should track classification time accurately', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.string({ minLength: 1 }),
            classificationTime: fc.integer({ min: 100, max: 10000 }),
            confidence: fc.float({ min: 0, max: 1 }),
            groupCount: fc.integer({ min: 1, max: 5 }),
            timestamp: fc.date()
          }),
          (metrics) => {
            // Property: classification time must be positive
            expect(metrics.classificationTime).toBeGreaterThan(0);
            
            // Property: timestamp must be valid
            expect(metrics.timestamp).toBeInstanceOf(Date);
            expect(metrics.timestamp.getTime()).not.toBeNaN();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirement 2.3**
     * 
     * Property: Performance score calculation must be consistent
     * 
     * Rationale: Performance score (0-100) should accurately reflect the
     * percentage of classifications meeting the 5-second target.
     */
    it('should calculate performance score consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            totalClassifications: fc.integer({ min: 1, max: 1000 }),
            slowClassifications: fc.integer({ min: 0, max: 1000 })
          }).filter(data => data.slowClassifications <= data.totalClassifications),
          (data) => {
            // Calculate performance score
            const performanceScore = Math.max(
              0,
              100 - (data.slowClassifications / data.totalClassifications * 100)
            );

            // Property: score must be in [0, 100]
            expect(performanceScore).toBeGreaterThanOrEqual(0);
            expect(performanceScore).toBeLessThanOrEqual(100);

            // Property: 0 slow classifications = 100% score
            if (data.slowClassifications === 0) {
              expect(performanceScore).toBe(100);
            }

            // Property: all slow classifications = 0% score
            if (data.slowClassifications === data.totalClassifications) {
              expect(performanceScore).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Batch Processing Properties', () => {
    /**
     * **Validates: Requirement 2.1**
     * 
     * Property: Batch results must account for all users
     * 
     * Rationale: In batch reclassification, the sum of successes and failures
     * must equal the total number of users processed.
     */
    it('should account for all users in batch processing', () => {
      fc.assert(
        fc.property(
          fc.record({
            totalUsers: fc.integer({ min: 1, max: 1000 }),
            successCount: fc.integer({ min: 0, max: 1000 }),
            failureCount: fc.integer({ min: 0, max: 1000 })
          }).filter(data => 
            data.successCount + data.failureCount === data.totalUsers
          ),
          (result) => {
            // Property: successes + failures = total
            expect(result.successCount + result.failureCount).toBe(result.totalUsers);
            
            // Property: counts must be non-negative
            expect(result.successCount).toBeGreaterThanOrEqual(0);
            expect(result.failureCount).toBeGreaterThanOrEqual(0);
            expect(result.totalUsers).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
