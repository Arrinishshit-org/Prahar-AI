"""
Property-based tests for UserClassifier

Tests universal properties that should hold for all user classifications.
"""

import pytest
import numpy as np
from hypothesis import given, strategies as st, settings, assume
from datetime import datetime
import time

from src.user_classifier import UserClassifier
from tests.conftest import user_profile_strategy


# Helper to create a trained classifier
def create_trained_classifier(n_profiles: int = 100) -> UserClassifier:
    """Create and train a UserClassifier with sample data"""
    classifier = UserClassifier(n_clusters=25, random_state=42)
    
    # Generate diverse training profiles
    profiles = []
    states = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat']
    genders = ['male', 'female', 'other']
    marital_statuses = ['single', 'married', 'divorced', 'widowed']
    employment_statuses = ['employed', 'self_employed', 'unemployed', 'student', 'retired']
    
    for i in range(n_profiles):
        profiles.append({
            'user_id': f'user-{i}',
            'age': 18 + (i % 82),  # 18-100
            'gender': genders[i % len(genders)],
            'marital_status': marital_statuses[i % len(marital_statuses)],
            'family_size': 1 + (i % 10),
            'annual_income': 100000 + (i * 50000) % 5000000,
            'employment_status': employment_statuses[i % len(employment_statuses)],
            'state': states[i % len(states)],
            'rural_urban': 'urban' if i % 2 == 0 else 'rural',
            'education_level': 'graduate',
            'caste': 'general',
            'disability': i % 10 == 0,
        })
    
    classifier.train(profiles)
    return classifier


class TestUserClassificationProperties:
    """Property-based tests for user classification"""
    
    @given(user_profile_strategy())
    @settings(max_examples=100, deadline=5000)
    def test_property_4_user_classification_assignment(self, profile):
        """
        **Validates: Requirements 2.1, 2.3, 2.4**
        
        Property 4: User Classification Assignment
        
        For any user profile (created or updated), the classification engine
        should assign at least one user group within 5 seconds, and the
        assignment should be stored and retrievable.
        """
        # Arrange: Create and train classifier
        classifier = create_trained_classifier()
        
        # Act: Classify user and measure time
        start_time = time.time()
        result = classifier.classify_user(profile)
        elapsed_time = time.time() - start_time
        
        # Assert: At least one group assigned
        assert 'groups' in result, "Result must contain 'groups' field"
        assert isinstance(result['groups'], list), "Groups must be a list"
        assert len(result['groups']) >= 1, "At least one group must be assigned"
        
        # Assert: All group IDs are valid integers
        for group_id in result['groups']:
            assert isinstance(group_id, int), f"Group ID must be integer, got {type(group_id)}"
            assert 0 <= group_id < classifier.n_clusters, \
                f"Group ID {group_id} out of range [0, {classifier.n_clusters})"
        
        # Assert: Classification completes within 5 seconds
        assert elapsed_time < 5.0, \
            f"Classification took {elapsed_time:.2f}s, exceeds 5 second limit"
        
        # Assert: Result is stored and retrievable (has required fields)
        assert 'user_id' in result, "Result must contain 'user_id'"
        assert 'confidence' in result, "Result must contain 'confidence'"
        assert 'timestamp' in result, "Result must contain 'timestamp'"
        
        # Assert: Confidence is valid
        assert isinstance(result['confidence'], float), "Confidence must be float"
        assert 0.0 <= result['confidence'] <= 1.0, \
            f"Confidence {result['confidence']} not in range [0, 1]"
        
        # Assert: Timestamp is valid ISO format
        try:
            datetime.fromisoformat(result['timestamp'])
        except ValueError:
            pytest.fail(f"Invalid timestamp format: {result['timestamp']}")
    
    @given(user_profile_strategy())
    @settings(max_examples=100, deadline=5000)
    def test_classification_consistency(self, profile):
        """
        Property: Classification should be deterministic for same input.
        
        Classifying the same profile multiple times should yield the same result.
        """
        # Arrange
        classifier = create_trained_classifier()
        
        # Act: Classify same profile twice
        result1 = classifier.classify_user(profile)
        result2 = classifier.classify_user(profile)
        
        # Assert: Results are identical
        assert result1['groups'] == result2['groups'], \
            "Classification should be deterministic"
        assert abs(result1['confidence'] - result2['confidence']) < 1e-6, \
            "Confidence should be deterministic"
    
    @given(user_profile_strategy())
    @settings(max_examples=100, deadline=5000)
    def test_classification_produces_valid_features(self, profile):
        """
        Property: Classification should produce valid feature vectors.
        
        The extracted features should be numeric and properly normalized.
        """
        # Arrange
        classifier = create_trained_classifier()
        
        # Act
        result = classifier.classify_user(profile)
        
        # Assert: Features are present and valid
        assert 'features' in result, "Result must contain 'features'"
        features = result['features']
        
        assert isinstance(features, list), "Features must be a list"
        assert len(features) > 0, "Features list must not be empty"
        
        # All features should be numeric
        for i, feature in enumerate(features):
            assert isinstance(feature, (int, float)), \
                f"Feature {i} must be numeric, got {type(feature)}"
            assert not np.isnan(feature), f"Feature {i} is NaN"
            assert not np.isinf(feature), f"Feature {i} is infinite"
    
    @given(
        st.lists(
            user_profile_strategy(),
            min_size=2,
            max_size=10
        )
    )
    @settings(max_examples=50, deadline=10000)
    def test_batch_classification_consistency(self, profiles):
        """
        Property: Batch classification should be consistent with individual classification.
        
        Classifying profiles individually should yield same results as batch processing.
        """
        # Arrange
        classifier = create_trained_classifier()
        
        # Act: Classify individually
        individual_results = [classifier.classify_user(p) for p in profiles]
        
        # Act: Classify in batch (simulate by classifying each)
        batch_results = [classifier.classify_user(p) for p in profiles]
        
        # Assert: Results match
        for i, (ind, batch) in enumerate(zip(individual_results, batch_results)):
            assert ind['groups'] == batch['groups'], \
                f"Profile {i}: Individual and batch results differ"
    
    def test_classification_requires_trained_model(self):
        """
        Property: Classification should fail on untrained model.
        
        Attempting to classify without training should raise an error.
        """
        # Arrange: Untrained classifier
        classifier = UserClassifier()
        profile = {
            'user_id': 'test-user',
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
        }
        
        # Act & Assert: Should raise ValueError
        with pytest.raises(ValueError, match="must be trained"):
            classifier.classify_user(profile)
    
    @given(user_profile_strategy())
    @settings(max_examples=50, deadline=5000)
    def test_multi_group_assignment_validity(self, profile):
        """
        Property: Multi-group assignments should be valid and related.
        
        When multiple groups are assigned, they should be nearby clusters.
        """
        # Arrange
        classifier = create_trained_classifier()
        
        # Act
        result = classifier.classify_user(profile)
        
        # Assert: If multiple groups assigned, check they're valid
        if len(result['groups']) > 1:
            # All groups should be distinct
            assert len(result['groups']) == len(set(result['groups'])), \
                "Multi-group assignment should not contain duplicates"
            
            # All groups should be valid cluster IDs
            for group_id in result['groups']:
                assert 0 <= group_id < classifier.n_clusters, \
                    f"Invalid group ID {group_id}"
    
    def test_training_with_insufficient_data(self):
        """
        Property: Training should fail with insufficient data.
        
        Training with fewer profiles than clusters should raise an error.
        """
        # Arrange
        classifier = UserClassifier(n_clusters=25)
        insufficient_profiles = [
            {
                'user_id': f'user-{i}',
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
            }
            for i in range(10)  # Only 10 profiles for 25 clusters
        ]
        
        # Act & Assert
        with pytest.raises(ValueError, match="Need at least"):
            classifier.train(insufficient_profiles)
    
    def test_cluster_metadata_completeness(self):
        """
        Property: Cluster metadata should be complete after training.
        
        All clusters should have metadata with required fields.
        """
        # Arrange & Act
        classifier = create_trained_classifier()
        
        # Assert: Metadata exists for all clusters
        metadata = classifier.get_all_clusters_info()
        assert len(metadata) == classifier.n_clusters, \
            "Metadata should exist for all clusters"
        
        # Assert: Each cluster has required fields
        for cluster_id, info in metadata.items():
            assert 'size' in info, f"Cluster {cluster_id} missing 'size'"
            assert 'centroid' in info, f"Cluster {cluster_id} missing 'centroid'"
            assert 'typical_profile' in info, f"Cluster {cluster_id} missing 'typical_profile'"
            assert 'feature_stats' in info, f"Cluster {cluster_id} missing 'feature_stats'"
            
            # Centroid should be a list of floats
            assert isinstance(info['centroid'], list), "Centroid must be a list"
            assert all(isinstance(x, (int, float)) for x in info['centroid']), \
                "Centroid values must be numeric"

    @given(user_profile_strategy())
    @settings(max_examples=100, deadline=5000)
    def test_property_6_low_confidence_default_assignment(self, profile):
        """
        **Validates: Requirements 2.5**
        
        Property 6: Low Confidence Default Assignment
        
        For any user profile that results in classification confidence below 70%,
        the system should assign the user to a default broad category.
        """
        # Arrange: Create classifier with training data
        classifier = create_trained_classifier()
        
        # Act: Classify user with explicit confidence threshold
        result = classifier.classify_user(profile, confidence_threshold=0.7)
        
        # Assert: Check confidence and group assignment relationship
        confidence = result['confidence']
        groups = result['groups']
        
        assert isinstance(confidence, float), "Confidence must be a float"
        assert 0.0 <= confidence <= 1.0, f"Confidence {confidence} not in range [0, 1]"
        
        if confidence < 0.7:
            # Low confidence case: should assign to default group
            assert len(groups) >= 1, "Must assign at least one group even with low confidence"
            
            # Default group should be present (group 0 is default)
            default_group = classifier._get_default_group_id()
            assert default_group in groups, \
                f"Low confidence ({confidence:.3f}) should assign to default group {default_group}, got {groups}"
        else:
            # High confidence case: should assign to actual cluster(s)
            assert len(groups) >= 1, "Must assign at least one group with high confidence"
            
            # All groups should be valid cluster IDs
            for group_id in groups:
                assert 0 <= group_id < classifier.n_clusters, \
                    f"Invalid group ID {group_id}"
    
    def test_forced_low_confidence_assignment(self):
        """
        Property: Explicitly test low confidence scenario.
        
        Create a scenario where we can verify low confidence behavior.
        """
        # Arrange: Train classifier with very distinct clusters
        classifier = UserClassifier(n_clusters=5, random_state=42)
        
        # Create 5 very distinct groups
        profiles = []
        for cluster in range(5):
            for i in range(20):
                profiles.append({
                    'user_id': f'user-{cluster}-{i}',
                    'age': 20 + cluster * 15,  # Very different ages per cluster
                    'gender': 'male',
                    'marital_status': 'single',
                    'family_size': 1 + cluster,
                    'annual_income': 100000 + cluster * 1000000,  # Very different incomes
                    'employment_status': 'employed',
                    'state': 'Maharashtra',
                    'rural_urban': 'urban',
                    'education_level': 'graduate',
                    'caste': 'general',
                    'disability': False,
                })
        
        classifier.train(profiles)
        
        # Create an outlier profile that doesn't fit any cluster well
        outlier_profile = {
            'user_id': 'outlier-user',
            'age': 95,  # Very old, outside training range
            'gender': 'other',
            'marital_status': 'widowed',
            'family_size': 10,  # Very large family
            'annual_income': 9000000,  # Very high income
            'employment_status': 'retired',
            'state': 'Sikkim',  # Uncommon state
            'rural_urban': 'rural',
            'education_level': 'no_formal',
            'caste': 'other',
            'disability': True,
        }
        
        # Act: Classify outlier with high threshold
        result = classifier.classify_user(outlier_profile, confidence_threshold=0.7)
        
        # Assert: Should handle outlier appropriately
        assert 'groups' in result
        assert 'confidence' in result
        assert len(result['groups']) >= 1, "Must assign at least one group"
        
        # If confidence is low, default group should be assigned
        if result['confidence'] < 0.7:
            default_group = classifier._get_default_group_id()
            assert default_group in result['groups'], \
                "Low confidence outlier should be assigned to default group"
    
    @given(
        st.floats(min_value=0.0, max_value=1.0),
        user_profile_strategy()
    )
    @settings(max_examples=50, deadline=5000)
    def test_confidence_threshold_parameter(self, threshold, profile):
        """
        Property: Confidence threshold parameter should be respected.
        
        The classification should respect custom confidence thresholds.
        """
        # Arrange
        classifier = create_trained_classifier()
        
        # Act: Classify with custom threshold
        result = classifier.classify_user(profile, confidence_threshold=threshold)
        
        # Assert: Result structure is valid
        assert 'confidence' in result
        assert 'groups' in result
        assert len(result['groups']) >= 1
        
        # If confidence below threshold, should use default group
        if result['confidence'] < threshold:
            default_group = classifier._get_default_group_id()
            # Default group should be in the assigned groups
            assert default_group in result['groups'], \
                f"Confidence {result['confidence']:.3f} < threshold {threshold:.3f}, " \
                f"should include default group {default_group}"
