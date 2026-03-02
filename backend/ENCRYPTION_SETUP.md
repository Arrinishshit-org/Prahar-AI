# Encryption Setup Guide

This guide covers the complete encryption implementation for the Personalized Scheme Recommendation System, including both data at rest (AES-256-GCM) and data in transit (TLS 1.3).

## Overview

The system implements comprehensive encryption to protect sensitive user data:

1. **Data at Rest**: AES-256-GCM encryption for sensitive profile fields
2. **Data in Transit**: TLS 1.3 encryption for all network communication

This satisfies **Requirements 19.1 and 19.2** from the specification.

## Data at Rest Encryption

### Sensitive Fields

The following user profile fields are encrypted before storage:

- `email`
- `firstName`
- `lastName`
- `dateOfBirth`
- `annualIncome`
- `pincode`

### Configuration

Set the encryption key in your environment:

```bash
# Generate a new key (32 bytes = 64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set in .env
ENCRYPTION_KEY=your_64_character_hex_string_here
```

### Usage

The encryption is automatically applied when creating or updating user profiles:

```typescript
import { encryptProfile, decryptProfile } from './encryption';

// Encrypt profile before storing
const encryptedProfile = await encryptProfile(userProfile);
await database.store(encryptedProfile);

// Decrypt profile when retrieving
const encryptedProfile = await database.retrieve(userId);
const profile = await decryptProfile(encryptedProfile);
```

### Implementation Details

- **Algorithm**: AES-256-GCM (Authenticated Encryption with Associated Data)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 128 bits (16 bytes) - randomly generated for each encryption
- **Auth Tag**: 128 bits (16 bytes) - ensures data integrity
- **Format**: `iv:authTag:ciphertext` (all hex-encoded)

### Security Properties

1. **Confidentiality**: Data is encrypted and unreadable without the key
2. **Integrity**: Authentication tag prevents tampering
3. **Uniqueness**: Random IVs ensure same plaintext produces different ciphertext
4. **Forward Secrecy**: Compromising one message doesn't compromise others

## Data in Transit Encryption

### TLS 1.3 Configuration

See [TLS_SETUP.md](./TLS_SETUP.md) for detailed TLS configuration.

Quick setup:

```bash
# Enable TLS
TLS_ENABLED=true

# Set certificate paths
TLS_KEY_PATH=/path/to/private-key.pem
TLS_CERT_PATH=/path/to/certificate.pem
```

### Features

- **TLS 1.3 Only**: Enforces latest TLS version
- **Secure Ciphers**: Only AEAD cipher suites
- **Perfect Forward Secrecy**: Ephemeral key exchange
- **HSTS**: HTTP Strict Transport Security enabled

## Testing

### Property-Based Tests

The encryption implementation includes comprehensive property-based tests:

```bash
npm test -- encryption.property.test.ts
```

Tests verify:
- Encryption is reversible
- Ciphertext differs from plaintext
- Random IVs produce unique ciphertexts
- Correct format (iv:authTag:ciphertext)
- Tamper detection
- Profile encryption/decryption
- Partial profile handling

### Manual Testing

```typescript
import { EncryptionService } from './encryption';

const service = new EncryptionService();

// Test basic encryption
const plaintext = 'sensitive data';
const encrypted = await service.encrypt(plaintext);
const decrypted = await service.decrypt(encrypted);
console.assert(decrypted === plaintext);

// Test profile encryption
const profile = {
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  // ... other fields
};

const encryptedProfile = await encryptProfile(profile);
const decryptedProfile = await decryptProfile(encryptedProfile);
console.assert(decryptedProfile.email === profile.email);
```

## Key Management

### Development

For development, use environment variables:

```bash
ENCRYPTION_KEY=your_64_character_hex_string
```

### Production

For production, use a Key Management Service (KMS):

1. **AWS KMS**:
   ```typescript
   import { KMS } from 'aws-sdk';
   
   const kms = new KMS();
   const { Plaintext } = await kms.decrypt({
     CiphertextBlob: Buffer.from(process.env.ENCRYPTED_KEY, 'base64')
   }).promise();
   ```

2. **HashiCorp Vault**:
   ```typescript
   import vault from 'node-vault';
   
   const client = vault({ endpoint: process.env.VAULT_ADDR });
   const { data } = await client.read('secret/encryption-key');
   ```

3. **Azure Key Vault**:
   ```typescript
   import { SecretClient } from '@azure/keyvault-secrets';
   
   const client = new SecretClient(vaultUrl, credential);
   const secret = await client.getSecret('encryption-key');
   ```

### Key Rotation

To rotate encryption keys:

1. Generate new key
2. Decrypt all data with old key
3. Re-encrypt with new key
4. Update key in environment/KMS
5. Deploy changes

```typescript
async function rotateKeys(oldKey: string, newKey: string) {
  // Set old key temporarily
  process.env.ENCRYPTION_KEY = oldKey;
  const oldService = new EncryptionService();
  
  // Get all encrypted profiles
  const profiles = await database.getAllProfiles();
  
  // Decrypt with old key
  const decryptedProfiles = await Promise.all(
    profiles.map(p => decryptProfile(p))
  );
  
  // Set new key
  process.env.ENCRYPTION_KEY = newKey;
  const newService = new EncryptionService();
  
  // Re-encrypt with new key
  const reencryptedProfiles = await Promise.all(
    decryptedProfiles.map(p => encryptProfile(p))
  );
  
  // Update database
  await database.updateProfiles(reencryptedProfiles);
}
```

## Security Best Practices

### Key Storage

1. **Never commit keys to version control**
2. **Use environment variables or KMS**
3. **Restrict access to key files** (chmod 600)
4. **Rotate keys regularly** (every 90 days)
5. **Use different keys for different environments**

### Encryption

1. **Always use random IVs** (never reuse)
2. **Verify authentication tags** (detect tampering)
3. **Use secure key derivation** (if deriving from passwords)
4. **Implement key rotation** (plan for compromise)
5. **Monitor encryption failures** (potential attacks)

### TLS

1. **Use TLS 1.3 only** (disable older versions)
2. **Use strong cipher suites** (AEAD only)
3. **Enable HSTS** (force HTTPS)
4. **Monitor certificate expiry** (automate renewal)
5. **Use certificate pinning** (mobile apps)

## Compliance

### Requirements Validation

- **Requirement 19.1**: ✅ User_Profile data encrypted at rest using AES-256
- **Requirement 19.2**: ✅ All data in transit encrypted using TLS 1.3

### Audit Logging

All encryption operations should be logged:

```typescript
console.log('Encryption operation', {
  operation: 'encrypt',
  field: 'email',
  userId: user.userId,
  timestamp: new Date().toISOString()
});
```

### Data Protection

- **GDPR**: Encryption helps satisfy data protection requirements
- **HIPAA**: Encryption at rest and in transit required for PHI
- **PCI DSS**: Encryption required for cardholder data

## Troubleshooting

### Common Issues

1. **"ENCRYPTION_KEY environment variable not set"**
   - Set ENCRYPTION_KEY in .env file
   - Ensure key is 64 hex characters (32 bytes)

2. **"Invalid ciphertext format"**
   - Ciphertext must be in format: iv:authTag:ciphertext
   - Check for data corruption

3. **"Decryption failed"**
   - Wrong encryption key
   - Data has been tampered with
   - Corrupted ciphertext

4. **"TLS handshake failed"**
   - Check certificate validity
   - Verify TLS configuration
   - Ensure client supports TLS 1.3

### Debugging

Enable debug logging:

```typescript
process.env.DEBUG = 'encryption:*';
```

Test encryption manually:

```bash
# Test encryption service
npm test -- encryption.property.test.ts

# Test TLS configuration
openssl s_client -connect localhost:443 -tls1_3
```

## References

- [NIST SP 800-38D](https://csrc.nist.gov/publications/detail/sp/800-38d/final) - GCM Mode
- [RFC 5116](https://tools.ietf.org/html/rfc5116) - AEAD Cipher Suites
- [RFC 8446](https://tools.ietf.org/html/rfc8446) - TLS 1.3
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

## Support

For issues or questions:
1. Check this documentation
2. Review test cases in `__tests__/encryption.property.test.ts`
3. Consult security team for key management
4. Review audit logs for encryption failures
