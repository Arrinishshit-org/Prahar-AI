"""
Unit tests for UserClassifier

Tests specific examples and edge cases for user classification.
"""

import pytest
import numpy as np
from pathlib import Path
import tempfile

from src.user_classifier import UserClassifier


class TestUserClassifier:
    """Unit tests for UserClassifier"""
    
    def test_initialization(self):
        """Test classifier initialization with default parameters"""
        classifier = UserClassifier()
        
        assert classifier.n_clusters == 25
        assert classifier.random_state == 42
        assert not classifier.is_fitted
        assert classifier.cluster_metadata == {}
    
    def test_initialization_custom_params(self):
        """Test classifier initialization with custom parameters"""
        classifier = UserClassifier(n_clusters=10, random_state=123)
        
        assert classifier.n_clusters == 10
        assert classifier.random_state == 123
    
    def test_train_basic(self, sample_user_profiles_batch):
        """Test basic training functionality"""
        classifier = UserClassifier(n_clusters=5)
        
        # Extend to have enough profiles
        profiles = sample_user_profiles_batch * 5  # 50 profiles
        
        metrics = classifier.train(profiles)
        
        assert classifier.is_fitted
        assert metrics['n_clusters'] == 5
        assert metrics['n_samples'] == 50
        assert 'inertia' in metrics
        assert 'timestamp' in metrics
    
    def test_train_stores_metadata(self, sample_user_profiles_batch):
        """Test that training stores cluster metadata"""
        classifier = UserClassifier(n_clusters=5)
        profiles = sample_user_profiles_batch * 5
        
        classifier.train(profiles)
        
        metadata = classifier.get_all_clusters_info()
        assert len(metadata) == 5
        
        for cluster_id, info in metadata.items():
            assert 'size' in info
            assert 'centroid' in info
            assert 'typical_profile' in info
            assert 'feature_stats' in info
    
    def test_classify_user_basic(self, sample_user_profile):
        """Test basic user classification"""
        classifier = UserClassifier(n_clusters=5)
        
        # Create training data
        profiles = []
        for i in range(50):
            profile = sample_user_profile.copy()
            profile['user_id'] = f'user-{i}'
            profile['age'] = 20 + i
            profile['annual_income'] = 200000 + i * 50000
            profiles.append(profile)
        
        classifier.train(profiles)
        
        # Classify a new user
        result = classifier.classify_user(sample_user_profile)
        
        assert 'user_id' in result
        assert 'groups' in result
        assert 'confidence' in result
        assert 'features' in result
        assert 'timestamp' in result
        
        assert len(result['groups']) >= 1
        assert 0.0 <= result['confidence'] <= 1.0
    
    def test_classify_user_high_confidence(self):
        """Test classification with high confidence"""
        classifier = UserClassifier(n_clusters=3)
        
        # Create very distinct clusters
        profiles = []
        for cluster in range(3):
            for i in range(20):
                profiles.append({
                    'user_id': f'user-{cluster}-{i}',
                    'age': 25 + cluster * 20,
                    'gender': 'male',
                    'marital_status': 'single',
                    'family_size': 1 + cluster,
                    'annual_income': 300000 + cluster * 2000000,
                    'employment_status': 'employed',
                    'state': 'Maharashtra',
                    'rural_urban': 'urban',
                    'education_level': 'graduate',
                    'caste': 'general',
                    'disability': False,
                })
        
        classifier.train(profiles)
        
        # Classify a profile similar to cluster 0
        test_profile = {
            'user_id': 'test-user',
            'age': 26,
            'gender': 'male',
            'marital_status': 'single',
            'family_size': 1,
            'annual_income': 320000,
            'employment_status': 'employed',
            'state': 'Maharashtra',
            'rural_urban': 'urban',
            'education_level': 'graduate',
            'caste': 'general',
            'disability': False,
        }
        
        result = classifier.classify_user(test_profile)
        
        # Should have high confidence
        assert result['confidence'] >= 0.5
        assert len(result['groups']) >= 1
    
    def test_classify_user_low_confidence_default(self):
        """Test that low confidence assigns to default group"""
        classifier = UserClassifier(n_clusters=3)
        
        # Create training data
        profiles = []
        for i in range(30):
            profiles.append({
                'user_id': f'user-{i}',
                'age': 30,
                'gender': 'male',
                'marital_status': 'single',
                'family_size': 2,
                'annual_income': 500000,
                'employment_status': 'employed',
                'state': 'Maharashtra',
                'rural_urban': 'urban',
                'education_level': 'graduate',
                'caste': 'general',
                'disability': False,
            })
        
        classifier.train(profiles)
        
        # Classify with high threshold to force low confidence
        result = classifier.classify_user(profiles[0], confidence_threshold=0.99)
        
        # Should assign to default group
        default_group = classifier._get_default_group_id()
        assert default_group in result['groups']
    
    def test_get_cluster_info(self, sample_user_profiles_batch):
        """Test retrieving cluster information"""
        classifier = UserClassifier(n_clusters=5)
        profiles = sample_user_profiles_batch * 5
        
        classifier.train(profiles)
        
        # Get info for specific cluster
        info = classifier.get_cluster_info(0)
        assert info is not None
        assert 'size' in info
        assert 'typical_profile' in info
        
        # Get info for non-existent cluster
        info = classifier.get_cluster_info(999)
        assert info is None
    
    def test_save_and_load_model(self, sample_user_profiles_batch):
        """Test saving and loading trained model"""
        classifier = UserClassifier(n_clusters=5)
        profiles = sample_user_profiles_batch * 5
        
        classifier.train(profiles)
        
        # Save model
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pkl') as f:
            temp_path = f.name
        
        try:
            classifier.save_model(temp_path)
            
            # Load model into new classifier
            new_classifier = UserClassifier()
            new_classifier.load_model(temp_path)
            
            # Verify loaded model
            assert new_classifier.is_fitted
            assert new_classifier.n_clusters == 5
            assert len(new_classifier.cluster_metadata) == 5
            
            # Verify classification works
            result = new_classifier.classify_user(profiles[0])
            assert 'groups' in result
            assert len(result['groups']) >= 1
        
        finally:
            # Clean up
            Path(temp_path).unlink(missing_ok=True)
    
    def test_save_unfitted_model_raises_error(self):
        """Test that saving unfitted model raises error"""
        classifier = UserClassifier()
        
        with pytest.raises(ValueError, match="Cannot save unfitted model"):
            classifier.save_model('test.pkl')
    
    def test_classify_unfitted_model_raises_error(self, sample_user_profile):
        """Test that classifying with unfitted model raises error"""
        classifier = UserClassifier()
        
        with pytest.raises(ValueError, match="must be trained"):
            classifier.classify_user(sample_user_profile)
    
    def test_train_insufficient_profiles_raises_error(self):
        """Test that training with too few profiles raises error"""
        classifier = UserClassifier(n_clusters=25)
        
        # Only 10 profiles for 25 clusters
        profiles = [
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
            for i in range(10)
        ]
        
        with pytest.raises(ValueError, match="Need at least"):
            classifier.train(profiles)
    
    def test_multi_group_assignment(self):
        """Test multi-group assignment for boundary cases"""
        classifier = UserClassifier(n_clusters=3)
        
        # Create distinct clusters
        profiles = []
        for cluster in range(3):
            for i in range(20):
                profiles.append({
                    'user_id': f'user-{cluster}-{i}',
                    'age': 25 + cluster * 20,
                    'gender': 'male',
                    'marital_status': 'single',
                    'family_size': 1,
                    'annual_income': 300000 + cluster * 2000000,
                    'employment_status': 'employed',
                    'state': 'Maharashtra',
                    'rural_urban': 'urban',
                    'education_level': 'graduate',
                    'caste': 'general',
                    'disability': False,
                })
        
        classifier.train(profiles)
        
        # Create a profile on the boundary
        boundary_profile = {
            'user_id': 'boundary-user',
            'age': 35,  # Between cluster 0 (25) and cluster 1 (45)
            'gender': 'male',
            'marital_status': 'single',
            'family_size': 1,
            'annual_income': 1500000,  # Between clusters
            'employment_status': 'employed',
            'state': 'Maharashtra',
            'rural_urban': 'urban',
            'education_level': 'graduate',
            'caste': 'general',
            'disability': False,
        }
        
        result = classifier.classify_user(boundary_profile, multi_group_threshold=1.5)
        
        # May be assigned to multiple groups
        assert len(result['groups']) >= 1
        
        # All groups should be valid
        for group_id in result['groups']:
            assert 0 <= group_id < 3
    
    def test_feature_extraction_in_classification(self, sample_user_profile):
        """Test that features are properly extracted during classification"""
        classifier = UserClassifier(n_clusters=5)
        
        profiles = []
        for i in range(50):
            profile = sample_user_profile.copy()
            profile['user_id'] = f'user-{i}'
            profile['age'] = 20 + i
            profiles.append(profile)
        
        classifier.train(profiles)
        
        result = classifier.classify_user(sample_user_profile)
        
        # Check features
        features = result['features']
        assert isinstance(features, list)
        assert len(features) > 0
        
        # All features should be numeric
        for feature in features:
            assert isinstance(feature, (int, float))
            assert not np.isnan(feature)
            assert not np.isinf(feature)
    
    def test_default_group_id(self):
        """Test default group ID retrieval"""
        classifier = UserClassifier()
        
        default_id = classifier._get_default_group_id()
        assert isinstance(default_id, int)
        assert default_id == 0  # Default is cluster 0
