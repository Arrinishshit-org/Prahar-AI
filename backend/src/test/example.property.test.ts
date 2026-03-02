/**
 * Example property-based tests demonstrating fast-check usage
 * These tests verify universal properties that should hold for all inputs
 */

import fc from 'fast-check';
import { userProfileArbitrary, messageArbitrary } from './arbitraries';

describe('Example Property-Based Tests', () => {
  /**
   * Property: Message Serialization Round Trip
   * Validates that messages can be serialized and deserialized without data loss
   */
  it('Property: Message serialization preserves data', () => {
    fc.assert(
      fc.property(messageArbitrary(), (message) => {
        // Serialize
        const serialized = JSON.stringify(message);

        // Deserialize
        const deserialized = JSON.parse(serialized);

        // Verify equivalence
        expect(deserialized.messageId).toBe(message.messageId);
        expect(deserialized.role).toBe(message.role);
        expect(deserialized.content).toBe(message.content);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: User Profile Email Validation
   * Validates that generated user profiles always have valid email addresses
   */
  it('Property: User profiles have valid email format', () => {
    fc.assert(
      fc.property(userProfileArbitrary(), (profile) => {
        // Email should contain @ symbol
        expect(profile.email).toContain('@');

        // Email should have domain
        const parts = profile.email.split('@');
        expect(parts.length).toBe(2);
        expect(parts[1]).toContain('.');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Age Consistency
   * Validates that age is consistent with date of birth
   */
  it('Property: Age matches date of birth', () => {
    fc.assert(
      fc.property(userProfileArbitrary(), (profile) => {
        const today = new Date();
        const birthDate = new Date(profile.dateOfBirth);
        const calculatedAge = today.getFullYear() - birthDate.getFullYear();

        // Age should be within 1 year of calculated age (accounting for birthday)
        expect(Math.abs(profile.age - calculatedAge)).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Income Level Consistency
   * Validates that income level matches annual income ranges
   */
  it('Property: Income level matches annual income', () => {
    fc.assert(
      fc.property(userProfileArbitrary(), (profile) => {
        const { annualIncome, incomeLevel } = profile;

        // Verify income level is consistent with income amount
        if (incomeLevel === 'below_poverty') {
          expect(annualIncome).toBeLessThanOrEqual(200000);
        } else if (incomeLevel === 'low') {
          expect(annualIncome).toBeGreaterThan(200000);
          expect(annualIncome).toBeLessThanOrEqual(500000);
        } else if (incomeLevel === 'middle') {
          expect(annualIncome).toBeGreaterThan(500000);
          expect(annualIncome).toBeLessThanOrEqual(2000000);
        } else if (incomeLevel === 'high') {
          expect(annualIncome).toBeGreaterThan(2000000);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: String Length Constraints
   * Validates that generated strings meet length requirements
   */
  it('Property: Names have valid lengths', () => {
    fc.assert(
      fc.property(userProfileArbitrary(), (profile) => {
        // First name should be between 2 and 50 characters
        expect(profile.firstName.length).toBeGreaterThanOrEqual(2);
        expect(profile.firstName.length).toBeLessThanOrEqual(50);

        // Last name should be between 2 and 50 characters
        expect(profile.lastName.length).toBeGreaterThanOrEqual(2);
        expect(profile.lastName.length).toBeLessThanOrEqual(50);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Pincode Format
   * Validates that pincodes follow Indian format (6 digits, not starting with 0)
   */
  it('Property: Pincode has valid format', () => {
    fc.assert(
      fc.property(userProfileArbitrary(), (profile) => {
        const { pincode } = profile;

        // Should be 6 digits
        expect(pincode).toMatch(/^\d{6}$/);

        // Should not start with 0
        expect(pincode[0]).not.toBe('0');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Family Size Constraints
   * Validates that family size is within reasonable bounds
   */
  it('Property: Family size is positive and reasonable', () => {
    fc.assert(
      fc.property(userProfileArbitrary(), (profile) => {
        expect(profile.familySize).toBeGreaterThanOrEqual(1);
        expect(profile.familySize).toBeLessThanOrEqual(10);
      }),
      { numRuns: 100 }
    );
  });
});
