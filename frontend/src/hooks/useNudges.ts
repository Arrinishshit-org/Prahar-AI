import { useState, useEffect } from 'react';

interface Nudge {
  nudgeId: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  schemeId: string;
  viewed: boolean;
  dismissed: boolean;
}

export const useNudges = (userId: string | null) => {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchNudges = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`/api/users/${userId}/nudges`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch nudges');

        const data = await response.json();
        setNudges(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNudges();
  }, [userId]);

  const markAsViewed = async (nudgeId: string) => {
    if (!userId) return;

    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`/api/users/${userId}/nudges/${nudgeId}/view`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      setNudges(prev =>
        prev.map(n => (n.nudgeId === nudgeId ? { ...n, viewed: true } : n))
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const dismiss = async (nudgeId: string) => {
    if (!userId) return;

    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`/api/users/${userId}/nudges/${nudgeId}/dismiss`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      setNudges(prev =>
        prev.map(n => (n.nudgeId === nudgeId ? { ...n, dismissed: true } : n))
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  return { nudges, isLoading, error, markAsViewed, dismiss };
};
