# Backend Test Utilities

This directory contains shared test utilities, fixtures, and configurations for the backend test suite.

## Files

### `setup.ts`
Global test setup and configuration. Runs before all tests to:
- Set environment variables for testing
- Configure Jest timeouts
- Set up global lifecycle hooks

### `fixtures.ts`
Mock data generators and test fixtures:
- `createMockUserProfile()` - Generate valid user profiles
- `createMockScheme()` - Generate valid schemes
- `createMockEligibilityScore()` - Generate eligibility scores
- `createMockNudge()` - Generate nudges
- `createMockConversationSession()` - Generate conversation sessions
- `createMockRedisClient()` - Mock Redis client
- `createMockNeo4jSession()` - Mock Neo4j session
- `sleep()` - Utility for async testing

### `arbitraries.ts`
fast-check arbitraries for property-based testing:
- `userProfileArbitrary()` - Generate random valid user profiles
- `schemeArbitrary()` - Generate random valid schemes
- `messageArbitrary()` - Generate random valid messages
- `nudgeArbitrary()` - Generate random valid nudges
- `intentArbitrary()` - Generate random valid intents
- `entityArbitrary()` - Generate random valid entities
- `toolResultArbitrary()` - Generate random tool results
- `eligibilityScoreArbitrary()` - Generate random eligibility scores
- `featureVectorArbitrary()` - Generate random feature vectors

### `example.property.test.ts`
Example property-based tests demonstrating:
- Message serialization round trips
- Email validation
- Age consistency
- Income level consistency
- String length constraints
- Pincode format validation
- Family size constraints

## Usage

### Using Fixtures

```typescript
import { createMockUserProfile, createMockScheme } from '../test/fixtures';

describe('My Test', () => {
  it('should do something', () => {
    const user = createMockUserProfile({ age: 25 });
    const scheme = createMockScheme({ category: 'education' });
    
    // Use in your test
  });
});
```

### Using Arbitraries for Property-Based Testing

```typescript
import fc from 'fast-check';
import { userProfileArbitrary } from '../test/arbitraries';

describe('Property Test', () => {
  it('should verify property', () => {
    fc.assert(
      fc.property(
        userProfileArbitrary(),
        (profile) => {
          // Test property
          expect(profile.age).toBeGreaterThanOrEqual(18);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Using Mock Clients

```typescript
import { createMockRedisClient } from '../test/fixtures';

describe('Cache Test', () => {
  it('should cache data', async () => {
    const redis = createMockRedisClient();
    
    await redis.set('key', 'value');
    const result = await redis.get('key');
    
    expect(result).toBe('value');
  });
});
```

## Best Practices

1. **Reuse fixtures** - Don't create new mock data in every test
2. **Override defaults** - Use fixture parameters to customize test data
3. **Keep tests isolated** - Each test should be independent
4. **Use property tests** - Verify universal properties across all inputs
5. **Mock external dependencies** - Use mock clients for Redis, Neo4j, etc.

## Adding New Utilities

When adding new test utilities:
1. Add to appropriate file (fixtures.ts or arbitraries.ts)
2. Export the function
3. Add JSDoc comments
4. Update this README
5. Add example usage in example.property.test.ts if applicable
