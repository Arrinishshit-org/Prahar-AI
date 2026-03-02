#!/usr/bin/env node
/**
 * Database Initialization Script
 * 
 * Initializes the Neo4j database with schema, indexes, and optional seed data.
 * 
 * Usage:
 *   npm run db:init              # Initialize schema only
 *   npm run db:init -- --seed    # Initialize schema and seed data
 *   npm run db:init -- --drop    # Drop existing schema first
 *   npm run db:init -- --verify  # Verify schema only
 */

import * as dotenv from 'dotenv';
import { initializeNeo4j, closeNeo4j } from './neo4j.config';
import { initializeSchema, dropSchema, verifySchema } from './schema';
import { seedCategories } from './seed-data';

// Load environment variables
dotenv.config();

interface InitOptions {
  drop: boolean;
  seed: boolean;
  verify: boolean;
}

async function parseArgs(): Promise<InitOptions> {
  const args = process.argv.slice(2);
  return {
    drop: args.includes('--drop'),
    seed: args.includes('--seed'),
    verify: args.includes('--verify'),
  };
}

async function main() {
  const options = await parseArgs();

  console.log('='.repeat(60));
  console.log('Neo4j Database Initialization');
  console.log('='.repeat(60));
  console.log();

  // Validate environment variables
  const requiredEnvVars = ['NEO4J_URI', 'NEO4J_USERNAME', 'NEO4J_PASSWORD'];
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('✗ Missing required environment variables:');
    missingVars.forEach((varName) => console.error(`  - ${varName}`));
    console.error('\nPlease set these variables in your .env file or environment.');
    process.exit(1);
  }

  // Initialize connection
  const connection = initializeNeo4j({
    uri: process.env.NEO4J_URI!,
    username: process.env.NEO4J_USERNAME!,
    password: process.env.NEO4J_PASSWORD!,
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  try {
    // Connect to database
    console.log('Connecting to Neo4j...');
    console.log(`  URI: ${process.env.NEO4J_URI}`);
    console.log(`  Database: ${process.env.NEO4J_DATABASE || 'neo4j'}`);
    console.log();
    
    await connection.connect();
    console.log();

    // Verify only mode
    if (options.verify) {
      const isValid = await verifySchema(connection);
      console.log();
      
      if (isValid) {
        console.log('✓ Database schema is valid');
        process.exit(0);
      } else {
        console.error('✗ Database schema is invalid or incomplete');
        process.exit(1);
      }
    }

    // Drop existing schema if requested
    if (options.drop) {
      console.log('⚠️  Dropping existing schema...');
      await dropSchema(connection);
      console.log();
    }

    // Initialize schema
    console.log('Creating database schema...');
    const result = await initializeSchema(connection);
    console.log();

    // Report results
    if (result.errors.length > 0) {
      console.warn('⚠️  Schema initialization completed with warnings');
    } else {
      console.log('✓ Schema initialization completed successfully');
    }
    console.log();

    // Seed data if requested
    if (options.seed) {
      console.log('Seeding initial data...');
      await seedCategories(connection);
      console.log();
      console.log('✓ Data seeding completed');
      console.log();
    }

    // Verify schema
    console.log('Verifying schema...');
    const isValid = await verifySchema(connection);
    console.log();

    if (!isValid) {
      console.error('✗ Schema verification failed');
      process.exit(1);
    }

    // Success summary
    console.log('='.repeat(60));
    console.log('Database initialization completed successfully!');
    console.log('='.repeat(60));
    console.log();
    console.log('Summary:');
    console.log(`  - Constraints created: ${result.constraints.length}`);
    console.log(`  - Indexes created: ${result.indexes.length}`);
    console.log(`  - Full-text indexes: ${result.fullTextIndexes.length}`);
    if (options.seed) {
      console.log('  - Seed data: Categories initialized');
    }
    console.log();
    console.log('Next steps:');
    console.log('  1. Start the backend server: npm start');
    console.log('  2. Access Neo4j Browser: http://localhost:7474');
    console.log('  3. Run tests: npm test');
    console.log();

  } catch (error) {
    console.error();
    console.error('✗ Database initialization failed:');
    console.error(error);
    console.error();
    process.exit(1);
  } finally {
    await closeNeo4j();
  }
}

// Run the script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
