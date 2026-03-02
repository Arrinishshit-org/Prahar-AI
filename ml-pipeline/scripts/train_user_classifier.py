"""
Training script for UserClassifier model

This script loads user profiles, trains the K-Means classifier,
evaluates the model using silhouette score, and saves the trained model.
"""

import sys
import os
import argparse
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

import numpy as np
from sklearn.metrics import silhouette_score

from user_classifier import UserClassifier


def load_profiles_from_json(filepath: str) -> List[Dict[str, Any]]:
    """
    Load user profiles from JSON file.
    
    Args:
        filepath: Path to JSON file containing user profiles
        
    Returns:
        List of user profile dictionaries
    """
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    # Handle both list and dict with 'profiles' key
    if isinstance(data, list):
        return data
    elif isinstance(data, dict) and 'profiles' in data:
        return data['profiles']
    else:
        raise ValueError("JSON file must contain a list of profiles or dict with 'profiles' key")


def generate_sample_profiles(n_profiles: int = 1000) -> List[Dict[str, Any]]:
    """
    Generate sample user profiles for training.
    
    Args:
        n_profiles: Number of profiles to generate
        
    Returns:
        List of user profile dictionaries
    """
    profiles = []
    
    states = [
        'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat',
        'Uttar Pradesh', 'West Bengal', 'Rajasthan', 'Madhya Pradesh', 'Bihar'
    ]
    genders = ['male', 'female', 'other']
    marital_statuses = ['single', 'married', 'divorced', 'widowed']
    employment_statuses = ['employed', 'self_employed', 'unemployed', 'student', 'retired']
    education_levels = ['no_formal', 'primary', 'secondary', 'higher_secondary', 'graduate', 'postgraduate']
    castes = ['general', 'obc', 'sc', 'st', 'other']
    rural_urban = ['rural', 'urban', 'semi_urban']
    
    np.random.seed(42)
    
    for i in range(n_profiles):
        profile = {
            'user_id': f'user-{i:06d}',
            'age': int(np.random.normal(35, 15)),  # Mean 35, std 15
            'gender': np.random.choice(genders),
            'marital_status': np.random.choice(marital_statuses),
            'family_size': int(np.random.exponential(2)) + 1,  # Exponential distribution
            'annual_income': int(np.random.lognormal(13, 1)),  # Log-normal distribution
            'employment_status': np.random.choice(employment_statuses),
            'state': np.random.choice(states),
            'rural_urban': np.random.choice(rural_urban),
            'education_level': np.random.choice(education_levels),
            'caste': np.random.choice(castes),
            'disability': np.random.random() < 0.05,  # 5% disability rate
        }
        
        # Clamp values to valid ranges
        profile['age'] = max(18, min(100, profile['age']))
        profile['family_size'] = max(1, min(10, profile['family_size']))
        profile['annual_income'] = max(0, min(10000000, profile['annual_income']))
        
        profiles.append(profile)
    
    return profiles


def evaluate_clustering(
    classifier: UserClassifier,
    profiles: List[Dict[str, Any]]
) -> Dict[str, float]:
    """
    Evaluate clustering quality using silhouette score.
    
    Args:
        classifier: Trained UserClassifier
        profiles: List of user profiles used for training
        
    Returns:
        Dictionary containing evaluation metrics
    """
    # Extract features
    features = [classifier.feature_extractor.extract_features(p) for p in profiles]
    X = np.array(features)
    
    # Scale features
    X_scaled = classifier.scaler.transform(X)
    
    # Get cluster labels
    labels = classifier.kmeans.labels_
    
    # Calculate silhouette score
    silhouette = silhouette_score(X_scaled, labels)
    
    # Calculate inertia (within-cluster sum of squares)
    inertia = classifier.kmeans.inertia_
    
    # Calculate cluster sizes
    unique_labels, counts = np.unique(labels, return_counts=True)
    cluster_sizes = dict(zip(unique_labels.tolist(), counts.tolist()))
    
    return {
        'silhouette_score': float(silhouette),
        'inertia': float(inertia),
        'n_clusters': classifier.n_clusters,
        'n_samples': len(profiles),
        'cluster_sizes': cluster_sizes,
        'min_cluster_size': int(counts.min()),
        'max_cluster_size': int(counts.max()),
        'avg_cluster_size': float(counts.mean()),
    }


def print_training_summary(
    training_metrics: Dict[str, Any],
    evaluation_metrics: Dict[str, float],
    model_path: str
):
    """
    Print a summary of training results.
    
    Args:
        training_metrics: Metrics from training
        evaluation_metrics: Metrics from evaluation
        model_path: Path where model was saved
    """
    print("\n" + "="*70)
    print("USER CLASSIFIER TRAINING SUMMARY")
    print("="*70)
    
    print("\nTraining Configuration:")
    print(f"  Number of clusters: {training_metrics['n_clusters']}")
    print(f"  Number of samples: {training_metrics['n_samples']}")
    print(f"  Training timestamp: {training_metrics['timestamp']}")
    
    print("\nClustering Quality Metrics:")
    print(f"  Silhouette Score: {evaluation_metrics['silhouette_score']:.4f}")
    print(f"    (Range: -1 to 1, higher is better)")
    print(f"    (>0.5 = good, >0.7 = excellent)")
    print(f"  Inertia: {evaluation_metrics['inertia']:.2f}")
    print(f"    (Within-cluster sum of squares, lower is better)")
    
    print("\nCluster Distribution:")
    print(f"  Minimum cluster size: {evaluation_metrics['min_cluster_size']}")
    print(f"  Maximum cluster size: {evaluation_metrics['max_cluster_size']}")
    print(f"  Average cluster size: {evaluation_metrics['avg_cluster_size']:.1f}")
    
    print("\nModel Saved:")
    print(f"  Path: {model_path}")
    
    print("\n" + "="*70)
    
    # Interpretation
    silhouette = evaluation_metrics['silhouette_score']
    if silhouette > 0.7:
        quality = "EXCELLENT"
    elif silhouette > 0.5:
        quality = "GOOD"
    elif silhouette > 0.3:
        quality = "FAIR"
    else:
        quality = "POOR"
    
    print(f"\nOverall Clustering Quality: {quality}")
    
    if silhouette < 0.5:
        print("\nRecommendations:")
        print("  - Consider adjusting the number of clusters")
        print("  - Ensure training data has sufficient diversity")
        print("  - Check for data quality issues")
    
    print("="*70 + "\n")


def main():
    """Main training function"""
    parser = argparse.ArgumentParser(
        description='Train UserClassifier model for user grouping'
    )
    parser.add_argument(
        '--input',
        type=str,
        help='Path to JSON file containing user profiles (optional, generates sample data if not provided)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='models/user_classifier.pkl',
        help='Path to save trained model (default: models/user_classifier.pkl)'
    )
    parser.add_argument(
        '--n-clusters',
        type=int,
        default=25,
        help='Number of clusters for K-Means (default: 25)'
    )
    parser.add_argument(
        '--n-samples',
        type=int,
        default=1000,
        help='Number of sample profiles to generate if no input file (default: 1000)'
    )
    parser.add_argument(
        '--random-state',
        type=int,
        default=42,
        help='Random seed for reproducibility (default: 42)'
    )
    
    args = parser.parse_args()
    
    print("\n" + "="*70)
    print("USER CLASSIFIER TRAINING")
    print("="*70 + "\n")
    
    # Load or generate profiles
    if args.input:
        print(f"Loading profiles from: {args.input}")
        profiles = load_profiles_from_json(args.input)
        print(f"Loaded {len(profiles)} profiles")
    else:
        print(f"Generating {args.n_samples} sample profiles...")
        profiles = generate_sample_profiles(args.n_samples)
        print(f"Generated {len(profiles)} profiles")
    
    # Validate minimum profiles
    if len(profiles) < args.n_clusters:
        print(f"\nERROR: Need at least {args.n_clusters} profiles for {args.n_clusters} clusters")
        print(f"Got only {len(profiles)} profiles")
        sys.exit(1)
    
    # Initialize classifier
    print(f"\nInitializing UserClassifier with {args.n_clusters} clusters...")
    classifier = UserClassifier(
        n_clusters=args.n_clusters,
        random_state=args.random_state
    )
    
    # Train classifier
    print("Training K-Means classifier...")
    training_metrics = classifier.train(profiles)
    print("Training complete!")
    
    # Evaluate clustering
    print("\nEvaluating clustering quality...")
    evaluation_metrics = evaluate_clustering(classifier, profiles)
    
    # Create output directory if needed
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save model
    print(f"\nSaving model to: {args.output}")
    classifier.save_model(args.output)
    
    # Save metrics
    metrics_path = output_path.with_suffix('.json')
    metrics = {
        'training': training_metrics,
        'evaluation': evaluation_metrics,
        'config': {
            'n_clusters': args.n_clusters,
            'n_samples': len(profiles),
            'random_state': args.random_state,
        }
    }
    
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved metrics to: {metrics_path}")
    
    # Print summary
    print_training_summary(training_metrics, evaluation_metrics, args.output)
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
