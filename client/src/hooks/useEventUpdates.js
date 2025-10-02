import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import api from '../utils/api';

const useEventUpdates = (eventId) => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const { isAuthenticated, user } = useSelector(state => state.auth);

  const fetchUpdates = useCallback(async (pageNum = 1, append = false) => {
    if (!eventId || !isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/api/events/${eventId}/updates`, {
        params: { page: pageNum, limit: 10 }
      });

      const newUpdates = response.data.data || [];
      
      if (append) {
        setUpdates(prev => [...prev, ...newUpdates]);
      } else {
        setUpdates(newUpdates);
      }

      setHasMore(newUpdates.length === 10);
      setPage(pageNum);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch updates');
      console.error('Error fetching updates:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, isAuthenticated]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchUpdates(page + 1, true);
    }
  }, [fetchUpdates, loading, hasMore, page]);

  const refreshUpdates = useCallback(() => {
    return fetchUpdates(1, false);
  }, [fetchUpdates]);

  const addUpdate = useCallback((newUpdate) => {
    setUpdates(prev => [newUpdate, ...prev]);
  }, []);

  const updateUpdate = useCallback((updateId, updatedData) => {
    setUpdates(prev => prev.map(update => 
      update._id === updateId ? { ...update, ...updatedData } : update
    ));
  }, []);

  const removeUpdate = useCallback((updateId) => {
    setUpdates(prev => prev.filter(update => update._id !== updateId));
  }, []);

  useEffect(() => {
    if (eventId && isAuthenticated) {
      fetchUpdates(1, false);
    }
  }, [eventId, isAuthenticated, fetchUpdates]);

  return {
    updates,
    loading,
    error,
    hasMore,
    loadMore,
    refreshUpdates,
    addUpdate,
    updateUpdate,
    removeUpdate
  };
};

export { useEventUpdates };
export default useEventUpdates;