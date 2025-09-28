// Form persistence utilities for better user experience
const FORM_STORAGE_KEY = 'eventForm_draft';

export const formPersistence = {
  // Save form data to localStorage
  saveFormData: (formData, eventId = null) => {
    try {
      const dataToSave = {
        formData,
        eventId,
        timestamp: Date.now(),
        version: 1
      };
      
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(dataToSave));
      return true;
    } catch (error) {
      console.warn('Failed to save form data to localStorage:', error);
      return false;
    }
  },

  // Load form data from localStorage
  loadFormData: () => {
    try {
      const savedData = localStorage.getItem(FORM_STORAGE_KEY);
      if (!savedData) return null;

      const parsedData = JSON.parse(savedData);
      
      // Check if data is not too old (24 hours)
      const isRecent = Date.now() - parsedData.timestamp < 24 * 60 * 60 * 1000;
      if (!isRecent) {
        formPersistence.clearFormData();
        return null;
      }

      return parsedData;
    } catch (error) {
      console.warn('Failed to load form data from localStorage:', error);
      formPersistence.clearFormData();
      return null;
    }
  },

  // Clear form data from localStorage
  clearFormData: () => {
    try {
      localStorage.removeItem(FORM_STORAGE_KEY);
      return true;
    } catch (error) {
      console.warn('Failed to clear form data from localStorage:', error);
      return false;
    }
  },

  // Check if there's saved data
  hasSavedData: () => {
    const savedData = formPersistence.loadFormData();
    return savedData !== null;
  },

  // Get saved data info
  getSavedDataInfo: () => {
    const savedData = formPersistence.loadFormData();
    if (!savedData) return null;

    return {
      hasData: true,
      timestamp: savedData.timestamp,
      eventId: savedData.eventId,
      age: Date.now() - savedData.timestamp,
      ageText: getAgeText(Date.now() - savedData.timestamp)
    };
  }
};

// Helper function to get human-readable age
function getAgeText(ageInMs) {
  const minutes = Math.floor(ageInMs / (1000 * 60));
  const hours = Math.floor(ageInMs / (1000 * 60 * 60));
  const days = Math.floor(ageInMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// Auto-save utility with debouncing
export const autoSaveForm = {
  debounceTimer: null,
  debounceDelay: 2000, // 2 seconds

  // Debounced save function
  save: (formData, eventId = null) => {
    // Clear existing timer
    if (autoSaveForm.debounceTimer) {
      clearTimeout(autoSaveForm.debounceTimer);
    }

    // Set new timer
    autoSaveForm.debounceTimer = setTimeout(() => {
      formPersistence.saveFormData(formData, eventId);
      autoSaveForm.debounceTimer = null;
    }, autoSaveForm.debounceDelay);
  },

  // Immediate save (for manual saves)
  saveImmediate: (formData, eventId = null) => {
    // Clear any pending debounced save
    if (autoSaveForm.debounceTimer) {
      clearTimeout(autoSaveForm.debounceTimer);
      autoSaveForm.debounceTimer = null;
    }

    return formPersistence.saveFormData(formData, eventId);
  },

  // Clear pending saves
  clearPending: () => {
    if (autoSaveForm.debounceTimer) {
      clearTimeout(autoSaveForm.debounceTimer);
      autoSaveForm.debounceTimer = null;
    }
  }
};

export default formPersistence;
