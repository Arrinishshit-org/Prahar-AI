# Eligibility Engine

## Overview

The Eligibility Engine calculates how well a user matches a scheme's requirements using cosine similarity between feature vectors. It provides detailed explanations of eligibility, including which criteria are met and which are not.

## Features

- **Cosine Similarity Calculation**: Computes similarity between user profile and scheme requirement vectors
- **Score Categorization**: Categorizes eligibility as highly_eligible (≥80%), potentially_eligible (50-80%), or low_eligibility (<50%)
- **Criteria Analysis**: Identifies met and unmet criteria with detailed explanations
- **Batch Processing**: Efficiently calculates eligibility for multiple schemes
- **Caching**: Caches results for 24 hours to improve performance
- **Natural Language Explanations**: Generates user-friendly explanations with top 3 matching criteria

## Usage

### Basic Eligibility Calculation

```python
from src.eligibility_engine import EligibilityEngine

engine = EligibilityEngine()

user_profile = {
    'user_id': 'user-123',
    'age': 30,
    'annual_income': 500000,
    'state': 'Maharashtra',
    'education_level': 'graduate',
    'caste': 'general',
    'disability': False,
    # ... other profile fields
}

scheme = {
    'scheme_id': 'scheme-456',
    'scheme_name': 'Education Scholarship',
    'eligibility': {
        'age_min': 18,
        'age_max': 35,
        'income_max': 800000,
        'states': ['Maharashtra', 'Karnataka'],
        'education_levels': ['graduate', 'postgraduate'],
    }
}

result = engine.calculate_eligibility(user_profile, scheme)

print(f"Eligibility Score: {result['percentage']:.1f}%")
print(f"Category: {result['category']}")
print(f"Met Criteria: {len(result['met_criteria'])}")
print(f"Unmet Criteria: {len(result['unmet_criteria'])}")
```

### Batch Eligibility Calculation

```python
schemes = [scheme1, scheme2, scheme3, ...]

results = engine.batch_calculate_eligibility(user_profile, schemes)

for result in results:
    print(f"Scheme {result['scheme_id']}: {result['percentage']:.1f}%")
```

### Generate Explanation

```python
eligibility_result = engine.calculate_eligibility(user_profile, scheme)

explanation = engine.generate_explanation(
    eligibility_result,
    user_profile,
    scheme
)

print(explanation['summary'])
print("\nStrengths:")
for strength in explanation['strengths']:
    print(f"  - {strength}")

print("\nGaps:")
for gap in explanation['gaps']:
    print(f"  - {gap}")

print("\nRecommendations:")
for rec in explanation['recommendations']:
    print(f"  - {rec}")
```

## Algorithm

### Cosine Similarity

The engine uses cosine similarity to measure how well a user matches a scheme:

1. **User Vector**: Extract features from user profile using FeatureExtractor
2. **Scheme Vector**: Convert scheme requirements into a feature vector
3. **Similarity**: Calculate cosine similarity between the two vectors
4. **Score**: Convert similarity to 0-100% range

```
cosine_similarity = (U · S) / (||U|| × ||S||)
```

Where:
- U is the user feature vector
- S is the scheme requirement vector
- · is the dot product
- ||·|| is the vector magnitude

### Categorization

Eligibility scores are categorized as:

- **Highly Eligible** (≥80%): User meets most or all requirements
- **Potentially Eligible** (50-80%): User meets many requirements
- **Low Eligibility** (<50%): User meets few requirements

### Criteria Analysis

The engine analyzes specific criteria:

- **Age**: User age within scheme's age range
- **Income**: User income below scheme's maximum
- **Location**: User state in scheme's eligible states
- **Occupation**: User occupation in scheme's eligible occupations
- **Education**: User education level in scheme's requirements
- **Caste**: User caste category in scheme's eligible categories
- **Disability**: User disability status matches scheme requirement

## Performance

### Caching

Results are cached for 24 hours to improve performance:

- Cache key: `{user_id}:{scheme_id}`
- Expiration: 24 hours from calculation
- Automatic invalidation on expiry

### Batch Processing

Batch calculation is optimized:

- User vector extracted once and reused
- Scheme vectors cached indefinitely
- Results cached individually

## Testing

### Property-Based Tests

The engine includes comprehensive property-based tests using Hypothesis:

- **Property 24**: Eligibility Score Range (0-100%)
- **Property 25**: Eligibility Score Categorization
- **Property 26**: Eligibility Explanation Completeness
- **Property 43**: Top Matching Criteria Display

Run property tests:

```bash
pytest tests/test_eligibility_engine_properties.py -v
```

### Unit Tests

Unit tests cover specific examples and edge cases:

- Cosine similarity calculations
- Categorization logic
- Criteria analysis
- Batch processing
- Caching functionality
- Explanation generation

Run unit tests:

```bash
pytest tests/test_eligibility_engine.py -v
```

## API Reference

### EligibilityEngine

#### `calculate_eligibility(user_profile, scheme)`

Calculate eligibility score for a user-scheme pair.

**Parameters:**
- `user_profile` (dict): User profile dictionary
- `scheme` (dict): Scheme dictionary with eligibility requirements

**Returns:**
- dict with keys:
  - `score` (float): Raw cosine similarity (0.0-1.0)
  - `percentage` (float): Score as percentage (0-100)
  - `category` (str): Eligibility category
  - `met_criteria` (list): List of met criteria
  - `unmet_criteria` (list): List of unmet criteria
  - `calculated_at` (str): ISO timestamp

#### `batch_calculate_eligibility(user_profile, schemes)`

Calculate eligibility for multiple schemes efficiently.

**Parameters:**
- `user_profile` (dict): User profile dictionary
- `schemes` (list): List of scheme dictionaries

**Returns:**
- list of eligibility result dictionaries

#### `generate_explanation(eligibility_result, user_profile, scheme)`

Generate natural language explanation for eligibility result.

**Parameters:**
- `eligibility_result` (dict): Result from calculate_eligibility
- `user_profile` (dict): User profile dictionary
- `scheme` (dict): Scheme dictionary

**Returns:**
- dict with keys:
  - `summary` (str): Overall summary
  - `strengths` (list): Top 3 matching criteria
  - `gaps` (list): Unmet criteria with explanations
  - `recommendations` (list): Suggestions for improvement

## Requirements Validation

This implementation validates the following requirements:

- **Requirement 9.1**: Calculate eligibility using cosine similarity
- **Requirement 9.2**: Display score as 0-100% percentage
- **Requirement 9.3**: Provide explanation of met/unmet criteria
- **Requirement 9.4**: Mark schemes as "Highly Eligible" (≥80%)
- **Requirement 9.5**: Mark schemes as "Potentially Eligible" (50-80%)
- **Requirement 9.6**: Mark schemes as "Low Eligibility" (<50%)
- **Requirement 17.1**: Provide explanations for recommendations
- **Requirement 17.2**: Highlight matching user profile attributes
- **Requirement 17.3**: Display top 3 matching criteria

## Integration

The Eligibility Engine integrates with:

- **FeatureExtractor**: Converts user profiles to feature vectors
- **Classification Engine**: Uses eligibility scores for recommendations
- **MCP Server**: Exposed via `check_eligibility` tool
- **Backend API**: Provides eligibility endpoints

## Future Enhancements

Potential improvements:

1. **Weighted Criteria**: Allow schemes to specify importance weights for criteria
2. **Fuzzy Matching**: Support approximate matches for categorical criteria
3. **Temporal Factors**: Consider application deadlines and scheme availability
4. **Machine Learning**: Train models to predict application success
5. **Personalized Thresholds**: Adjust categorization thresholds per user
6. **Explanation Templates**: Customizable explanation formats
7. **Multi-language Support**: Generate explanations in multiple languages

## License

Part of the Personalized Scheme Recommendation System.
