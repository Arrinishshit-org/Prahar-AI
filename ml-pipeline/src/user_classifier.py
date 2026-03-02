"""
User classification using K-Means clustering

This module provides the UserClassifier class that groups users with similar
characteristics using K-Means clustering algorithm.
"""

import numpy as np
import pickle
from typing import Dict, List, Any, Optional, Tuple
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from datetime import datetime

try:
    from src.feature_extractor import FeatureExtractor
except ImportError:
    from feature_extractor import FeatureExtractor


class UserClassifier:
    """
    Classify users into groups using K-Means clustering.
    
    Uses K-Means with 25 clusters to group users with similar demographic,
    economic, and geographic characteristics. Includes confidence-based
    assignment and support for multi-group membership.
    """
    
    def __init__(self, n_clusters: int = 25, random_state: int = 42):
        """
        Initialize UserClassifier.
        
        Args:
            n_clusters: Number of clusters for K-Means (default: 25)
            random_state: Random seed for reproducibility
        """
        self.n_clusters = n_clusters
        self.random_state = random_state
        self.kmeans = KMeans(
            n_clusters=n_clusters,
            random_state=random_state,
            n_init=10,
            max_iter=300
        )
        self.scaler = StandardScaler()
        self.feature_extractor = FeatureExtractor()
        self.is_fitted = False
        self.cluster_metadata: Dict[int, Dict[str, Any]] = {}
        
    def train(self, profiles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Train the classifier on user profiles.
        
        Args:
            profiles: List of user profile dictionaries
            
        Returns:
            Dictionary containing training metrics
        """
        if len(profiles) < self.n_clusters:
            raise ValueError(
                f"Need at least {self.n_clusters} profiles to train, got {len(profiles)}"
            )
        
        # Extract features from all profiles
        features = [self.feature_extractor.extract_features(p) for p in profiles]
        X = np.array(features)
        
        # Standardize features
        X_scaled = self.scaler.fit_transform(X)
        
        # Fit K-Means
        self.kmeans.fit(X_scaled)
        self.is_fitted = True
        
        # Analyze and store cluster characteristics
        self.cluster_metadata = self._analyze_clusters(profiles, X_scaled)
        
        # Calculate training metrics
        inertia = self.kmeans.inertia_
        
        return {
            'n_clusters': self.n_clusters,
            'n_samples': len(profiles),
            'inertia': inertia,
            'is_fitted': self.is_fitted,
            'timestamp': datetime.now().isoformat()
        }
    
    def classify_user(
        self,
        profile: Dict[str, Any],
        confidence_threshold: float = 0.7,
        multi_group_threshold: float = 1.2
    ) -> Dict[str, Any]:
        """
        Classify a user into one or more groups.
        
        Args:
            profile: User profile dictionary
            confidence_threshold: Minimum confidence for cluster assignment (default: 0.7)
            multi_group_threshold: Distance multiplier for multi-group assignment (default: 1.2)
            
        Returns:
            Dictionary containing:
                - user_id: User identifier
                - groups: List of assigned group IDs
                - confidence: Classification confidence score
                - features: Extracted feature vector
                - timestamp: Classification timestamp
        """
        if not self.is_fitted:
            raise ValueError("Classifier must be trained before classification")
        
        # Extract and scale features
        features = self.feature_extractor.extract_features(profile)
        features_scaled = self.scaler.transform(features.reshape(1, -1))
        
        # Predict primary cluster
        cluster_id = self.kmeans.predict(features_scaled)[0]
        
        # Calculate distances to all centroids
        distances = self.kmeans.transform(features_scaled)[0]
        min_distance = distances[cluster_id]
        
        # Calculate confidence (inverse of distance, normalized)
        # Higher confidence when closer to centroid
        confidence = 1.0 / (1.0 + min_distance)
        
        # Determine group assignments
        groups = []
        
        if confidence < confidence_threshold:
            # Low confidence - assign to default group
            groups = [self._get_default_group_id()]
        else:
            # High confidence - assign to primary cluster
            groups = [int(cluster_id)]
            
            # Check for multi-group membership (near cluster boundaries)
            for i, dist in enumerate(distances):
                if i != cluster_id and dist < min_distance * multi_group_threshold:
                    groups.append(int(i))
        
        return {
            'user_id': profile.get('user_id', 'unknown'),
            'groups': groups,
            'confidence': float(confidence),
            'features': features.tolist(),
            'timestamp': datetime.now().isoformat()
        }
    
    def _analyze_clusters(
        self,
        profiles: List[Dict[str, Any]],
        features_scaled: np.ndarray
    ) -> Dict[int, Dict[str, Any]]:
        """
        Analyze cluster characteristics and compute metadata.
        
        Args:
            profiles: List of user profiles
            features_scaled: Scaled feature matrix
            
        Returns:
            Dictionary mapping cluster IDs to metadata
        """
        labels = self.kmeans.labels_
        cluster_info = {}
        
        for cluster_id in range(self.n_clusters):
            # Get profiles in this cluster
            mask = labels == cluster_id
            cluster_profiles = [p for p, m in zip(profiles, mask) if m]
            cluster_features = features_scaled[mask]
            
            if len(cluster_profiles) == 0:
                # Empty cluster
                cluster_info[cluster_id] = {
                    'size': 0,
                    'centroid': self.kmeans.cluster_centers_[cluster_id].tolist(),
                    'typical_profile': {},
                    'feature_stats': {}
                }
                continue
            
            # Compute typical profile characteristics
            typical_profile = self._compute_typical_profile(cluster_profiles)
            
            # Compute feature statistics
            feature_stats = {
                'mean': cluster_features.mean(axis=0).tolist(),
                'std': cluster_features.std(axis=0).tolist(),
                'min': cluster_features.min(axis=0).tolist(),
                'max': cluster_features.max(axis=0).tolist()
            }
            
            cluster_info[cluster_id] = {
                'size': len(cluster_profiles),
                'centroid': self.kmeans.cluster_centers_[cluster_id].tolist(),
                'typical_profile': typical_profile,
                'feature_stats': feature_stats
            }
        
        return cluster_info
    
    def _compute_typical_profile(
        self,
        profiles: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compute typical characteristics of a cluster.
        
        Args:
            profiles: List of profiles in the cluster
            
        Returns:
            Dictionary of typical profile characteristics
        """
        if not profiles:
            return {}
        
        # Calculate age range
        ages = [p.get('age', 0) for p in profiles]
        age_range = [min(ages), max(ages)] if ages else [0, 0]
        
        # Calculate income range
        incomes = [p.get('annual_income', 0) for p in profiles]
        income_range = [min(incomes), max(incomes)] if incomes else [0, 0]
        
        # Find most common categorical values
        def most_common(values):
            if not values:
                return None
            return max(set(values), key=values.count)
        
        common_gender = most_common([p.get('gender', '') for p in profiles])
        common_marital = most_common([p.get('marital_status', '') for p in profiles])
        common_employment = most_common([p.get('employment_status', '') for p in profiles])
        common_education = most_common([p.get('education_level', '') for p in profiles])
        common_state = most_common([p.get('state', '') for p in profiles])
        common_rural_urban = most_common([p.get('rural_urban', '') for p in profiles])
        
        return {
            'age_range': age_range,
            'income_range': income_range,
            'common_gender': common_gender,
            'common_marital_status': common_marital,
            'common_employment_status': common_employment,
            'common_education_level': common_education,
            'common_state': common_state,
            'common_rural_urban': common_rural_urban,
            'member_count': len(profiles)
        }
    
    def _get_default_group_id(self) -> int:
        """
        Get the default group ID for low-confidence classifications.
        
        Returns:
            Default group ID (uses cluster 0 as default)
        """
        return 0
    
    def get_cluster_info(self, cluster_id: int) -> Optional[Dict[str, Any]]:
        """
        Get metadata for a specific cluster.
        
        Args:
            cluster_id: Cluster identifier
            
        Returns:
            Cluster metadata dictionary or None if not found
        """
        return self.cluster_metadata.get(cluster_id)
    
    def get_all_clusters_info(self) -> Dict[int, Dict[str, Any]]:
        """
        Get metadata for all clusters.
        
        Returns:
            Dictionary mapping cluster IDs to metadata
        """
        return self.cluster_metadata
    
    def save_model(self, filepath: str) -> None:
        """
        Save the trained model to disk.
        
        Args:
            filepath: Path to save the model
        """
        if not self.is_fitted:
            raise ValueError("Cannot save unfitted model")
        
        model_data = {
            'kmeans': self.kmeans,
            'scaler': self.scaler,
            'n_clusters': self.n_clusters,
            'random_state': self.random_state,
            'cluster_metadata': self.cluster_metadata,
            'is_fitted': self.is_fitted
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
    
    def load_model(self, filepath: str) -> None:
        """
        Load a trained model from disk.
        
        Args:
            filepath: Path to the saved model
        """
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.kmeans = model_data['kmeans']
        self.scaler = model_data['scaler']
        self.n_clusters = model_data['n_clusters']
        self.random_state = model_data['random_state']
        self.cluster_metadata = model_data['cluster_metadata']
        self.is_fitted = model_data['is_fitted']
