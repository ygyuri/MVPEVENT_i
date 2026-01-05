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
    this.creatingDraftPromise = null; // lock to ensure only one draft creation
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
  // DISABLED: API saves are now only allowed for manual saves or beforeunload
  async saveToAPI(formData, eventId, dispatch, apiActions, options = {}) {
    // Only allow API saves if explicitly forced (manual save or beforeunload)
    if (!options.force && !options.isManual) {
      console.log('⏸️ [OPTIMIZED PERSISTENCE] Skipping API save - only allowed for manual saves or beforeunload');
      return { skipped: true, reason: 'auto_save_disabled' };
    }
    
    const now = Date.now();
    
    // Check cooldown (only for non-forced saves)
    if (!options.force && now - this.lastApiSave < this.apiSaveCooldown) {
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
        // Ensure only one create draft runs at a time
        if (this.creatingDraftPromise) {
          const existing = await this.creatingDraftPromise;
          return { created: true, eventId: existing?.data?.id };
        }
        this.creatingDraftPromise = dispatch(apiActions.createEventDraft(formData)).unwrap()
          .finally(() => {
            // Release lock shortly after to allow subsequent updates
            setTimeout(() => { this.creatingDraftPromise = null; }, 0);
          });
        const result = await this.creatingDraftPromise;
        return { created: true, eventId: result.data?.id };
      }
      
      return { success: true };
    } catch (error) {
      console.error('API save failed:', error);
      throw error;
    }
  }

  // Optimized field update - Redux first, then smart persistence
  // DISABLED: API saves are now only allowed for manual saves or beforeunload
  async updateField(dispatch, updateFormData, field, value, step, formData, eventId, apiActions, options = {}) {
    // 1. Immediate Redux update (fastest)
    this.updateReduxField(dispatch, updateFormData, field, value, step);

    // 2. Fast localStorage save (debounced) - this is safe and doesn't create drafts
    this.saveToLocalStorage(formData, eventId);

    // 3. API save - ONLY if explicitly forced (manual save or beforeunload)
    // NEVER create drafts while typing
    if (options.force || options.isManual) {
      try {
        return await this.saveToAPI(formData, eventId, dispatch, apiActions, options);
      } catch (error) {
        // Don't throw - localStorage already saved the data
        console.warn('API save failed, but localStorage saved:', error);
      }
    }
    
    // Always skip API save for regular field updates
    return { skipped: true, reason: 'auto_save_disabled' };
  }

  // Determine if API save should be triggered
  // DISABLED: API saves are now only allowed for manual saves or beforeunload
  // This prevents creating drafts while typing
  shouldTriggerApiSave(field, value, formData) {
    // NEVER trigger API save automatically - only for manual saves or beforeunload
    // Drafts should only be created when:
    // 1. User clicks "Save Draft" button
    // 2. User leaves the page (beforeunload event)
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
