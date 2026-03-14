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

    Produces a feature vector containing:
    - Normalized numerical features (age, income, family size)
    - One-hot encoded categorical features (gender, marital status, etc.)
    - Location encoding (state)
    - Binary features (disability)
    - New: poverty_status, ration_card, land_ownership encodings
    """

    # Define categorical feature mappings
    GENDER_CATEGORIES = ["male", "female", "other", "prefer_not_to_say"]
    MARITAL_STATUS_CATEGORIES = ["single", "married", "divorced", "widowed"]
    EMPLOYMENT_CATEGORIES = [
        "employed",
        "self_employed",
        "self-employed",
        "unemployed",
        "student",
        "retired",
        "salaried",
        "farmer",
    ]
    EDUCATION_CATEGORIES = [
        "no_formal",
        "primary",
        "secondary",
        "higher_secondary",
        "graduate",
        "postgraduate",
        "below 10th",
        "10th / ssc",
        "12th / hsc",
        "diploma",
    ]
    CASTE_CATEGORIES = ["general", "obc", "sc", "st", "ews", "minority", "other"]
    RURAL_URBAN_CATEGORIES = ["rural", "urban", "semi-urban", "semi_urban"]
    POVERTY_CATEGORIES = ["bpl", "apl", "not sure"]
    RATION_CARD_CATEGORIES = ["aay", "bpl", "apl", "none"]
    LAND_CATEGORIES = ["landless", "marginal (< 1 ha)", "small (1-2 ha)", "large (> 2 ha)", "n/a"]

    # Derived beneficiary-type labels for one-hot encoding.
    # These are computed from profile fields rather than stored directly.
    BENEFICIARY_TYPE_CATEGORIES = [
        "student",
        "farmer",
        "senior_citizen",
        "woman_head_household",
        "disabled",
        "unemployed_youth",
        "other",
    ]

    # Profile completeness scoring: fields and their weights (must sum to 1.0)
    _COMPLETENESS_FIELDS = [
        ("age", 0.15),
        ("income", 0.15),
        ("state", 0.15),
        ("employment", 0.10),
        ("education", 0.10),
        ("gender", 0.10),
        ("social_category", 0.05),
        ("family_size", 0.05),
        ("rural_urban", 0.05),
        ("poverty_status", 0.05),
        ("marital_status", 0.05),
    ]

    # Top states by population for encoding
    TOP_STATES = [
        "Uttar Pradesh",
        "Maharashtra",
        "Bihar",
        "West Bengal",
        "Madhya Pradesh",
        "Tamil Nadu",
        "Rajasthan",
        "Karnataka",
        "Gujarat",
        "Andhra Pradesh",
        "Odisha",
        "Telangana",
        "Kerala",
        "Jharkhand",
        "Assam",
        "Punjab",
        "Chhattisgarh",
        "Haryana",
        "Delhi",
        "Jammu and Kashmir",
    ]

    def _resolve(self, profile: Dict[str, Any], *keys, default=None):
        """Resolve a value from the profile using multiple possible key names."""
        for key in keys:
            val = profile.get(key)
            if val is not None and val != "":
                return val
        return default

    def extract_features(self, profile: Dict[str, Any]) -> np.ndarray:
        """
        Extract and encode features from user profile.

        Handles both naming conventions:
        - Backend: employment, education, social_category, income
        - ML formal: employment_status, education_level, caste, annual_income

        Args:
            profile: Dictionary containing user profile data

        Returns:
            numpy array of features normalized to 0-1 range
        """
        features = []

        # Numerical features (normalized to 0-1)
        age = self._resolve(profile, "age", default=30)
        income = self._resolve(profile, "annual_income", "income", default=0)
        family_size = self._resolve(profile, "family_size", default=1)

        features.append(self.normalize_age(age))
        features.append(self.normalize_income(income))
        features.append(self.normalize_family_size(family_size))

        # Categorical features (one-hot encoded) — with key aliasing
        gender = self._resolve(profile, "gender", default="prefer_not_to_say")
        marital = self._resolve(profile, "marital_status", default="single")
        employment = self._resolve(profile, "employment_status", "employment", default="unemployed")
        education = self._resolve(profile, "education_level", "education", default="secondary")
        caste = self._resolve(profile, "caste", "social_category", default="general")
        rural_urban = self._resolve(profile, "rural_urban", default="urban")

        features.extend(self.encode_gender(gender))
        features.extend(self.encode_marital_status(marital))
        features.extend(self.encode_employment(employment))
        features.extend(self.encode_education(education))
        features.extend(self.encode_caste(caste))
        features.extend(self.encode_rural_urban(rural_urban))

        # New categorical features
        poverty = self._resolve(profile, "poverty_status", default="")
        ration = self._resolve(profile, "ration_card", default="")
        land = self._resolve(profile, "land_ownership", default="")

        features.extend(self._one_hot_encode(str(poverty).lower(), self.POVERTY_CATEGORIES))
        features.extend(self._one_hot_encode(str(ration).lower(), self.RATION_CARD_CATEGORIES))
        features.extend(self._one_hot_encode(str(land).lower(), self.LAND_CATEGORIES))

        # Location features
        features.extend(self.encode_state(profile.get("state", "")))

        # Binary features
        is_disabled = self._resolve(profile, "disability", "is_disabled", default=False)
        is_minority = self._resolve(profile, "is_minority", "minority", default=False)
        features.append(1.0 if is_disabled else 0.0)
        features.append(1.0 if is_minority else 0.0)

        # ── Derived features ───────────────────────────────────────────────────
        # Profile completeness: weighted sum of filled fields, normalised to [0,1]
        features.append(self.compute_profile_completeness(profile))

        # Income decile: log-scale bucket 1‒10 normalised to [0,1]
        features.append(self.compute_income_decile(income))

        # Beneficiary type: derived one-hot from employment/age/gender/disability
        features.extend(self.derive_beneficiary_type(profile, age, is_disabled))

        return np.array(features, dtype=np.float64)

    def normalize_age(self, age: int) -> float:
        """Normalize age to 0-1 range (18-100)."""
        try:
            age = int(age)
        except (TypeError, ValueError):
            age = 30
        age = max(18, min(100, age))
        return (age - 18) / (100 - 18)

    def normalize_income(self, income: float) -> float:
        """Normalize income using log scale to 0-1 range."""
        if income is None:
            income = 0
        try:
            income = float(income)
        except (TypeError, ValueError):
            income = 0
        income = max(0, income)
        return np.log1p(income) / np.log1p(10000000)

    def normalize_family_size(self, family_size: int) -> float:
        """Normalize family size to 0-1 range (1-10)."""
        try:
            family_size = int(family_size)
        except (TypeError, ValueError):
            family_size = 1
        family_size = max(1, min(10, family_size))
        return (family_size - 1) / (10 - 1)

    def encode_gender(self, gender: str) -> List[float]:
        """One-hot encode gender."""
        return self._one_hot_encode(str(gender).lower(), self.GENDER_CATEGORIES)

    def encode_marital_status(self, marital_status: str) -> List[float]:
        """One-hot encode marital status."""
        return self._one_hot_encode(str(marital_status).lower(), self.MARITAL_STATUS_CATEGORIES)

    def encode_employment(self, employment_status: str) -> List[float]:
        """One-hot encode employment status."""
        return self._one_hot_encode(str(employment_status).lower(), self.EMPLOYMENT_CATEGORIES)

    def encode_education(self, education_level: str) -> List[float]:
        """One-hot encode education level."""
        return self._one_hot_encode(str(education_level).lower(), self.EDUCATION_CATEGORIES)

    def encode_caste(self, caste: str) -> List[float]:
        """One-hot encode caste/social category."""
        return self._one_hot_encode(str(caste).lower(), self.CASTE_CATEGORIES)

    def encode_rural_urban(self, rural_urban: str) -> List[float]:
        """One-hot encode rural/urban classification."""
        return self._one_hot_encode(str(rural_urban).lower(), self.RURAL_URBAN_CATEGORIES)

    def encode_state(self, state: str) -> List[float]:
        """One-hot encode state with top 20 states."""
        return self._one_hot_encode(state, self.TOP_STATES)

    def _one_hot_encode(self, value: str, categories: List[str]) -> List[float]:
        """
        Generic one-hot encoding helper.
        Tries case-insensitive matching for robustness.
        """
        encoding = [0.0] * len(categories)
        if not value:
            return encoding
        value_lower = value.lower().strip()
        for i, cat in enumerate(categories):
            if cat.lower() == value_lower:
                encoding[i] = 1.0
                return encoding
        return encoding

    # ── Derived feature helpers ───────────────────────────────────────────────

    def compute_profile_completeness(self, profile: Dict[str, Any]) -> float:
        """Weighted fraction of filled profile fields, normalised to [0, 1]."""
        score = 0.0
        for field, weight in self._COMPLETENESS_FIELDS:
            # Accept both the canonical field name and its common alias
            val = profile.get(field) or profile.get(
                {"employment": "employment_status", "social_category": "caste"}.get(field, field)
            )
            if val is not None and val != "" and val is not False:
                score += weight
        return round(min(score, 1.0), 4)

    def compute_income_decile(self, income: float) -> float:
        """Map income to a log-scale decile bucket normalised to [0, 1].

        Bucket boundaries are approximate annual income thresholds (INR):
          1 → <12K  2 → 12–36K  3 → 36–72K  4 → 72–120K  5 → 120–200K
          6 → 200–360K  7 → 360–600K  8 → 600–1.2M  9 → 1.2–3M  10 → >3M
        """
        thresholds = [
            12_000,
            36_000,
            72_000,
            120_000,
            200_000,
            360_000,
            600_000,
            1_200_000,
            3_000_000,
        ]
        decile = 1
        for i, threshold in enumerate(thresholds):
            if income > threshold:
                decile = i + 2
        return (decile - 1) / 9.0  # normalise to [0, 1]

    def derive_beneficiary_type(
        self, profile: Dict[str, Any], age: int, is_disabled: bool
    ) -> List[float]:
        """Derive a one-hot beneficiary type from profile fields.

        Categories:
          student              — employment is student or age < 25
          farmer               — employment contains farmer/agriculture
          senior_citizen       — age >= 60
          woman_head_household — gender female AND marital_status in (widowed, divorced, single)
          disabled             — is_disabled flag
          unemployed_youth     — employment unemployed AND age <= 35
          other                — none of the above
        """
        emp = (profile.get("employment_status") or profile.get("employment") or "").lower()
        gender = (profile.get("gender") or "").lower()
        marital = (profile.get("marital_status") or "").lower()

        student = emp == "student" or age < 25
        farmer = any(kw in emp for kw in ("farmer", "agricult"))
        senior = age >= 60
        woman_head = gender == "female" and marital in ("widowed", "divorced", "single")
        disabled = bool(is_disabled)
        unemployed_youth = "unemployed" in emp and age <= 35

        flags = [student, farmer, senior, woman_head, disabled, unemployed_youth]
        result = [1.0 if f else 0.0 for f in flags]
        result.append(0.0 if any(flags) else 1.0)  # other
        return result

    def get_feature_dimension(self) -> int:
        """Get the total dimension of the feature vector."""
        return (
            3  # Numerical: age, income, family_size
            + len(self.GENDER_CATEGORIES)
            + len(self.MARITAL_STATUS_CATEGORIES)
            + len(self.EMPLOYMENT_CATEGORIES)
            + len(self.EDUCATION_CATEGORIES)
            + len(self.CASTE_CATEGORIES)
            + len(self.RURAL_URBAN_CATEGORIES)
            + len(self.POVERTY_CATEGORIES)
            + len(self.RATION_CARD_CATEGORIES)
            + len(self.LAND_CATEGORIES)
            + len(self.TOP_STATES)
            + 2  # Binary: disability, minority
            + 1  # profile_completeness
            + 1  # income_decile
            + len(self.BENEFICIARY_TYPE_CATEGORIES)  # derived beneficiary type
        )

    def get_feature_names(self) -> List[str]:
        """Get descriptive names for all features."""
        names = ["age_normalized", "income_normalized", "family_size_normalized"]

        names.extend([f"gender_{cat}" for cat in self.GENDER_CATEGORIES])
        names.extend([f"marital_{cat}" for cat in self.MARITAL_STATUS_CATEGORIES])
        names.extend([f"employment_{cat}" for cat in self.EMPLOYMENT_CATEGORIES])
        names.extend([f"education_{cat}" for cat in self.EDUCATION_CATEGORIES])
        names.extend([f"caste_{cat}" for cat in self.CASTE_CATEGORIES])
        names.extend([f"rural_urban_{cat}" for cat in self.RURAL_URBAN_CATEGORIES])
        names.extend([f"poverty_{cat}" for cat in self.POVERTY_CATEGORIES])
        names.extend([f"ration_{cat}" for cat in self.RATION_CARD_CATEGORIES])
        names.extend([f"land_{cat}" for cat in self.LAND_CATEGORIES])
        names.extend([f'state_{state.replace(" ", "_")}' for state in self.TOP_STATES])
        names.append("disability")
        names.append("minority")
        names.append("profile_completeness")
        names.append("income_decile")
        names.extend([f"beneficiary_{cat}" for cat in self.BENEFICIARY_TYPE_CATEGORIES])

        return names
