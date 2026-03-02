import React, { useEffect, useState } from 'react';
import { EligibilityBadge } from './EligibilityBadge';
import { RecommendationExplanation } from './RecommendationExplanation';

interface SchemeDetailProps {
  schemeId: string;
}

export const SchemeDetail: React.FC<SchemeDetailProps> = ({ schemeId }) => {
  const [scheme, setScheme] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchScheme = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const headers: any = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(`/api/schemes/${schemeId}`, { headers });
        const data = await response.json();
        setScheme(data);
      } catch (err) {
        console.error('Failed to fetch scheme', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScheme();
  }, [schemeId]);

  if (isLoading) return <div>Loading...</div>;
  if (!scheme) return <div>Scheme not found</div>;

  return (
    <div className="scheme-detail">
      <h1>{scheme.name}</h1>
      {scheme.eligibilityScore !== undefined && (
        <EligibilityBadge score={scheme.eligibilityScore} />
      )}
      <p className="category">{scheme.category}</p>
      <p className="description">{scheme.description}</p>
      {scheme.explanation && (
        <RecommendationExplanation explanation={scheme.explanation} />
      )}
      {scheme.applicationUrl && (
        <a href={scheme.applicationUrl} target="_blank" rel="noopener noreferrer">
          Apply Now
        </a>
      )}
    </div>
  );
};
