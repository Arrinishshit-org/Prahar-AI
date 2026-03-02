# TLS 1.3 Configuration Guide

This guide explains how to configure TLS 1.3 for secure data in transit.

## Overview

The system implements TLS 1.3 encryption for all HTTP and WebSocket connections to protect data in transit. This satisfies **Requirement 19.2**: "THE System SHALL encrypt all data in transit using TLS 1.3 or higher."

## Features

- **TLS 1.3 Enforcement**: Minimum TLS version set to 1.3
- **Secure Cipher Suites**: Only AEAD ciphers (AES-GCM, ChaCha20-Poly1305)
- **Perfect Forward Secrecy**: Ephemeral key exchange
- **Certificate Management**: Support for custom certificates

## Configuration

### Environment Variables

Set the following environment variables to enable TLS:

```bash
# Enable TLS
TLS_ENABLED=true

# Certificate paths
TLS_KEY_PATH=/path/to/private-key.pem
TLS_CERT_PATH=/path/to/certificate.pem
TLS_CA_PATH=/path/to/ca-bundle.pem  # Optional
```

### Certificate Generation

#### Production Certificates

For production, obtain certificates from a trusted Certificate Authority (CA):

1. **Let's Encrypt** (Free, automated):
   ```bash
   # Install certbot
   sudo apt-get install certbot
   
   # Generate certificate
   sudo certbot certonly --standalone -d yourdomain.com
   
   # Certificates will be in /etc/letsencrypt/live/yourdomain.com/
   ```

2. **Commercial CA** (DigiCert, GlobalSign, etc.):
   - Generate CSR (Certificate Signing Request)
   - Submit to CA
   - Install signed certificate

#### Development Certificates (Self-Signed)

For development and testing, generate self-signed certificates:

```bash
# Generate private key
openssl genrsa -out private-key.pem 2048

# Generate certificate signing request
openssl req -new -key private-key.pem -out csr.pem

# Generate self-signed certificate (valid for 365 days)
openssl x509 -req -days 365 -in csr.pem -signkey private-key.pem -out certificate.pem

# Set environment variables
export TLS_KEY_PATH=./private-key.pem
export TLS_CERT_PATH=./certificate.pem
```

**Note**: Self-signed certificates will trigger browser warnings. For development, you can:
- Add exception in browser
- Use `NODE_TLS_REJECT_UNAUTHORIZED=0` (not recommended for production!)

## Usage

### Starting HTTPS Server

```typescript
import express from 'express';
import { createHTTPSServer } from './config/tls.config';

const app = express();

// Configure routes...

// Create HTTPS server with TLS 1.3
const server = createHTTPSServer(app);

if (server) {
  server.listen(443, () => {
    console.log('HTTPS server listening on port 443');
  });
} else {
  // Fallback to HTTP for development
  app.listen(3000, () => {
    console.log('HTTP server listening on port 3000');
  });
}
```

### TLS Configuration Details

The system enforces the following TLS configuration:

```typescript
{
  minVersion: 'TLSv1.3',
  maxVersion: 'TLSv1.3',
  ciphers: [
    'TLS_AES_256_GCM_SHA384',      // AES-256-GCM
    'TLS_CHACHA20_POLY1305_SHA256', // ChaCha20-Poly1305
    'TLS_AES_128_GCM_SHA256',      // AES-128-GCM
  ],
  honorCipherOrder: true,
  secureOptions: SSL_OP_NO_SSLv2 | SSL_OP_NO_SSLv3 | SSL_OP_NO_TLSv1 | SSL_OP_NO_TLSv1_1
}
```

## Security Considerations

### TLS 1.3 Benefits

1. **Faster Handshake**: 1-RTT handshake (vs 2-RTT in TLS 1.2)
2. **0-RTT Resumption**: Even faster reconnections
3. **Improved Security**: Removed weak ciphers and algorithms
4. **Perfect Forward Secrecy**: Always enabled
5. **Encrypted Handshake**: More metadata protected

### Cipher Suites

TLS 1.3 uses only AEAD (Authenticated Encryption with Associated Data) ciphers:

- **TLS_AES_256_GCM_SHA384**: AES-256 in GCM mode (strongest)
- **TLS_CHACHA20_POLY1305_SHA256**: ChaCha20-Poly1305 (mobile-optimized)
- **TLS_AES_128_GCM_SHA256**: AES-128 in GCM mode (fast)

### Certificate Management

1. **Rotation**: Rotate certificates before expiry
2. **Storage**: Store private keys securely (never in version control)
3. **Permissions**: Restrict key file permissions (chmod 600)
4. **Monitoring**: Monitor certificate expiry dates

### HSTS (HTTP Strict Transport Security)

Enable HSTS to force HTTPS:

```typescript
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});
```

## Testing

### Verify TLS Configuration

```bash
# Test TLS version
openssl s_client -connect localhost:443 -tls1_3

# Check certificate
openssl s_client -connect localhost:443 -showcerts

# Test cipher suites
nmap --script ssl-enum-ciphers -p 443 localhost
```

### SSL Labs Test

For production, test your TLS configuration:
- Visit: https://www.ssllabs.com/ssltest/
- Enter your domain
- Aim for A+ rating

## Troubleshooting

### Common Issues

1. **Certificate not found**
   - Check TLS_KEY_PATH and TLS_CERT_PATH
   - Verify file permissions
   - Ensure paths are absolute or relative to project root

2. **TLS handshake failed**
   - Verify certificate is valid
   - Check certificate chain (include intermediate certificates)
   - Ensure client supports TLS 1.3

3. **Browser warnings**
   - Self-signed certificates trigger warnings
   - Add certificate to trusted store or use proper CA

4. **Performance issues**
   - Enable HTTP/2 for better performance
   - Use session resumption (0-RTT)
   - Consider CDN for static assets

## Production Deployment

### Recommended Setup

1. **Load Balancer**: Terminate TLS at load balancer (AWS ALB, Nginx)
2. **Certificate Management**: Use AWS Certificate Manager or Let's Encrypt
3. **Monitoring**: Monitor TLS handshake failures and certificate expiry
4. **Backup**: Keep backup certificates and keys securely

### AWS Example

```bash
# Use AWS Certificate Manager
aws acm request-certificate \
  --domain-name yourdomain.com \
  --validation-method DNS

# Configure ALB with TLS 1.3
aws elbv2 create-listener \
  --load-balancer-arn <arn> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<cert-arn> \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06
```

## References

- [TLS 1.3 RFC 8446](https://tools.ietf.org/html/rfc8446)
- [Node.js TLS Documentation](https://nodejs.org/api/tls.html)
- [OWASP TLS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

## Requirements

**Validates: Requirements 19.2** - Encrypt all data in transit using TLS 1.3 or higher
