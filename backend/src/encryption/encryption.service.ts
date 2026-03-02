import * as crypto from 'crypto';

/**
 * Encryption Service for sensitive data
 * Implements AES-256-GCM encryption with secure key management
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits

  /**
   * Encrypt plaintext using AES-256-GCM
   * @param plaintext - The text to encrypt
   * @returns Encrypted string in format: iv:authTag:ciphertext (all hex-encoded)
   */
  async encrypt(plaintext: string): Promise<string> {
    const key = await this.getEncryptionKey();
    
    // Generate random IV for each encryption
    const iv = crypto.randomBytes(this.ivLength);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Return iv:authTag:ciphertext format
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   * @param ciphertext - Encrypted string in format: iv:authTag:ciphertext
   * @returns Decrypted plaintext
   */
  async decrypt(ciphertext: string): Promise<string> {
    // Parse the ciphertext format
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    
    const key = await this.getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the ciphertext
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Get encryption key from secure key management
   * In production, this should retrieve from a key management service (AWS KMS, HashiCorp Vault, etc.)
   * For now, uses environment variable
   */
  private async getEncryptionKey(): Promise<Buffer> {
    const keyHex = process.env.ENCRYPTION_KEY;
    
    if (!keyHex) {
      throw new Error('ENCRYPTION_KEY environment variable not set');
    }

    // Convert hex string to buffer
    const key = Buffer.from(keyHex, 'hex');
    
    // Validate key length
    if (key.length !== this.keyLength) {
      throw new Error(`Encryption key must be ${this.keyLength} bytes (${this.keyLength * 2} hex characters)`);
    }
    
    return key;
  }

  /**
   * Generate a new encryption key (for setup/rotation)
   * @returns Hex-encoded 256-bit key
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Singleton instance
let encryptionServiceInstance: EncryptionService | null = null;

/**
 * Get singleton instance of EncryptionService
 */
export function getEncryptionService(): EncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new EncryptionService();
  }
  return encryptionServiceInstance;
}

/**
 * Profile-specific encryption methods
 */

/**
 * Encrypt sensitive fields in a user profile
 * Sensitive fields: email, firstName, lastName, dateOfBirth, annualIncome, pincode
 */
export async function encryptProfile(profile: any): Promise<any> {
  const encryptionService = getEncryptionService();
  const encrypted = { ...profile };

  const sensitiveFields = [
    'email',
    'firstName',
    'lastName',
    'dateOfBirth',
    'annualIncome',
    'pincode'
  ];

  for (const field of sensitiveFields) {
    if (profile[field] !== undefined && profile[field] !== null) {
      // Convert to string for encryption
      const value = profile[field] instanceof Date 
        ? profile[field].toISOString() 
        : String(profile[field]);
      
      encrypted[field] = await encryptionService.encrypt(value);
    }
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in a user profile
 * Sensitive fields: email, firstName, lastName, dateOfBirth, annualIncome, pincode
 */
export async function decryptProfile(encryptedProfile: any): Promise<any> {
  const encryptionService = getEncryptionService();
  const decrypted = { ...encryptedProfile };

  const sensitiveFields = [
    'email',
    'firstName',
    'lastName',
    'dateOfBirth',
    'annualIncome',
    'pincode'
  ];

  for (const field of sensitiveFields) {
    if (encryptedProfile[field] !== undefined && encryptedProfile[field] !== null) {
      // Check if the field is encrypted (contains colons in the expected format)
      const value = encryptedProfile[field];
      if (typeof value === 'string' && value.includes(':')) {
        try {
          const decryptedValue = await encryptionService.decrypt(value);
          
          // Convert back to original type
          if (field === 'dateOfBirth') {
            decrypted[field] = new Date(decryptedValue);
          } else if (field === 'annualIncome') {
            decrypted[field] = Number(decryptedValue);
          } else {
            decrypted[field] = decryptedValue;
          }
        } catch (error) {
          // If decryption fails, the field might not be encrypted (backward compatibility)
          console.warn(`Failed to decrypt field ${field}, using original value`);
        }
      }
    }
  }

  return decrypted;
}
