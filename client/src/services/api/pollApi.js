import api from '../../utils/api';

export const pollApi = {
  // List polls for an event
  listPolls: (eventId, status = 'active') => {
    return api
      .get(`/api/events/${eventId}/polls`, {
        params: { status }
      })
      .then(res => res.data);
  },
  
  // Get poll details
  getPoll: (pollId) => {
    return api.get(`/api/polls/${pollId}`).then(res => res.data);
  },
  
  // Create poll (organizer only) - Using new simple endpoint
  createPoll: (eventId, pollData) => {
    return api
      .post(`/api/events/${eventId}/polls/simple`, pollData)
      .then(res => res.data)
      .catch((err) => {
        const status = err?.response?.status;
        const data = err?.response?.data;
        const message = data?.error || data?.message || err.message || 'Failed to create poll';
        const error = new Error(message);
        error.status = status;
        error.data = data;
        throw error;
      });
  },
  
  // Submit vote
  submitVote: (pollId, optionIds) => {
    return api
      .post(`/api/polls/${pollId}/vote`, {
        option_ids: optionIds
      })
      .then(res => res.data);
  },
  
  // Get poll results
  getResults: (pollId) => {
    return api.get(`/api/polls/${pollId}/results`).then(res => res.data);
  },
  
  // Close poll (organizer only)
  closePoll: (pollId) => {
    return api.delete(`/api/polls/${pollId}`).then(res => res.data);
  },
  
  // Export results (organizer only)
  exportResults: (pollId, format = 'csv') => {
    return api
      .get(`/api/polls/${pollId}/export`, {
        params: { format },
        responseType: 'blob'
      })
      .then(res => res.data);
  }
};
