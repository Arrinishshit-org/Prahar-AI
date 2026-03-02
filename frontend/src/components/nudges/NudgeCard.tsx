import React from 'react';

interface NudgeCardProps {
  nudge: {
    nudgeId: string;
    title: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
    schemeId: string;
    viewed: boolean;
    dismissed: boolean;
  };
  onView: (nudgeId: string) => void;
  onDismiss: (nudgeId: string) => void;
}

export const NudgeCard: React.FC<NudgeCardProps> = ({ nudge, onView, onDismiss }) => {
  const handleClick = () => {
    if (!nudge.viewed) {
      onView(nudge.nudgeId);
    }
  };

  return (
    <div
      className={`nudge-card nudge-${nudge.priority} ${nudge.viewed ? 'viewed' : 'unviewed'}`}
      onClick={handleClick}
    >
      <div className="nudge-priority">{nudge.priority}</div>
      <h3>{nudge.title}</h3>
      <p>{nudge.message}</p>
      <div className="nudge-actions">
        <button onClick={() => window.location.href = `/schemes/${nudge.schemeId}`}>
          View Scheme
        </button>
        <button onClick={() => onDismiss(nudge.nudgeId)}>Dismiss</button>
      </div>
    </div>
  );
};
