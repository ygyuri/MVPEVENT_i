import { validateField, validateForm, stepValidators, validationRules } from '../utils/eventValidation';

describe('eventValidation', () => {
  describe('validateField', () => {
    it('should validate required fields', () => {
      expect(validateField('title', '')).toBe('Title is required');
      expect(validateField('title', 'Valid Title')).toBe(null);
    });

    it('should validate title length', () => {
      expect(validateField('title', 'ab')).toBe('Title must be between 3 and 255 characters');
      expect(validateField('title', 'a'.repeat(300))).toBe('Title must be between 3 and 255 characters');
      expect(validateField('title', 'Valid Title')).toBe(null);
    });

    it('should validate description length', () => {
      expect(validateField('description', 'Short')).toBe('Description must be between 10 and 5000 characters');
      expect(validateField('description', 'This is a longer description with enough characters')).toBe(null);
    });

    it('should validate capacity range', () => {
      expect(validateField('capacity', 0)).toBe('Capacity must be between 1 and 100,000');
      expect(validateField('capacity', 100)).toBe(null);
      expect(validateField('capacity', null)).toBe(null); // Optional field
    });

    it('should validate price range', () => {
      expect(validateField('price', -10)).toBe('Price must be between 0 and 10,000');
      expect(validateField('price', 0)).toBe(null);
      expect(validateField('price', 25)).toBe(null);
    });

    it('should validate date fields', () => {
      expect(validateField('startDate', 'invalid-date')).toBe('Invalid start date');
      expect(validateField('startDate', '2025-12-01')).toBe(null);
    });

    it('should validate end date after start date', () => {
      const formData = { dates: { startDate: '2025-12-02' } };
      expect(validateField('endDate', '2025-12-01', formData)).toBe('End date must be after start date');
      expect(validateField('endDate', '2025-12-03', formData)).toBe(null);
    });

    it('should validate venue name', () => {
      expect(validateField('venueName', '')).toBe('Venue name is required');
      expect(validateField('venueName', 'Test Venue')).toBe(null);
    });

    it('should validate city', () => {
      expect(validateField('city', '')).toBe('City is required');
      expect(validateField('city', 'Test City')).toBe(null);
    });

    it('should validate category', () => {
      expect(validateField('category', null)).toBe('Please select a category');
      expect(validateField('category', 'music')).toBe(null);
    });
  });

  describe('validateForm', () => {
    it('should validate complete form data', () => {
      const validFormData = {
        title: 'Test Event',
        description: 'This is a test event description that is long enough',
        category: 'music',
        location: {
          venueName: 'Test Venue',
          city: 'Test City',
          country: 'Test Country'
        },
        dates: {
          startDate: '2025-12-01',
          endDate: '2025-12-02',
          timezone: 'UTC'
        },
        capacity: 100,
        pricing: {
          isFree: true,
          price: 0,
          currency: 'USD'
        },
        ticketTypes: [],
        recurrence: {
          enabled: false
        },
        media: {
          coverImageUrl: ''
        }
      };
      
      const result = validateForm(validFormData);
      expect(result.isValid).toBe(true);
    });

    it('should return errors for invalid form data', () => {
      const invalidFormData = {
        title: '',
        description: 'short',
        category: null
      };
      
      const result = validateForm(invalidFormData);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBeDefined();
    });
  });

  describe('stepValidators', () => {
    it('should have validators for all steps', () => {
      expect(stepValidators).toHaveProperty('validateBasicInfo');
      expect(stepValidators).toHaveProperty('validateLocation');
      expect(stepValidators).toHaveProperty('validateSchedule');
      expect(stepValidators).toHaveProperty('validatePricing');
      expect(stepValidators).toHaveProperty('validateTicketTypes');
      expect(stepValidators).toHaveProperty('validateRecurrence');
      expect(stepValidators).toHaveProperty('validateMedia');
    });
  });

  describe('validationRules', () => {
    it('should have rules defined', () => {
      expect(validationRules).toBeDefined();
      expect(validationRules.basicInfo).toBeDefined();
      expect(validationRules.location).toBeDefined();
      expect(validationRules.schedule).toBeDefined();
      expect(validationRules.pricing).toBeDefined();
    });
  });
});
