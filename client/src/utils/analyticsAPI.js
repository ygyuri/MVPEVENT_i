import api from './api';

const analyticsAPI = {
  // Dashboard overview
  getDashboardOverview: () => api.get('/api/organizer/analytics/dashboard-overview'),
  
  // Sales chart
  getSalesChart: (eventId, options = {}) => {
    const params = new URLSearchParams();
    if (options.period) params.append('period', options.period);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.ticketType) params.append('ticketType', options.ticketType);
    
    return api.get(`/api/organizer/analytics/sales-chart/${eventId}?${params}`);
  },
  
  // Revenue overview
  getRevenueOverview: (eventId) => 
    api.get(`/api/organizer/analytics/revenue-overview/${eventId}`),
  
  // Revenue trends
  getRevenueTrends: (options = {}) => {
    const params = new URLSearchParams();
    if (options.period) params.append('period', options.period);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.eventIds) params.append('eventIds', JSON.stringify(options.eventIds));
    
    return api.get(`/api/organizer/analytics/revenue-trends?${params}`);
  },
  
  // Export attendees
  exportAttendees: (eventId, options = {}) => {
    const params = new URLSearchParams();
    if (options.format) params.append('format', options.format);
    if (options.status) params.append('status', options.status);
    if (options.ticketType) params.append('ticketType', options.ticketType);
    if (options.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options.dateTo) params.append('dateTo', options.dateTo);
    
    return api.get(`/api/organizer/analytics/export/attendees/${eventId}?${params}`);
  },
  
  // Create export job
  createExportJob: (eventId, options) => 
    api.post(`/api/organizer/analytics/export/attendees/${eventId}`, options),
  
  // Event summary
  getEventSummary: (eventId) => 
    api.get(`/api/organizer/analytics/events/${eventId}/summary`),
  
  // Export job status
  getExportStatus: (jobId) => 
    api.get(`/api/organizer/analytics/export-status/${jobId}`),
  
  // Download file
  downloadFile: (eventId, format) => 
    api.get(`/api/organizer/analytics/download/${eventId}/${format}`, {
      responseType: 'blob'
    }),
  
  // Cache management
  clearCache: () => api.get('/api/organizer/analytics/cache/clear'),
  clearEventCache: (eventId) => api.get(`/api/organizer/analytics/cache/clear/${eventId}`)
};

export default analyticsAPI;


