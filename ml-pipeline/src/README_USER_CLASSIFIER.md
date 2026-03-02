# User Classifier

## Overview

The User Classifier implements K-Means clustering to group users with similar characteristics. It uses demographic, economic, and geographic features to assign users to one or more groups, enabling personalized scheme recommendations.

## Features

- **K-Means Clustering**: Groups users into 25 clusters based on profile similarity
- **Confidence-Based Assignment**: Assigns users to default group when confidence < 70%
- **Multi-Group Support**: Users near cluster boundaries can belong to multiple groups
- **Feature Extraction**: Converts user profiles to ~50-dimensional feature vectors
- **Model Persistence**: Save and load trained models
- **Cluster Analysis**: Compute and store typical profile characteristics for each cluster

## Architecture

```
UserProfile → FeatureExtractor → StandardScaler → K-Means → Group Assignment
                                                              ↓
                                                         Confidence Check
                                                              ↓
                                                    High (≥70%) | Low (<70%)
                                                         ↓              ↓
                                                  Actual Cluster   Default Group
```

## Usage

### Training a Model

```python
from user_classifier import UserClassifier

# Initialize classifier
classifier = UserClassifier(n_clusters=25, random_state=42)

# Prepare training data
profiles = [
    {
        'user_id': 'user-1',
        'age': 30,
        'gender': 'male',
        'marital_status': 'single',
        'family_size': 1,
        'annual_income': 500000,
        'employment_status': 'employed',
        'state': 'Maharashtra',
        'rural_urban': 'urban',
        'education_level': 'graduate',
        'caste': 'general',
        'disability': False,
    },
    # ... more profiles
]

# Train the model
metrics = classifier.train(profiles)
print(f"Training complete. Inertia: {metrics['inertia']}")

# Save the model
classifier.save_model('models/user_classifier.pkl')
```

### Classifying Users

```python
# Load trained model
classifier = UserClassifier()
classifier.load_model('models/user_classifier.pkl')

# Classify a user
user_profile = {
    'user_id': 'new-user',
    'age': 28,
    'gender': 'female',
    # ... other fields
}

result = classifier.classify_user(user_profile)

print(f"User ID: {result['user_id']}")
print(f"Assigned Groups: {result['groups']}")
print(f"Confidence: {result['confidence']:.2%}")
```

### Using the Training Script

```bash
# Train with sample data
python scripts/train_user_classifier.py \
    --n-samples 1000 \
    --n-clusters 25 \
    --output models/user_classifier.pkl

# Train with custom data
python scripts/train_user_classifier.py \
    --input data/user_profiles.json \
    --n-clusters 25 \
    --output models/user_classifier.pkl
```

## Configuration

### Classifier Parameters

- `n_clusters` (int): Number of clusters (default: 25)
- `random_state` (int): Random seed for reproducibility (default: 42)

### Classification Parameters

- `confidence_threshold` (float): Minimum confidence for cluster assignment (default: 0.7)
- `multi_group_threshold` (float): Distance multiplier for multi-group assignment (default: 1.2)

## Feature Vector

The classifier extracts a ~50-dimensional feature vector from each user profile:

### Numerical Features (3)
- Age (normalized to 0-1, range 18-100)
- Annual income (log-normalized to 0-1)
- Family size (normalized to 0-1, range 1-10)

### Categorical Features (one-hot encoded)
- Gender (4 categories)
- Marital status (4 categories)
- Employment status (5 categories)
- Education level (6 categories)
- Caste (5 categories)
- Rural/urban (3 categories)
- State (20 top states)

### Binary Features (1)
- Disability (0 or 1)

**Total: ~51 features**

## Cluster Metadata

Each cluster stores:

- **Size**: Number of members
- **Centroid**: Cluster center in feature space
- **Typical Profile**: Common characteristics
  - Age range
  - Income range
  - Most common gender, marital status, employment, education, state, rural/urban
- **Feature Statistics**: Mean, std, min, max for each feature

## Evaluation Metrics

### Silhouette Score
- Range: -1 to 1
- Interpretation:
  - > 0.7: Excellent clustering
  - > 0.5: Good clustering
  - > 0.3: Fair clustering
  - < 0.3: Poor clustering

### Inertia
- Within-cluster sum of squares
- Lower is better
- Useful for comparing different numbers of clusters

## Requirements

Validates the following requirements from the design document:

- **Requirement 2.1**: User classification and group assignment
- **Requirement 2.2**: Classification using demographic, income, location, occupation
- **Requirement 2.3**: Classification within 5 seconds
- **Requirement 2.4**: Store group assignments with profile
- **Requirement 2.5**: Default group for confidence < 70%

## Testing

### Property-Based Tests

Run property tests to verify universal correctness:

```bash
pytest tests/test_user_classifier_properties.py -v
```

Key properties tested:
- **Property 4**: User classification assignment (within 5 seconds, at least one group)
- **Property 6**: Low confidence default assignment (< 70% → default group)

### Unit Tests

Run unit tests for specific scenarios:

```bash
pytest tests/test_user_classifier.py -v
```

## Performance

- **Training**: O(n × k × i × d) where n=samples, k=clusters, i=iterations, d=dimensions
  - Typical: 1000 samples, 25 clusters, ~10 iterations → ~2-5 seconds
- **Classification**: O(k × d) where k=clusters, d=dimensions
  - Typical: 25 clusters, 51 dimensions → < 10ms per user
- **Memory**: O(n × d + k × d) for training data and centroids
  - Typical: 1000 samples → ~400KB

## Best Practices

1. **Training Data Size**: Use at least 10× the number of clusters (e.g., 250+ profiles for 25 clusters)
2. **Data Diversity**: Ensure training data covers diverse demographics, incomes, and locations
3. **Regular Retraining**: Retrain monthly or when new user patterns emerge
4. **Silhouette Score**: Aim for > 0.5; adjust cluster count if lower
5. **Confidence Threshold**: Keep at 0.7 for balanced precision/recall
6. **Multi-Group Threshold**: Adjust 1.2 multiplier based on desired boundary sensitivity

## Troubleshooting

### Low Silhouette Score
- Increase training data size
- Adjust number of clusters (try 15-35 range)
- Check for data quality issues (missing values, outliers)
- Ensure sufficient diversity in training data

### Too Many Default Assignments
- Lower confidence threshold (e.g., 0.6)
- Increase training data diversity
- Reduce number of clusters

### Slow Classification
- Reduce number of clusters
- Use batch classification for multiple users
- Cache results for frequently accessed users

## Future Enhancements

- Support for hierarchical clustering
- Dynamic cluster count selection using elbow method
- Online learning for incremental updates
- GPU acceleration for large-scale training
- Cluster visualization and interpretation tools
