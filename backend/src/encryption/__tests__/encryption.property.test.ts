/**
 * Property-based tests for encryption service
 * Tests encryption/decryption properties and profile encryption at rest
 */

import fc from 'fast-check';
import { EncryptionService, encryptProfile, decryptProfile } from '../encryption.service';
import { userProfileArbitrary } from '../../test/arbitraries';
import * as crypto from 'crypto';

// Set up test encryption key
const TEST_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

describe('Encryption Service - Property Tests', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
  });

  describe('Basic Encryption Properties', () => {
    /**
     * Property: Encryption should be reversible
     * For any plaintext, decrypt(encrypt(plaintext)) should equal plaintext
     */
    it('should decrypt encrypted data back to original plaintext', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          async (plaintext) => {
            const encrypted = await encryptionService.encrypt(plaintext);
            const decrypted = await encryptionService.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Encrypted data should be different from plaintext
     * For any non-empty plaintext, encrypt(plaintext) should not equal plaintext
     */
    it('should produce ciphertext different from plaintext', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          async (plaintext) => {
            const encrypted = await encryptionService.encrypt(plaintext);
            expect(encrypted).not.toBe(plaintext);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Encryption should produce unique ciphertexts
     * Encrypting the same plaintext twice should produce different ciphertexts (due to random IVs)
     */
    it('should produce different ciphertexts for same plaintext (random IVs)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          async (plaintext) => {
            const encrypted1 = await encryptionService.encrypt(plaintext);
            const encrypted2 = await encryptionService.encrypt(plaintext);
            
            // Ciphertexts should be different (different IVs)
            expect(encrypted1).not.toBe(encrypted2);
            
            // But both should decrypt to the same plaintext
            const decrypted1 = await encryptionService.decrypt(encrypted1);
            const decrypted2 = await encryptionService.decrypt(encrypted2);
            expect(decrypted1).toBe(plaintext);
            expect(decrypted2).toBe(plaintext);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Encrypted data should have correct format
     * Ciphertext should be in format: iv:authTag:encrypted (all hex)
     */
    it('should produce ciphertext in correct format (iv:authTag:encrypted)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          async (plaintext) => {
            const encrypted = await encryptionService.encrypt(plaintext);
            
            // Should have exactly 3 parts separated by colons
            const parts = encrypted.split(':');
            expect(parts).toHaveLength(3);
            
            // Each part should be valid hex
            const [iv, authTag, ciphertext] = parts;
            expect(iv).toMatch(/^[0-9a-f]+$/);
            expect(authTag).toMatch(/^[0-9a-f]+$/);
            expect(ciphertext).toMatch(/^[0-9a-f]+$/);
            
            // IV should be 16 bytes (32 hex chars)
            expect(iv.length).toBe(32);
            
            // Auth tag should be 16 bytes (32 hex chars)
            expect(authTag.length).toBe(32);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Decryption should fail with tampered ciphertext
     * Modifying any part of the ciphertext should cause decryption to fail
     */
    it('should fail to decrypt tampered ciphertext', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (plaintext) => {
            const encrypted = await encryptionService.encrypt(plaintext);
            const parts = encrypted.split(':');
            
            // Tamper with the ciphertext part
            const tamperedCiphertext = parts[2].substring(0, parts[2].length - 2) + 'ff';
            const tampered = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;
            
            // Decryption should fail
            await expect(encryptionService.decrypt(tampered)).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 48: Profile Data Encryption at Rest', () => {
    /**
     * **Validates: Requirements 19.1**
     * 
     * Property 48: Profile Data Encryption at Rest
     * 
     * For any user profile stored in the database, sensitive fields should be encrypted using AES-256 encryption.
     * 
     * Sensitive fields: email, firstName, lastName, dateOfBirth, annualIncome, pincode
     */
    it('should encrypt sensitive profile fields at rest', async () => {
      await fc.assert(
        fc.asyncProperty(
          userProfileArbitrary(),
          async (profile) => {
            // Encrypt the profile
            const encryptedProfile = await encryptProfile(profile);
            
            // Sensitive fields should be encrypted (different from original)
            const sensitiveFields = ['email', 'firstName', 'lastName', 'dateOfBirth', 'annualIncome', 'pincode'] as const;
            
            for (const field of sensitiveFields) {
              const profileAny = profile as any;
              const encryptedAny = encryptedProfile as any;
              
              if (profileAny[field] !== undefined && profileAny[field] !== null) {
                const originalValue = profileAny[field] instanceof Date 
                  ? profileAny[field].toISOString() 
                  : String(profileAny[field]);
                const encryptedValue = encryptedAny[field];
                
                // Encrypted value should be different from original
                expect(encryptedValue).not.toBe(originalValue);
                
                // Encrypted value should be in correct format (iv:authTag:ciphertext)
                expect(encryptedValue).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
              }
            }
            
            // Non-sensitive fields should remain unchanged
            const nonSensitiveFields = ['gender', 'maritalStatus', 'familySize', 'employmentStatus', 
                                        'occupation', 'state', 'district', 'educationLevel', 'caste'] as const;
            
            for (const field of nonSensitiveFields) {
              const profileAny = profile as any;
              const encryptedAny = encryptedProfile as any;
              
              if (profileAny[field] !== undefined) {
                expect(encryptedAny[field]).toBe(profileAny[field]);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Profile encryption should be reversible
     * For any profile, decrypt(encrypt(profile)) should equal the original profile
     */
    it('should decrypt encrypted profile back to original', async () => {
      await fc.assert(
        fc.asyncProperty(
          userProfileArbitrary(),
          async (profile) => {
            // Encrypt then decrypt
            const encryptedProfile = await encryptProfile(profile);
            const decryptedProfile = await decryptProfile(encryptedProfile);
            
            // All fields should match original
            expect(decryptedProfile.email).toBe(profile.email);
            expect(decryptedProfile.firstName).toBe(profile.firstName);
            expect(decryptedProfile.lastName).toBe(profile.lastName);
            expect(decryptedProfile.dateOfBirth.toISOString()).toBe(profile.dateOfBirth.toISOString());
            expect(decryptedProfile.annualIncome).toBe(profile.annualIncome);
            expect(decryptedProfile.pincode).toBe(profile.pincode);
            
            // Non-sensitive fields should also match
            expect(decryptedProfile.gender).toBe(profile.gender);
            expect(decryptedProfile.maritalStatus).toBe(profile.maritalStatus);
            expect(decryptedProfile.state).toBe(profile.state);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Encrypted profiles should have unique ciphertexts
     * Encrypting the same profile twice should produce different encrypted values (due to random IVs)
     */
    it('should produce different encrypted values for same profile (random IVs)', async () => {
      await fc.assert(
        fc.asyncProperty(
          userProfileArbitrary(),
          async (profile) => {
            const encrypted1 = await encryptProfile(profile);
            const encrypted2 = await encryptProfile(profile);
            
            // Encrypted sensitive fields should be different
            expect(encrypted1.email).not.toBe(encrypted2.email);
            expect(encrypted1.firstName).not.toBe(encrypted2.firstName);
            
            // But both should decrypt to the same values
            const decrypted1 = await decryptProfile(encrypted1);
            const decrypted2 = await decryptProfile(encrypted2);
            
            expect(decrypted1.email).toBe(profile.email);
            expect(decrypted2.email).toBe(profile.email);
            expect(decrypted1.firstName).toBe(profile.firstName);
            expect(decrypted2.firstName).toBe(profile.firstName);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Profile encryption should handle partial profiles
     * Encrypting a profile with only some sensitive fields should work correctly
     */
    it('should handle partial profiles with missing sensitive fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            firstName: fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: undefined }),
            lastName: fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: undefined }),
            gender: fc.constantFrom('male', 'female', 'other'),
            state: fc.string({ minLength: 3, maxLength: 50 }),
          }),
          async (partialProfile) => {
            const encrypted = await encryptProfile(partialProfile);
            const decrypted = await decryptProfile(encrypted);
            
            // Email should always be encrypted/decrypted
            expect(decrypted.email).toBe(partialProfile.email);
            
            // Optional fields should be handled correctly
            if (partialProfile.firstName !== undefined) {
              expect(decrypted.firstName).toBe(partialProfile.firstName);
            }
            if (partialProfile.lastName !== undefined) {
              expect(decrypted.lastName).toBe(partialProfile.lastName);
            }
            
            // Non-sensitive fields should remain unchanged
            expect(decrypted.gender).toBe(partialProfile.gender);
            expect(decrypted.state).toBe(partialProfile.state);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Encrypted profile data should be stored as strings
     * All encrypted fields should be strings (for database storage)
     */
    it('should store encrypted fields as strings', async () => {
      await fc.assert(
        fc.asyncProperty(
          userProfileArbitrary(),
          async (profile) => {
            const encrypted = await encryptProfile(profile);
            
            // All encrypted sensitive fields should be strings
            expect(typeof encrypted.email).toBe('string');
            expect(typeof encrypted.firstName).toBe('string');
            expect(typeof encrypted.lastName).toBe('string');
            expect(typeof encrypted.dateOfBirth).toBe('string');
            expect(typeof encrypted.annualIncome).toBe('string');
            expect(typeof encrypted.pincode).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
