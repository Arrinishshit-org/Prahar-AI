import { useState, useEffect } from 'react';

interface Scheme {
  schemeId: string;
  name: string;
  description: string;
  category: string;
  eligibilityScore?: number;
}

export const useSchemes = (filters?: { category?: string; state?: string; search?: string }) => {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchSchemes = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          limit: '20',
          offset: String((page - 1) * 20),
          ...(filters?.category && { category: filters.category }),
          ...(filters?.state && { state: filters.state }),
          ...(filters?.search && { search: filters.search }),
        });

        const response = await fetch(`/api/schemes?${params}`);
        if (!response.ok) throw new Error('Failed to fetch schemes');

        const data = await response.json();
        setSchemes(prev => (page === 1 ? data : [...prev, ...data]));
        setHasMore(data.length === 20);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchemes();
  }, [page, filters?.category, filters?.state, filters?.search]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  return { schemes, isLoading, error, loadMore, hasMore };
};
