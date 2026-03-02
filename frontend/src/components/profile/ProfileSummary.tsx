import React from 'react';
import { ProfileCompleteness } from './ProfileCompleteness';

interface ProfileSummaryProps {
  profile: {
    name: string;
    email: string;
    age?: number;
    income?: number;
    state?: string;
    completeness: number;
  };
  onEdit: () => void;
}

export const ProfileSummary: React.FC<ProfileSummaryProps> = ({ profile, onEdit }) => {
  return (
    <div className="profile-summary">
      <h2>Profile Overview</h2>
      <ProfileCompleteness completeness={profile.completeness} />
      <div className="profile-details">
        <p>
          <strong>Name:</strong> {profile.name}
        </p>
        <p>
          <strong>Email:</strong> {profile.email}
        </p>
        {profile.age && (
          <p>
            <strong>Age:</strong> {profile.age}
          </p>
        )}
        {profile.income && (
          <p>
            <strong>Income:</strong> ₹{profile.income.toLocaleString()}
          </p>
        )}
        {profile.state && (
          <p>
            <strong>State:</strong> {profile.state}
          </p>
        )}
      </div>
      <button onClick={onEdit}>Edit Profile</button>
    </div>
  );
};
