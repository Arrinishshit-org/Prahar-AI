# Classification Service Implementation Summary

## Overview

The Classification Service provides ML-based user classification functionality for the Personalized Scheme Recommendation System. It interfaces with a trained K-Means model to group users with similar characteristics and stores group assignments in Neo4j.

## Implementation Status

✅ **Task 11.1**: Create classification service API
- Classification service with Python ML model integration
- REST API endpoints for classification operations
- Controller and routes for HTTP handling

✅ **Task 11.2**: Implement user group assignment storage
- BELONGS_TO relationships in Neo4j
- Confidence scores and feature vectors storage
- Automatic reclassification support

✅ **Task 11.3**: Implement classification performance monitoring
- Classification time tracking
- Confidence score logging
- Aggregate performance metrics
- 5-second performance target monitoring

## Architecture

### Components

1. **ClassificationService** (`classification.service.ts`)
   - Core service handling classification logic
   - Python process spawning for ML model inference
   - Neo4j integration for storing group assignments
   - Performance monitoring and caching

2. **ClassificationController** (`classification.controller.ts`)
   - HTTP request handling
   - Input validation
   - Error handling and response formatting

3. **Classification Routes** (`classification.routes.ts`)
   - API endpoint definitions
   - Route-to-controller mapping

4. **Python Classifier Script** (`ml-pipeline/src/classify_user.py`)
   - Loads trained K-Means model
   - Performs user classification
   - Returns results as JSON

### Data Flow

```
HTTP Request
    ↓
Controller
    ↓
Service
    ↓
Check Cache → Cache Hit → Return Cached Result
    ↓ Cache Miss
Get User Profile from Neo4j
    ↓
Spawn Python Process
    ↓
Load K-Means Model
    ↓
Classify User
    ↓
Store BELONGS_TO Relationships
    ↓
Cache Result (24h TTL)
    ↓
Log Performance Metrics
    ↓
Return Classification Result
```

## API Endpoints

### POST /api/classification/classify
Classify a single user into groups.

**Request:**
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
        "incomeRange": [300000, 800000]
      }
    }
  ],
  "confidence": 0.85,
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "User successfully classified"
}
```

### POST /api/classification/reclassify-all
Batch reclassify all users.

**Response:**
```json
{
  "totalUsers": 1000,
  "successCount": 998,
  "failureCount": 2,
  "duration": 45000,
  "errors": [...]
}
```

### GET /api/classification/:userId
Get existing classification for a user.

### GET /api/classification/metrics/performance
Get aggregate performance metrics.

**Response:**
```json
{
  "totalClassifications": 1000,
  "avgTime": 1500,
  "maxTime": 4500,
  "minTime": 800,
  "avgConfidence": 0.82,
  "slowClassifications": 25,
  "performanceScore": 97,
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

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

## Performance Monitoring

### Metrics Tracked

1. **Individual Classification Metrics**
   - Classification time (ms)
   - Confidence score
   - Number of groups assigned
   - Timestamp

2. **Aggregate Metrics**
   - Total classifications
   - Average classification time
   - Min/max classification time
   - Average confidence
   - Count of slow classifications (>5s)
   - Performance score (0-100)

### Performance Requirements

- **Target**: Classification must complete within 5 seconds (Requirement 2.3)
- **Monitoring**: Warnings logged when target exceeded
- **Tracking**: Percentage of classifications meeting target

### Performance Score Calculation

```
performanceScore = 100 - (slowClassifications / totalClassifications * 100)
```

Where:
- 100 = All classifications under 5 seconds
- 0 = All classifications over 5 seconds

## Caching Strategy

### Classification Results
- **Key**: `classification:{userId}`
- **TTL**: 24 hours
- **Invalidation**: On profile update or manual reclassification

### Performance Metrics
- **Individual**: `metrics:classification:{userId}:{timestamp}` (7 day TTL)
- **Aggregate**: `metrics:classification:aggregate` (30 day TTL)

## Error Handling

### Error Types

1. **User Not Found** (404)
   - User doesn't exist in database

2. **Model Not Found** (500)
   - K-Means model file missing

3. **Classification Timeout** (504)
   - Classification exceeds 5-second limit

4. **Python Script Error** (500)
   - Python process fails or returns error

### Retry Logic

- Database operations: 3 retries with exponential backoff
- Python process: Single attempt with 5-second timeout

## Testing

### Unit Tests (`classification.service.test.ts`)
- Cache hit/miss scenarios
- Database query handling
- Performance metrics calculation
- Error handling

### Property-Based Tests (`classification.property.test.ts`)
- User group assignment properties
- Confidence score validation
- Classification profile requirements
- Performance metrics consistency
- Batch processing correctness

**Test Coverage**: 7 unit tests + 7 property-based tests

## Configuration

### Environment Variables

```bash
# Path to trained K-Means model
CLASSIFIER_MODEL_PATH=./ml-pipeline/models/user_classifier.pkl

# Python executable
PYTHON_PATH=python
```

## Integration Points

### With Profile Service
- Profile updates trigger cache invalidation
- Profile data used for classification

### With ML Pipeline
- Trained model loaded from file
- Python script called for inference

### With Cache Service
- Classification results cached
- Performance metrics stored

### With Neo4j
- User profiles retrieved
- Group assignments stored
- BELONGS_TO relationships created

## Requirements Mapping

| Requirement | Implementation |
|-------------|----------------|
| 2.1 - User classification | `classifyUser()` method |
| 2.1 - Batch reclassification | `reclassifyAllUsers()` method |
| 2.3 - 5-second performance | Timeout enforcement + monitoring |
| 2.4 - Store group assignments | `storeGroupAssignments()` method |
| 2.4 - Confidence scores | Stored in BELONGS_TO relationship |
| 2.4 - Feature vectors | Stored in BELONGS_TO relationship |

## Future Enhancements

1. **Model Versioning**: Track which model version was used for classification
2. **A/B Testing**: Support multiple models for comparison
3. **Real-time Updates**: WebSocket notifications for classification completion
4. **Batch Optimization**: Parallel Python processes for faster batch processing
5. **Model Retraining**: Automated retraining based on new user data

## Known Limitations

1. **Python Dependency**: Requires Python runtime and dependencies
2. **Model Size**: Large models may impact startup time
3. **Single Process**: Python spawned per classification (could be optimized with process pool)
4. **Synchronous**: Classification blocks until complete (could be made async with job queue)

## Maintenance

### Model Updates

To update the classification model:

1. Train new model: `python ml-pipeline/scripts/train_user_classifier.py`
2. Update model path in environment variables
3. Restart backend service
4. Run batch reclassification: `POST /api/classification/reclassify-all`

### Monitoring

Monitor these metrics:
- Average classification time
- Performance score
- Cache hit rate
- Error rate

### Troubleshooting

**Issue**: Classifications timing out
- Check Python environment and dependencies
- Verify model file exists and is accessible
- Check system resources (CPU, memory)

**Issue**: Low confidence scores
- Review training data quality
- Consider retraining with more samples
- Adjust confidence threshold

**Issue**: Cache misses
- Check Redis connection
- Verify TTL settings
- Monitor cache memory usage
