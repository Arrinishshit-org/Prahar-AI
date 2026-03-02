# Classification Service

The Classification Service provides user classification functionality using a trained K-Means machine learning model. It groups users with similar characteristics and stores group assignments in Neo4j.

## Features

- **Single User Classification**: Classify individual users into groups based on their profile
- **Batch Reclassification**: Reclassify all users in the system
- **Performance Monitoring**: Track classification times and confidence scores
- **Caching**: Cache classification results for 24 hours
- **Neo4j Integration**: Store BELONGS_TO relationships with confidence scores

## Architecture

The service interfaces with a Python-based K-Means classifier:

```
┌─────────────────┐
│  Node.js API    │
│  (TypeScript)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Classification  │
│    Service      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Python Script  │
│  (classify_user)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  K-Means Model  │
│   (.pkl file)   │
└─────────────────┘
```

## API Endpoints

### POST /api/classification/classify

Classify a single user into groups.

**Request Body:**
```json
{
  "userId": "user-123",
  "confidenceThreshold": 0.7,
  "multiGroupThreshold": 1.2
}
```

**Response:**
```json
{
  "userId": "user-123",
  "groups": [
    {
      "groupId": 5,
      "groupName": "Group 5",
      "description": "User cluster 5",
      "memberCount": 42,
      "typicalProfile": {
        "ageRange": [25, 45],
        "incomeRange": [300000, 800000],
        "commonState": "Maharashtra"
      }
    }
  ],
  "confidence": 0.85,
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "User successfully classified"
}
```

### POST /api/classification/reclassify-all

Batch reclassify all users in the system.

**Response:**
```json
{
  "totalUsers": 1000,
  "successCount": 998,
  "failureCount": 2,
  "duration": 45000,
  "errors": [
    {
      "userId": "user-456",
      "error": "Profile incomplete"
    }
  ]
}
```

### GET /api/classification/:userId

Get existing classification for a user.

**Response:**
```json
{
  "userId": "user-123",
  "groups": [...],
  "confidence": 0.85,
  "features": [0.45, 0.32, ...],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Configuration

Set these environment variables:

```bash
# Path to trained K-Means model
CLASSIFIER_MODEL_PATH=./ml-pipeline/models/user_classifier.pkl

# Python executable path
PYTHON_PATH=python
```

## Model Training

Before using the classification service, train the K-Means model:

```bash
cd ml-pipeline
python scripts/train_user_classifier.py --output models/user_classifier.pkl
```

See `ml-pipeline/src/README_USER_CLASSIFIER.md` for details.

## Performance Requirements

- **Classification Time**: Must complete within 5 seconds per user (Requirement 2.3)
- **Confidence Threshold**: Default 0.7 (70%)
- **Batch Processing**: Processes 50 users in parallel

## Neo4j Schema

### BELONGS_TO Relationship

```cypher
(User)-[BELONGS_TO {
  confidence: Float,
  features: [Float],
  timestamp: DateTime
}]->(UserGroup)
```

### UserGroup Node

```cypher
(:UserGroup {
  groupId: Integer,
  groupName: String,
  description: String,
  memberCount: Integer,
  createdAt: DateTime,
  updatedAt: DateTime
})
```

## Caching Strategy

- **Classification Results**: 24 hour TTL
- **Performance Metrics**: 7 day TTL
- **Cache Keys**:
  - `classification:{userId}` - Classification results
  - `metrics:classification:{userId}:{timestamp}` - Performance metrics

## Error Handling

The service handles these error scenarios:

- **User Not Found**: Returns 404
- **Model Not Found**: Returns 500 with descriptive error
- **Classification Timeout**: Returns 504 after 5 seconds
- **Python Script Error**: Returns 500 with stderr output

## Integration with Profile Service

When a user profile is updated, the profile service should:

1. Invalidate classification cache
2. Optionally trigger reclassification

```typescript
// In profile.service.ts
await this.cacheService.delete(`classification:${userId}`);
```

## Monitoring

Classification metrics are logged for each operation:

```
Classification metrics for user-123: time=1234ms, confidence=0.850, groups=2
```

Metrics are also stored in cache for monitoring dashboards.

## Testing

See `backend/src/classification/__tests__/` for unit and property-based tests.

## Requirements Mapping

- **Requirement 2.1**: User classification and group assignment
- **Requirement 2.3**: 5-second classification performance target
- **Requirement 2.4**: Store User_Group assignments with confidence scores
