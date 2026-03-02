import React from 'react';

interface ProfileCompletenessProps {
  completeness: number;
}

export const ProfileCompleteness: React.FC<ProfileCompletenessProps> = ({
  completeness,
}) => {
  return (
    <div className="profile-completeness">
      <h3>Profile Completeness</h3>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${completeness}%` }} />
      </div>
      <span>{completeness}% Complete</span>
      {completeness < 100 && (
        <p className="hint">Complete your profile to get better recommendations</p>
      )}
    </div>
  );
};
