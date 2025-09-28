/**
 * Event form validation utilities
 * Provides validation schemas and functions for the multi-step event creation form
 */

// Validation rules for each step
export const validationRules = {
  // Step 1: Basic Information
  basicInfo: {
    title: {
      required: true,
      minLength: 3,
      maxLength: 255,
      message: 'Title must be between 3 and 255 characters'
    },
    description: {
      required: true,
      minLength: 10,
      maxLength: 5000,
      message: 'Description must be between 10 and 5000 characters'
    },
    shortDescription: {
      required: false,
      maxLength: 300,
      message: 'Short description cannot exceed 300 characters'
    },
    category: {
      required: true,
      message: 'Please select a category'
    }
  },

  // Step 2: Location & Venue
  location: {
    venueName: {
      required: true,
      minLength: 2,
      maxLength: 100,
      message: 'Venue name must be between 2 and 100 characters'
    },
    city: {
      required: true,
      minLength: 2,
      maxLength: 50,
      message: 'City must be between 2 and 50 characters'
    },
    country: {
      required: true,
      minLength: 2,
      maxLength: 50,
      message: 'Country must be between 2 and 50 characters'
    },
    address: {
      required: false,
      maxLength: 200,
      message: 'Address cannot exceed 200 characters'
    },
    state: {
      required: false,
      maxLength: 50,
      message: 'State cannot exceed 50 characters'
    },
    postalCode: {
      required: false,
      maxLength: 20,
      message: 'Postal code cannot exceed 20 characters'
    }
  },

  // Step 3: Schedule & Timing
  schedule: {
    startDate: {
      required: true,
      message: 'Start date is required'
    },
    endDate: {
      required: true,
      message: 'End date is required'
    },
    timezone: {
      required: true,
      message: 'Timezone is required'
    }
  },

  // Step 4: Pricing Setup
  pricing: {
    capacity: {
      required: false,
      min: 1,
      max: 100000,
      message: 'Capacity must be between 1 and 100,000'
    },
    price: {
      required: false,
      min: 0,
      max: 10000,
      message: 'Price must be between 0 and 10,000'
    },
    currency: {
      required: true,
      message: 'Currency is required'
    }
  },

  // Step 5: Ticket Types
  ticketTypes: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 100,
      message: 'Ticket name must be between 2 and 100 characters'
    },
    price: {
      required: true,
      min: 0,
      max: 10000,
      message: 'Price must be between 0 and 10,000'
    },
    quantity: {
      required: true,
      min: 1,
      max: 100000,
      message: 'Quantity must be between 1 and 100,000'
    },
    description: {
      required: false,
      maxLength: 500,
      message: 'Description cannot exceed 500 characters'
    }
  },

  // Step 6: Recurrence Rules
  recurrence: {
    frequency: {
      required: true,
      enum: ['daily', 'weekly', 'monthly'],
      message: 'Please select a valid frequency'
    },
    interval: {
      required: true,
      min: 1,
      max: 365,
      message: 'Interval must be between 1 and 365'
    },
    count: {
      required: false,
      min: 1,
      max: 100,
      message: 'Count must be between 1 and 100'
    }
  },

  // Step 7: Media & Assets
  media: {
    coverImageUrl: {
      required: false,
      pattern: /^https?:\/\/.+/,
      message: 'Please enter a valid image URL'
    }
  }
};

// Validation functions
export const validators = {
  // Generic required field validator
  required: (value, message = 'This field is required') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return message;
    }
    return null;
  },

  // String length validator
  length: (value, min = 0, max = Infinity, message = 'Invalid length') => {
    if (typeof value !== 'string') return null;
    if (value.length < min || value.length > max) {
      return message;
    }
    return null;
  },

  // Number range validator
  range: (value, min = -Infinity, max = Infinity, message = 'Value out of range') => {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
      return message;
    }
    return null;
  },

  // Email validator
  email: (value, message = 'Invalid email format') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return message;
    }
    return null;
  },

  // URL validator
  url: (value, message = 'Invalid URL format') => {
    try {
      if (value && !new URL(value).href) {
        return message;
      }
    } catch {
      return message;
    }
    return null;
  },

  // Date validator
  date: (value, message = 'Invalid date') => {
    if (value && isNaN(Date.parse(value))) {
      return message;
    }
    return null;
  },

  // Date range validator
  dateRange: (startDate, endDate, message = 'End date must be after start date') => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        return message;
      }
    }
    return null;
  },

  // Array length validator
  arrayLength: (array, min = 0, max = Infinity, message = 'Invalid array length') => {
    if (!Array.isArray(array)) return null;
    if (array.length < min || array.length > max) {
      return message;
    }
    return null;
  },

  // Enum validator
  enum: (value, options, message = 'Invalid option') => {
    if (value && !options.includes(value)) {
      return message;
    }
    return null;
  }
};

// Step-specific validation functions
export const stepValidators = {
  // Step 1: Basic Information
  validateBasicInfo: (formData) => {
    const errors = {};
    const rules = validationRules.basicInfo;

    // Title validation
    const titleError = validators.required(formData.title, 'Title is required') ||
                      validators.length(formData.title, rules.title.minLength, rules.title.maxLength, rules.title.message);
    if (titleError) errors.title = titleError;

    // Description validation
    const descriptionError = validators.required(formData.description, 'Description is required') ||
                            validators.length(formData.description, rules.description.minLength, rules.description.maxLength, rules.description.message);
    if (descriptionError) errors.description = descriptionError;

    // Short description validation
    if (formData.shortDescription) {
      const shortDescError = validators.length(formData.shortDescription, 0, rules.shortDescription.maxLength, rules.shortDescription.message);
      if (shortDescError) errors.shortDescription = shortDescError;
    }

    // Category validation
    const categoryError = validators.required(formData.category, rules.category.message);
    if (categoryError) errors.category = categoryError;

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Step 2: Location & Venue
  validateLocation: (formData) => {
    const errors = {};
    const rules = validationRules.location;

    // Venue name validation
    const venueError = validators.required(formData.location?.venueName, 'Venue name is required') ||
                      validators.length(formData.location?.venueName, rules.venueName.minLength, rules.venueName.maxLength, rules.venueName.message);
    if (venueError) errors.venueName = venueError;

    // City validation
    const cityError = validators.required(formData.location?.city, 'City is required') ||
                     validators.length(formData.location?.city, rules.city.minLength, rules.city.maxLength, rules.city.message);
    if (cityError) errors.city = cityError;

    // Country validation
    const countryError = validators.required(formData.location?.country, 'Country is required') ||
                        validators.length(formData.location?.country, rules.country.minLength, rules.country.maxLength, rules.country.message);
    if (countryError) errors.country = countryError;

    // Optional fields validation
    if (formData.location?.address) {
      const addressError = validators.length(formData.location.address, 0, rules.address.maxLength, rules.address.message);
      if (addressError) errors.address = addressError;
    }

    if (formData.location?.state) {
      const stateError = validators.length(formData.location.state, 0, rules.state.maxLength, rules.state.message);
      if (stateError) errors.state = stateError;
    }

    if (formData.location?.postalCode) {
      const postalError = validators.length(formData.location.postalCode, 0, rules.postalCode.maxLength, rules.postalCode.message);
      if (postalError) errors.postalCode = postalError;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Step 3: Schedule & Timing
  validateSchedule: (formData) => {
    const errors = {};
    const rules = validationRules.schedule;

    // Start date validation
    const startDateError = validators.required(formData.dates?.startDate, rules.startDate.message) ||
                          validators.date(formData.dates?.startDate, 'Invalid start date');
    if (startDateError) errors.startDate = startDateError;

    // End date validation
    const endDateError = validators.required(formData.dates?.endDate, rules.endDate.message) ||
                        validators.date(formData.dates?.endDate, 'Invalid end date');
    if (endDateError) errors.endDate = endDateError;

    // Date range validation
    if (!startDateError && !endDateError) {
      const rangeError = validators.dateRange(formData.dates?.startDate, formData.dates?.endDate);
      if (rangeError) errors.dateRange = rangeError;
    }

    // Timezone validation
    const timezoneError = validators.required(formData.dates?.timezone, rules.timezone.message);
    if (timezoneError) errors.timezone = timezoneError;

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Step 4: Pricing Setup
  validatePricing: (formData) => {
    const errors = {};
    const rules = validationRules.pricing;

    // Capacity validation
    if (formData.capacity !== null && formData.capacity !== undefined) {
      const capacityError = validators.range(formData.capacity, rules.capacity.min, rules.capacity.max, rules.capacity.message);
      if (capacityError) errors.capacity = capacityError;
    }

    // Price validation (only for paid events)
    if (formData.pricing && !formData.pricing.isFree) {
      const priceError = validators.range(formData.pricing.price, rules.price.min, rules.price.max, rules.price.message);
      if (priceError) errors.price = priceError;
    }

    // Currency validation
    const currencyError = validators.required(formData.pricing?.currency, rules.currency.message);
    if (currencyError) errors.currency = currencyError;

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Step 5: Ticket Types
  validateTicketTypes: (formData) => {
    const errors = {};
    const rules = validationRules.ticketTypes;

    // Check if ticket types exist
    if (!formData.ticketTypes || formData.ticketTypes.length === 0) {
      return { isValid: true, errors: {} };
    }

    // Validate each ticket type
    formData.ticketTypes.forEach((ticket, index) => {
      // Name validation
      const nameError = validators.required(ticket.name, 'Ticket name is required') ||
                       validators.length(ticket.name, rules.name.minLength, rules.name.maxLength, rules.name.message);
      if (nameError) errors[`ticketTypes.${index}.name`] = nameError;

      // Price validation
      const priceError = validators.range(ticket.price, rules.price.min, rules.price.max, rules.price.message);
      if (priceError) errors[`ticketTypes.${index}.price`] = priceError;

      // Quantity validation
      const quantityError = validators.range(ticket.quantity, rules.quantity.min, rules.quantity.max, rules.quantity.message);
      if (quantityError) errors[`ticketTypes.${index}.quantity`] = quantityError;

      // Description validation (optional)
      if (ticket.description) {
        const descError = validators.length(ticket.description, 0, rules.description.maxLength, rules.description.message);
        if (descError) errors[`ticketTypes.${index}.description`] = descError;
      }

      // Sales window validation
      if (ticket.salesStart && ticket.salesEnd) {
        const salesError = validators.dateRange(ticket.salesStart, ticket.salesEnd, 'Sales end date must be after sales start date');
        if (salesError) errors[`ticketTypes.${index}.salesWindow`] = salesError;
      }
    });

    // Check total quantity against capacity
    if (formData.capacity && formData.ticketTypes.length > 0) {
      const totalQuantity = formData.ticketTypes.reduce((sum, ticket) => sum + (ticket.quantity || 0), 0);
      if (totalQuantity > formData.capacity) {
        errors.totalQuantity = 'Total ticket quantity exceeds event capacity';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Step 6: Recurrence Rules
  validateRecurrence: (formData) => {
    const errors = {};
    const rules = validationRules.recurrence;

    // Only validate if recurrence is enabled
    if (!formData.recurrence?.enabled) {
      return { isValid: true, errors: {} };
    }

    // Frequency validation
    const frequencyError = validators.enum(formData.recurrence?.frequency, rules.frequency.enum, rules.frequency.message);
    if (frequencyError) errors.frequency = frequencyError;

    // Interval validation
    const intervalError = validators.range(formData.recurrence?.interval, rules.interval.min, rules.interval.max, rules.interval.message);
    if (intervalError) errors.interval = intervalError;

    // Count validation (optional)
    if (formData.recurrence?.count !== null && formData.recurrence?.count !== undefined) {
      const countError = validators.range(formData.recurrence.count, rules.count.min, rules.count.max, rules.count.message);
      if (countError) errors.count = countError;
    }

    // Until date validation (optional)
    if (formData.recurrence?.until) {
      const untilError = validators.date(formData.recurrence.until, 'Invalid until date');
      if (untilError) errors.until = untilError;
    }

    // Validate that either count or until is specified
    if (!formData.recurrence?.count && !formData.recurrence?.until) {
      errors.limit = 'Please specify either a count or until date';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Step 7: Media & Assets
  validateMedia: (formData) => {
    const errors = {};
    const rules = validationRules.media;

    // Cover image URL validation (optional)
    if (formData.media?.coverImageUrl) {
      const urlError = validators.url(formData.media.coverImageUrl, rules.coverImageUrl.message);
      if (urlError) errors.coverImageUrl = urlError;
    }

    // Gallery URLs validation (optional)
    if (formData.media?.galleryUrls && formData.media.galleryUrls.length > 0) {
      formData.media.galleryUrls.forEach((url, index) => {
        const urlError = validators.url(url, 'Invalid image URL');
        if (urlError) errors[`galleryUrls.${index}`] = urlError;
      });
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

// Overall form validation
export const validateForm = (formData, currentStep = null) => {
  const allErrors = {};
  let allStepsValid = true;

  // Validate specific step or all steps
  const stepsToValidate = currentStep ? [currentStep] : [1, 2, 3, 4, 5, 6, 7];

  stepsToValidate.forEach(step => {
    let stepResult;
    
    switch (step) {
      case 1:
        stepResult = stepValidators.validateBasicInfo(formData);
        break;
      case 2:
        stepResult = stepValidators.validateLocation(formData);
        break;
      case 3:
        stepResult = stepValidators.validateSchedule(formData);
        break;
      case 4:
        stepResult = stepValidators.validatePricing(formData);
        break;
      case 5:
        stepResult = stepValidators.validateTicketTypes(formData);
        break;
      case 6:
        stepResult = stepValidators.validateRecurrence(formData);
        break;
      case 7:
        stepResult = stepValidators.validateMedia(formData);
        break;
      default:
        stepResult = { isValid: true, errors: {} };
    }

    if (!stepResult.isValid) {
      allStepsValid = false;
      Object.assign(allErrors, stepResult.errors);
    }
  });

  return {
    isValid: allStepsValid,
    errors: allErrors
  };
};

// Real-time field validation
export const validateField = (fieldName, value, formData, step = null) => {
  // Get the appropriate validator based on field name
  const fieldValidators = {
    title: () => validators.required(value, 'Title is required') || validators.length(value, 3, 255, 'Title must be between 3 and 255 characters'),
    description: () => validators.required(value, 'Description is required') || validators.length(value, 10, 5000, 'Description must be between 10 and 5000 characters'),
    shortDescription: () => value ? validators.length(value, 0, 300, 'Short description cannot exceed 300 characters') : null,
    category: () => validators.required(value, 'Please select a category'),
    venueName: () => validators.required(value, 'Venue name is required') || validators.length(value, 2, 100, 'Venue name must be between 2 and 100 characters'),
    city: () => validators.required(value, 'City is required') || validators.length(value, 2, 50, 'City must be between 2 and 50 characters'),
    country: () => validators.required(value, 'Country is required') || validators.length(value, 2, 50, 'Country must be between 2 and 50 characters'),
    startDate: () => validators.required(value, 'Start date is required') || validators.date(value, 'Invalid start date'),
    endDate: () => {
      const dateError = validators.required(value, 'End date is required') || validators.date(value, 'Invalid end date');
      if (dateError) return dateError;
      
      // Check date range if start date exists
      if (formData.dates?.startDate) {
        return validators.dateRange(formData.dates.startDate, value);
      }
      return null;
    },
    capacity: () => value !== null && value !== undefined ? validators.range(value, 1, 100000, 'Capacity must be between 1 and 100,000') : null,
    price: () => validators.range(value, 0, 10000, 'Price must be between 0 and 10,000')
  };

  const validator = fieldValidators[fieldName];
  return validator ? validator() : null;
};

export default {
  validationRules,
  validators,
  stepValidators,
  validateForm,
  validateField
};
