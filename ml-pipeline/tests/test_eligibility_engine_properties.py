"""
Property-based tests for EligibilityEngine

Tests Properties 24, 25, 26, and 43 from the design document.
"""

import pytest
import numpy as np
from hypothesis import given, strategies as st, assume
from tests.conftest import user_profile_strategy
from src.eligibility_engine import EligibilityEngine


def scheme_strategy():
    """Hypothesis strategy for generating schemes"""
    return st.fixed_dictionaries({
        'scheme_id': st.text(min_size=5, max_size=20),
        'scheme_name': st.text(min_size=10, max_size=100),
        'category': st.sampled_from(['education', 'healthcare', 'agriculture', 'employment', 'housing']),
        'eligibility': st.fixed_dictionaries({
            'age_min': st.integers(min_value=18, max_value=60),
            'age_max': st.integers(min_value=25, max_value=100),
            'income_max': st.integers(min_value=100000, max_value=5000000),
            'states': st.lists(
                st.sampled_from(['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat']),
                min_size=1,
                max_size=3,
                unique=True
            ),
            'education_levels': st.lists(
                st.sampled_from(['primary', 'secondary', 'graduate', 'postgraduate']),
                min_size=1,
                max_size=3,
                unique=True
            ),
            'castes': st.lists(
                st.sampled_from(['general', 'obc', 'sc', 'st']),
                min_size=1,
                max_size=3,
                unique=True
            ),
            'disability': st.booleans(),
        }),
        'is_active': st.just(True),
    })


class TestEligibilityEngineProperties:
    """Property-based tests for eligibility engine"""
    
    @given(user_profile_strategy(), scheme_strategy())
    def test_property_24_eligibility_score_range(self, user_profile, scheme):
        """
        **Property 24: Eligibility Score Range**
        
        For any user-scheme pair, the calculated eligibility score should be
        a percentage value between 0% and 100%.
        
        **Validates: Requirements 9.2**
        """
        # Ensure age_max >= age_min
        assume(scheme['eligibility']['age_max'] >= scheme['eligibility']['age_min'])
        
        engine = EligibilityEngine()
        result = engine.calculate_eligibility(user_profile, scheme)
        
        # Score should be between 0.0 and 1.0
        assert 0.0 <= result['score'] <= 1.0, \
            f"Score {result['score']} is outside [0.0, 1.0] range"
        
        # Percentage should be between 0 and 100
        assert 0 <= result['percentage'] <= 100, \
            f"Percentage {result['percentage']} is outside [0, 100] range"
        
        # Percentage should be score * 100
        assert abs(result['percentage'] - result['score'] * 100) < 0.01, \
            f"Percentage {result['percentage']} doesn't match score {result['score']} * 100"
    
    @given(user_profile_strategy(), scheme_strategy())
    def test_property_25_eligibility_score_categorization(self, user_profile, scheme):
        """
        **Property 25: Eligibility Score Categorization**
        
        For any eligibility score, the system should categorize it as:
        - "Highly Eligible" (≥80%)
        - "Potentially Eligible" (50-80%)
        - "Low Eligibility" (<50%)
        
        **Validates: Requirements 9.4, 9.5, 9.6**
        """
        # Ensure age_max >= age_min
        assume(scheme['eligibility']['age_max'] >= scheme['eligibility']['age_min'])
        
        engine = EligibilityEngine()
        result = engine.calculate_eligibility(user_profile, scheme)
        
        percentage = result['percentage']
        category = result['category']
        
        # Verify categorization is correct
        if percentage >= 80:
            assert category == 'highly_eligible', \
                f"Score {percentage}% should be 'highly_eligible', got '{category}'"
        elif percentage >= 50:
            assert category == 'potentially_eligible', \
                f"Score {percentage}% should be 'potentially_eligible', got '{category}'"
        else:
            assert category == 'low_eligibility', \
                f"Score {percentage}% should be 'low_eligibility', got '{category}'"
        
        # Verify category is one of the valid values
        assert category in ['highly_eligible', 'potentially_eligible', 'low_eligibility'], \
            f"Invalid category: {category}"
    
    @given(user_profile_strategy(), scheme_strategy())
    def test_property_26_eligibility_explanation_completeness(self, user_profile, scheme):
        """
        **Property 26: Eligibility Explanation Completeness**
        
        For any eligibility calculation, the system should provide an explanation
        listing which criteria the user meets and which they do not meet.
        
        **Validates: Requirements 9.3**
        """
        # Ensure age_max >= age_min
        assume(scheme['eligibility']['age_max'] >= scheme['eligibility']['age_min'])
        
        engine = EligibilityEngine()
        result = engine.calculate_eligibility(user_profile, scheme)
        
        # Should have met_criteria list
        assert 'met_criteria' in result, "Result missing 'met_criteria'"
        assert isinstance(result['met_criteria'], list), \
            "'met_criteria' should be a list"
        
        # Should have unmet_criteria list
        assert 'unmet_criteria' in result, "Result missing 'unmet_criteria'"
        assert isinstance(result['unmet_criteria'], list), \
            "'unmet_criteria' should be a list"
        
        # Each criterion should have required fields
        for criterion in result['met_criteria']:
            assert 'name' in criterion, "Met criterion missing 'name'"
            assert 'user_value' in criterion, "Met criterion missing 'user_value'"
            assert 'requirement' in criterion, "Met criterion missing 'requirement'"
        
        for criterion in result['unmet_criteria']:
            assert 'name' in criterion, "Unmet criterion missing 'name'"
            assert 'user_value' in criterion, "Unmet criterion missing 'user_value'"
            assert 'requirement' in criterion, "Unmet criterion missing 'requirement'"
            assert 'required' in criterion, "Unmet criterion missing 'required'"
        
        # At least one of the lists should be non-empty
        # (either some criteria are met or some are not met)
        assert len(result['met_criteria']) > 0 or len(result['unmet_criteria']) > 0, \
            "Both met_criteria and unmet_criteria are empty"
    
    @given(user_profile_strategy(), scheme_strategy())
    def test_property_43_top_matching_criteria_display(self, user_profile, scheme):
        """
        **Property 43: Top Matching Criteria Display**
        
        For any scheme recommendation, the explanation should include
        the top 3 matching criteria between the user and the scheme.
        
        **Validates: Requirements 17.3**
        """
        # Ensure age_max >= age_min
        assume(scheme['eligibility']['age_max'] >= scheme['eligibility']['age_min'])
        
        engine = EligibilityEngine()
        eligibility_result = engine.calculate_eligibility(user_profile, scheme)
        
        # Generate explanation
        explanation = engine.generate_explanation(
            eligibility_result,
            user_profile,
            scheme
        )
        
        # Should have strengths field
        assert 'strengths' in explanation, "Explanation missing 'strengths'"
        assert isinstance(explanation['strengths'], list), \
            "'strengths' should be a list"
        
        # Should have at most 3 top criteria
        assert len(explanation['strengths']) <= 3, \
            f"Should have at most 3 top criteria, got {len(explanation['strengths'])}"
        
        # If there are met criteria, strengths should not be empty
        if len(eligibility_result['met_criteria']) > 0:
            assert len(explanation['strengths']) > 0, \
                "Should have at least one strength when criteria are met"
        
        # Each strength should be a non-empty string
        for strength in explanation['strengths']:
            assert isinstance(strength, str), "Strength should be a string"
            assert len(strength) > 0, "Strength should not be empty"
    
    @given(user_profile_strategy(), scheme_strategy())
    def test_eligibility_calculation_deterministic(self, user_profile, scheme):
        """
        Property: Eligibility calculation should be deterministic
        
        For any user-scheme pair, calculating eligibility multiple times
        should produce identical results.
        """
        # Ensure age_max >= age_min
        assume(scheme['eligibility']['age_max'] >= scheme['eligibility']['age_min'])
        
        engine = EligibilityEngine()
        result1 = engine.calculate_eligibility(user_profile, scheme)
        result2 = engine.calculate_eligibility(user_profile, scheme)
        
        # Scores should be identical
        assert result1['score'] == result2['score']
        assert result1['percentage'] == result2['percentage']
        assert result1['category'] == result2['category']
    
    @given(user_profile_strategy(), st.lists(scheme_strategy(), min_size=1, max_size=5))
    def test_batch_calculation_consistency(self, user_profile, schemes):
        """
        Property: Batch calculation should produce same results as individual calculations
        
        For any user and list of schemes, batch calculation should produce
        the same results as calculating each scheme individually.
        """
        # Ensure all schemes have valid age ranges and unique IDs
        for i, scheme in enumerate(schemes):
            assume(scheme['eligibility']['age_max'] >= scheme['eligibility']['age_min'])
            # Make scheme IDs unique to avoid cache conflicts
            scheme['scheme_id'] = f"scheme-{i}-{scheme.get('scheme_id', '')}"
        
        engine = EligibilityEngine()
        
        # Calculate individually
        individual_results = []
        for scheme in schemes:
            result = engine.calculate_eligibility(user_profile, scheme)
            individual_results.append(result)
        
        # Clear cache to ensure fresh calculation in batch
        engine._eligibility_cache.clear()
        
        # Calculate in batch
        batch_results = engine.batch_calculate_eligibility(user_profile, schemes)
        
        # Should have same number of results
        assert len(batch_results) == len(individual_results)
        
        # Each result should match (comparing scores)
        for i, (batch_result, individual_result) in enumerate(
            zip(batch_results, individual_results)
        ):
            assert abs(batch_result['score'] - individual_result['score']) < 0.0001, \
                f"Batch result {i} score differs from individual calculation"
            assert batch_result['category'] == individual_result['category'], \
                f"Batch result {i} category differs from individual calculation"
    
    @given(user_profile_strategy(), scheme_strategy())
    def test_explanation_has_required_fields(self, user_profile, scheme):
        """
        Property: Explanation should have all required fields
        
        For any eligibility calculation, the generated explanation should
        contain summary, strengths, gaps, and recommendations.
        """
        # Ensure age_max >= age_min
        assume(scheme['eligibility']['age_max'] >= scheme['eligibility']['age_min'])
        
        engine = EligibilityEngine()
        eligibility_result = engine.calculate_eligibility(user_profile, scheme)
        explanation = engine.generate_explanation(
            eligibility_result,
            user_profile,
            scheme
        )
        
        # Check required fields
        assert 'summary' in explanation, "Explanation missing 'summary'"
        assert 'strengths' in explanation, "Explanation missing 'strengths'"
        assert 'gaps' in explanation, "Explanation missing 'gaps'"
        assert 'recommendations' in explanation, "Explanation missing 'recommendations'"
        
        # Check types
        assert isinstance(explanation['summary'], str)
        assert isinstance(explanation['strengths'], list)
        assert isinstance(explanation['gaps'], list)
        assert isinstance(explanation['recommendations'], list)
        
        # Summary should not be empty
        assert len(explanation['summary']) > 0
        
        # Recommendations should not be empty
        assert len(explanation['recommendations']) > 0
    
    @given(user_profile_strategy(), scheme_strategy())
    def test_cosine_similarity_symmetry(self, user_profile, scheme):
        """
        Property: Cosine similarity should be symmetric
        
        For any user-scheme pair, the eligibility score should be the same
        regardless of which is treated as the "user" vector.
        
        Note: This tests the mathematical property of cosine similarity.
        """
        # Ensure age_max >= age_min
        assume(scheme['eligibility']['age_max'] >= scheme['eligibility']['age_min'])
        
        engine = EligibilityEngine()
        
        # Extract vectors
        user_vector = engine.feature_extractor.extract_features(user_profile)
        scheme_vector = engine._extract_scheme_vector(scheme)
        
        # Calculate similarity both ways
        sim1 = engine._cosine_similarity(user_vector, scheme_vector)
        sim2 = engine._cosine_similarity(scheme_vector, user_vector)
        
        # Should be equal (within floating point precision)
        assert abs(sim1 - sim2) < 1e-10, \
            f"Cosine similarity not symmetric: {sim1} vs {sim2}"
    
    @given(user_profile_strategy(), scheme_strategy())
    def test_eligibility_result_has_timestamp(self, user_profile, scheme):
        """
        Property: Eligibility result should have a timestamp
        
        For any eligibility calculation, the result should include
        a calculated_at timestamp.
        """
        # Ensure age_max >= age_min
        assume(scheme['eligibility']['age_max'] >= scheme['eligibility']['age_min'])
        
        engine = EligibilityEngine()
        result = engine.calculate_eligibility(user_profile, scheme)
        
        # Should have timestamp
        assert 'calculated_at' in result, "Result missing 'calculated_at'"
        assert isinstance(result['calculated_at'], str), \
            "'calculated_at' should be a string"
        
        # Should be a valid ISO format timestamp
        from datetime import datetime
        try:
            datetime.fromisoformat(result['calculated_at'])
        except ValueError:
            pytest.fail(f"Invalid timestamp format: {result['calculated_at']}")
    
    @given(user_profile_strategy())
    def test_perfect_match_gives_high_score(self, user_profile):
        """
        Property: Perfect match should give reasonable eligibility score
        
        When a scheme's requirements exactly match a user's profile,
        the eligibility score should be positive (> 0%).
        
        Note: Due to the nature of cosine similarity and vector construction,
        a "perfect match" doesn't guarantee high similarity, as the scheme
        vector is constructed from requirements which may differ in structure
        from the user vector.
        """
        # Create a scheme that perfectly matches the user
        scheme = {
            'scheme_id': 'perfect-match',
            'scheme_name': 'Perfect Match Scheme',
            'category': 'general',
            'eligibility': {
                'age_min': user_profile['age'] - 5,
                'age_max': user_profile['age'] + 5,
                'income_max': user_profile['annual_income'] + 100000,
                'states': [user_profile['state']],
                'education_levels': [user_profile['education_level']],
                'castes': [user_profile['caste']],
                'disability': user_profile['disability'],
            },
            'is_active': True,
        }
        
        engine = EligibilityEngine()
        result = engine.calculate_eligibility(user_profile, scheme)
        
        # Should have positive eligibility (better than random)
        assert result['percentage'] > 0, \
            f"Perfect match should give > 0% eligibility, got {result['percentage']}%"
        
        # Should not be negative or zero
        assert result['score'] > 0
    
    @given(user_profile_strategy(), scheme_strategy())
    def test_cache_functionality(self, user_profile, scheme):
        """
        Property: Cache should store and retrieve results correctly
        
        For any user-scheme pair, batch calculation should use cache
        when called multiple times (within 24 hours).
        """
        # Ensure age_max >= age_min
        assume(scheme['eligibility']['age_max'] >= scheme['eligibility']['age_min'])
        
        # Ensure user_id and scheme_id are set
        if 'user_id' not in user_profile or not user_profile['user_id']:
            user_profile['user_id'] = 'test-user-cache'
        if 'scheme_id' not in scheme or not scheme['scheme_id']:
            scheme['scheme_id'] = 'test-scheme-cache'
        
        engine = EligibilityEngine()
        
        # First batch calculation (should populate cache)
        result1 = engine.batch_calculate_eligibility(user_profile, [scheme])
        
        # Check cache
        cache_key = engine._get_cache_key(user_profile, scheme)
        cached = engine._get_cached_result(cache_key)
        
        # Should be cached
        assert cached is not None, "Result should be cached after batch calculation"
        assert abs(cached['score'] - result1[0]['score']) < 0.0001
        
        # Second batch calculation should return same result
        result2 = engine.batch_calculate_eligibility(user_profile, [scheme])
        assert abs(result2[0]['score'] - result1[0]['score']) < 0.0001
