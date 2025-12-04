import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Form structure
  currentStep: 1,
  totalSteps: 7,
  isDirty: false,
  
  // Auto-save on blur tracking
  blurField: null,
  
  // Form data
  formData: {
    // Step 1: Basic Information
    title: '',
    description: '',
    shortDescription: '',
    category: null,
    
    // Step 2: Location & Venue
    location: {
      venueName: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      coordinates: {
        latitude: null,
        longitude: null
      }
    },
    
    // Step 3: Schedule & Timing
    dates: {
      startDate: null,
      endDate: null,
      timezone: 'UTC'
    },
    
    // Step 4: Pricing & Tickets (unified)
    capacity: null,
    pricing: {
      isFree: true,
      price: 0,
      currency: 'KES'
    },
    ticketTypes: [],
    
    // Step 5: Recurrence Rules
    recurrence: {
      enabled: false,
      frequency: 'weekly',
      interval: 1,
      byWeekday: [],
      byMonthday: [],
      count: null,
      until: null
    },
    
    // Step 6: Media & Assets
    media: {
      coverImageUrl: '',
      galleryUrls: []
    },
    
    // Step 7: Preview & Publish
    flags: {
      isFeatured: false,
      isTrending: false
    },
    
    tags: [],
    metadata: {}
  },
  
  // Validation state
  validation: {
    isValid: false,
    errors: {},
    stepErrors: {}
  },
  
  // Auto-save state
  autoSave: {
    enabled: true,
    interval: 30000, // 30 seconds
    lastSaved: null,
    isSaving: false,
    saveError: null
  },
  
  // Version control for optimistic updates
  version: 0,
  
  // Event ID (null for new events)
  eventId: null,
  
  // Loading states
  loading: {
    saving: false,
    validating: false,
    loading: false
  },
  
  // Error state
  error: null
};

const eventFormSlice = createSlice({
  name: 'eventForm',
  initialState,
  reducers: {
    // Blur tracking for auto-save-on-blur
    setBlurField: (state, action) => {
      state.blurField = action.payload;
    },
    // Navigation
    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
      
      // Always save current step to metadata for persistence
      state.formData.metadata = {
        ...state.formData.metadata,
        currentStep: action.payload,
        lastStepChange: Date.now()
      };
    },
    
    nextStep: (state) => {
      if (state.currentStep < state.totalSteps) {
        state.currentStep += 1;
        
        // Always save current step to metadata for persistence
        state.formData.metadata = {
          ...state.formData.metadata,
          currentStep: state.currentStep,
          lastStepChange: Date.now()
        };
      }
    },
    
    previousStep: (state) => {
      if (state.currentStep > 1) {
        state.currentStep -= 1;
        
        // Always save current step to metadata for persistence
        state.formData.metadata = {
          ...state.formData.metadata,
          currentStep: state.currentStep,
          lastStepChange: Date.now()
        };
      }
    },
    
    goToStep: (state, action) => {
      const step = action.payload;
      // Clamp step between 1 and totalSteps
      const clampedStep = Math.max(1, Math.min(step, state.totalSteps));
      state.currentStep = clampedStep;
      
      // Always save current step to metadata for persistence
      state.formData.metadata = {
        ...state.formData.metadata,
        currentStep: clampedStep,
        lastStepChange: Date.now()
      };
    },
    
    // Form data management
    updateFormData: (state, action) => {
      // Support both single field update and batch update
      const payload = action.payload;
      
      if (payload && typeof payload === 'object') {
        // Check if it's a single field update (has 'field' and 'value')
        if ('field' in payload && 'value' in payload) {
          const { field, value, step } = payload;
          state.formData[field] = value;
          
          // Mark step as modified for validation
          if (step) {
            state.validation.stepErrors[step] = null;
          }
        } else {
          // Batch update: merge all top-level fields
          Object.keys(payload).forEach(key => {
            if (key !== 'step') {
              state.formData[key] = payload[key];
            }
          });
        }
        
        state.isDirty = true;
      }
    },
    
    updateNestedFormData: (state, action) => {
      const { path, value } = action.payload;
      const keys = path.split('.');
      let current = state.formData;
      
      // Navigate to the nested property
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      // Set the final value
      current[keys[keys.length - 1]] = value;
      state.isDirty = true;
    },
    
    addTicketType: (state) => {
      const newTicketType = {
        name: '',
        price: 0,
        quantity: 1,
        description: '',
        currency: state.formData.pricing.currency,
        salesStart: null,
        salesEnd: null,
        minPerOrder: 1,
        maxPerOrder: null
      };
      state.formData.ticketTypes.push(newTicketType);
      state.isDirty = true;
    },
    
    updateTicketType: (state, action) => {
      const { index, updates } = action.payload;
      if (state.formData.ticketTypes[index]) {
        state.formData.ticketTypes[index] = {
          ...state.formData.ticketTypes[index],
          ...updates
        };
        state.isDirty = true;
      }
    },
    
    removeTicketType: (state, action) => {
      const index = action.payload;
      state.formData.ticketTypes.splice(index, 1);
      state.isDirty = true;
    },
    
    // Validation
    setValidation: (state, action) => {
      const { isValid, errors, stepErrors } = action.payload;
      state.validation.isValid = isValid;
      state.validation.errors = errors || {};
      state.validation.stepErrors = stepErrors || {};
    },
    
    setFormValidation: (state, action) => {
      const { isValid, errors } = action.payload;
      state.validation.isValid = isValid;
      state.validation.errors = errors || {};
    },
    
    setStepValidation: (state, action) => {
      const { step, isValid, errors } = action.payload;
      state.validation.stepErrors[step] = { isValid, errors: errors || {} };
      
      // Update overall validation
      const allStepsValid = Object.values(state.validation.stepErrors).every(
        stepValidation => stepValidation && stepValidation.isValid
      );
      state.validation.isValid = allStepsValid && Object.keys(state.validation.errors).length === 0;
    },
    
    clearValidation: (state) => {
      state.validation = {
        isValid: false,
        errors: {},
        stepErrors: {}
      };
    },
    
    // Dirty state management
    setDirty: (state, action) => {
      state.isDirty = action.payload;
    },
    
    // Auto-save management
    setAutoSaveEnabled: (state, action) => {
      state.autoSave.enabled = action.payload;
    },
    
    setAutoSaveInterval: (state, action) => {
      state.autoSave.interval = action.payload;
    },
    
    setLastSaved: (state, action) => {
      state.autoSave.lastSaved = action.payload;
      state.isDirty = false;
    },
    
    setSaving: (state, action) => {
      state.autoSave.isSaving = action.payload;
    },
    
    setSaveError: (state, action) => {
      state.autoSave.saveError = action.payload;
    },
    
    // Version control
    setVersion: (state, action) => {
      state.version = action.payload;
    },
    
    incrementVersion: (state) => {
      state.version += 1;
    },
    
    // Event management
    setEventId: (state, action) => {
      state.eventId = action.payload;
    },
    
    loadExistingEvent: (state, action) => {
      const event = action.payload;
      state.eventId = event._id;
      state.version = event.version || 0;
      
      // Load form data from existing event
      state.formData = {
        title: event.title || '',
        description: event.description || '',
        shortDescription: event.shortDescription || '',
        category: event.category || null,
        location: event.location || initialState.formData.location,
        dates: event.dates || initialState.formData.dates,
        capacity: event.capacity || null,
        pricing: event.pricing || initialState.formData.pricing,
        ticketTypes: event.ticketTypes || [],
        recurrence: event.recurrence || initialState.formData.recurrence,
        media: event.media || initialState.formData.media,
        flags: event.flags || initialState.formData.flags,
        tags: event.tags || [],
        metadata: event.metadata || {}
      };
      
      // Determine the last completed step based on event data
      let lastCompletedStep = 1;
      
      // Step 1: Basic Info (always available if event exists)
      if (event.title || event.description) {
        lastCompletedStep = 1;
      }
      
      // Step 2: Location & Venue
      if (event.location?.venueName || event.location?.city || event.location?.address) {
        lastCompletedStep = 2;
      }
      
      // Step 3: Schedule & Timing
      if (event.dates?.startDate && event.dates?.endDate) {
        lastCompletedStep = 3;
      }
      
      // Step 4: Pricing & Tickets (unified)
      if (event.capacity !== null || event.pricing || (event.ticketTypes && event.ticketTypes.length > 0)) {
        lastCompletedStep = 4;
      }
      
      // Step 5: Recurrence Rules
      if (event.recurrence && event.recurrence.enabled) {
        lastCompletedStep = 5;
      }
      
      // Step 6: Media & Assets
      if (event.media?.coverImageUrl || (event.media?.galleryUrls && event.media.galleryUrls.length > 0)) {
        lastCompletedStep = 6;
      }
      
      // Step 7: Preview (always the last step if we have basic data)
      if (event.title && event.description && event.dates?.startDate) {
        lastCompletedStep = 7;
      }
      
      // Set current step to the next incomplete step, or the last completed step if all are done
      state.currentStep = Math.min(lastCompletedStep + 1, 7);
      
      // If we have a stored currentStep in metadata, use that instead
      if (event.metadata?.currentStep) {
        state.currentStep = Math.min(event.metadata.currentStep, 7);
        // console.log('🔄 [LOAD EVENT] Restored step from metadata:', event.metadata.currentStep);
      }
      
      // console.log('🔄 [LOAD EVENT] Determined current step:', {
      //   lastCompletedStep,
      //   currentStep: state.currentStep,
      //   hasTitle: !!event.title,
      //   hasDescription: !!event.description,
      //   hasLocation: !!(event.location?.venueName || event.location?.city),
      //   hasDates: !!(event.dates?.startDate && event.dates?.endDate),
      //   hasCapacity: event.capacity !== null,
      //   hasPricing: !!event.pricing,
      //   hasTicketTypes: !!(event.ticketTypes && event.ticketTypes.length > 0),
      //   hasMedia: !!(event.media?.coverImageUrl || event.media?.galleryUrls?.length)
      // });
      
      state.isDirty = false;
    },
    
    // Reset form
    resetForm: (state) => {
      return {
        ...initialState,
        currentStep: 1
      };
    },
    
    clearForm: (state) => {
      state.formData = initialState.formData;
      state.validation = initialState.validation;
      state.isDirty = false;
      state.eventId = null;
      state.version = 0;
      state.currentStep = 1;
      state.error = null;
    },
    
    // Loading states
    setLoading: (state, action) => {
      const { key, loading } = action.payload;
      state.loading[key] = loading;
    },
    
    // Error handling
    setError: (state, action) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    }
  }
});

export const {
  setCurrentStep,
  nextStep,
  previousStep,
  goToStep,
  updateFormData,
  updateNestedFormData,
  addTicketType,
  updateTicketType,
  removeTicketType,
  setValidation,
  setFormValidation,
  setStepValidation,
  clearValidation,
  setDirty,
  setAutoSaveEnabled,
  setAutoSaveInterval,
  setLastSaved,
  setSaving,
  setSaveError,
  setVersion,
  incrementVersion,
  setEventId,
  loadExistingEvent,
  resetForm,
  clearForm,
  setLoading,
  setError,
  clearError,
  setBlurField
} = eventFormSlice.actions;

export default eventFormSlice.reducer;
