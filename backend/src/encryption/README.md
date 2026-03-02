# Encryption Service

This module implements AES-256-GCM encryption for sensitive user data at rest.

## Features

- **AES-256-GCM Encryption**: Industry-standard authenticated encryption
- **Random IVs**: Each encryption uses a unique initialization vector
- **Secure Key Management**: Keys stored in environment variables (production should use KMS)
- **Authentication Tags**: Ensures data integrity and authenticity

## Usage

```typescript
import { getEncryptionService } from './encryption';

const encryptionService = getEncryptionService();

// Encrypt sensitive data
const encrypted = await encryptionService.encrypt('sensitive data');
console.log(encrypted); // iv:authTag:ciphertext

// Decrypt data
const decrypted = await encryptionService.decrypt(encrypted);
console.log(decrypted); // 'sensitive data'
```

## Configuration

Set the `ENCRYPTION_KEY` environment variable with a 64-character hex string (32 bytes):

```bash
ENCRYPTION_KEY=your_64_character_hex_string_here
```

To generate a new key:

```typescript
import { EncryptionService } from './encryption';

const key = EncryptionService.generateKey();
console.log(key); // 64-character hex string
```

## Security Considerations

1. **Key Storage**: In production, use a key management service (AWS KMS, HashiCorp Vault, Azure Key Vault)
2. **Key Rotation**: Implement key rotation policies
3. **IV Uniqueness**: Never reuse IVs with the same key
4. **Authentication**: GCM mode provides authenticated encryption (AEAD)

## Format

Encrypted data is stored in the format: `iv:authTag:ciphertext`

- `iv`: 16-byte initialization vector (hex-encoded)
- `authTag`: 16-byte authentication tag (hex-encoded)
- `ciphertext`: Encrypted data (hex-encoded)

## Requirements

**Validates: Requirements 19.1** - Encrypt User_Profile data at rest using AES-256 encryption
