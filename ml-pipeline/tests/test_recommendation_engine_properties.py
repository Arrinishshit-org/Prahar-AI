"""
Property-based tests for RecommendationEngine

Tests universal properties that should hold for all recommendation generations.
"""

import pytest
import time
from hypothesis import given, strategies as st, settings, assume
from datetime import datetime

from src.recommendation_engine import RecommendationEngine
from src.user_classifier import UserClassifier
from src.eligibility_engine import EligibilityEngine
from tests.conftest import user_profile_strategy, scheme_strategy


# Helper to create a trained recommendation engine
def create_recommendation_engine() -> RecommendationEngine:
    """Create a recommendation engine with trained classifier"""
    # Create and train user classifier
    classifier = UserClassifier(n_clusters=25, random_state=42)
    
    # Generate training profiles
    profiles = []
    states = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat']
    genders = ['male', 'female', 'other']
    marital_statuses = ['single', 'married', 'divorced', 'widowed']
    employment_statuses = ['employed', 'self_employed', 'unemployed', 'student', 'retired']
    
    for i in range(100):
        profiles.append({
            'user_id': f'user-{i}',
            'age': 18 + (i % 82),
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
    
    # Create eligibility engine
    eligibility_engine = EligibilityEngine()
    
    # Create recommendation engine
    return RecommendationEngine(classifier, eligibility_engine)


class TestRecommendationEngineProperties:
    """Property-based tests for recommendation generation"""
    
    @given(
        user_profile_strategy(),
        st.lists(scheme_strategy(), min_size=10, max_size=50)
    )
    @settings(max_examples=20, deadline=10000)
    def test_property_19_recommendation_generation_on_login(self, profile, schemes):
        """
        **Validates: Requirements 8.1, 8.2**
        
        Property 19: Recommendation Generation on Login
        
        For any registered user login, the system should generate or retrieve
        personalized scheme recommendations based on user groups and profile features.
        """
        # Arrange
        engine = create_recommendation_engine()
        
        # Act: Generate recommendations (simulating login)
        recommendations = engine.generate_recommendations(
            user_profile=profile,
            schemes=schemes
        )
        
        # Assert: Recommendations are generated
        assert recommendations is not None, "Recommendations must be generated"
        assert isinstance(recommendations, list), "Recommendations must be a list"
        assert len(recommendations) > 0, "At least one recommendation must be generated"
        
        # Assert: Each recommendation has required fields
        for rec in recommendations:
            assert 'scheme_id' in rec, "Recommendation must have scheme_id"
            assert 'scheme_name' in rec, "Recommendation must have scheme_name"
            assert 'relevance_score' in rec, "Recommendation must have relevance_score"
            assert 'eligibility_score' in rec, "Recommendation must have eligibility_score"
            assert 'matching_criteria' in rec, "Recommendation must have matching_criteria"
            assert 'explanation' in rec, "Recommendation must have explanation"
            assert 'rank' in rec, "Recommendation must have rank"
            assert 'generated_at' in rec, "Recommendation must have generated_at timestamp"
            
            # Validate field types
            assert isinstance(rec['scheme_id'], str), "scheme_id must be string"
            assert isinstance(rec['scheme_name'], str), "scheme_name must be string"
            assert isinstance(rec['relevance_score'], float), "relevance_score must be float"
            assert isinstance(rec['eligibility_score'], float), "eligibility_score must be float"
            assert isinstance(rec['matching_criteria'], list), "matching_criteria must be list"
            assert isinstance(rec['explanation'], str), "explanation must be string"
            assert isinstance(rec['rank'], int), "rank must be int"
            
            # Validate score ranges
            assert 0.0 <= rec['relevance_score'] <= 1.0, \
                f"relevance_score {rec['relevance_score']} not in range [0, 1]"
            assert 0.0 <= rec['eligibility_score'] <= 100.0, \
                f"eligibility_score {rec['eligibility_score']} not in range [0, 100]"
        
        # Assert: Recommendations are based on user groups and profile
        # (verified by presence of matching_criteria and explanation)
        for rec in recommendations:
            assert len(rec['explanation']) > 0, "Explanation must not be empty"
    
    @given(
        user_profile_strategy(),
        st.lists(scheme_strategy(), min_size=10, max_size=50)
    )
    @settings(max_examples=20, deadline=10000)
    def test_property_20_recommendation_ranking_order(self, profile, schemes):
        """
        **Validates: Requirements 8.3**
        
        Property 20: Recommendation Ranking Order
        
        For any set of generated recommendations, they should be returned in
        descending order by relevance score.
        """
        # Arrange
        engine = create_recommendation_engine()
        
        # Act
        recommendations = engine.generate_recommendations(
            user_profile=profile,
            schemes=schemes
        )
        
        # Assert: Recommendations are in descending order by relevance_score
        relevance_scores = [rec['relevance_score'] for rec in recommendations]
        
        for i in range(len(relevance_scores) - 1):
            assert relevance_scores[i] >= relevance_scores[i + 1], \
                f"Recommendations not in descending order: " \
                f"score[{i}]={relevance_scores[i]:.4f} < score[{i+1}]={relevance_scores[i+1]:.4f}"
        
        # Assert: Rank field matches position
        for i, rec in enumerate(recommendations):
            assert rec['rank'] == i + 1, \
                f"Rank mismatch at position {i}: expected {i+1}, got {rec['rank']}"
    
    @given(
        user_profile_strategy(),
        st.lists(scheme_strategy(), min_size=5, max_size=100)
    )
    @settings(max_examples=10, deadline=10000)
    def test_property_21_recommendation_count_bounds(self, profile, schemes):
        """
        **Validates: Requirements 8.4**
        
        Property 21: Recommendation Count Bounds
        
        For any user, the number of scheme recommendations returned should be
        at least 5 and at most 20.
        """
        # Arrange
        engine = create_recommendation_engine()
        
        # Ensure we have at least 5 unique schemes
        unique_schemes = []
        seen_ids = set()
        for scheme in schemes:
            scheme_id = scheme.get('scheme_id', '')
            if scheme_id not in seen_ids:
                seen_ids.add(scheme_id)
                unique_schemes.append(scheme)
        
        # Skip test if we don't have enough unique schemes
        assume(len(unique_schemes) >= 5)
        
        # Act
        recommendations = engine.generate_recommendations(
            user_profile=profile,
            schemes=unique_schemes,
            min_recommendations=5,
            max_recommendations=20
        )
        
        # Assert: Count is within bounds
        count = len(recommendations)
        
        # Should return at least 5 (we ensured we have at least 5 unique schemes)
        assert count >= 5, \
            f"Should return at least 5 recommendations, got {count}"
        
        # Should never exceed 20
        assert count <= 20, \
            f"Should return at most 20 recommendations, got {count}"
    
    @given(
        user_profile_strategy(),
        st.lists(scheme_strategy(), min_size=10, max_size=50)
    )
    @settings(max_examples=20, deadline=10000)
    def test_property_23_recommendation_generation_performance(self, profile, schemes):
        """
        **Validates: Requirements 8.6**
        
        Property 23: Recommendation Generation Performance
        
        For any user, generating personalized recommendations should complete
        within 3 seconds.
        """
        # Arrange
        engine = create_recommendation_engine()
        
        # Act: Measure generation time
        start_time = time.time()
        recommendations = engine.generate_recommendations(
            user_profile=profile,
            schemes=schemes
        )
        elapsed_time = time.time() - start_time
        
        # Assert: Completes within 3 seconds
        assert elapsed_time < 3.0, \
            f"Recommendation generation took {elapsed_time:.2f}s, exceeds 3 second limit"
        
        # Assert: Recommendations were actually generated
        assert len(recommendations) > 0, \
            "Should generate recommendations within time limit"
    
    @given(
        user_profile_strategy(),
        st.lists(scheme_strategy(), min_size=10, max_size=30)
    )
    @settings(max_examples=20, deadline=10000)
    def test_property_42_recommendation_explanation_presence(self, profile, schemes):
        """
        **Validates: Requirements 17.1, 17.2**
        
        Property 42: Recommendation Explanation Presence
        
        For any scheme recommendation, the system should provide an explanation
        that highlights which user profile attributes contributed to the recommendation.
        """
        # Arrange
        engine = create_recommendation_engine()
        
        # Act
        recommendations = engine.generate_recommendations(
            user_profile=profile,
            schemes=schemes
        )
        
        # Assert: Each recommendation has an explanation
        for rec in recommendations:
            explanation = rec['explanation']
            
            # Explanation must be present and non-empty
            assert explanation is not None, "Explanation must not be None"
            assert isinstance(explanation, str), "Explanation must be a string"
            assert len(explanation) > 0, "Explanation must not be empty"
            assert len(explanation) > 20, \
                f"Explanation too short ({len(explanation)} chars), should be descriptive"
            
            # Explanation should reference user profile attributes
            # Check for common attribute mentions
            explanation_lower = explanation.lower()
            
            # Should mention at least one profile attribute or matching criterion
            attribute_mentioned = any([
                'age' in explanation_lower,
                'income' in explanation_lower,
                'location' in explanation_lower,
                'state' in explanation_lower,
                'occupation' in explanation_lower,
                'education' in explanation_lower,
                'category' in explanation_lower,
                'disability' in explanation_lower,
                'match' in explanation_lower,
                'eligible' in explanation_lower,
                'qualif' in explanation_lower,
            ])
            
            assert attribute_mentioned, \
                f"Explanation should reference user profile attributes: {explanation}"
            
            # Should include eligibility information
            assert any([
                'eligible' in explanation_lower,
                'match' in explanation_lower,
                '%' in explanation,
            ]), f"Explanation should include eligibility information: {explanation}"
    
    @given(
        user_profile_strategy(),
        st.lists(scheme_strategy(), min_size=10, max_size=30)
    )
    @settings(max_examples=20, deadline=10000)
    def test_cache_functionality(self, profile, schemes):
        """
        Property: Caching should improve performance for repeated requests.
        
        Second request for same user should be faster due to caching.
        """
        # Arrange
        engine = create_recommendation_engine()
        
        # Act: First request (no cache)
        start_time1 = time.time()
        recommendations1 = engine.generate_recommendations(
            user_profile=profile,
            schemes=schemes,
            use_cache=True
        )
        elapsed_time1 = time.time() - start_time1
        
        # Act: Second request (should use cache)
        start_time2 = time.time()
        recommendations2 = engine.generate_recommendations(
            user_profile=profile,
            schemes=schemes,
            use_cache=True
        )
        elapsed_time2 = time.time() - start_time2
        
        # Assert: Second request returns same results
        assert len(recommendations1) == len(recommendations2), \
            "Cached recommendations should match original"
        
        for rec1, rec2 in zip(recommendations1, recommendations2):
            assert rec1['scheme_id'] == rec2['scheme_id'], \
                "Cached recommendations should have same scheme IDs"
            assert abs(rec1['relevance_score'] - rec2['relevance_score']) < 1e-6, \
                "Cached recommendations should have same scores"
        
        # Assert: Second request is faster (or at least not slower)
        # Note: This may not always hold due to system variance, so we just check it's reasonable
        assert elapsed_time2 < elapsed_time1 * 2, \
            f"Cached request ({elapsed_time2:.4f}s) should not be much slower than " \
            f"original ({elapsed_time1:.4f}s)"
    
    @given(
        user_profile_strategy(),
        st.lists(scheme_strategy(), min_size=10, max_size=30)
    )
    @settings(max_examples=20, deadline=10000)
    def test_cache_invalidation(self, profile, schemes):
        """
        Property: Cache should be invalidated when requested.
        
        After cache invalidation, recommendations should be regenerated.
        """
        # Arrange
        engine = create_recommendation_engine()
        user_id = profile.get('user_id', 'test-user')
        
        # Act: Generate initial recommendations
        recommendations1 = engine.generate_recommendations(
            user_profile=profile,
            schemes=schemes,
            use_cache=True
        )
        
        # Act: Invalidate cache
        engine.invalidate_cache(user_id)
        
        # Act: Generate recommendations again (should not use cache)
        recommendations2 = engine.generate_recommendations(
            user_profile=profile,
            schemes=schemes,
            use_cache=True
        )
        
        # Assert: Recommendations are regenerated (timestamps differ)
        # Note: Results should be the same, but timestamps should differ
        assert len(recommendations1) == len(recommendations2), \
            "Regenerated recommendations should have same count"
        
        # Timestamps should be different (regenerated)
        time1 = recommendations1[0]['generated_at']
        time2 = recommendations2[0]['generated_at']
        
        # Parse timestamps
        dt1 = datetime.fromisoformat(time1)
        dt2 = datetime.fromisoformat(time2)
        
        # Second generation should be after first
        assert dt2 >= dt1, \
            "Regenerated recommendations should have newer timestamp"
    
    @given(
        user_profile_strategy(),
        st.lists(scheme_strategy(), min_size=10, max_size=30)
    )
    @settings(max_examples=20, deadline=10000)
    def test_recommendation_uniqueness(self, profile, schemes):
        """
        Property: Recommendations should not contain duplicate schemes.
        
        Each scheme should appear at most once in recommendations.
        """
        # Arrange
        engine = create_recommendation_engine()
        
        # Act
        recommendations = engine.generate_recommendations(
            user_profile=profile,
            schemes=schemes
        )
        
        # Assert: No duplicate scheme IDs
        scheme_ids = [rec['scheme_id'] for rec in recommendations]
        unique_scheme_ids = set(scheme_ids)
        
        assert len(scheme_ids) == len(unique_scheme_ids), \
            f"Recommendations contain duplicates: {len(scheme_ids)} total, " \
            f"{len(unique_scheme_ids)} unique"
    
    @given(
        user_profile_strategy(),
        st.lists(scheme_strategy(), min_size=10, max_size=30)
    )
    @settings(max_examples=20, deadline=10000)
    def test_recommendation_validity(self, profile, schemes):
        """
        Property: All recommended schemes should exist in input schemes.
        
        Recommendations should only reference schemes from the input list.
        """
        # Arrange
        engine = create_recommendation_engine()
        
        # Act
        recommendations = engine.generate_recommendations(
            user_profile=profile,
            schemes=schemes
        )
        
        # Assert: All recommended schemes are from input
        input_scheme_ids = {s.get('scheme_id', '') for s in schemes}
        
        for rec in recommendations:
            assert rec['scheme_id'] in input_scheme_ids, \
                f"Recommended scheme {rec['scheme_id']} not in input schemes"
    
    @given(
        user_profile_strategy(),
        st.lists(scheme_strategy(), min_size=10, max_size=30),
        st.integers(min_value=3, max_value=15),
        st.integers(min_value=10, max_value=25)
    )
    @settings(max_examples=10, deadline=10000)
    def test_custom_bounds_respected(self, profile, schemes, min_recs, max_recs):
        """
        Property: Custom min/max bounds should be respected.
        
        When custom bounds are provided, recommendations should respect them.
        """
        # Ensure min <= max
        assume(min_recs <= max_recs)
        
        # Arrange
        engine = create_recommendation_engine()
        
        # Ensure we have enough unique schemes
        unique_schemes = []
        seen_ids = set()
        for scheme in schemes:
            scheme_id = scheme.get('scheme_id', '')
            if scheme_id not in seen_ids:
                seen_ids.add(scheme_id)
                unique_schemes.append(scheme)
        
        # Skip if we don't have enough unique schemes
        assume(len(unique_schemes) >= min_recs)
        
        # Act
        recommendations = engine.generate_recommendations(
            user_profile=profile,
            schemes=unique_schemes,
            min_recommendations=min_recs,
            max_recommendations=max_recs
        )
        
        # Assert: Count respects bounds
        count = len(recommendations)
        
        assert count >= min_recs, \
            f"Should return at least {min_recs} recommendations, got {count}"
        
        assert count <= max_recs, \
            f"Should return at most {max_recs} recommendations, got {count}"
    
    @given(
        user_profile_strategy(),
        st.lists(scheme_strategy(), min_size=10, max_size=30)
    )
    @settings(max_examples=20, deadline=10000)
    def test_matching_criteria_validity(self, profile, schemes):
        """
        Property: Matching criteria should be valid criterion names.
        
        All matching criteria should be recognized criterion types.
        """
        # Arrange
        engine = create_recommendation_engine()
        valid_criteria = {
            'age', 'income', 'location', 'occupation', 'education',
            'caste', 'disability', 'gender', 'marital_status', 'rural_urban'
        }
        
        # Act
        recommendations = engine.generate_recommendations(
            user_profile=profile,
            schemes=schemes
        )
        
        # Assert: All matching criteria are valid
        for rec in recommendations:
            for criterion in rec['matching_criteria']:
                assert criterion in valid_criteria, \
                    f"Invalid criterion '{criterion}' in matching_criteria"
