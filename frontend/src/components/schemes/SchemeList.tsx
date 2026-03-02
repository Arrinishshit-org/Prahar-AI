/**
 * Scheme List Component
 * Displays a paginated list of government schemes
 */

import React, { useState, useEffect } from 'react';

interface Scheme {
  schemeId: string;
  schemeName: string;
  category: string;
  description: string;
}

export const SchemeList: React.FC = () => {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    try {
      const response = await fetch('/api/schemes?limit=20');
      if (!response.ok) throw new Error('Failed to fetch schemes');
      
      const data = await response.json();
      setSchemes(data.schemes || []);
    } catch (err) {
      setError('Failed to load schemes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="scheme-list">
      <h2>Government Schemes</h2>
      <div className="schemes-grid">
        {schemes.map((scheme) => (
          <div key={scheme.schemeId} className="scheme-card">
            <h3>{scheme.schemeName}</h3>
            <p className="category">{scheme.category}</p>
            <p>{scheme.description}</p>
            <button onClick={() => window.location.href = `/schemes/${scheme.schemeId}`}>
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
