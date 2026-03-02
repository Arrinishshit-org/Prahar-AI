import React, { useState } from 'react';
import { NudgeCard } from './NudgeCard';

interface Nudge {
  nudgeId: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  schemeId: string;
  viewed: boolean;
  dismissed: boolean;
}

interface NudgeListProps {
  nudges: Nudge[];
  onView: (nudgeId: string) => void;
  onDismiss: (nudgeId: string) => void;
}

export const NudgeList: React.FC<NudgeListProps> = ({ nudges, onView, onDismiss }) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const filteredNudges = nudges.filter(nudge => {
    if (filter === 'unread') return !nudge.viewed;
    if (filter === 'read') return nudge.viewed;
    return true;
  });

  const unreadCount = nudges.filter(n => !n.viewed).length;

  return (
    <div className="nudge-list">
      <div className="nudge-header">
        <h2>Notifications</h2>
        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
      </div>
      <div className="nudge-filters">
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'active' : ''}>
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={filter === 'unread' ? 'active' : ''}
        >
          Unread
        </button>
        <button onClick={() => setFilter('read')} className={filter === 'read' ? 'active' : ''}>
          Read
        </button>
      </div>
      <div className="nudges">
        {filteredNudges.map(nudge => (
          <NudgeCard
            key={nudge.nudgeId}
            nudge={nudge}
            onView={onView}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
};
