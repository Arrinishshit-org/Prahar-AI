import React from 'react';

interface EligibilityBadgeProps {
  score: number;
}

export const EligibilityBadge: React.FC<EligibilityBadgeProps> = ({ score }) => {
  const getCategory = () => {
    if (score >= 80) return { label: 'Highly Eligible', color: 'green' };
    if (score >= 50) return { label: 'Potentially Eligible', color: 'yellow' };
    return { label: 'Low Eligibility', color: 'red' };
  };

  const { label, color } = getCategory();

  return (
    <div className={`eligibility-badge eligibility-${color}`}>
      <span className="score">{score}%</span>
      <span className="label">{label}</span>
    </div>
  );
};
