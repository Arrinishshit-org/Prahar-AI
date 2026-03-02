# Profile Management Service

The Profile Management Service handles user profile CRUD operations with transaction support, retry logic, and cache invalidation.

## Features

- **Profile CRUD Operations**: Get, update, and delete user profiles
- **Transaction Support**: All write operations use Neo4j transactions for consistency
- **Retry Logic**: Automatic retry (up to 3 attempts) for failed database operations
- **Cache Invalidation**: Automatically invalidates cached recommendations on profile updates
- **Profile Completeness**: Calculates and tracks profile completion percentage
- **Parameterized Queries**: All database queries use parameters to prevent injection attacks

## Usage

### Initialize the Service

```typescript
import { ProfileService } from './profile/profile.service';
import { initializeNeo4j } from './db/neo4j.config';

const neo4jConnection = initializeNeo4j({
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  username: process.env.NEO4J_USERNAME || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password',
});

await neo4jConnection.connect();
const driver = neo4jConnection.getDriver();

const profileService = new ProfileService(driver);
```

### Get User Profile

```typescript
const profile = await profileService.getProfile(userId);

if (profile) {
  console.log(`User: ${profile.firstName} ${profile.lastName}`);
  console.log(`Profile completeness: ${profile.profileCompleteness}%`);
}
```

### Update User Profile

```typescript
const updates = {
  firstName: 'John',
  lastName: 'Doe',
  annualIncome: 750000,
  occupation: 'Software Engineer',
};

const result = await profileService.updateProfile(userId, updates);
console.log(result.message); // "Profile updated successfully. Recalculating recommendations..."
```

### Delete User Profile

```typescript
const result = await profileService.deleteProfile(userId);
console.log(result.message); // "Profile deleted successfully"
```

### Calculate Profile Completeness

```typescript
const completeness = profileService.calculateProfileCompleteness(profile);

console.log(`Completeness: ${completeness.percentage}%`);
console.log(`Missing fields: ${completeness.missingFields.join(', ')}`);
console.log(`Filled fields: ${completeness.filledFields.join(', ')}`);
```

## Profile Update Behavior

When a profile is updated:

1. **Validation**: Input is validated for correctness (e.g., pincode format, positive income)
2. **Transaction**: Update is executed within a Neo4j transaction
3. **Retry Logic**: If the transaction fails, it's retried up to 3 times with exponential backoff
4. **Derived Fields**: Computed fields (age, incomeLevel, occupationCategory) are automatically updated
5. **Completeness**: Profile completeness percentage is recalculated
6. **Cache Invalidation**: All cached data for the user is invalidated:
   - Recommendations cache
   - User groups cache
   - Classification cache
   - Eligibility scores cache
7. **Reclassification Trigger**: The system triggers user reclassification (handled by classification service)

## Cache Invalidation

The service automatically invalidates the following cache keys on profile updates:

- `recommendations:{userId}` - Cached recommendations
- `user_groups:{userId}` - User group assignments
- `classification:{userId}` - Classification data
- `eligibility:{userId}:*` - All eligibility scores for the user

## Transaction Consistency (Property 35)

All database write operations use Neo4j transactions to ensure atomicity:

- Either all changes succeed, or all are rolled back
- No partial updates are possible
- Derived fields are always consistent with source fields

Example: When updating `annualIncome`, the `incomeLevel` field is automatically updated in the same transaction.

## Retry Logic (Property 36)

Failed database operations are automatically retried:

- **Max Retries**: 3 attempts
- **Backoff Strategy**: Exponential (100ms, 200ms, 400ms)
- **Retry Conditions**: All database errors trigger retry
- **Final Failure**: After 3 failed attempts, the error is thrown to the caller

## Validation Rules

### Required Fields
- firstName, lastName, dateOfBirth, gender, maritalStatus
- familySize, annualIncome, employmentStatus, occupation
- state, district, pincode, educationLevel, caste

### Optional Fields
- religion, disabilityType

### Validation Constraints
- **Pincode**: Must be exactly 6 digits
- **Family Size**: Must be >= 1
- **Annual Income**: Must be >= 0
- **Date of Birth**: Must be a valid date resulting in age 0-150

## Derived Fields

The service automatically computes and updates these fields:

### Age
Calculated from `dateOfBirth`:
```typescript
age = currentYear - birthYear (adjusted for month/day)
```

### Income Level
Determined from `annualIncome`:
- `below_poverty`: < ₹100,000
- `low`: ₹100,000 - ₹500,000
- `middle`: ₹500,000 - ₹1,500,000
- `high`: > ₹1,500,000

### Occupation Category
Categorized from `occupation` string:
- `agriculture`: farmer, agriculture-related
- `education`: teacher, education-related
- `healthcare`: doctor, nurse, health-related
- `technology`: engineer, developer, tech-related
- `business`: business, entrepreneur
- `other`: all others

### Rural/Urban Classification
Determined from `pincode`:
- Currently simplified to `urban` (production would use pincode database)

## Error Handling

The service throws errors for:

- **User Not Found**: When updating/deleting non-existent user
- **Validation Errors**: Invalid input data
- **Database Errors**: After 3 retry attempts
- **Transaction Failures**: When transaction cannot be committed

All errors include descriptive messages for debugging.

## Testing

Property-based tests verify:

- **Property 35**: Transaction consistency - all updates are atomic
- **Property 36**: Retry logic - operations retry up to 3 times

Run tests:
```bash
npm test -- profile.property.test.ts
```

Note: Tests require a running Neo4j instance.

## Integration with Other Services

### Cache Service
- Automatically invalidates cached data on updates
- Uses pattern matching to clear related cache entries

### Classification Service (Future)
- Profile updates trigger reclassification
- User group assignments are recalculated
- Recommendations are regenerated

### Authentication Service
- Shares UserProfile data model
- Profile service handles updates, auth service handles creation

## Security

- **Parameterized Queries**: All Neo4j queries use parameters to prevent injection
- **Password Exclusion**: Profile operations never return password hashes
- **Transaction Isolation**: Updates are isolated from concurrent operations
- **Audit Trail**: All updates modify the `updatedAt` timestamp

## Performance Considerations

- **Connection Pooling**: Uses Neo4j driver's built-in connection pooling
- **Cache Invalidation**: Selective invalidation minimizes cache misses
- **Batch Operations**: Future enhancement for bulk profile updates
- **Index Usage**: Queries use indexed `userId` field for fast lookups
