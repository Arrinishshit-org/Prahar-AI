# ML Service Contracts

This document defines the backend-to-ML API contracts used by `backend/src/services/ml.service.ts`.

## Contract Boundary Rules

- Backend internal models may use camelCase.
- All payloads sent to ML must be normalized to snake_case.
- ML response payloads are schema-validated before use.
- Invalid response contracts must degrade gracefully (`null`) and trigger fallback behavior.

## Endpoints

### POST /classify

Request:

```json
{
  "message": "am i eligible for pm kisan?",
  "user_id": "user_123"
}
```

Response:

```json
{
  "primary_intent": "eligibility_check",
  "confidence": 0.84,
  "entities": {
    "scheme": "PM-KISAN"
  },
  "secondary_intents": ["scheme_search"]
}
```

### POST /recommend

Request:

```json
{
  "user_profile": {
    "user_id": "user_123",
    "age": 28,
    "state": "Kerala",
    "annual_income": 250000,
    "occupation": "farmer",
    "education_level": "secondary",
    "is_disabled": false,
    "is_minority": false
  },
  "schemes": [
    {
      "id": "SCHEME_1",
      "name": "PM-KISAN",
      "description": "Income support"
    }
  ],
  "max_results": 10,
  "min_score": 0.2
}
```

Response:

```json
{
  "recommendations": [
    {
      "id": "SCHEME_1",
      "name": "PM-KISAN",
      "relevanceScore": 0.89
    }
  ],
  "total": 1,
  "cached": false
}
```

### POST /eligibility

Request:

```json
{
  "user_profile": {
    "user_id": "user_123",
    "age": 28,
    "state": "Kerala",
    "annual_income": 250000,
    "occupation": "farmer"
  },
  "scheme": {
    "id": "SCHEME_1",
    "name": "PM-KISAN"
  }
}
```

Response:

```json
{
  "scheme_id": "SCHEME_1",
  "score": 0.81,
  "percentage": 81,
  "category": "highly_eligible",
  "met_criteria": ["State match", "Occupation match"],
  "unmet_criteria": [],
  "explanation": "The profile matches most mandatory criteria."
}
```

### POST /chat

Request:

```json
{
  "message": "i am from kerala and i am a farmer",
  "user_profile": {
    "user_id": "user_123",
    "age": 28,
    "state": "Kerala",
    "occupation": "farmer",
    "annual_income": 250000
  },
  "conversation_history": [
    {
      "role": "user",
      "content": "help me find schemes"
    }
  ]
}
```

Response:

```json
{
  "response": "You may be eligible for PM-KISAN and related agriculture support schemes.",
  "suggestions": ["Check my eligibility", "Show matching schemes"],
  "extracted_entities": {
    "state": "Kerala",
    "occupation": "farmer"
  }
}
```

### GET /health

Response can vary by ML implementation. Backend treats any successful 2xx response as available.

## Validation and Failure Behavior

- Backend validates request payloads before ML calls.
- Backend validates response payloads before returning typed results.
- On timeout/network/schema mismatch/non-retryable failure:
  - ML service method returns `null`.
  - Callers must execute fallback behavior.
  - Structured logs include endpoint, latency, attempt, and error category.
