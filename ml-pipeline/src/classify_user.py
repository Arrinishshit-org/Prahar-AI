#!/usr/bin/env python3
"""
User classification script

This script is called by the Node.js backend to classify users.
It loads the trained K-Means model and classifies a user profile.

Input: JSON via stdin with profile data and configuration
Output: JSON via stdout with classification results
"""

import sys
import json
from typing import Dict, Any

try:
    from src.user_classifier import UserClassifier
except ImportError:
    from user_classifier import UserClassifier


def classify_user_from_input() -> Dict[str, Any]:
    """
    Read input from stdin, classify user, and return results.
    
    Returns:
        Dictionary containing classification results
    """
    try:
        # Read input from stdin
        input_data = json.load(sys.stdin)
        
        profile = input_data['profile']
        confidence_threshold = input_data.get('confidence_threshold', 0.7)
        multi_group_threshold = input_data.get('multi_group_threshold', 1.2)
        model_path = input_data['model_path']
        
        # Load trained model
        classifier = UserClassifier()
        classifier.load_model(model_path)
        
        # Classify user
        result = classifier.classify_user(
            profile,
            confidence_threshold=confidence_threshold,
            multi_group_threshold=multi_group_threshold
        )
        
        # Enrich with cluster metadata
        enriched_groups = []
        for group_id in result['groups']:
            cluster_info = classifier.get_cluster_info(group_id)
            enriched_groups.append({
                'group_id': group_id,
                'group_name': f'Group {group_id}',
                'description': f'User cluster {group_id}',
                'member_count': cluster_info.get('size', 0) if cluster_info else 0,
                'typical_profile': cluster_info.get('typical_profile', {}) if cluster_info else {}
            })
        
        # Build output
        output = {
            'user_id': result['user_id'],
            'groups': enriched_groups,
            'confidence': result['confidence'],
            'features': result['features'],
            'timestamp': result['timestamp']
        }
        
        return output
        
    except Exception as e:
        # Write error to stderr
        sys.stderr.write(f"Classification error: {str(e)}\n")
        sys.exit(1)


def main():
    """Main entry point"""
    try:
        result = classify_user_from_input()
        # Write result to stdout as JSON
        json.dump(result, sys.stdout)
        sys.exit(0)
    except Exception as e:
        sys.stderr.write(f"Fatal error: {str(e)}\n")
        sys.exit(1)


if __name__ == '__main__':
    main()
