import api from './api';

/**
 * Organizer API service functions
 * Handles all organizer-related API calls for event management
 */

// Event Management
export const organizerAPI = {
  // Get organizer's events with filtering and pagination
  getMyEvents: async ({ status, page = 1, pageSize = 12, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString()
    });
    
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    
    const response = await api.get(`/api/organizer/events?${params}`);
    return response.data;
  },

  // Create a new event draft
  createDraft: async (eventData) => {
    const response = await api.post('/api/organizer/events', eventData);
    return response.data;
  },

  // Update an existing event draft
  updateDraft: async (eventId, eventData, version = null) => {
    const payload = { ...eventData };
    if (version !== null) {
      payload.version = version;
    }
    
    const response = await api.patch(`/api/organizer/events/${eventId}`, payload);
    return response.data;
  },

  // Get event details by ID
  getEventDetails: async (eventId) => {
    const response = await api.get(`/api/organizer/events/${eventId}`);
    return response.data.data;
  },

  // Publish an event
  publishEvent: async (eventId) => {
    const response = await api.post(`/api/organizer/events/${eventId}/publish`);
    return response.data;
  },

  // Cancel an event
  cancelEvent: async (eventId) => {
    const response = await api.post(`/api/organizer/events/${eventId}/cancel`);
    return response.data;
  },

  // Unpublish an event
  unpublishEvent: async (eventId) => {
    const response = await api.post(`/api/organizer/events/${eventId}/unpublish`);
    return response.data;
  },

  // Clone an event
  cloneEvent: async (eventId, options = {}) => {
    const response = await api.post(`/api/organizer/events/${eventId}/clone`, options);
    return response.data;
  },

  // Update ticket types for an event
  updateTicketTypes: async (eventId, ticketTypes) => {
    const response = await api.put(`/api/organizer/events/${eventId}/tickets`, { ticketTypes });
    return response.data;
  },

  // Get organizer overview/stats
  getOverview: async () => {
    const response = await api.get('/api/organizer/overview');
    return response.data.overview;
  }
};

// Categories API (for form dropdowns)
export const categoriesAPI = {
  // Get all event categories
  getCategories: async () => {
    const response = await api.get('/api/events/categories');
    return response.data.categories;
  },

  // Check if category name exists (for duplicate detection)
  checkDuplicate: async (name) => {
    const response = await api.post('/api/events/categories/check', { name });
    return response.data;
  },

  // Create new category
  createCategory: async (name, description = '') => {
    const response = await api.post('/api/events/categories', { name, description });
    return response.data;
  }
};

// Utility functions for form data transformation
export const formUtils = {
  // Transform form data to API format
  transformFormDataToAPI: (formData) => {
    return {
      title: formData.title || undefined,
      description: formData.description || undefined,
      shortDescription: formData.shortDescription || undefined,
      category: formData.category || undefined,
      location: formData.location || undefined,
      dates: formData.dates || undefined,
      capacity: formData.capacity || undefined,
      pricing: formData.pricing || undefined,
      ticketTypes: formData.ticketTypes || undefined,
      recurrence: formData.recurrence || undefined,
      media: formData.media || undefined,
      flags: formData.flags || undefined,
      tags: formData.tags || undefined,
      metadata: formData.metadata || undefined
    };
  },

  // Transform API data to form format
  transformAPIToFormData: (apiData) => {
    return {
      title: apiData.title || '',
      description: apiData.description || '',
      shortDescription: apiData.shortDescription || '',
      category: apiData.category || null,
      location: {
        venueName: apiData.location?.venueName || '',
        address: apiData.location?.address || '',
        city: apiData.location?.city || '',
        state: apiData.location?.state || '',
        country: apiData.location?.country || '',
        postalCode: apiData.location?.postalCode || '',
        coordinates: {
          latitude: apiData.location?.coordinates?.latitude || null,
          longitude: apiData.location?.coordinates?.longitude || null
        }
      },
      dates: {
        startDate: apiData.dates?.startDate || null,
        endDate: apiData.dates?.endDate || null,
        timezone: apiData.dates?.timezone || 'UTC'
      },
      capacity: apiData.capacity || null,
      pricing: {
        isFree: apiData.pricing?.isFree ?? true,
        price: apiData.pricing?.price || 0,
        currency: apiData.pricing?.currency || 'USD'
      },
      ticketTypes: apiData.ticketTypes || [],
      recurrence: {
        enabled: apiData.recurrence?.enabled || false,
        frequency: apiData.recurrence?.frequency || 'weekly',
        interval: apiData.recurrence?.interval || 1,
        byWeekday: apiData.recurrence?.byWeekday || [],
        byMonthday: apiData.recurrence?.byMonthday || [],
        count: apiData.recurrence?.count || null,
        until: apiData.recurrence?.until || null
      },
      media: {
        coverImageUrl: apiData.media?.coverImageUrl || '',
        galleryUrls: apiData.media?.galleryUrls || []
      },
      flags: {
        isFeatured: apiData.flags?.isFeatured || false,
        isTrending: apiData.flags?.isTrending || false
      },
      tags: apiData.tags || [],
      metadata: apiData.metadata || {}
    };
  },

  // Validate required fields for publishing
  validateForPublishing: (formData) => {
    const errors = {};
    
    // Required fields for publishing
    if (!formData.title?.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!formData.description?.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!formData.dates?.startDate) {
      errors.startDate = 'Start date is required';
    }
    
    if (!formData.dates?.endDate) {
      errors.endDate = 'End date is required';
    }
    
    if (formData.dates?.startDate && formData.dates?.endDate) {
      const startDate = new Date(formData.dates.startDate);
      const endDate = new Date(formData.dates.endDate);
      
      if (startDate >= endDate) {
        errors.dateRange = 'End date must be after start date';
      }
    }
    
    if (formData.pricing && !formData.pricing.isFree && formData.pricing.price <= 0) {
      errors.price = 'Price must be greater than 0 for paid events';
    }
    
    if (formData.capacity && formData.capacity <= 0) {
      errors.capacity = 'Capacity must be greater than 0';
    }
    
    // Validate ticket types
    if (formData.ticketTypes && formData.ticketTypes.length > 0) {
      const totalQuantity = formData.ticketTypes.reduce((sum, ticket) => sum + (ticket.quantity || 0), 0);
      
      if (formData.capacity && totalQuantity > formData.capacity) {
        errors.ticketQuantity = 'Total ticket quantity exceeds event capacity';
      }
      
      formData.ticketTypes.forEach((ticket, index) => {
        if (!ticket.name?.trim()) {
          errors[`ticketTypes.${index}.name`] = 'Ticket name is required';
        }
        
        if (ticket.price < 0) {
          errors[`ticketTypes.${index}.price`] = 'Ticket price cannot be negative';
        }
        
        if (ticket.quantity <= 0) {
          errors[`ticketTypes.${index}.quantity`] = 'Ticket quantity must be greater than 0';
        }
        
        if (ticket.salesStart && ticket.salesEnd) {
          const salesStart = new Date(ticket.salesStart);
          const salesEnd = new Date(ticket.salesEnd);
          
          if (salesStart >= salesEnd) {
            errors[`ticketTypes.${index}.salesWindow`] = 'Sales end date must be after sales start date';
          }
        }
      });
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Calculate total ticket quantity
  calculateTotalTicketQuantity: (ticketTypes) => {
    return ticketTypes.reduce((total, ticket) => total + (ticket.quantity || 0), 0);
  },

  // Calculate event duration in hours
  calculateEventDuration: (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    
    return Math.round(diffMs / (1000 * 60 * 60) * 100) / 100; // Round to 2 decimal places
  },

  // Generate slug from title
  generateSlug: (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  // Format currency for display
  formatCurrency: (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  // Format date for display
  formatDate: (date, options = {}) => {
    if (!date) return '';
    
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    };
    
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(new Date(date));
  }
};

export default organizerAPI;
