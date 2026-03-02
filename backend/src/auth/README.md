# Authentication Service

This module implements JWT-based authentication with RS256 asymmetric encryption for the Personalized Scheme Recommendation System.

## Features

- **JWT Token Generation**: RS256 asymmetric encryption with access tokens (15-min expiry) and refresh tokens (7-day expiry)
- **Password Security**: bcrypt hashing with cost factor 12 and password strength validation
- **User Registration**: Complete profile creation with validation and duplicate checking
- **User Login**: Credential verification with token generation
- **Token Refresh**: Seamless token renewal without re-authentication
- **Property-Based Testing**: Comprehensive tests using fast-check

## Components

### JWT Service (`jwt.service.ts`)
- Generates and verifies JWT tokens using RS256 algorithm
- Automatically generates RSA key pairs if not present
- Separate methods for access and refresh tokens
- Token expiry: Access (15 min), Refresh (7 days)

### Password Service (`password.service.ts`)
- Password hashing using bcrypt with cost factor 12
- Password strength validation:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (@$!%*?&)

### Auth Service (`auth.service.ts`)
- User registration with comprehensive validation
- User login with credential verification
- Token refresh functionality
- User profile retrieval
- Integration with Neo4j database

## API

### Registration
```typescript
const result = await authService.register({
  email: 'user@example.com',
  password: 'SecurePass123!',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    gender: 'male',
    maritalStatus: 'single',
    familySize: 4,
    annualIncome: 500000,
    employmentStatus: 'employed',
    occupation: 'Software Engineer',
    state: 'Maharashtra',
    district: 'Mumbai',
    pincode: '400001',
    educationLevel: 'graduate',
    caste: 'general',
    disability: false,
  }
});

// Returns: { accessToken, refreshToken, expiresIn, user }
```

### Login
```typescript
const result = await authService.login({
  email: 'user@example.com',
  password: 'SecurePass123!'
});

// Returns: { accessToken, refreshToken, expiresIn, user }
```

### Token Refresh
```typescript
const result = await authService.refreshToken(refreshToken);

// Returns: { accessToken, refreshToken, expiresIn, user }
```

### Get User Profile
```typescript
const profile = await authService.getUserProfile(userId);

// Returns: UserProfile (without passwordHash)
```

## Property-Based Tests

The authentication service includes comprehensive property-based tests using fast-check:

### Property 1: Registration Round Trip
Verifies that all profile data is preserved through registration and retrieval.

**Validates**: Requirements 1.1, 1.3

### Property 2: Registration Validation
Ensures invalid profiles are rejected with appropriate error messages.

**Validates**: Requirements 1.2, 1.5

### Property 3: User ID Uniqueness
Confirms all assigned user IDs are unique across the system.

**Validates**: Requirements 1.4

### Property 28: Session Persistence
Validates that refresh tokens remain valid for 7 days.

**Validates**: Requirements 10.5

## Running Tests

```bash
# Run all authentication tests
npm test -- auth.property.test.ts

# Note: Tests require a running Neo4j instance
# Configure connection in .env or test setup:
# NEO4J_URI=bolt://localhost:7687
# NEO4J_USER=neo4j
# NEO4J_PASSWORD=your-password
```

## Security Considerations

1. **RS256 Algorithm**: Uses asymmetric encryption for enhanced security
2. **Password Hashing**: bcrypt with cost factor 12 provides strong protection
3. **Token Expiry**: Short-lived access tokens (15 min) minimize exposure
4. **Refresh Tokens**: 7-day validity balances security and user experience
5. **Input Validation**: Comprehensive validation prevents invalid data
6. **Duplicate Prevention**: Email uniqueness enforced at registration

## Database Schema

User nodes in Neo4j include:
- Authentication: userId, email, passwordHash, emailVerified
- Demographics: firstName, lastName, dateOfBirth, age, gender, maritalStatus, familySize
- Economic: annualIncome, incomeLevel, employmentStatus, occupation, occupationCategory
- Geographic: state, district, pincode, ruralUrban
- Categorical: educationLevel, caste, religion, disability, disabilityType
- System: userGroups, createdAt, updatedAt, lastLoginAt, profileCompleteness

## Future Enhancements

- Email verification workflow
- Password reset functionality
- Multi-factor authentication
- OAuth integration
- Session management and revocation
- Rate limiting for authentication endpoints
