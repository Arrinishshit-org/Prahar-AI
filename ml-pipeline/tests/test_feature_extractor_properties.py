"""
Property-based tests for FeatureExtractor

**Validates: Requirements 2.2**
"""

import pytest
import numpy as np
from hypothesis import given, strategies as st, assume
from tests.conftest import user_profile_strategy
from src.feature_extractor import FeatureExtractor


class TestFeatureExtractionProperties:
    """Property-based tests for feature extraction"""
    
    @given(user_profile_strategy())
    def test_feature_extraction_produces_valid_vector(self, profile):
        """
        Property: Feature extraction should always produce a valid vector
        
        For any user profile, the extracted features should:
        - Be a numpy array
        - Have the correct dimension
        - Contain only values in [0, 1] range
        """
        extractor = FeatureExtractor()
        features = extractor.extract_features(profile)
        
        # Should be numpy array
        assert isinstance(features, np.ndarray)
        
        # Should have correct dimension
        assert len(features) == extractor.get_feature_dimension()
        
        # All values should be in [0, 1] range
        assert np.all(features >= 0.0)
        assert np.all(features <= 1.0)
        
        # Should not contain NaN or infinity
        assert not np.any(np.isnan(features))
        assert not np.any(np.isinf(features))
    
    @given(user_profile_strategy())
    def test_feature_extraction_deterministic(self, profile):
        """
        Property: Feature extraction should be deterministic
        
        For any user profile, extracting features multiple times
        should produce identical results.
        """
        extractor = FeatureExtractor()
        features1 = extractor.extract_features(profile)
        features2 = extractor.extract_features(profile)
        
        np.testing.assert_array_equal(features1, features2)
    
    @given(user_profile_strategy())
    def test_classification_feature_sensitivity_age(self, profile):
        """
        **Property 5: Classification Feature Sensitivity**
        
        For any two user profiles that differ only in demographic data (age),
        the feature extraction should produce different feature vectors.
        
        **Validates: Requirements 2.2**
        """
        extractor = FeatureExtractor()
        # Create a modified profile with different age
        modified_profile = profile.copy()
        
        # Change age significantly (at least 10 years difference)
        original_age = profile['age']
        if original_age <= 50:
            modified_profile['age'] = original_age + 15
        else:
            modified_profile['age'] = original_age - 15
        
        # Ensure age is in valid range
        modified_profile['age'] = max(18, min(100, modified_profile['age']))
        
        # Extract features
        features1 = extractor.extract_features(profile)
        features2 = extractor.extract_features(modified_profile)
        
        # Features should be different
        assert not np.array_equal(features1, features2)
        
        # Specifically, the age feature (first element) should differ
        assert features1[0] != features2[0]
    
    @given(user_profile_strategy())
    def test_classification_feature_sensitivity_income(self, profile):
        """
        **Property 5: Classification Feature Sensitivity**
        
        For any two user profiles that differ only in income level,
        the feature extraction should produce different feature vectors.
        
        **Validates: Requirements 2.2**
        """
        extractor = FeatureExtractor()
        # Create a modified profile with different income
        modified_profile = profile.copy()
        
        # Change income significantly (at least 50% difference)
        original_income = profile['annual_income']
        if original_income < 500000:
            modified_profile['annual_income'] = original_income + 500000
        else:
            modified_profile['annual_income'] = original_income // 2
        
        # Extract features
        features1 = extractor.extract_features(profile)
        features2 = extractor.extract_features(modified_profile)
        
        # Features should be different
        assert not np.array_equal(features1, features2)
        
        # Specifically, the income feature (second element) should differ
        assert features1[1] != features2[1]
    
    @given(user_profile_strategy())
    def test_classification_feature_sensitivity_location(self, profile):
        """
        **Property 5: Classification Feature Sensitivity**
        
        For any two user profiles that differ only in location (state),
        the feature extraction should produce different feature vectors.
        
        **Validates: Requirements 2.2**
        """
        extractor = FeatureExtractor()
        # Create a modified profile with different state
        modified_profile = profile.copy()
        
        # Change to a different state
        original_state = profile['state']
        states = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat']
        
        # Pick a different state
        different_states = [s for s in states if s != original_state]
        if different_states:
            modified_profile['state'] = different_states[0]
        else:
            modified_profile['state'] = 'Maharashtra'
        
        # Extract features
        features1 = extractor.extract_features(profile)
        features2 = extractor.extract_features(modified_profile)
        
        # Features should be different (state encoding should differ)
        assert not np.array_equal(features1, features2)
    
    @given(user_profile_strategy())
    def test_classification_feature_sensitivity_occupation(self, profile):
        """
        **Property 5: Classification Feature Sensitivity**
        
        For any two user profiles that differ only in occupation (employment status),
        the feature extraction should produce different feature vectors.
        
        **Validates: Requirements 2.2**
        """
        extractor = FeatureExtractor()
        # Create a modified profile with different employment status
        modified_profile = profile.copy()
        
        # Change employment status
        original_employment = profile['employment_status']
        employment_options = ['employed', 'self_employed', 'unemployed', 'student', 'retired']
        
        # Pick a different employment status
        different_employment = [e for e in employment_options if e != original_employment]
        if different_employment:
            modified_profile['employment_status'] = different_employment[0]
        else:
            modified_profile['employment_status'] = 'employed'
        
        # Extract features
        features1 = extractor.extract_features(profile)
        features2 = extractor.extract_features(modified_profile)
        
        # Features should be different
        assert not np.array_equal(features1, features2)
    
    @given(user_profile_strategy())
    def test_classification_feature_sensitivity_gender(self, profile):
        """
        **Property 5: Classification Feature Sensitivity**
        
        For any two user profiles that differ only in demographic data (gender),
        the feature extraction should produce different feature vectors.
        
        **Validates: Requirements 2.2**
        """
        extractor = FeatureExtractor()
        # Create a modified profile with different gender
        modified_profile = profile.copy()
        
        # Change gender
        original_gender = profile['gender']
        genders = ['male', 'female', 'other']
        
        # Pick a different gender
        different_genders = [g for g in genders if g != original_gender]
        if different_genders:
            modified_profile['gender'] = different_genders[0]
        else:
            modified_profile['gender'] = 'male'
        
        # Extract features
        features1 = extractor.extract_features(profile)
        features2 = extractor.extract_features(modified_profile)
        
        # Features should be different
        assert not np.array_equal(features1, features2)
    
    @given(user_profile_strategy(), user_profile_strategy())
    def test_classification_feature_sensitivity_different_profiles(self, profile1, profile2):
        """
        **Property 5: Classification Feature Sensitivity**
        
        For any two different user profiles, the feature extraction
        should produce different feature vectors (with high probability).
        
        **Validates: Requirements 2.2**
        """
        extractor = FeatureExtractor()
        # Assume profiles are actually different in at least one key field
        assume(
            profile1['age'] != profile2['age'] or
            profile1['annual_income'] != profile2['annual_income'] or
            profile1['state'] != profile2['state'] or
            profile1['gender'] != profile2['gender'] or
            profile1['employment_status'] != profile2['employment_status']
        )
        
        # Extract features
        features1 = extractor.extract_features(profile1)
        features2 = extractor.extract_features(profile2)
        
        # Features should be different
        assert not np.array_equal(features1, features2)
    
    @given(user_profile_strategy())
    def test_feature_vector_not_all_zeros(self, profile):
        """
        Property: Feature vectors should not be all zeros
        
        For any valid user profile, the feature vector should contain
        at least some non-zero values.
        """
        extractor = FeatureExtractor()
        features = extractor.extract_features(profile)
        
        # Should have at least some non-zero features
        assert np.sum(features) > 0
        
        # Should have at least 3 non-zero features (age, income, family_size minimums)
        assert np.count_nonzero(features) >= 3
    
    @given(user_profile_strategy())
    def test_one_hot_encoding_mutually_exclusive(self, profile):
        """
        Property: One-hot encoded features should be mutually exclusive
        
        For categorical features, exactly one category should be active (1.0)
        within each categorical group.
        """
        extractor = FeatureExtractor()
        features = extractor.extract_features(profile)
        
        # Gender one-hot (4 categories starting at index 3)
        gender_features = features[3:7]
        assert np.sum(gender_features) <= 1.0  # At most one active
        
        # Marital status one-hot (4 categories)
        marital_features = features[7:11]
        assert np.sum(marital_features) <= 1.0
        
        # Employment one-hot (5 categories)
        employment_features = features[11:16]
        assert np.sum(employment_features) <= 1.0
    
    @given(user_profile_strategy())
    def test_normalized_features_in_range(self, profile):
        """
        Property: Normalized numerical features should be in [0, 1]
        
        For any user profile, the first three features (age, income, family_size)
        should be normalized to the [0, 1] range.
        """
        extractor = FeatureExtractor()
        features = extractor.extract_features(profile)
        
        # Check first three numerical features
        age_feature = features[0]
        income_feature = features[1]
        family_size_feature = features[2]
        
        assert 0.0 <= age_feature <= 1.0
        assert 0.0 <= income_feature <= 1.0
        assert 0.0 <= family_size_feature <= 1.0
    
    @given(
        st.integers(min_value=18, max_value=100),
        st.integers(min_value=18, max_value=100)
    )
    def test_age_ordering_preserved(self, age1, age2):
        """
        Property: Age normalization should preserve ordering
        
        If age1 < age2, then normalized(age1) < normalized(age2)
        """
        extractor = FeatureExtractor()
        assume(age1 != age2)
        
        norm1 = extractor.normalize_age(age1)
        norm2 = extractor.normalize_age(age2)
        
        if age1 < age2:
            assert norm1 < norm2
        else:
            assert norm1 > norm2
    
    @given(
        st.integers(min_value=0, max_value=10000000),
        st.integers(min_value=0, max_value=10000000)
    )
    def test_income_ordering_preserved(self, income1, income2):
        """
        Property: Income normalization should preserve ordering
        
        If income1 < income2, then normalized(income1) < normalized(income2)
        """
        extractor = FeatureExtractor()
        assume(income1 != income2)
        
        norm1 = extractor.normalize_income(income1)
        norm2 = extractor.normalize_income(income2)
        
        if income1 < income2:
            assert norm1 < norm2
        else:
            assert norm1 > norm2
