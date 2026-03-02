/**
 * Example: Using TLS 1.3 Configuration
 * 
 * This example shows how to create an HTTPS server with TLS 1.3
 */

import express from 'express';
import { createHTTPSServer, getTLSConfig } from './tls.config';

// Create Express app
const app = express();

// Configure middleware
app.use(express.json());

// Add HSTS header for security
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});

// Example route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', secure: req.secure });
});

// Create HTTPS server with TLS 1.3
const httpsServer = createHTTPSServer(app);

if (httpsServer) {
  // TLS is enabled - start HTTPS server
  const port = process.env.HTTPS_PORT || 443;
  httpsServer.listen(port, () => {
    console.log(`HTTPS server listening on port ${port}`);
    console.log('TLS 1.3 encryption enabled for data in transit');
    
    const config = getTLSConfig();
    if (config) {
      console.log('TLS Configuration:');
      console.log('  - Min Version:', config.minVersion);
      console.log('  - Max Version:', config.maxVersion);
      console.log('  - Cipher Suites:', config.ciphers);
    }
  });
} else {
  // TLS is disabled - start HTTP server (development only)
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`HTTP server listening on port ${port}`);
    console.warn('WARNING: TLS is disabled. Data in transit is not encrypted.');
    console.warn('Set TLS_ENABLED=true to enable HTTPS.');
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (httpsServer) {
    httpsServer.close(() => {
      console.log('HTTPS server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
