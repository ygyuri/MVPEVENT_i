// Optimized form persistence with Redux-first approach
import { formPersistence } from './formPersistence';

class OptimizedFormPersistence {
  constructor() {
    this.saveQueue = new Set();
    this.isProcessing = false;
    this.lastApiSave = 0;
    this.apiSaveCooldown = 5000; // 5 seconds minimum between API saves
    this.localStorageDebounce = 500; // 500ms debounce for localStorage
    this.localStorageTimer = null;
    this.apiSaveTimer = null;
  }

  // Immediate Redux update (fastest - no persistence)
  updateReduxField(dispatch, updateFormData, field, value, step = null) {
    dispatch(updateFormData({ field, value, step }));
  }

  // Fast localStorage save (debounced)
  saveToLocalStorage(formData, eventId = null) {
    // Clear existing timer
    if (this.localStorageTimer) {
      clearTimeout(this.localStorageTimer);
    }

    // Set new timer for debounced save
    this.localStorageTimer = setTimeout(() => {
      formPersistence.saveFormData(formData, eventId);
      this.localStorageTimer = null;
    }, this.localStorageDebounce);
  }

  // Smart API save (only when meaningful changes)
  async saveToAPI(formData, eventId, dispatch, apiActions, options = {}) {
    const now = Date.now();
    
    // Check cooldown
    if (now - this.lastApiSave < this.apiSaveCooldown && !options.force) {
      return { skipped: true, reason: 'cooldown' };
    }

    // Check if we have meaningful data
    const hasBasicData = formData.title || formData.description || formData.dates?.startDate;
    if (!hasBasicData && !options.force) {
      return { skipped: true, reason: 'no_meaningful_data' };
    }

    try {
      this.lastApiSave = now;
      
      if (eventId) {
        await dispatch(apiActions.updateEventDraft({ 
          eventId, 
          eventData: formData,
          version: options.version 
        })).unwrap();
      } else {
        const result = await dispatch(apiActions.createEventDraft(formData)).unwrap();
        return { created: true, eventId: result.data?.id };
      }
      
      return { success: true };
    } catch (error) {
      console.error('API save failed:', error);
      throw error;
    }
  }

  // Optimized field update - Redux first, then smart persistence
  async updateField(dispatch, updateFormData, field, value, step, formData, eventId, apiActions, options = {}) {
    // 1. Immediate Redux update (fastest)
    this.updateReduxField(dispatch, updateFormData, field, value, step);

    // 2. Fast localStorage save (debounced)
    this.saveToLocalStorage(formData, eventId);

    // 3. Smart API save (only when appropriate)
    if (options.immediateApiSave || this.shouldTriggerApiSave(field, value, formData)) {
      try {
        await this.saveToAPI(formData, eventId, dispatch, apiActions, options);
      } catch (error) {
        // Don't throw - localStorage already saved the data
        console.warn('API save failed, but localStorage saved:', error);
      }
    }
  }

  // Determine if API save should be triggered
  shouldTriggerApiSave(field, value, formData) {
    // Always save for these critical fields
    const criticalFields = ['title', 'description', 'dates.startDate', 'dates.endDate'];
    if (criticalFields.includes(field)) {
      return true;
    }

    // Save if we have a complete basic info set
    if (formData.title && formData.description && formData.dates?.startDate) {
      return true;
    }

    // Save for location completion
    if (field.startsWith('location.') && formData.location?.venueName && formData.location?.city) {
      return true;
    }

    // Save for pricing completion
    if (field.startsWith('pricing.') || field === 'capacity') {
      return true;
    }

    // Save for ticket types
    if (field.startsWith('ticketTypes.')) {
      return true;
    }

    // Save for media
    if (field.startsWith('media.')) {
      return true;
    }

    // Save for recurrence
    if (field.startsWith('recurrence.')) {
      return true;
    }

    // Save for tags
    if (field === 'tags') {
      return true;
    }

    return false;
  }

  // Batch save multiple fields
  async batchUpdate(dispatch, updates, formData, eventId, apiActions) {
    // 1. Update all fields in Redux immediately
    updates.forEach(({ field, value, step }) => {
      this.updateReduxField(dispatch, updateFormData, field, value, step);
    });

    // 2. Save to localStorage
    this.saveToLocalStorage(formData, eventId);

    // 3. Single API save for the batch
    try {
      await this.saveToAPI(formData, eventId, dispatch, apiActions, { force: true });
    } catch (error) {
      console.warn('Batch API save failed, but localStorage saved:', error);
    }
  }

  // Clear all pending operations
  clearPending() {
    if (this.localStorageTimer) {
      clearTimeout(this.localStorageTimer);
      this.localStorageTimer = null;
    }
    
    if (this.apiSaveTimer) {
      clearTimeout(this.apiSaveTimer);
      this.apiSaveTimer = null;
    }
    
    this.saveQueue.clear();
  }

  // Force immediate save (for manual save button)
  async forceSave(formData, eventId, dispatch, apiActions) {
    // Clear any pending operations
    this.clearPending();
    
    // Immediate localStorage save
    formPersistence.saveFormData(formData, eventId);
    
    // Immediate API save
    try {
      return await this.saveToAPI(formData, eventId, dispatch, apiActions, { force: true });
    } catch (error) {
      throw error; // Re-throw for manual saves so user gets feedback
    }
  }
}

// Create singleton instance
export const optimizedFormPersistence = new OptimizedFormPersistence();

// Hook for easy integration
export const useOptimizedFormPersistence = () => {
  return optimizedFormPersistence;
};

export default optimizedFormPersistence;
