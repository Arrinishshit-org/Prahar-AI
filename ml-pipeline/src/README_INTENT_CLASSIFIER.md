# Intent Classifier

## Overview

The Intent Classifier is a BERT/DistilBERT-based ML model that analyzes user queries to determine their intent and extract relevant entities. It's a core component of the ReAct Agent system, enabling intelligent routing of queries to appropriate tools.

## Intent Categories

The classifier supports 7 intent categories:

1. **scheme_search**: User looking for schemes matching specific criteria
   - Example: "Show me education schemes in Karnataka"

2. **eligibility_check**: User wants to know if they qualify for a scheme
   - Example: "Am I eligible for PM-KISAN?"

3. **application_info**: User needs application process details
   - Example: "How do I apply for this scholarship?"

4. **deadline_query**: User asking about scheme deadlines
   - Example: "When is the last date to apply?"

5. **profile_update**: User wants to modify their profile
   - Example: "I want to update my income information"

6. **general_question**: General inquiry about schemes or platform
   - Example: "What is this platform about?"

7. **nudge_preferences**: User configuring notification settings
   - Example: "Stop sending me notifications"

## Entity Extraction

The classifier extracts 5 types of entities:

1. **location**: Geographic location (Indian states)
2. **income**: Income-related information
3. **occupation**: Job or occupation type
4. **age**: Age-related information
5. **scheme_name**: Name of a specific scheme

## Usage

### Basic Classification

```python
from intent_classifier import IntentClassifier

# Initialize classifier
classifier = IntentClassifier()

# Classify a query
result = classifier.classify("Show me schemes for farmers in Punjab")

print(f"Intent: {result.primary_intent}")
print(f"Confidence: {result.confidence:.2f}")
print(f"Entities: {result.entities}")
```

### Training

```python
# Prepare training data
training_data = [
    ("What schemes are available for students?", "scheme_search"),
    ("Am I eligible for this scheme?", "eligibility_check"),
    ("How do I apply?", "application_info"),
    # ... more examples
]

# Train the model
metrics = classifier.train(training_data, epochs=3)
print(f"Training accuracy: {metrics['accuracy']:.2%}")

# Save trained model
classifier.save("models/intent_classifier")
```

### Loading Trained Model

```python
# Load pre-trained model
classifier = IntentClassifier(model_path="models/intent_classifier")

# Use for inference
result = classifier.classify("When is the deadline?")
```

## Model Architecture

- **Base Model**: DistilBERT (distilbert-base-uncased)
- **Task**: Multi-class classification (7 classes)
- **Input**: User query text (max 512 tokens)
- **Output**: Intent probabilities + extracted entities

## Performance Requirements

- **Accuracy**: ≥85% on test set (Requirement 5.3)
- **Routing Time**: <500ms from classification to tool routing (Requirement 5.5)
- **Coverage**: All scheme-related queries should be classified (Requirement 5.2)

## Entity Extraction Strategy

Entity extraction uses a hybrid approach:

1. **Pattern Matching**: Regex patterns for structured entities (income, age)
2. **Dictionary Lookup**: Predefined lists for locations and occupations
3. **Heuristics**: Capitalization patterns for scheme names

This approach is fast and doesn't require additional NER models, meeting the 500ms routing requirement.

## Training Data Format

Training data should be a list of (query, intent_label) tuples:

```python
[
    ("Show me education schemes", "scheme_search"),
    ("Can I apply for PM-KISAN?", "eligibility_check"),
    ("What documents do I need?", "application_info"),
    ("When does the scheme close?", "deadline_query"),
    ("Update my profile", "profile_update"),
    ("What is myscheme.gov.in?", "general_question"),
    ("Turn off notifications", "nudge_preferences")
]
```

## Integration with ReAct Agent

The Intent Classifier integrates with the ReAct Agent workflow:

1. User submits query
2. Intent Classifier analyzes query
3. Primary intent determines tool selection
4. Extracted entities populate tool parameters
5. ReAct Agent executes appropriate tool
6. Response generated and returned to user

## Files

- `intent_classifier.py`: Main implementation
- `train_intent_classifier.py`: Training script (in scripts/)
- `test_intent_classifier.py`: Unit tests
- `test_intent_classifier_properties.py`: Property-based tests

## Dependencies

- transformers>=4.36.2
- torch>=2.1.2
- numpy>=1.26.2
- scikit-learn>=1.3.2
