"""
Unit tests for EligibilityEngine

Complements property-based tests with specific examples and edge cases.
"""

import pytest
import numpy as np
from src.eligibility_engine import EligibilityEngine


class TestEligibilityEngine:
    """Unit tests for eligibility engine"""
    
    def test_calculate_eligibility_basic(self, sample_user_profile, sample_scheme):
        """Test basic eligibility calculation"""
        engine = EligibilityEngine()
        result = engine.calculate_eligibility(sample_user_profile, sample_scheme)
        
        # Check result structure
        assert 'score' in result
        assert 'percentage' in result
        assert 'category' in result
        assert 'met_criteria' in result
        assert 'unmet_criteria' in result
        assert 'calculated_at' in result
        
        # Check value ranges
        assert 0.0 <= result['score'] <= 1.0
        assert 0 <= result['percentage'] <= 100
        assert result['category'] in ['highly_eligible', 'potentially_eligible', 'low_eligibility']
    
    def test_cosine_similarity_identical_vectors(self):
        """Test cosine similarity with identical vectors"""
        engine = EligibilityEngine()
        vector = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        
        similarity = engine._cosine_similarity(vector, vector)
        
        # Identical vectors should have similarity of 1.0
        assert abs(similarity - 1.0) < 1e-10
    
    def test_cosine_similarity_orthogonal_vectors(self):
        """Test cosine similarity with orthogonal vectors"""
        engine = EligibilityEngine()
        vector_a = np.array([1.0, 0.0, 0.0])
        vector_b = np.array([0.0, 1.0, 0.0])
        
        similarity = engine._cosine_similarity(vector_a, vector_b)
        
        # Orthogonal vectors should have similarity of 0.0
        assert abs(similarity - 0.0) < 1e-10
    
    def test_cosine_similarity_zero_vector(self):
        """Test cosine similarity with zero vector"""
        engine = EligibilityEngine()
        vector_a = np.array([1.0, 2.0, 3.0])
        vector_b = np.array([0.0, 0.0, 0.0])
        
        similarity = engine._cosine_similarity(vector_a, vector_b)
        
        # Zero vector should return 0.0
        assert similarity == 0.0
    
    def test_categorize_eligibility_highly_eligible(self):
        """Test categorization for highly eligible score"""
        engine = EligibilityEngine()
        
        assert engine._categorize_eligibility(80) == 'highly_eligible'
        assert engine._categorize_eligibility(90) == 'highly_eligible'
        assert engine._categorize_eligibility(100) == 'highly_eligible'
    
    def test_categorize_eligibility_potentially_eligible(self):
        """Test categorization for potentially eligible score"""
        engine = EligibilityEngine()
        
        assert engine._categorize_eligibility(50) == 'potentially_eligible'
        assert engine._categorize_eligibility(65) == 'potentially_eligible'
        assert engine._categorize_eligibility(79) == 'potentially_eligible'
    
    def test_categorize_eligibility_low_eligibility(self):
        """Test categorization for low eligibility score"""
        engine = EligibilityEngine()
        
        assert engine._categorize_eligibility(0) == 'low_eligibility'
        assert engine._categorize_eligibility(25) == 'low_eligibility'
        assert engine._categorize_eligibility(49) == 'low_eligibility'
    
    def test_batch_calculate_eligibility(self, sample_user_profile, sample_schemes_batch):
        """Test batch eligibility calculation"""
        engine = EligibilityEngine()
        results = engine.batch_calculate_eligibility(
            sample_user_profile,
            sample_schemes_batch
        )
        
        # Should return results for all schemes
        assert len(results) == len(sample_schemes_batch)
        
        # Each result should have required fields
        for result in results:
            assert 'scheme_id' in result
            assert 'score' in result
            assert 'percentage' in result
            assert 'category' in result
    
    def test_generate_explanation(self, sample_user_profile, sample_scheme):
        """Test explanation generation"""
        engine = EligibilityEngine()
        eligibility_result = engine.calculate_eligibility(
            sample_user_profile,
            sample_scheme
        )
        
        explanation = engine.generate_explanation(
            eligibility_result,
            sample_user_profile,
            sample_scheme
        )
        
        # Check explanation structure
        assert 'summary' in explanation
        assert 'strengths' in explanation
        assert 'gaps' in explanation
        assert 'recommendations' in explanation
        
        # Summary should not be empty
        assert len(explanation['summary']) > 0
        
        # Should have recommendations
        assert len(explanation['recommendations']) > 0
    
    def test_age_criterion_met(self):
        """Test age criterion when user meets requirement"""
        engine = EligibilityEngine()
        
        user_profile = {
            'age': 25,
            'annual_income': 500000,
            'state': 'Maharashtra',
            'occupation': 'Engineer',
            'education_level': 'graduate',
            'caste': 'general',
            'disability': False,
        }
        
        scheme = {
            'scheme_id': 'test-scheme',
            'eligibility': {
                'age_min': 18,
                'age_max': 35,
            }
        }
        
        result = engine.calculate_eligibility(user_profile, scheme)
        
        # Should have age in met criteria
        age_criteria = [c for c in result['met_criteria'] if c['name'] == 'age']
        assert len(age_criteria) > 0
    
    def test_age_criterion_not_met(self):
        """Test age criterion when user doesn't meet requirement"""
        engine = EligibilityEngine()
        
        user_profile = {
            'age': 40,
            'annual_income': 500000,
            'state': 'Maharashtra',
            'occupation': 'Engineer',
            'education_level': 'graduate',
            'caste': 'general',
            'disability': False,
        }
        
        scheme = {
            'scheme_id': 'test-scheme',
            'eligibility': {
                'age_min': 18,
                'age_max': 35,
            }
        }
        
        result = engine.calculate_eligibility(user_profile, scheme)
        
        # Should have age in unmet criteria
        age_criteria = [c for c in result['unmet_criteria'] if c['name'] == 'age']
        assert len(age_criteria) > 0
    
    def test_income_criterion_met(self):
        """Test income criterion when user meets requirement"""
        engine = EligibilityEngine()
        
        user_profile = {
            'age': 25,
            'annual_income': 300000,
            'state': 'Maharashtra',
            'occupation': 'Engineer',
            'education_level': 'graduate',
            'caste': 'general',
            'disability': False,
        }
        
        scheme = {
            'scheme_id': 'test-scheme',
            'eligibility': {
                'income_max': 500000,
            }
        }
        
        result = engine.calculate_eligibility(user_profile, scheme)
        
        # Should have income in met criteria
        income_criteria = [c for c in result['met_criteria'] if c['name'] == 'income']
        assert len(income_criteria) > 0
    
    def test_income_criterion_not_met(self):
        """Test income criterion when user doesn't meet requirement"""
        engine = EligibilityEngine()
        
        user_profile = {
            'age': 25,
            'annual_income': 800000,
            'state': 'Maharashtra',
            'occupation': 'Engineer',
            'education_level': 'graduate',
            'caste': 'general',
            'disability': False,
        }
        
        scheme = {
            'scheme_id': 'test-scheme',
            'eligibility': {
                'income_max': 500000,
            }
        }
        
        result = engine.calculate_eligibility(user_profile, scheme)
        
        # Should have income in unmet criteria
        income_criteria = [c for c in result['unmet_criteria'] if c['name'] == 'income']
        assert len(income_criteria) > 0
    
    def test_location_criterion_met(self):
        """Test location criterion when user meets requirement"""
        engine = EligibilityEngine()
        
        user_profile = {
            'age': 25,
            'annual_income': 500000,
            'state': 'Maharashtra',
            'occupation': 'Engineer',
            'education_level': 'graduate',
            'caste': 'general',
            'disability': False,
        }
        
        scheme = {
            'scheme_id': 'test-scheme',
            'eligibility': {
                'states': ['Maharashtra', 'Karnataka'],
            }
        }
        
        result = engine.calculate_eligibility(user_profile, scheme)
        
        # Should have location in met criteria
        location_criteria = [c for c in result['met_criteria'] if c['name'] == 'location']
        assert len(location_criteria) > 0
    
    def test_cache_stores_results(self, sample_user_profile, sample_scheme):
        """Test that cache stores results correctly"""
        sample_user_profile['user_id'] = 'cache-test-user'
        sample_scheme['scheme_id'] = 'cache-test-scheme'
        
        engine = EligibilityEngine()
        
        # First calculation
        engine.batch_calculate_eligibility(sample_user_profile, [sample_scheme])
        
        # Check cache
        cache_key = engine._get_cache_key(sample_user_profile, sample_scheme)
        cached = engine._get_cached_result(cache_key)
        
        assert cached is not None
        assert 'score' in cached
        assert 'percentage' in cached
    
    def test_explanation_includes_top_3_criteria(self, sample_user_profile, sample_scheme):
        """Test that explanation includes at most 3 top criteria"""
        engine = EligibilityEngine()
        eligibility_result = engine.calculate_eligibility(
            sample_user_profile,
            sample_scheme
        )
        
        explanation = engine.generate_explanation(
            eligibility_result,
            sample_user_profile,
            sample_scheme
        )
        
        # Should have at most 3 strengths
        assert len(explanation['strengths']) <= 3
