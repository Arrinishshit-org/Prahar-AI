import React from 'react';

interface RecommendationExplanationProps {
  explanation: {
    reason: string;
    matchingCriteria: string[];
  };
}

export const RecommendationExplanation: React.FC<RecommendationExplanationProps> = ({
  explanation,
}) => {
  return (
    <div className="recommendation-explanation">
      <h3>Why this scheme is recommended for you</h3>
      <p>{explanation.reason}</p>
      {explanation.matchingCriteria.length > 0 && (
        <div className="matching-criteria">
          <h4>Matching Criteria:</h4>
          <ul>
            {explanation.matchingCriteria.map((criteria, index) => (
              <li key={index}>{criteria}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
