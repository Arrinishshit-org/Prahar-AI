/**
 * Dashboard Page Component
 * Shows personalized recommendations and recent nudges
 */

import React, { useState, useEffect } from 'react';

interface Recommendation {
  schemeId: string;
  schemeName: string;
  eligibilityScore: number;
  explanation: string;
}

export const DashboardPage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const userId = 'current'; // Get from auth context
      
      const response = await fetch(`/api/users/${userId}/recommendations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch recommendations');
      
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('Failed to load recommendations', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading your recommendations...</div>;

  return (
    <div className="dashboard">
      <h1>Your Personalized Recommendations</h1>
      <div className="recommendations">
        {recommendations.map((rec) => (
          <div key={rec.schemeId} className="recommendation-card">
            <h3>{rec.schemeName}</h3>
            <div className="eligibility-score">
              Eligibility: {rec.eligibilityScore}%
            </div>
            <p>{rec.explanation}</p>
            <button onClick={() => window.location.href = `/schemes/${rec.schemeId}`}>
              Learn More
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
