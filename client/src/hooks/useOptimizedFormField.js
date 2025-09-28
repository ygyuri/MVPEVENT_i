import { useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { updateFormData } from '../store/slices/eventFormSlice';
import { optimizedFormPersistence } from '../utils/optimizedFormPersistence';

// Hook for optimized form field updates
export const useOptimizedFormField = (formData, eventId, apiActions) => {
  const dispatch = useDispatch();
  const updateTimeoutRef = useRef(null);
  const lastValueRef = useRef({});

  // Optimized field update with smart persistence
  const updateField = useCallback(async (field, value, step = null, options = {}) => {
    // Skip if value hasn't actually changed
    const lastValue = lastValueRef.current[field];
    if (lastValue === value) {
      return;
    }
    lastValueRef.current[field] = value;

    // Immediate Redux update (instant UI feedback)
    dispatch(updateFormData({ field, value, step }));

    // Smart persistence (debounced and optimized)
    if (options.skipPersistence) {
      return;
    }

    // Clear any existing timeout for this field
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounced persistence update
    updateTimeoutRef.current = setTimeout(async () => {
      try {
        await optimizedFormPersistence.updateField(
          dispatch,
          updateFormData,
          field,
          value,
          step,
          { ...formData, [field]: value }, // Updated form data
          eventId,
          apiActions,
          options
        );
      } catch (error) {
        console.warn('Field update persistence failed:', error);
      }
    }, options.debounceMs || 300); // Default 300ms debounce

  }, [dispatch, formData, eventId, apiActions]);

  // Batch update multiple fields
  const batchUpdateFields = useCallback(async (updates, options = {}) => {
    // Clear any pending individual updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }

    // Update all fields immediately in Redux
    const updatedFormData = { ...formData };
    updates.forEach(({ field, value, step }) => {
      dispatch(updateFormData({ field, value, step }));
      updatedFormData[field] = value;
      lastValueRef.current[field] = value;
    });

    // Single batch persistence call
    if (!options.skipPersistence) {
      try {
        await optimizedFormPersistence.batchUpdate(
          dispatch,
          updates,
          updatedFormData,
          eventId,
          apiActions
        );
      } catch (error) {
        console.warn('Batch update persistence failed:', error);
      }
    }
  }, [dispatch, formData, eventId, apiActions]);

  // Force immediate save
  const forceSave = useCallback(async (currentFormData = formData) => {
    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }

    try {
      return await optimizedFormPersistence.forceSave(
        currentFormData,
        eventId,
        dispatch,
        apiActions
      );
    } catch (error) {
      console.error('Force save failed:', error);
      throw error;
    }
  }, [formData, eventId, dispatch, apiActions]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    optimizedFormPersistence.clearPending();
  }, []);

  return {
    updateField,
    batchUpdateFields,
    forceSave,
    cleanup
  };
};

// Hook for nested form fields (like location.address)
export const useOptimizedNestedFormField = (formData, eventId, apiActions) => {
  const dispatch = useDispatch();
  const updateTimeoutRef = useRef(null);
  const lastValueRef = useRef({});

  const updateNestedField = useCallback(async (path, value, step = null, options = {}) => {
    // Skip if value hasn't actually changed
    const lastValue = lastValueRef.current[path];
    if (lastValue === value) {
      return;
    }
    lastValueRef.current[path] = value;

    // Immediate Redux update (instant UI feedback)
    dispatch(updateFormData({ field: path, value, step }));

    // Smart persistence (debounced and optimized)
    if (options.skipPersistence) {
      return;
    }

    // Clear any existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounced persistence update
    updateTimeoutRef.current = setTimeout(async () => {
      try {
        // Create updated form data with nested field
        const updatedFormData = { ...formData };
        const keys = path.split('.');
        let current = updatedFormData;
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;

        await optimizedFormPersistence.updateField(
          dispatch,
          updateFormData,
          path,
          value,
          step,
          updatedFormData,
          eventId,
          apiActions,
          options
        );
      } catch (error) {
        console.warn('Nested field update persistence failed:', error);
      }
    }, options.debounceMs || 300);

  }, [dispatch, formData, eventId, apiActions]);

  const cleanup = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    optimizedFormPersistence.clearPending();
  }, []);

  return {
    updateNestedField,
    cleanup
  };
};

export default useOptimizedFormField;
