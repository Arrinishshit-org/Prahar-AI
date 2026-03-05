"""
User classification using K-Means clustering

This module provides the UserClassifier class that groups users with similar
characteristics using K-Means clustering algorithm.
"""

import numpy as np
import pickle
from typing import Dict, List, Any, Optional, Tuple
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from datetime import datetime

try:
    from src.feature_extractor import FeatureExtractor
except ImportError:
    from feature_extractor import FeatureExtractor


class UserClassifier:
    """
    Classify users into groups using DBSCAN clustering.
    
    Uses DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
    to group users with similar demographic, economic, and geographic 
    characteristics. Unlike K-Means, DBSCAN doesn't require pre-specifying 
    the number of clusters and can handle outliers as noise.
    """
    
    def __init__(self, eps: float = 0.5, min_samples: int = 5):
        """
        Initialize UserClassifier.
        
        Args:
            eps: The maximum distance between two samples for one to be 
                 considered as in the neighborhood of the other.
            min_samples: The number of samples in a neighborhood for a point
                         to be considered as a core point.
        """
        self.eps = eps
        self.min_samples = min_samples
        self.dbscan = DBSCAN(eps=eps, min_samples=min_samples)
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
        if len(profiles) < self.min_samples:
            raise ValueError(
                f"Need at least {self.min_samples} profiles to train, got {len(profiles)}"
            )
        
        # Extract features from all profiles
        features = [self.feature_extractor.extract_features(p) for p in profiles]
        X = np.array(features)
        
        # Standardize features
        X_scaled = self.scaler.fit_transform(X)
        
        # Fit DBSCAN
        labels = self.dbscan.fit_predict(X_scaled)
        self.is_fitted = True
        
        # Unique labels (excluding noise if necessary)
        unique_labels = set(labels)
        n_clusters = len([l for l in unique_labels if l != -1])
        n_noise = list(labels).count(-1)
        
        # Analyze and store cluster characteristics
        self.cluster_metadata = self._analyze_clusters(profiles, X_scaled, labels)
        
        return {
            'eps': self.eps,
            'min_samples': self.min_samples,
            'n_clusters': n_clusters,
            'n_noise': n_noise,
            'n_samples': len(profiles),
            'is_fitted': self.is_fitted,
            'timestamp': datetime.now().isoformat()
        }
    
    def classify_user(
        self,
        profile: Dict[str, Any],
        # DBSCAN doesn't have a direct predict for new points, so we find the nearest cluster
        # or label as noise if too far.
        near_neighbor_threshold: float = 1.0 
    ) -> Dict[str, Any]:
        """
        Classify a user into one or more groups.
        
        Args:
            profile: User profile dictionary
            near_neighbor_threshold: Max distance to consider user part of a cluster
            
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
        
        # DBSCAN doesn't predict. We find the nearest core point or cluster centroid.
        # For simplicity, we compare with cluster centroids from training data.
        
        best_cluster = -1
        min_dist = float('inf')
        
        for cluster_id, metadata in self.cluster_metadata.items():
            if cluster_id == -1: continue # Skip noise
            
            centroid = np.array(metadata['centroid'])
            dist = np.linalg.norm(features_scaled - centroid)
            
            if dist < min_dist:
                min_dist = dist
                best_cluster = cluster_id
        
        # Determine group assignments
        groups = []
        confidence = 1.0 / (1.0 + min_dist) if min_dist != float('inf') else 0.0
        
        if best_cluster != -1 and min_dist < near_neighbor_threshold:
            groups = [int(best_cluster)]
        else:
            # Noise or too far - assign to default group (-1 or noise)
            groups = [-1]
        
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
        features_scaled: np.ndarray,
        labels: np.ndarray
    ) -> Dict[int, Dict[str, Any]]:
        """
        Analyze cluster characteristics and compute metadata.
        
        Args:
            profiles: List of user profiles
            features_scaled: Scaled feature matrix
            labels: DBSCAN output labels
            
        Returns:
            Dictionary mapping cluster IDs to metadata
        """
        unique_labels = set(labels)
        cluster_info = {}
        
        for cluster_id in unique_labels:
            # Get profiles in this cluster
            mask = labels == cluster_id
            cluster_profiles = [p for p, m in zip(profiles, mask) if m]
            cluster_features = features_scaled[mask]
            
            # Compute centroid (mean of points in cluster)
            centroid = cluster_features.mean(axis=0).tolist()
            
            # Compute typical profile characteristics
            typical_profile = self._compute_typical_profile(cluster_profiles)
            
            # Compute feature statistics
            feature_stats = {
                'mean': centroid,
                'std': cluster_features.std(axis=0).tolist(),
                'min': cluster_features.min(axis=0).tolist(),
                'max': cluster_features.max(axis=0).tolist()
            }
            
            cluster_info[int(cluster_id)] = {
                'size': len(cluster_profiles),
                'centroid': centroid,
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
            'dbscan': self.dbscan,
            'scaler': self.scaler,
            'eps': self.eps,
            'min_samples': self.min_samples,
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
        
        self.dbscan = model_data['dbscan']
        self.scaler = model_data['scaler']
        self.eps = model_data['eps']
        self.min_samples = model_data['min_samples']
        self.cluster_metadata = model_data['cluster_metadata']
        self.is_fitted = model_data['is_fitted']
