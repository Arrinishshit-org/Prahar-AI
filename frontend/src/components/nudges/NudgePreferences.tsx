import React, { useState } from 'react';

interface NudgePreferencesProps {
  initialPreferences?: any;
  onSave: (preferences: any) => void;
}

export const NudgePreferences: React.FC<NudgePreferencesProps> = ({
  initialPreferences,
  onSave,
}) => {
  const [preferences, setPreferences] = useState(
    initialPreferences || {
      enabled: true,
      maxPerWeek: 3,
      minEligibilityScore: 70,
      categories: [],
      channels: ['in-app'],
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(preferences);
  };

  return (
    <form className="nudge-preferences" onSubmit={handleSubmit}>
      <h2>Notification Preferences</h2>

      <label>
        <input
          type="checkbox"
          checked={preferences.enabled}
          onChange={e => setPreferences({ ...preferences, enabled: e.target.checked })}
        />
        Enable notifications
      </label>

      <label>
        Max notifications per week:
        <input
          type="number"
          min="1"
          max="10"
          value={preferences.maxPerWeek}
          onChange={e =>
            setPreferences({ ...preferences, maxPerWeek: parseInt(e.target.value) })
          }
        />
      </label>

      <label>
        Minimum eligibility score:
        <input
          type="number"
          min="0"
          max="100"
          value={preferences.minEligibilityScore}
          onChange={e =>
            setPreferences({ ...preferences, minEligibilityScore: parseInt(e.target.value) })
          }
        />
      </label>

      <button type="submit">Save Preferences</button>
    </form>
  );
};
