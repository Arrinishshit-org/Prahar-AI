# Testing Guide

This document provides comprehensive guidance on testing practices for the Personalized Scheme Recommendation System.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Frameworks](#testing-frameworks)
3. [Test Types](#test-types)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Property-Based Testing](#property-based-testing)
7. [Test Coverage](#test-coverage)
8. [Best Practices](#best-practices)

## Testing Philosophy

We follow a comprehensive testing strategy that includes:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test interactions between components
- **Property-Based Tests**: Verify universal properties across all inputs
- **E2E Tests**: Test complete user journeys through the application

## Testing Frameworks

### Backend (TypeScript/Node.js)

- **Jest**: Unit and integration testing framework
- **fast-check**: Property-based testing library
- **ts-jest**: TypeScript support for Jest

### Frontend (React 19/TypeScript)

- **Vitest**: Fast unit testing framework
- **React Testing Library**: Component testing utilities
- **Playwright**: End-to-end testing framework
- **fast-check**: Property-based testing (can be used with Vitest)

### ML Pipeline (Python)

- **pytest**: Unit and integration testing framework
- **Hypothesis**: Property-based testing library
- **pytest-cov**: Coverage reporting

## Test Types

### Unit Tests

Test individual functions, classes, and components in isolation.

**Location:**
- Backend: `backend/src/**/__tests__/*.test.ts`
- Frontend: `frontend_new/src/**/*.test.tsx`
- ML Pipeline: `ml-pipeline/tests/test_*.py`

**Example (Backend):**
```typescript
import { calculateEligibilityScore } from '../eligibility';

describe('calculateEligibilityScore', () => {
  it('should return 1.0 for perfect match', () => {
    const userVector = [1, 0, 1, 0];
    const schemeVector = [1, 0, 1, 0];
    const score = calculateEligibilityScore(userVector, schemeVector);
    expect(score).toBe(1.0);
  });
});
```

### Integration Tests

Test interactions between multiple components.

**Example (Backend):**
```typescript
describe('User Registration Flow', () => {
  it('should register user and assign to groups', async () => {
    const profile = createMockUserProfile();
    const { userId } = await registrationService.register(profile);
    
    const classification = await classificationService.classify(userId);
    expect(classification.groups.length).toBeGreaterThan(0);
  });
});
```

### Property-Based Tests

Verify universal properties that should hold for all inputs.

**Example (Backend with fast-check):**
```typescript
import fc from 'fast-check';
import { userProfileArbitrary } from '../test/arbitraries';

describe('Property: Registration Round Trip', () => {
  it('should preserve all profile data', async () => {
    await fc.assert(
      fc.asyncProperty(
        userProfileArbitrary(),
        async (profile) => {
          const { userId } = await register(profile);
          const retrieved = await getProfile(userId);
          
          expect(retrieved.email).toBe(profile.email);
          expect(retrieved.age).toBe(profile.age);
          // ... verify all fields
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Example (Python with Hypothesis):**
```python
from hypothesis import given, strategies as st
from tests.conftest import user_profile_strategy

@given(user_profile_strategy())
def test_feature_extraction_preserves_data(profile):
    """Property: Feature extraction should preserve key profile data"""
    features = extract_features(profile)
    
    assert features is not None
    assert len(features) > 0
    assert all(0 <= f <= 1 for f in features)  # Normalized
```

### E2E Tests

Test complete user journeys through the application.

**Example (Playwright):**
```typescript
import { test, expect } from '@playwright/test';

test('Anonymous user can browse and view schemes', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Browse Schemes');
  
  await expect(page.locator('.scheme-card')).toHaveCount(20);
  
  await page.click('.scheme-card:first-child');
  await expect(page.locator('h1')).toContainText('Scheme');
});
```

## Running Tests

### Backend

```bash
# Run all tests
cd backend
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- cache.test.ts

# Run property-based tests
npm test -- --testNamePattern="Property:"
```

### Frontend

```bash
# Run unit tests
cd frontend_new
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npx playwright test --headed

# Run specific E2E test
npx playwright test example.spec.ts
```

### ML Pipeline

```bash
# Run all tests
cd ml-pipeline
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_classification.py

# Run property-based tests only
pytest -m property

# Run with verbose output
pytest -v
```

### Run All Tests (from root)

```bash
npm test
```

## Writing Tests

### Test Structure

Follow the AAA pattern:
- **Arrange**: Set up test data and dependencies
- **Act**: Execute the code under test
- **Assert**: Verify the results

```typescript
describe('Feature', () => {
  it('should do something', () => {
    // Arrange
    const input = createTestData();
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### Using Test Fixtures

**Backend:**
```typescript
import { createMockUserProfile, createMockScheme } from '../test/fixtures';

const user = createMockUserProfile({ age: 25 });
const scheme = createMockScheme({ category: 'education' });
```

**Frontend:**
```typescript
import { renderWithProviders, mockUserProfile } from '../test/utils';

const { getByText } = renderWithProviders(<Component user={mockUserProfile} />);
```

**Python:**
```python
def test_classification(sample_user_profile, sample_scheme):
    result = classify_user(sample_user_profile)
    assert result is not None
```

### Mocking

**Backend (Jest):**
```typescript
jest.mock('../services/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));
```

**Frontend (Vitest):**
```typescript
vi.mock('../api/client', () => ({
  fetchSchemes: vi.fn(() => Promise.resolve(mockSchemes)),
}));
```

**Python (pytest):**
```python
def test_with_mock(mocker):
    mock_api = mocker.patch('src.api.fetch_schemes')
    mock_api.return_value = []
    
    result = get_recommendations()
    assert result == []
```

## Property-Based Testing

### When to Use

Use property-based testing for:
- Data transformations that should preserve properties
- Serialization/deserialization round trips
- Mathematical operations with invariants
- Input validation and error handling
- Caching and idempotency

### Writing Properties

**Good Properties:**
- Round trip: `deserialize(serialize(x)) == x`
- Idempotency: `f(f(x)) == f(x)`
- Ordering: `sorted(sorted(x)) == sorted(x)`
- Invariants: `0 <= score <= 1`

**Example:**
```typescript
// Property: Eligibility score is always between 0 and 1
fc.assert(
  fc.property(
    userProfileArbitrary(),
    schemeArbitrary(),
    (user, scheme) => {
      const score = calculateEligibility(user, scheme);
      return score >= 0 && score <= 1;
    }
  )
);
```

### Custom Generators

**Backend (fast-check):**
```typescript
// See backend/src/test/arbitraries.ts for examples
export function userProfileArbitrary() {
  return fc.record({
    email: fc.emailAddress(),
    age: fc.integer({ min: 18, max: 100 }),
    // ...
  });
}
```

**Python (Hypothesis):**
```python
# See ml-pipeline/tests/conftest.py for examples
from hypothesis import strategies as st

@st.composite
def user_profile_strategy(draw):
    return {
        'age': draw(st.integers(min_value=18, max_value=100)),
        'income': draw(st.integers(min_value=0, max_value=10000000)),
        # ...
    }
```

## Test Coverage

### Coverage Thresholds

All workspaces maintain minimum 70% coverage:
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

### Viewing Coverage Reports

**Backend:**
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

**Frontend:**
```bash
npm test -- --coverage
open coverage/index.html
```

**Python:**
```bash
pytest --cov=src --cov-report=html
open htmlcov/index.html
```

### Coverage Best Practices

- Focus on critical paths and business logic
- Don't chase 100% coverage - focus on meaningful tests
- Exclude generated code and type definitions
- Review coverage reports regularly

## Best Practices

### General

1. **Write tests first** (TDD) when possible
2. **Keep tests simple** and focused on one thing
3. **Use descriptive test names** that explain what is being tested
4. **Avoid test interdependencies** - each test should be independent
5. **Clean up after tests** - use afterEach/afterAll hooks
6. **Mock external dependencies** - databases, APIs, file system
7. **Test edge cases** - empty inputs, null values, boundary conditions

### Property-Based Testing

1. **Start with simple properties** and add complexity gradually
2. **Use appropriate number of runs** (100-1000 depending on complexity)
3. **Leverage shrinking** to find minimal failing cases
4. **Document properties** with comments explaining what is being verified
5. **Combine with example-based tests** for specific edge cases

### Performance

1. **Keep unit tests fast** (< 100ms each)
2. **Use test.skip** for slow tests during development
3. **Run integration tests separately** from unit tests
4. **Parallelize test execution** when possible
5. **Use test fixtures** to avoid repeated setup

### Debugging

1. **Use test.only** to focus on specific tests
2. **Add console.log** statements for debugging
3. **Use debugger** statements with --inspect flag
4. **Check test output** for helpful error messages
5. **Review coverage reports** to find untested code

## Continuous Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Pull requests (GitHub Actions)
- Main branch merges

### CI Configuration

See `.github/workflows/test.yml` for CI setup.

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [fast-check Documentation](https://fast-check.dev/)
- [Hypothesis Documentation](https://hypothesis.readthedocs.io/)
- [React Testing Library](https://testing-library.com/react)
- [pytest Documentation](https://docs.pytest.org/)

## Getting Help

- Check existing tests for examples
- Review test utilities in `src/test/` directories
- Ask in team chat or code reviews
- Consult the design document for property definitions
