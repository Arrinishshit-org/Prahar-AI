"""
Pytest configuration and fixtures for ml-pipeline tests
"""

import pytest
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any
from hypothesis import settings, Phase

# Configure Hypothesis to run faster with fewer examples
settings.register_profile("fast", max_examples=10, phases=[Phase.generate, Phase.target])
settings.register_profile("ci", max_examples=50)
settings.register_profile("dev", max_examples=20)
settings.load_profile("fast")


@pytest.fixture
def sample_user_profile() -> Dict[str, Any]:
    """Generate a sample user profile for testing"""
    return {
        'user_id': 'test-user-123',
        'age': 30,
        'gender': 'male',
        'marital_status': 'single',
        'family_size': 1,
        'annual_income': 500000,
        'income_level': 'middle',
        'employment_status': 'employed',
        'occupation': 'Software Engineer',
        'occupation_category': 'IT',
        'state': 'Maharashtra',
        'district': 'Mumbai',
        'pincode': '400001',
        'rural_urban': 'urban',
        'education_level': 'graduate',
        'caste': 'general',
        'disability': False,
    }


@pytest.fixture
def sample_scheme() -> Dict[str, Any]:
    """Generate a sample scheme for testing"""
    return {
        'scheme_id': 'scheme-123',
        'scheme_name': 'Test Education Scheme',
        'category': 'education',
        'sub_category': 'scholarship',
        'eligibility': {
            'age_min': 18,
            'age_max': 35,
            'gender': ['male', 'female', 'other'],
            'income_max': 800000,
            'states': ['Maharashtra', 'Karnataka'],
            'education_levels': ['graduate', 'postgraduate'],
        },
        'is_active': True,
    }


@pytest.fixture
def sample_feature_vector() -> np.ndarray:
    """Generate a sample feature vector for testing"""
    return np.random.rand(50)


@pytest.fixture
def sample_user_profiles_batch() -> List[Dict[str, Any]]:
    """Generate a batch of user profiles for testing"""
    profiles = []
    states = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat']
    occupations = ['Software Engineer', 'Teacher', 'Farmer', 'Doctor', 'Businessman']
    
    for i in range(10):
        profiles.append({
            'user_id': f'test-user-{i}',
            'age': 20 + i * 5,
            'gender': 'male' if i % 2 == 0 else 'female',
            'marital_status': 'single' if i < 5 else 'married',
            'family_size': 1 + i % 5,
            'annual_income': 200000 + i * 100000,
            'income_level': 'low' if i < 3 else 'middle' if i < 7 else 'high',
            'employment_status': 'employed',
            'occupation': occupations[i % len(occupations)],
            'state': states[i % len(states)],
            'district': f'District-{i}',
            'rural_urban': 'urban' if i % 2 == 0 else 'rural',
            'education_level': 'graduate',
            'caste': 'general',
            'disability': False,
        })
    
    return profiles


@pytest.fixture
def sample_schemes_batch() -> List[Dict[str, Any]]:
    """Generate a batch of schemes for testing"""
    schemes = []
    categories = ['education', 'healthcare', 'agriculture', 'employment', 'housing']
    
    for i in range(10):
        schemes.append({
            'scheme_id': f'scheme-{i}',
            'scheme_name': f'Test Scheme {i}',
            'category': categories[i % len(categories)],
            'eligibility': {
                'age_min': 18 + i * 2,
                'age_max': 35 + i * 5,
                'income_max': 500000 + i * 100000,
            },
            'is_active': True,
        })
    
    return schemes


@pytest.fixture
def mock_neo4j_session(mocker):
    """Mock Neo4j session for testing"""
    mock_session = mocker.Mock()
    mock_session.run.return_value.data.return_value = []
    return mock_session


@pytest.fixture
def mock_redis_client(mocker):
    """Mock Redis client for testing"""
    mock_client = mocker.Mock()
    mock_client.get.return_value = None
    mock_client.set.return_value = True
    mock_client.delete.return_value = 1
    return mock_client


@pytest.fixture
def sample_training_data() -> tuple:
    """Generate sample training data for ML models"""
    X = np.random.rand(100, 50)  # 100 samples, 50 features
    y = np.random.randint(0, 5, 100)  # 5 classes
    return X, y


@pytest.fixture
def sample_cosine_similarity_data() -> tuple:
    """Generate sample data for cosine similarity testing"""
    user_vector = np.random.rand(50)
    scheme_vector = np.random.rand(50)
    return user_vector, scheme_vector


@pytest.fixture(autouse=True)
def reset_random_seed():
    """Reset random seed before each test for reproducibility"""
    np.random.seed(42)


@pytest.fixture
def temp_model_path(tmp_path):
    """Provide a temporary path for saving/loading models"""
    return tmp_path / "test_model.pkl"


# Hypothesis strategies for property-based testing
def user_profile_strategy():
    """Hypothesis strategy for generating user profiles"""
    from hypothesis import strategies as st
    
    return st.fixed_dictionaries({
        'user_id': st.text(min_size=5, max_size=20),
        'age': st.integers(min_value=18, max_value=100),
        'gender': st.sampled_from(['male', 'female', 'other']),
        'marital_status': st.sampled_from(['single', 'married', 'divorced', 'widowed']),
        'family_size': st.integers(min_value=1, max_value=10),
        'annual_income': st.integers(min_value=0, max_value=10000000),
        'income_level': st.sampled_from(['below_poverty', 'low', 'middle', 'high']),
        'employment_status': st.sampled_from(['employed', 'self_employed', 'unemployed', 'student', 'retired']),
        'occupation': st.text(min_size=3, max_size=50),
        'state': st.sampled_from(['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat']),
        'district': st.text(min_size=3, max_size=50),
        'rural_urban': st.sampled_from(['rural', 'urban', 'semi_urban']),
        'education_level': st.sampled_from(['primary', 'secondary', 'graduate', 'postgraduate']),
        'caste': st.sampled_from(['general', 'obc', 'sc', 'st']),
        'disability': st.booleans(),
    })


def feature_vector_strategy(min_size: int = 10, max_size: int = 50):
    """Hypothesis strategy for generating feature vectors"""
    from hypothesis import strategies as st
    from hypothesis.extra.numpy import arrays
    
    return arrays(
        dtype=np.float64,
        shape=st.integers(min_value=min_size, max_value=max_size),
        elements=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)
    )


def eligibility_score_strategy():
    """Hypothesis strategy for generating eligibility scores"""
    from hypothesis import strategies as st
    
    return st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)


def scheme_strategy():
    """Hypothesis strategy for generating schemes"""
    from hypothesis import strategies as st
    
    return st.fixed_dictionaries({
        'scheme_id': st.text(min_size=5, max_size=20),
        'scheme_name': st.text(min_size=10, max_size=100),
        'category': st.sampled_from(['education', 'healthcare', 'agriculture', 'employment', 'housing', 'social_welfare']),
        'sub_category': st.text(min_size=5, max_size=50),
        'eligibility': st.fixed_dictionaries({
            'age_min': st.integers(min_value=0, max_value=50).map(lambda x: x if x > 0 else None),
            'age_max': st.integers(min_value=18, max_value=100).map(lambda x: x if x < 100 else None),
            'income_max': st.integers(min_value=100000, max_value=10000000).map(lambda x: x if x < 10000000 else None),
            'states': st.lists(
                st.sampled_from(['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat']),
                min_size=0,
                max_size=3
            ),
            'gender': st.lists(
                st.sampled_from(['male', 'female', 'other']),
                min_size=0,
                max_size=3
            ),
            'education_levels': st.lists(
                st.sampled_from(['primary', 'secondary', 'graduate', 'postgraduate']),
                min_size=0,
                max_size=3
            ),
            'castes': st.lists(
                st.sampled_from(['general', 'obc', 'sc', 'st']),
                min_size=0,
                max_size=3
            ),
            'occupations': st.lists(
                st.text(min_size=3, max_size=30),
                min_size=0,
                max_size=3
            ),
            'rural_urban': st.lists(
                st.sampled_from(['rural', 'urban', 'semi_urban']),
                min_size=0,
                max_size=2
            ),
            'disability': st.one_of(st.none(), st.booleans()),
        }),
        'is_active': st.booleans(),
    })
