import { validateField, validateStep, validateForm, stepValidators } from '../utils/eventValidation';

describe('eventValidation', () => {
  describe('validateField', () => {
    it('should validate required fields', () => {
      expect(validateField('title', '')).toBe('Title is required');
      expect(validateField('title', 'Valid Title')).toBe(null);
    });

    it('should validate email format', () => {
      expect(validateField('email', 'invalid-email')).toBe('Please enter a valid email address');
      expect(validateField('email', 'test@example.com')).toBe(null);
    });

    it('should validate URL format', () => {
      expect(validateField('website', 'invalid-url')).toBe('Please enter a valid URL');
      expect(validateField('website', 'https://example.com')).toBe(null);
    });

    it('should validate phone number format', () => {
      expect(validateField('phone', '123')).toBe('Please enter a valid phone number');
      expect(validateField('phone', '+1234567890')).toBe(null);
    });

    it('should validate minimum length', () => {
      expect(validateField('description', 'Short')).toBe('Description must be at least 10 characters long');
      expect(validateField('description', 'This is a longer description')).toBe(null);
    });

    it('should validate maximum length', () => {
      const longText = 'a'.repeat(501);
      expect(validateField('title', longText)).toBe('Title must be less than 500 characters');
      expect(validateField('title', 'Valid Title')).toBe(null);
    });

    it('should validate numeric fields', () => {
      expect(validateField('capacity', 'abc')).toBe('Capacity must be a valid number');
      expect(validateField('capacity', '100')).toBe(null);
    });

    it('should validate positive numbers', () => {
      expect(validateField('price', '-10')).toBe('Price must be a positive number');
      expect(validateField('price', '0')).toBe(null);
      expect(validateField('price', '25')).toBe(null);
    });

    it('should validate date fields', () => {
      expect(validateField('startDate', 'invalid-date')).toBe('Please enter a valid date');
      expect(validateField('startDate', '2025-12-01')).toBe(null);
    });

    it('should validate future dates', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      expect(validateField('startDate', pastDate, { future: true })).toBe('Start date must be in the future');
      expect(validateField('startDate', '2025-12-01', { future: true })).toBe(null);
    });
  });

  describe('validateStep', () => {
    it('should validate basic info step', () => {
      const formData = {
        title: '',
        description: '',
        category: null,
      };
      const result = validateStep(1, formData);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe('Title is required');
      expect(result.errors.description).toBe('Description is required');
      expect(result.errors.category).toBe('Please select a category');
    });

    it('should validate location step', () => {
      const formData = {
        location: {
          venueName: '',
          address: '',
          city: '',
          country: '',
        },
      };
      const result = validateStep(2, formData);
      expect(result.isValid).toBe(false);
      expect(result.errors['location.venueName']).toBe('Venue name is required');
      expect(result.errors['location.city']).toBe('City is required');
      expect(result.errors['location.country']).toBe('Country is required');
    });

    it('should validate schedule step', () => {
      const formData = {
        dates: {
          startDate: null,
          endDate: null,
        },
      };
      const result = validateStep(3, formData);
      expect(result.isValid).toBe(false);
      expect(result.errors['dates.startDate']).toBe('Start date is required');
      expect(result.errors['dates.endDate']).toBe('End date is required');
    });

    it('should validate date range', () => {
      const formData = {
        dates: {
          startDate: '2025-12-02T10:00:00Z',
          endDate: '2025-12-01T18:00:00Z',
        },
      };
      const result = validateStep(3, formData);
      expect(result.isValid).toBe(false);
      expect(result.errors['dates.endDate']).toBe('End date must be after start date');
    });

    it('should validate pricing step', () => {
      const formData = {
        capacity: null,
        pricing: {
          isFree: false,
          price: null,
        },
      };
      const result = validateStep(4, formData);
      expect(result.isValid).toBe(false);
      expect(result.errors.capacity).toBe('Capacity is required');
      expect(result.errors['pricing.price']).toBe('Price is required for paid events');
    });

    it('should validate ticket types step', () => {
      const formData = {
        ticketTypes: [
          { name: '', price: 0, quantity: 0 },
        ],
      };
      const result = validateStep(5, formData);
      expect(result.isValid).toBe(false);
      expect(result.errors['ticketTypes.0.name']).toBe('Ticket type name is required');
    });

    it('should validate ticket type quantities', () => {
      const formData = {
        capacity: 100,
        ticketTypes: [
          { name: 'VIP', price: 100, quantity: 60 },
          { name: 'General', price: 50, quantity: 50 },
        ],
      };
      const result = validateStep(5, formData);
      expect(result.isValid).toBe(false);
      expect(result.errors['ticketTypes']).toBe('Total ticket quantities (110) exceed event capacity (100)');
    });

    it('should validate recurrence step', () => {
      const formData = {
        recurrence: {
          enabled: true,
          frequency: 'weekly',
          interval: 0,
        },
      };
      const result = validateStep(6, formData);
      expect(result.isValid).toBe(false);
      expect(result.errors['recurrence.interval']).toBe('Interval must be at least 1');
    });

    it('should validate media step', () => {
      const formData = {
        media: {
          coverImageUrl: '',
        },
      };
      const result = validateStep(7, formData);
      expect(result.isValid).toBe(false);
      expect(result.errors['media.coverImageUrl']).toBe('Cover image is required');
    });
  });

  describe('validateForm', () => {
    it('should validate complete form', () => {
      const formData = {
        title: 'Test Event',
        description: 'Test description',
        category: 'category123',
        location: {
          venueName: 'Test Venue',
          city: 'Test City',
          country: 'Test Country',
        },
        dates: {
          startDate: '2025-12-01T10:00:00Z',
          endDate: '2025-12-01T18:00:00Z',
        },
        capacity: 100,
        pricing: {
          isFree: true,
        },
        ticketTypes: [],
        recurrence: {
          enabled: false,
        },
        media: {
          coverImageUrl: 'https://example.com/image.jpg',
        },
      };
      const result = validateForm(formData);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should identify missing required fields', () => {
      const formData = {
        title: '',
        description: '',
      };
      const result = validateForm(formData);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe('Title is required');
      expect(result.errors.description).toBe('Description is required');
    });

    it('should validate all steps', () => {
      const formData = {
        title: 'Test Event',
        description: 'Test description',
        category: 'category123',
        location: {
          venueName: 'Test Venue',
          city: 'Test City',
          country: 'Test Country',
        },
        dates: {
          startDate: '2025-12-01T10:00:00Z',
          endDate: '2025-12-01T18:00:00Z',
        },
        capacity: 100,
        pricing: {
          isFree: true,
        },
        ticketTypes: [],
        recurrence: {
          enabled: false,
        },
        media: {
          coverImageUrl: 'https://example.com/image.jpg',
        },
      };
      const result = validateForm(formData);
      expect(result.stepResults).toHaveLength(7);
      result.stepResults.forEach((stepResult, index) => {
        expect(stepResult.step).toBe(index + 1);
        expect(stepResult.isValid).toBe(true);
      });
    });
  });

  describe('stepValidators', () => {
    it('should have validators for all steps', () => {
      expect(stepValidators).toHaveProperty('1');
      expect(stepValidators).toHaveProperty('2');
      expect(stepValidators).toHaveProperty('3');
      expect(stepValidators).toHaveProperty('4');
      expect(stepValidators).toHaveProperty('5');
      expect(stepValidators).toHaveProperty('6');
      expect(stepValidators).toHaveProperty('7');
    });

    it('should have functions for all step validators', () => {
      Object.values(stepValidators).forEach(validator => {
        expect(typeof validator).toBe('function');
      });
    });
  });
});

