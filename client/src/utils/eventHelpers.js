/**
 * Event helper utilities
 * Provides common functions for event management, formatting, and calculations
 */

// Timezone utilities
export const timezoneUtils = {
  // Get common timezones
  getCommonTimezones: () => [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Kolkata', label: 'Mumbai (IST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
    { value: 'Africa/Nairobi', label: 'Nairobi (EAT)' },
    { value: 'Africa/Lagos', label: 'Lagos (WAT)' }
  ],

  // Get user's timezone
  getUserTimezone: () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  },

  // Format timezone for display
  formatTimezone: (timezone) => {
    try {
      const date = new Date();
      const offset = date.toLocaleString('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' }).split(' ').pop();
      return `${timezone} (${offset})`;
    } catch {
      return timezone;
    }
  }
};

// Date utilities
export const dateUtils = {
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
  },

  // Format date for input (YYYY-MM-DDTHH:MM)
  formatDateForInput: (date) => {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  },

  // Parse input date to ISO string
  parseInputDate: (inputDate) => {
    if (!inputDate) return null;
    return new Date(inputDate).toISOString();
  },

  // Calculate duration between two dates in hours
  calculateDuration: (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    
    return Math.round(diffMs / (1000 * 60 * 60) * 100) / 100; // Round to 2 decimal places
  },

  // Check if date is in the future
  isFutureDate: (date) => {
    return new Date(date) > new Date();
  },

  // Check if date is today
  isToday: (date) => {
    const today = new Date();
    const checkDate = new Date(date);
    return today.toDateString() === checkDate.toDateString();
  },

  // Get relative time (e.g., "2 hours ago", "in 3 days")
  getRelativeTime: (date) => {
    const now = new Date();
    const target = new Date(date);
    const diffMs = target - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (Math.abs(diffDays) > 0) {
      return `${diffDays > 0 ? 'in' : ''} ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ${diffDays > 0 ? '' : 'ago'}`;
    } else if (Math.abs(diffHours) > 0) {
      return `${diffHours > 0 ? 'in' : ''} ${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''} ${diffHours > 0 ? '' : 'ago'}`;
    } else {
      return `${diffMinutes > 0 ? 'in' : ''} ${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) !== 1 ? 's' : ''} ${diffMinutes > 0 ? '' : 'ago'}`;
    }
  }
};

// Currency utilities
export const currencyUtils = {
  // Supported currencies
  supportedCurrencies: [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' }
  ],

  // Format currency for display
  formatCurrency: (amount, currency = 'USD', options = {}) => {
    const defaultOptions = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    };
    
    return new Intl.NumberFormat('en-US', { ...defaultOptions, ...options }).format(amount);
  },

  // Get currency symbol
  getCurrencySymbol: (currency) => {
    const currencyData = currencyUtils.supportedCurrencies.find(c => c.code === currency);
    return currencyData ? currencyData.symbol : currency;
  },

  // Parse currency amount from string
  parseCurrencyAmount: (amountString) => {
    if (!amountString) return 0;
    
    // Remove currency symbols and commas
    const cleanAmount = amountString.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleanAmount);
    
    return isNaN(parsed) ? 0 : parsed;
  }
};

// Event status utilities
export const statusUtils = {
  // Event statuses
  statuses: {
    draft: { label: 'Draft', color: 'gray', icon: 'edit' },
    published: { label: 'Published', color: 'green', icon: 'check' },
    cancelled: { label: 'Cancelled', color: 'red', icon: 'x' },
    completed: { label: 'Completed', color: 'blue', icon: 'calendar' }
  },

  // Get status info
  getStatusInfo: (status) => {
    return statusUtils.statuses[status] || statusUtils.statuses.draft;
  },

  // Check if event can be published
  canPublish: (event) => {
    return event.status === 'draft' && 
           event.title && 
           event.description && 
           event.dates?.startDate && 
           event.dates?.endDate;
  },

  // Check if event can be cancelled
  canCancel: (event) => {
    return ['draft', 'published'].includes(event.status) && 
           dateUtils.isFutureDate(event.dates?.startDate);
  },

  // Check if event can be unpublished
  canUnpublish: (event) => {
    return event.status === 'published' && 
           dateUtils.isFutureDate(event.dates?.startDate);
  }
};

// Recurrence utilities
export const recurrenceUtils = {
  // Recurrence frequencies
  frequencies: [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
  ],

  // Weekday options (0 = Sunday, 6 = Saturday)
  weekdays: [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ],

  // Generate occurrence dates
  generateOccurrences: (startDate, endDate, rule) => {
    if (!rule.enabled) return [];

    const occurrences = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = end - start;
    const maxOccurrences = Math.min(rule.count || 50, 50);
    const until = rule.until ? new Date(rule.until) : null;

    let currentStart = new Date(start);
    let occurrenceCount = 0;

    while (occurrenceCount < maxOccurrences) {
      if (until && currentStart > until) break;

      const currentEnd = new Date(currentStart.getTime() + duration);
      occurrences.push({
        startDate: new Date(currentStart),
        endDate: new Date(currentEnd)
      });

      occurrenceCount++;

      // Calculate next occurrence
      if (rule.frequency === 'daily') {
        currentStart.setDate(currentStart.getDate() + rule.interval);
      } else if (rule.frequency === 'weekly') {
        if (rule.byWeekday && rule.byWeekday.length > 0) {
          // Find next occurrence on specified weekdays
          const targetWeekdays = rule.byWeekday.sort((a, b) => a - b);
          let foundNext = false;
          
          for (let i = 0; i < 7 && !foundNext; i++) {
            currentStart.setDate(currentStart.getDate() + 1);
            const currentWeekday = currentStart.getDay();
            
            if (targetWeekdays.includes(currentWeekday)) {
              foundNext = true;
            }
          }
          
          if (!foundNext) {
            // Move to next week and find first occurrence
            currentStart.setDate(currentStart.getDate() + (7 - currentStart.getDay()) + targetWeekdays[0]);
          }
        } else {
          currentStart.setDate(currentStart.getDate() + (7 * rule.interval));
        }
      } else if (rule.frequency === 'monthly') {
        currentStart.setMonth(currentStart.getMonth() + rule.interval);
      }
    }

    return occurrences;
  },

  // Get recurrence description
  getRecurrenceDescription: (rule) => {
    if (!rule.enabled) return 'One-time event';

    let description = `Repeats every ${rule.interval} ${rule.frequency}`;
    
    if (rule.frequency === 'weekly' && rule.byWeekday && rule.byWeekday.length > 0) {
      const dayNames = rule.byWeekday.map(day => recurrenceUtils.weekdays[day].label);
      description += ` on ${dayNames.join(', ')}`;
    }
    
    if (rule.count) {
      description += ` for ${rule.count} occurrences`;
    } else if (rule.until) {
      description += ` until ${dateUtils.formatDate(rule.until, { year: 'numeric', month: 'long', day: 'numeric' })}`;
    }
    
    return description;
  }
};

// Ticket utilities
export const ticketUtils = {
  // Calculate total ticket quantity
  calculateTotalQuantity: (ticketTypes) => {
    return ticketTypes.reduce((total, ticket) => total + (ticket.quantity || 0), 0);
  },

  // Calculate total revenue potential
  calculateTotalRevenue: (ticketTypes) => {
    return ticketTypes.reduce((total, ticket) => total + ((ticket.price || 0) * (ticket.quantity || 0)), 0);
  },

  // Validate ticket type
  validateTicketType: (ticketType) => {
    const errors = {};

    if (!ticketType.name?.trim()) {
      errors.name = 'Ticket name is required';
    }

    if (ticketType.price < 0) {
      errors.price = 'Price cannot be negative';
    }

    if (ticketType.quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }

    if (ticketType.salesStart && ticketType.salesEnd) {
      const salesStart = new Date(ticketType.salesStart);
      const salesEnd = new Date(ticketType.salesEnd);
      
      if (salesStart >= salesEnd) {
        errors.salesWindow = 'Sales end date must be after sales start date';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Get ticket type summary
  getTicketTypeSummary: (ticketType) => {
    const revenue = (ticketType.price || 0) * (ticketType.quantity || 0);
    return {
      name: ticketType.name || 'Unnamed Ticket',
      price: currencyUtils.formatCurrency(ticketType.price || 0, ticketType.currency),
      quantity: ticketType.quantity || 0,
      revenue: currencyUtils.formatCurrency(revenue, ticketType.currency),
      revenueValue: revenue
    };
  }
};

// Form utilities
export const formUtils = {
  // Generate unique field ID
  generateFieldId: (prefix, suffix = '') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}${suffix}`;
  },

  // Deep clone object
  deepClone: (obj) => {
    return JSON.parse(JSON.stringify(obj));
  },

  // Check if object is empty
  isEmpty: (obj) => {
    if (obj === null || obj === undefined) return true;
    if (typeof obj === 'string') return obj.trim() === '';
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  },

  // Merge objects deeply
  deepMerge: (target, source) => {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = formUtils.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  },

  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function
  throttle: (func, limit) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// Image utilities
export const imageUtils = {
  // Validate image URL
  isValidImageUrl: (url) => {
    try {
      const urlObj = new URL(url);
      const validProtocols = ['http:', 'https:'];
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.pdf', '.heic', '.heif'];
      
      return validProtocols.includes(urlObj.protocol) &&
             validExtensions.some(ext => urlObj.pathname.toLowerCase().endsWith(ext));
    } catch {
      return false;
    }
  },

  // Validate file type for upload
  isValidFileType: (file) => {
    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 
      'image/svg+xml', 'image/bmp', 'image/tiff', 'application/pdf',
      'image/heic', 'image/heif' // Apple HEIC format support
    ];
    
    // Also check file extension for HEIC files (sometimes MIME type is not set correctly)
    const fileName = file.name.toLowerCase();
    const heicExtensions = ['.heic', '.heif'];
    const hasHeicExtension = heicExtensions.some(ext => fileName.endsWith(ext));
    
    return validTypes.includes(file.type) || hasHeicExtension;
  },

  // Get file type category for better error messages
  getFileTypeCategory: (file) => {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
      return 'HEIC (Apple format)';
    }
    
    const typeMap = {
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPEG', 
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/webp': 'WebP',
      'image/svg+xml': 'SVG',
      'image/bmp': 'BMP',
      'image/tiff': 'TIFF',
      'application/pdf': 'PDF'
    };
    
    return typeMap[file.type] || 'Unknown';
  },

  // Get file size in MB
  getFileSizeMB: (file) => {
    return (file.size / (1024 * 1024)).toFixed(2);
  },

  // Convert HEIC to JPEG (optional feature)
  convertHeicToJpeg: (file) => {
    return new Promise((resolve, reject) => {
      // For now, reject HEIC files with helpful message
      // This avoids the import issues while providing clear guidance
      reject(new Error(`HEIC files are not currently supported. Please convert "${file.name}" to JPEG format manually before uploading. You can use online converters or your device's built-in conversion tools.`));
    });
  },

  // Compress image file
  compressImage: (file, maxSizeMB = 2, quality = 0.8) => {
    return new Promise((resolve) => {
      if (file.type === 'application/pdf') {
        // For PDFs, just return the original file
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        const maxWidth = 1200;
        const maxHeight = 800;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, file.type, quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  },

  // Get image dimensions from URL (async)
  getImageDimensions: (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = url;
    });
  },

  // Resize image (client-side)
  resizeImage: (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
};

export default {
  timezoneUtils,
  dateUtils,
  currencyUtils,
  statusUtils,
  recurrenceUtils,
  ticketUtils,
  formUtils,
  imageUtils
};
