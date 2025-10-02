import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import api from '../utils/api';

const useUpdateActions = () => {
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useSelector(state => state.auth);

  const reactToUpdate = useCallback(async (updateId, reactionType) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    try {
      const response = await api.post(`/api/updates/${updateId}/reactions`, {
        reactionType
      });
      return response.data;
    } catch (error) {
      console.error('Error reacting to update:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const markAsRead = useCallback(async (updateId) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    try {
      await api.post(`/api/updates/${updateId}/read`);
    } catch (error) {
      console.error('Error marking update as read:', error);
      throw error;
    }
  }, [isAuthenticated, user]);

  const editUpdate = useCallback(async (updateId, content) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    try {
      const response = await api.patch(`/api/updates/${updateId}`, {
        content
      });
      return response.data;
    } catch (error) {
      console.error('Error editing update:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const deleteUpdate = useCallback(async (updateId) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    try {
      await api.delete(`/api/updates/${updateId}`);
    } catch (error) {
      console.error('Error deleting update:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const createUpdate = useCallback(async (eventId, updateData) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    try {
      const response = await api.post(`/api/events/${eventId}/updates`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error creating update:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  return {
    loading,
    reactToUpdate,
    markAsRead,
    editUpdate,
    deleteUpdate,
    createUpdate
  };
};

export { useUpdateActions };
export default useUpdateActions;