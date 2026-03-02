"""
Feature extraction for user classification

This module provides the FeatureExtractor class that converts user profiles
into numerical feature vectors suitable for machine learning models.
"""

import numpy as np
from typing import Dict, List, Any


class FeatureExtractor:
    """
    Extract and encode features from user profiles for classification.
    
    Produces a ~50-dimensional feature vector containing:
    - Normalized numerical features (age, income, family size)
    - One-hot encoded categorical features (gender, marital status, etc.)
    - Location encoding (state, district)
    """
    
    # Define categorical feature mappings
    GENDER_CATEGORIES = ['male', 'female', 'other', 'prefer_not_to_say']
    MARITAL_STATUS_CATEGORIES = ['single', 'married', 'divorced', 'widowed']
    EMPLOYMENT_CATEGORIES = ['employed', 'self_employed', 'unemployed', 'student', 'retired']
    EDUCATION_CATEGORIES = ['no_formal', 'primary', 'secondary', 'higher_secondary', 'graduate', 'postgraduate']
    CASTE_CATEGORIES = ['general', 'obc', 'sc', 'st', 'other']
    RURAL_URBAN_CATEGORIES = ['rural', 'urban', 'semi_urban']
    
    # Top states by population for encoding
    TOP_STATES = [
        'Uttar Pradesh', 'Maharashtra', 'Bihar', 'West Bengal', 'Madhya Pradesh',
        'Tamil Nadu', 'Rajasthan', 'Karnataka', 'Gujarat', 'Andhra Pradesh',
        'Odisha', 'Telangana', 'Kerala', 'Jharkhand', 'Assam', 'Punjab',
        'Chhattisgarh', 'Haryana', 'Delhi', 'Jammu and Kashmir'
    ]
    
    def extract_features(self, profile: Dict[str, Any]) -> np.ndarray:
        """
        Extract and encode features from user profile.
        
        Args:
            profile: Dictionary containing user profile data
            
        Returns:
            numpy array of ~50 features normalized to 0-1 range
        """
        features = []
        
        # Numerical features (normalized to 0-1)
        features.append(self.normalize_age(profile.get('age', 30)))
        features.append(self.normalize_income(profile.get('annual_income', 0)))
        features.append(self.normalize_family_size(profile.get('family_size', 1)))
        
        # Categorical features (one-hot encoded)
        features.extend(self.encode_gender(profile.get('gender', 'prefer_not_to_say')))
        features.extend(self.encode_marital_status(profile.get('marital_status', 'single')))
        features.extend(self.encode_employment(profile.get('employment_status', 'unemployed')))
        features.extend(self.encode_education(profile.get('education_level', 'secondary')))
        features.extend(self.encode_caste(profile.get('caste', 'general')))
        features.extend(self.encode_rural_urban(profile.get('rural_urban', 'urban')))
        
        # Location features
        features.extend(self.encode_state(profile.get('state', '')))
        
        # Binary features
        features.append(1.0 if profile.get('disability', False) else 0.0)
        
        return np.array(features, dtype=np.float64)
    
    def normalize_age(self, age: int) -> float:
        """
        Normalize age to 0-1 range.
        
        Assumes age range of 18-100 years.
        
        Args:
            age: User age in years
            
        Returns:
            Normalized age value between 0 and 1
        """
        age = max(18, min(100, age))  # Clamp to valid range
        return (age - 18) / (100 - 18)
    
    def normalize_income(self, income: float) -> float:
        """
        Normalize income using log scale to 0-1 range.
        
        Uses log scale to handle wide income range (0 to 10M).
        
        Args:
            income: Annual income in currency units
            
        Returns:
            Normalized income value between 0 and 1
        """
        if income is None:
            income = 0
        income = max(0, income)  # Ensure non-negative
        return np.log1p(income) / np.log1p(10000000)
    
    def normalize_family_size(self, family_size: int) -> float:
        """
        Normalize family size to 0-1 range.
        
        Assumes family size range of 1-10 members.
        
        Args:
            family_size: Number of family members
            
        Returns:
            Normalized family size value between 0 and 1
        """
        family_size = max(1, min(10, family_size))  # Clamp to valid range
        return (family_size - 1) / (10 - 1)
    
    def encode_gender(self, gender: str) -> List[float]:
        """
        One-hot encode gender.
        
        Args:
            gender: Gender category
            
        Returns:
            List of binary values (one-hot encoding)
        """
        return self._one_hot_encode(gender, self.GENDER_CATEGORIES)
    
    def encode_marital_status(self, marital_status: str) -> List[float]:
        """
        One-hot encode marital status.
        
        Args:
            marital_status: Marital status category
            
        Returns:
            List of binary values (one-hot encoding)
        """
        return self._one_hot_encode(marital_status, self.MARITAL_STATUS_CATEGORIES)
    
    def encode_employment(self, employment_status: str) -> List[float]:
        """
        One-hot encode employment status.
        
        Args:
            employment_status: Employment status category
            
        Returns:
            List of binary values (one-hot encoding)
        """
        return self._one_hot_encode(employment_status, self.EMPLOYMENT_CATEGORIES)
    
    def encode_education(self, education_level: str) -> List[float]:
        """
        One-hot encode education level.
        
        Args:
            education_level: Education level category
            
        Returns:
            List of binary values (one-hot encoding)
        """
        return self._one_hot_encode(education_level, self.EDUCATION_CATEGORIES)
    
    def encode_caste(self, caste: str) -> List[float]:
        """
        One-hot encode caste category.
        
        Args:
            caste: Caste category
            
        Returns:
            List of binary values (one-hot encoding)
        """
        return self._one_hot_encode(caste, self.CASTE_CATEGORIES)
    
    def encode_rural_urban(self, rural_urban: str) -> List[float]:
        """
        One-hot encode rural/urban classification.
        
        Args:
            rural_urban: Rural/urban category
            
        Returns:
            List of binary values (one-hot encoding)
        """
        return self._one_hot_encode(rural_urban, self.RURAL_URBAN_CATEGORIES)
    
    def encode_state(self, state: str) -> List[float]:
        """
        One-hot encode state with top 20 states.
        
        States not in top 20 are encoded as all zeros (other category).
        
        Args:
            state: State name
            
        Returns:
            List of binary values (one-hot encoding)
        """
        return self._one_hot_encode(state, self.TOP_STATES)
    
    def _one_hot_encode(self, value: str, categories: List[str]) -> List[float]:
        """
        Generic one-hot encoding helper.
        
        Args:
            value: Value to encode
            categories: List of valid categories
            
        Returns:
            List of binary values where only the matching category is 1.0
        """
        encoding = [0.0] * len(categories)
        try:
            index = categories.index(value)
            encoding[index] = 1.0
        except ValueError:
            # Value not in categories - all zeros (unknown/other)
            pass
        return encoding
    
    def get_feature_dimension(self) -> int:
        """
        Get the total dimension of the feature vector.
        
        Returns:
            Total number of features in the output vector
        """
        return (
            3 +  # Numerical: age, income, family_size
            len(self.GENDER_CATEGORIES) +
            len(self.MARITAL_STATUS_CATEGORIES) +
            len(self.EMPLOYMENT_CATEGORIES) +
            len(self.EDUCATION_CATEGORIES) +
            len(self.CASTE_CATEGORIES) +
            len(self.RURAL_URBAN_CATEGORIES) +
            len(self.TOP_STATES) +
            1  # Binary: disability
        )
    
    def get_feature_names(self) -> List[str]:
        """
        Get descriptive names for all features.
        
        Returns:
            List of feature names in order
        """
        names = ['age_normalized', 'income_normalized', 'family_size_normalized']
        
        names.extend([f'gender_{cat}' for cat in self.GENDER_CATEGORIES])
        names.extend([f'marital_{cat}' for cat in self.MARITAL_STATUS_CATEGORIES])
        names.extend([f'employment_{cat}' for cat in self.EMPLOYMENT_CATEGORIES])
        names.extend([f'education_{cat}' for cat in self.EDUCATION_CATEGORIES])
        names.extend([f'caste_{cat}' for cat in self.CASTE_CATEGORIES])
        names.extend([f'rural_urban_{cat}' for cat in self.RURAL_URBAN_CATEGORIES])
        names.extend([f'state_{state.replace(" ", "_")}' for state in self.TOP_STATES])
        names.append('disability')
        
        return names
