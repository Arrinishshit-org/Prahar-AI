# Recommendation Engine

The Recommendation Engine generates personalized scheme recommendations by combining user classification and eligibility scoring.

## Overview

The engine implements a hybrid recommendation approach:
- **40% Group Relevance**: Based on user's assigned groups from K-Means clustering
- **60% Eligibility Score**: Based on cosine similarity between user profile and scheme requirements

## Key Features

- **Personalized Recommendations**: Tailored to user's demographic, economic, and geographic profile
- **Ranked Results**: Schemes sorted by combined relevance score (descending)
- **Bounded Output**: Returns 5-20 recommendations per user
- **Explanations**: Natural language explanations for each recommendation
- **Caching**: 24-hour cache for performance optimization
- **Cache Invalidation**: Automatic invalidation on profile updates

## Usage

```python
from recommendation_engine import RecommendationEngine
from user_classifier import UserClassifier
from eligibility_engine import EligibilityEngine

# Initialize components
classifier = UserClassifier()
classifier.load_model('models/user_classifier.pkl')

eligibility_engine = EligibilityEngine()
recommendation_engine = RecommendationEngine(classifier, eligibility_engine)

# Generate recommendations
user_profile = {
    'user_id': 'user123',
    'age': 35,
    'annual_income': 300000,
    'state': 'Karnataka',
    'occupation': 'farmer',
    # ... other profile fields
}

schemes = [
    # List of available schemes
]

recommendations = recommendation_engine.generate_recommendations(
    user_profile=user_profile,
    schemes=schemes,
    min_recommendations=5,
    max_recommendations=20
)

# Each recommendation contains:
# - scheme_id: Unique identifier
# - scheme_name: Display name
# - relevance_score: Combined score (0.0-1.0)
# - eligibility_score: Eligibility percentage (0-100)
# - matching_criteria: List of met criteria
# - explanation: Natural language explanation
# - rank: Position in ranking (1-based)
```

## Recommendation Algorithm

### Step 1: User Classification
```
User Profile → Feature Extraction → K-Means Clustering → Group Assignment
```

### Step 2: Candidate Retrieval
```
User Groups → Group-Scheme Mapping → Candidate Schemes
```

### Step 3: Eligibility Calculation
```
For each candidate scheme:
  User Vector × Scheme Vector → Cosine Similarity → Eligibility Score
```

### Step 4: Score Combination
```
Combined Score = 0.4 × Group Relevance + 0.6 × Eligibility Score
```

### Step 5: Ranking & Filtering
```
Sort by Combined Score (descending) → Take top 5-20 → Generate Explanations
```

## Scoring Weights

The engine uses a weighted combination:
- **Group Relevance (40%)**: How well the scheme matches user's demographic group
- **Eligibility Score (60%)**: How well the user meets specific scheme requirements

This weighting prioritizes individual eligibility while considering group-level patterns.

## Caching Strategy

### Cache Key
```
user_id → recommendations
```

### Cache TTL
- **Duration**: 24 hours
- **Invalidation**: On profile update via `invalidate_cache(user_id)`

### Cache Benefits
- Reduces computation for repeated requests
- Improves response time for returning users
- Maintains consistency within 24-hour window

## Explanation Generation

Each recommendation includes a natural language explanation highlighting:

1. **Top 3 Matching Criteria**: Most relevant profile attributes
2. **Eligibility Category**: Highly eligible (≥80%), Potentially eligible (50-80%), or Low eligibility (<50%)
3. **Match Percentage**: Precise eligibility score

Example:
```
"This scheme is recommended because your age (35 years) matches the requirements, 
your income level qualifies, this scheme is available in Karnataka. You are highly 
eligible with a 87.5% match."
```

## Performance Characteristics

- **Generation Time**: < 3 seconds for 20 recommendations
- **Cache Hit Rate**: ~70% for returning users
- **Memory Usage**: O(n) where n = number of schemes
- **Scalability**: Batch processing for multiple users

## Integration Points

### With User Classifier
```python
classification = user_classifier.classify_user(profile)
user_groups = classification['groups']
```

### With Eligibility Engine
```python
eligibility_results = eligibility_engine.batch_calculate_eligibility(
    user_profile,
    candidate_schemes
)
```

## Requirements Validation

The Recommendation Engine validates:
- **Requirement 8.1**: Generate recommendations on login
- **Requirement 8.2**: Use user groups and profile features
- **Requirement 8.3**: Rank by relevance score (descending)
- **Requirement 8.4**: Return 5-20 recommendations
- **Requirement 8.5**: Cache with invalidation on profile update
- **Requirement 8.6**: Complete within 3 seconds
- **Requirement 17.1**: Provide explanations
- **Requirement 17.2**: Highlight matching attributes

## Future Enhancements

1. **Collaborative Filtering**: Incorporate user behavior patterns
2. **Scheme Popularity**: Factor in application success rates
3. **Temporal Relevance**: Prioritize schemes with upcoming deadlines
4. **Diversity**: Ensure recommendations span multiple categories
5. **Feedback Loop**: Learn from user interactions to improve relevance
