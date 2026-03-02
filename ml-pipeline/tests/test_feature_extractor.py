"""
Unit tests for FeatureExtractor class

Tests normalization, one-hot encoding, and vector dimensions.
"""

import pytest
import numpy as np
from src.feature_extractor import FeatureExtractor


class TestFeatureExtractor:
    """Unit tests for feature extraction"""
    
    @pytest.fixture
    def extractor(self):
        """Create a FeatureExtractor instance"""
        return FeatureExtractor()
    
    @pytest.fixture
    def complete_profile(self):
        """Complete user profile with all fields"""
        return {
            'age': 30,
            'annual_income': 500000,
            'family_size': 4,
            'gender': 'male',
            'marital_status': 'married',
            'employment_status': 'employed',
            'education_level': 'graduate',
            'caste': 'general',
            'rural_urban': 'urban',
            'state': 'Maharashtra',
            'disability': False,
        }
    
    # Test normalization
    
    def test_normalize_age_min(self, extractor):
        """Test age normalization at minimum value"""
        result = extractor.normalize_age(18)
        assert result == 0.0
    
    def test_normalize_age_max(self, extractor):
        """Test age normalization at maximum value"""
        result = extractor.normalize_age(100)
        assert result == 1.0
    
    def test_normalize_age_mid(self, extractor):
        """Test age normalization at middle value"""
        result = extractor.normalize_age(59)  # Midpoint of 18-100
        assert 0.4 < result < 0.6
    
    def test_normalize_age_clamps_low(self, extractor):
        """Test age normalization clamps values below minimum"""
        result = extractor.normalize_age(10)
        assert result == 0.0
    
    def test_normalize_age_clamps_high(self, extractor):
        """Test age normalization clamps values above maximum"""
        result = extractor.normalize_age(150)
        assert result == 1.0
    
    def test_normalize_income_zero(self, extractor):
        """Test income normalization at zero"""
        result = extractor.normalize_income(0)
        assert result == 0.0
    
    def test_normalize_income_max(self, extractor):
        """Test income normalization at maximum"""
        result = extractor.normalize_income(10000000)
        assert result == 1.0
    
    def test_normalize_income_mid(self, extractor):
        """Test income normalization at middle value"""
        result = extractor.normalize_income(500000)
        assert 0.0 < result < 1.0
    
    def test_normalize_income_negative(self, extractor):
        """Test income normalization handles negative values"""
        result = extractor.normalize_income(-1000)
        assert result == 0.0
    
    def test_normalize_family_size_min(self, extractor):
        """Test family size normalization at minimum"""
        result = extractor.normalize_family_size(1)
        assert result == 0.0
    
    def test_normalize_family_size_max(self, extractor):
        """Test family size normalization at maximum"""
        result = extractor.normalize_family_size(10)
        assert result == 1.0
    
    def test_normalize_family_size_mid(self, extractor):
        """Test family size normalization at middle value"""
        result = extractor.normalize_family_size(5)
        assert 0.3 < result < 0.6
    
    # Test one-hot encoding
    
    def test_encode_gender_male(self, extractor):
        """Test gender encoding for male"""
        result = extractor.encode_gender('male')
        assert result == [1.0, 0.0, 0.0, 0.0]
    
    def test_encode_gender_female(self, extractor):
        """Test gender encoding for female"""
        result = extractor.encode_gender('female')
        assert result == [0.0, 1.0, 0.0, 0.0]
    
    def test_encode_gender_other(self, extractor):
        """Test gender encoding for other"""
        result = extractor.encode_gender('other')
        assert result == [0.0, 0.0, 1.0, 0.0]
    
    def test_encode_gender_unknown(self, extractor):
        """Test gender encoding for unknown value"""
        result = extractor.encode_gender('invalid')
        assert result == [0.0, 0.0, 0.0, 0.0]
    
    def test_encode_marital_status_single(self, extractor):
        """Test marital status encoding for single"""
        result = extractor.encode_marital_status('single')
        assert result == [1.0, 0.0, 0.0, 0.0]
    
    def test_encode_marital_status_married(self, extractor):
        """Test marital status encoding for married"""
        result = extractor.encode_marital_status('married')
        assert result == [0.0, 1.0, 0.0, 0.0]
    
    def test_encode_employment_employed(self, extractor):
        """Test employment encoding for employed"""
        result = extractor.encode_employment('employed')
        assert result == [1.0, 0.0, 0.0, 0.0, 0.0]
    
    def test_encode_employment_unemployed(self, extractor):
        """Test employment encoding for unemployed"""
        result = extractor.encode_employment('unemployed')
        assert result == [0.0, 0.0, 1.0, 0.0, 0.0]
    
    def test_encode_education_graduate(self, extractor):
        """Test education encoding for graduate"""
        result = extractor.encode_education('graduate')
        assert result == [0.0, 0.0, 0.0, 0.0, 1.0, 0.0]
    
    def test_encode_caste_general(self, extractor):
        """Test caste encoding for general"""
        result = extractor.encode_caste('general')
        assert result == [1.0, 0.0, 0.0, 0.0, 0.0]
    
    def test_encode_rural_urban_urban(self, extractor):
        """Test rural/urban encoding for urban"""
        result = extractor.encode_rural_urban('urban')
        assert result == [0.0, 1.0, 0.0]
    
    def test_encode_state_maharashtra(self, extractor):
        """Test state encoding for Maharashtra"""
        result = extractor.encode_state('Maharashtra')
        assert result[1] == 1.0  # Maharashtra is at index 1
        assert sum(result) == 1.0
    
    def test_encode_state_unknown(self, extractor):
        """Test state encoding for unknown state"""
        result = extractor.encode_state('Unknown State')
        assert sum(result) == 0.0  # All zeros for unknown
    
    # Test vector dimensions
    
    def test_feature_dimension_calculation(self, extractor):
        """Test that feature dimension calculation is correct"""
        expected_dim = (
            3 +  # age, income, family_size
            4 +  # gender
            4 +  # marital_status
            5 +  # employment
            6 +  # education
            5 +  # caste
            3 +  # rural_urban
            20 +  # state (top 20)
            1  # disability
        )
        assert extractor.get_feature_dimension() == expected_dim
        assert extractor.get_feature_dimension() == 51
    
    def test_extract_features_dimension(self, extractor, complete_profile):
        """Test that extracted features have correct dimension"""
        features = extractor.extract_features(complete_profile)
        assert len(features) == extractor.get_feature_dimension()
        assert len(features) == 51
    
    def test_extract_features_type(self, extractor, complete_profile):
        """Test that extracted features are numpy array"""
        features = extractor.extract_features(complete_profile)
        assert isinstance(features, np.ndarray)
        assert features.dtype == np.float64
    
    def test_extract_features_range(self, extractor, complete_profile):
        """Test that all features are in valid range [0, 1]"""
        features = extractor.extract_features(complete_profile)
        assert np.all(features >= 0.0)
        assert np.all(features <= 1.0)
    
    # Test complete feature extraction
    
    def test_extract_features_complete_profile(self, extractor, complete_profile):
        """Test feature extraction with complete profile"""
        features = extractor.extract_features(complete_profile)
        
        # Check dimension
        assert len(features) == 51
        
        # Check first three are normalized numerical features
        assert 0.0 <= features[0] <= 1.0  # age
        assert 0.0 <= features[1] <= 1.0  # income
        assert 0.0 <= features[2] <= 1.0  # family_size
        
        # Check that some one-hot encoded features are present
        assert np.sum(features) > 3  # More than just numerical features
    
    def test_extract_features_minimal_profile(self, extractor):
        """Test feature extraction with minimal profile (missing fields)"""
        minimal_profile = {
            'age': 25,
            'annual_income': 300000,
        }
        features = extractor.extract_features(minimal_profile)
        
        # Should still produce valid feature vector with defaults
        assert len(features) == 51
        assert np.all(features >= 0.0)
        assert np.all(features <= 1.0)
    
    def test_extract_features_empty_profile(self, extractor):
        """Test feature extraction with empty profile"""
        features = extractor.extract_features({})
        
        # Should produce valid feature vector with all defaults
        assert len(features) == 51
        assert np.all(features >= 0.0)
        assert np.all(features <= 1.0)
    
    def test_extract_features_disability_true(self, extractor):
        """Test disability feature when True"""
        profile = {'disability': True}
        features = extractor.extract_features(profile)
        assert features[-1] == 1.0
    
    def test_extract_features_disability_false(self, extractor):
        """Test disability feature when False"""
        profile = {'disability': False}
        features = extractor.extract_features(profile)
        assert features[-1] == 0.0
    
    # Test feature names
    
    def test_get_feature_names_count(self, extractor):
        """Test that feature names match dimension"""
        names = extractor.get_feature_names()
        assert len(names) == extractor.get_feature_dimension()
        assert len(names) == 51
    
    def test_get_feature_names_format(self, extractor):
        """Test that feature names are properly formatted"""
        names = extractor.get_feature_names()
        
        # Check first few names
        assert names[0] == 'age_normalized'
        assert names[1] == 'income_normalized'
        assert names[2] == 'family_size_normalized'
        
        # Check some categorical names
        assert 'gender_male' in names
        assert 'marital_married' in names
        assert 'disability' in names
    
    # Test edge cases
    
    def test_one_hot_encode_case_sensitive(self, extractor):
        """Test that one-hot encoding is case-sensitive"""
        result1 = extractor.encode_gender('male')
        result2 = extractor.encode_gender('Male')
        
        assert result1 == [1.0, 0.0, 0.0, 0.0]
        assert result2 == [0.0, 0.0, 0.0, 0.0]  # Unknown
    
    def test_extract_features_deterministic(self, extractor, complete_profile):
        """Test that feature extraction is deterministic"""
        features1 = extractor.extract_features(complete_profile)
        features2 = extractor.extract_features(complete_profile)
        
        np.testing.assert_array_equal(features1, features2)
    
    def test_different_profiles_different_features(self, extractor):
        """Test that different profiles produce different features"""
        profile1 = {'age': 25, 'annual_income': 300000, 'gender': 'male'}
        profile2 = {'age': 45, 'annual_income': 800000, 'gender': 'female'}
        
        features1 = extractor.extract_features(profile1)
        features2 = extractor.extract_features(profile2)
        
        assert not np.array_equal(features1, features2)
