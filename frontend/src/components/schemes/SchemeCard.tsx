import React from 'react';
import { EligibilityBadge } from './EligibilityBadge';

interface SchemeCardProps {
  scheme: {
    schemeId: string;
    name: string;
    description: string;
    category: string;
    eligibilityScore?: number;
  };
  onClick: (schemeId: string) => void;
}

export const SchemeCard: React.FC<SchemeCardProps> = ({ scheme, onClick }) => {
  return (
    <div className="scheme-card" onClick={() => onClick(scheme.schemeId)}>
      <div className="scheme-header">
        <h3>{scheme.name}</h3>
        {scheme.eligibilityScore !== undefined && (
          <EligibilityBadge score={scheme.eligibilityScore} />
        )}
      </div>
      <p className="scheme-category">{scheme.category}</p>
      <p className="scheme-description">{scheme.description}</p>
    </div>
  );
};
