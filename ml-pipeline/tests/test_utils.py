"""
Utility functions for testing ml-pipeline
"""

import numpy as np
from typing import Dict, List, Any
from datetime import datetime, timedelta


def assert_vector_normalized(vector: np.ndarray, tolerance: float = 1e-6):
    """Assert that a vector is normalized (magnitude = 1)"""
    magnitude = np.linalg.norm(vector)
    assert abs(magnitude - 1.0) < tolerance, f"Vector not normalized: magnitude = {magnitude}"


def assert_vectors_similar(v1: np.ndarray, v2: np.ndarray, tolerance: float = 0.1):
    """Assert that two vectors are similar within tolerance"""
    similarity = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
    assert similarity >= (1.0 - tolerance), f"Vectors not similar: similarity = {similarity}"


def assert_score_in_range(score: float, min_val: float = 0.0, max_val: float = 1.0):
    """Assert that a score is within valid range"""
    assert min_val <= score <= max_val, f"Score {score} not in range [{min_val}, {max_val}]"


def assert_classification_valid(classification: Dict[str, Any]):
    """Assert that a classification result has valid structure"""
    assert 'user_id' in classification
    assert 'groups' in classification
    assert 'confidence' in classification
    assert isinstance(classification['groups'], list)
    assert 0.0 <= classification['confidence'] <= 1.0


def assert_recommendation_valid(recommendation: Dict[str, Any]):
    """Assert that a recommendation has valid structure"""
    assert 'scheme_id' in recommendation
    assert 'relevance_score' in recommendation
    assert 'matching_criteria' in recommendation
    assert 0.0 <= recommendation['relevance_score'] <= 1.0
    assert isinstance(recommendation['matching_criteria'], list)


def create_mock_model():
    """Create a mock ML model for testing"""
    class MockModel:
        def __init__(self):
            self.is_fitted = False
        
        def fit(self, X, y):
            self.is_fitted = True
            return self
        
        def predict(self, X):
            if not self.is_fitted:
                raise ValueError("Model not fitted")
            return np.random.randint(0, 5, len(X))
        
        def predict_proba(self, X):
            if not self.is_fitted:
                raise ValueError("Model not fitted")
            n_samples = len(X)
            n_classes = 5
            probs = np.random.rand(n_samples, n_classes)
            return probs / probs.sum(axis=1, keepdims=True)
    
    return MockModel()


def generate_random_feature_vector(size: int = 50) -> np.ndarray:
    """Generate a random normalized feature vector"""
    vector = np.random.rand(size)
    return vector / np.linalg.norm(vector)


def calculate_cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors"""
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))


def generate_test_dataset(n_samples: int = 100, n_features: int = 50, n_classes: int = 5):
    """Generate a synthetic dataset for testing"""
    X = np.random.rand(n_samples, n_features)
    y = np.random.randint(0, n_classes, n_samples)
    return X, y


def mock_api_response(data: Any, status_code: int = 200) -> Dict[str, Any]:
    """Create a mock API response"""
    return {
        'status_code': status_code,
        'data': data,
        'timestamp': datetime.now().isoformat(),
    }


def assert_model_performance(accuracy: float, min_accuracy: float = 0.7):
    """Assert that model performance meets minimum threshold"""
    assert accuracy >= min_accuracy, f"Model accuracy {accuracy} below threshold {min_accuracy}"


def assert_response_time(elapsed_time: float, max_time: float = 3.0):
    """Assert that response time is within acceptable range"""
    assert elapsed_time <= max_time, f"Response time {elapsed_time}s exceeds maximum {max_time}s"


def create_mock_cache():
    """Create a mock cache for testing"""
    class MockCache:
        def __init__(self):
            self.store = {}
        
        def get(self, key: str):
            return self.store.get(key)
        
        def set(self, key: str, value: Any, ttl: int = None):
            self.store[key] = value
        
        def delete(self, key: str):
            if key in self.store:
                del self.store[key]
        
        def clear(self):
            self.store.clear()
    
    return MockCache()


def assert_batch_processing_correct(
    input_batch: List[Any],
    output_batch: List[Any],
    expected_size: int = None
):
    """Assert that batch processing maintains correct size and order"""
    if expected_size:
        assert len(output_batch) == expected_size
    else:
        assert len(output_batch) == len(input_batch)
    
    # Additional validation can be added based on specific requirements
