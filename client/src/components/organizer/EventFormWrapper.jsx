import React, { useEffect, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, Eye, AlertCircle } from 'lucide-react';
import { useSwipeNavigation, useTouchOptimization } from '../common/MobileEnhancements';
import { useFocusManagement, SkipToContent } from '../common/AccessibilityEnhancements';
import StepIndicator from '../common/StepIndicator';
import SaveIndicator from '../common/SaveIndicator';
import FormValidation from '../common/FormValidation';
import RecoveryModal from '../common/RecoveryModal';
import EnhancedButton from '../EnhancedButton';
import { 
  setCurrentStep, 
  nextStep, 
  previousStep, 
  setLastSaved,
  setSaving,
  setSaveError,
  clearError,
  updateFormData,
  loadExistingEvent,
  clearForm,
  setValidation,
  setVersion,
  setEventId,
  setLoading,
  setBlurField
} from '../../store/slices/eventFormSlice';
import { createEventDraft, updateEventDraft, getEventDetails } from '../../store/slices/organizerSlice';
import { validateForm } from '../../utils/eventValidation';
import { formUtils as eventFormUtils } from '../../utils/eventHelpers';
import organizerAPI, { formUtils } from '../../utils/organizerAPI';
import { useDebounce } from '../../utils/useDebounce';
import { formPersistence, autoSaveForm } from '../../utils/formPersistence';

const EventFormWrapper = ({ children, onSubmit }) => {
  // Mobile and accessibility enhancements
  const isTouchDevice = useTouchOptimization();
  useFocusManagement();
  
  // Recovery modal state
  const [recoveryModal, setRecoveryModal] = useState({
    isOpen: false,
    type: 'draft', // 'draft' or 'recovery'
    lastSavedTime: null,
    onRecover: null,
    onDiscard: null
  });
  
  // Swipe navigation for mobile
  const swipeHandlers = useSwipeNavigation(
    () => handleNextStep(), // Swipe left to go to next step
    () => handlePreviousStep(), // Swipe right to go to previous step
    { delta: 50 }
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [isPublishing, setIsPublishing] = useState(false);
  
  const { user } = useSelector(state => state.auth);
  const { 
    currentStep, 
    totalSteps, 
    formData, 
    isDirty, 
    validation, 
    autoSave, 
    eventId: formEventId,
    version,
    loading,
    error 
  } = useSelector(state => state.eventForm);
  const { currentEvent, events } = useSelector(state => state.organizer);
  
  // Show toast notifications for auto-save status
  useEffect(() => {
    if (autoSave.lastSaved && !autoSave.isSaving && !autoSave.saveError) {
      // Show a subtle success message for auto-save
      toast.success('Changes saved automatically', {
        duration: 2000,
        position: 'bottom-right',
        style: {
          background: '#10B981',
          color: 'white',
        }
      });
    }
  }, [autoSave.lastSaved, autoSave.isSaving, autoSave.saveError]);

  // Show error notifications for save failures
  useEffect(() => {
    if (autoSave.saveError) {
      toast.error(`Auto-save failed: ${autoSave.saveError}`, {
        duration: 5000,
        position: 'bottom-right',
        style: {
          background: '#EF4444',
          color: 'white',
        }
      });
    }
  }, [autoSave.saveError]);
  
  // Enhanced data recovery system
  useEffect(() => {
    // Save current form data to localStorage on every change
    if (formData && Object.keys(formData).length > 0) {
      const recoveryData = {
        formData,
        eventId: formEventId,
        currentStep,
        timestamp: Date.now(),
        version: version || 0
      };
      
      try {
        localStorage.setItem('eventForm_recovery', JSON.stringify(recoveryData));
        // console.log('💾 [RECOVERY] Form data saved to localStorage');
      } catch (error) {
        console.warn('⚠️ [RECOVERY] Failed to save to localStorage:', error);
      }
    }
  }, [formData, formEventId, currentStep, version]);

  // Check for recovery data on component mount (only for drafts/new events or when switching events)
  useEffect(() => {
    // Skip recovery check if we're editing an existing event - let it load normally from server
    if (eventId && eventId !== 'create') {
      // When editing an existing event, clear any stale recovery data for different events
      try {
        const recoveryData = localStorage.getItem('eventForm_recovery');
        if (recoveryData) {
          const parsed = JSON.parse(recoveryData);
          // Only clear recovery data if it's for a different event
          if (parsed.eventId && parsed.eventId !== eventId) {
            localStorage.removeItem('eventForm_recovery');
          }
        }
      } catch (error) {
        console.warn('⚠️ [RECOVERY] Failed to check recovery data:', error);
      }
      return;
    }

    // For new events or when switching events, check for recovery data
    try {
      const recoveryData = localStorage.getItem('eventForm_recovery');
      if (recoveryData) {
        const parsed = JSON.parse(recoveryData);
        const age = Date.now() - parsed.timestamp;
        
        // Only recover if data is less than 1 hour old
        if (age < 60 * 60 * 1000) {
          // Only show recovery modal if we have a real draft (with eventId) or meaningful data
          // For "Create Event", we need to have an actual saved draft, not just empty form data
          const hasRealDraft = parsed.eventId && parsed.eventId !== null;
          const hasSignificantData = parsed.formData && (
            parsed.formData.title || 
            parsed.formData.description || 
            parsed.formData.location?.venueName ||
            parsed.formData.dates?.startDate
          );
          
          // Only show recovery if we have either:
          // 1. A real draft (with eventId) that was saved
          // 2. Significant unsaved data that's worth recovering
          if (hasRealDraft || hasSignificantData) {
            
            // Show recovery modal
            setRecoveryModal({
              isOpen: true,
              type: hasRealDraft ? 'draft' : 'recovery',
              lastSavedTime: parsed.timestamp,
              onRecover: () => {
                // Load recovery data into form
                // If we have eventId, load the draft from server
          if (parsed.eventId && parsed.eventId !== null) {
            // Navigate to the draft event to load it properly
            navigate(`/organizer/events/${parsed.eventId}/edit`);
                } else {
                  // Just load form data for unsaved draft
                  dispatch(loadExistingEvent(parsed.formData));
                  dispatch(setCurrentStep(parsed.currentStep || 1));
                }
                toast.success('Form data recovered successfully');
                setRecoveryModal(prev => ({ ...prev, isOpen: false }));
              },
              onDiscard: () => {
                // Clear recovery data and start fresh
                localStorage.removeItem('eventForm_recovery');
                dispatch(clearForm());
                dispatch(setCurrentStep(1));
                setRecoveryModal(prev => ({ ...prev, isOpen: false }));
              }
            });
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ [RECOVERY] Failed to check recovery data:', error);
    }
  }, [eventId, formEventId, formData, dispatch, navigate]);
  
  const { loading: organizerLoading } = useSelector(state => state.organizer);

  // Manual save function (for save button only)
  const saveDraft = useCallback(async (data, isManual = false) => {
    // Only allow manual saves now
    if (!isManual) {
      return;
    }
    
    // Prevent saving if already saving
    if (autoSave.isSaving || !data) {
      return;
    }
    
    // Basic validation - only save if we have some meaningful data
    const hasBasicData = data.title || data.description || data.dates?.startDate;
    if (!hasBasicData) {
      toast.error('Please add at least a title, description, or start date before saving');
      return;
    }
    
    try {
      console.log('🔄 [SAVE DRAFT] Starting save process...', {
        eventId: formEventId,
        data,
        timestamp: new Date().toISOString()
      });

      dispatch(setSaving(true));
      dispatch(setSaveError(null));
      
      // Use route eventId if we're editing an existing event (prevents creating new draft)
      const effectiveEventId = (eventId && eventId !== 'create') ? eventId : formEventId;
      
      // Transform form data to API format
      const apiData = formUtils.transformFormDataToAPI(data);
      
      // Always save to localStorage with effective event ID for consistency
      if (effectiveEventId) {
        formPersistence.saveFormData(data, effectiveEventId);
      }
      
      let result;
      if (effectiveEventId) {
        // Update existing event (draft or published)
        result = await dispatch(updateEventDraft({ 
          eventId: effectiveEventId, 
          eventData: apiData, 
          version 
        })).unwrap();
        // Sync form version from server
        if (result?.data?.version !== undefined) {
          dispatch(setVersion(result.data.version));
        }
        // Ensure eventId is set in state
        if (effectiveEventId !== formEventId) {
          dispatch(setEventId(effectiveEventId));
        }
        // Return the existing ID for callers
        dispatch(setLastSaved(new Date().toISOString()));
        dispatch(setSaving(false));
        dispatch(setSaveError(null));
        if (isManual) {
          // Check if this is a published event for a more informative message
          // Check multiple sources: currentEvent, events list, formData
          const eventFromList = events?.find(e => e._id === effectiveEventId);
          const eventStatus = currentEvent?.status || eventFromList?.status || data?.status || 'draft';
          const isPublished = eventStatus === 'published';
          
          if (isPublished) {
            toast.success(
              <div className="space-y-1">
                <div className="font-semibold">✅ Event Updated Successfully!</div>
                <div className="text-sm opacity-90">Your changes have been saved.</div>
              </div>,
              {
                duration: 4000,
                position: 'top-center',
                style: {
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  color: '#166534',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }
              }
            );
          } else {
            toast.success('Changes saved successfully', {
              duration: 3000,
              position: 'top-center'
            });
          }
        }
        return { id: effectiveEventId };
      } else {
        // Create new draft (only for new events)
        result = await dispatch(createEventDraft(apiData)).unwrap();
        if (result.data?.id) {
          // Persist eventId in the correct place in state
          dispatch(setEventId(result.data.id));
          // Update localStorage with the new event ID
          formPersistence.saveFormData(data, result.data.id);
        }
        // Sync version from server for new draft
        if (result?.data?.version !== undefined) {
          dispatch(setVersion(result.data.version));
        }
        // Update last saved timestamp
        dispatch(setLastSaved(new Date().toISOString()));
        dispatch(setSaving(false));
        dispatch(setSaveError(null));
        if (isManual) toast.success('Draft saved successfully');
        return { id: result.data?.id };
      }

    } catch (error) {
      
      // Extract meaningful error message
      let errorMessage = 'Failed to save draft';
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      dispatch(setSaveError(errorMessage));
      dispatch(setSaving(false));
      
      // Show error message for manual saves
      toast.error(errorMessage);
    }
  }, [eventId, formEventId, autoSave.isSaving, version, dispatch, currentEvent, events]);

  // Note: Auto-save is now handled by individual form fields using optimized persistence

  // Ensure user is authenticated using Redux state
  useEffect(() => {
    if (!user) {
      toast.error('Please log in to access organizer features');
      navigate('/');
    }
  }, [user, navigate]);

  // Load existing event if editing
  useEffect(() => {
    if (eventId && eventId !== 'create') {
      const loadEvent = async () => {
        try {
          // Set event ID immediately to prevent creating new draft during auto-save
          dispatch(setEventId(eventId));
          
          dispatch(setLoading({ key: 'loading', loading: true }));
          const eventData = await dispatch(getEventDetails(eventId)).unwrap();
          
          // Create a deep copy to avoid modifying a frozen/sealed object
          // Use structuredClone if available, otherwise fall back to JSON parse/stringify
          let eventDataCopy;
          try {
            if (typeof structuredClone !== 'undefined') {
              eventDataCopy = structuredClone(eventData);
            } else {
              eventDataCopy = JSON.parse(JSON.stringify(eventData));
            }
          } catch (e) {
            // If structuredClone fails or is not available, use Object.assign with spread
            eventDataCopy = Object.assign({}, eventData);
            // Deep copy nested objects
            if (eventDataCopy.location) eventDataCopy.location = { ...eventDataCopy.location };
            if (eventDataCopy.dates) eventDataCopy.dates = { ...eventDataCopy.dates };
            if (eventDataCopy.pricing) eventDataCopy.pricing = { ...eventDataCopy.pricing };
            if (eventDataCopy.media) eventDataCopy.media = { ...eventDataCopy.media };
          }
          
          // Ensure _id is set correctly (in case API returns id instead of _id)
          const eventIdValue = eventData._id || eventData.id || eventId;
          eventDataCopy._id = eventIdValue;
          
          // Transform API data to form format
          const formData = formUtils.transformAPIToFormData(eventDataCopy);
          
          // Combine into a new object
          const combinedData = { 
            ...eventDataCopy, 
            ...formData, 
            _id: eventIdValue 
          };
          
          dispatch(loadExistingEvent(combinedData));
          
          dispatch(setLoading({ key: 'loading', loading: false }));
        } catch (error) {
          toast.error('Failed to load event details');
          navigate('/organizer');
          dispatch(setLoading({ key: 'loading', loading: false }));
        }
      };
      
      loadEvent();
    }
    // For new events (eventId === 'create' or no eventId), let the recovery modal handle clearing if needed
    // Don't auto-clear here as it conflicts with recovery check
  }, [eventId, dispatch, navigate]);


  // Prevent concurrent saves
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Periodic auto-save (every 30 seconds)
  useEffect(() => {
    // Use route eventId if we're editing an existing event (prevents creating new draft)
    const effectiveEventId = (eventId && eventId !== 'create') ? eventId : formEventId;
    
    if (!effectiveEventId || !formData || isPublishing) return;
    
    const hasBasicData = formData.title || formData.description || formData.dates?.startDate;
    if (!hasBasicData) return;
    
    const interval = setInterval(async () => {
      try {
        if (isAutoSaving) {
          return;
        }
        setIsAutoSaving(true);
        
        // Transform form data to API format
        const apiData = formUtils.transformFormDataToAPI(formData);
        
        // Update the event with current data
        const res = await dispatch(updateEventDraft({ 
          eventId: effectiveEventId, 
          eventData: apiData, 
          version 
        })).unwrap().catch(async (err) => {
          // If 409, try once without version to let server resolve latest
          if (typeof err === 'string' && err.toLowerCase().includes('conflict')) {
            return await dispatch(updateEventDraft({ eventId: effectiveEventId, eventData: apiData })).unwrap();
          }
          throw err;
        });
        if (res?.data?.version !== undefined) {
          dispatch(setVersion(res.data.version));
        }
        
        // Update last saved timestamp
        dispatch(setLastSaved(new Date().toISOString()));
        
      } catch (error) {
        // Silent fail for periodic auto-save
      } finally {
        setIsAutoSaving(false);
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [eventId, formEventId, formData, version, dispatch, isPublishing, isAutoSaving]);

  // Auto-save on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = async (event) => {
      if (!formEventId || !formData) return;
      
      const hasBasicData = formData.title || formData.description || formData.dates?.startDate;
      if (!hasBasicData) return;
      
      try {
        console.log('🚪 [BEFORE UNLOAD] Saving before page unload');
        
        // Transform form data to API format
        const apiData = formUtils.transformFormDataToAPI(formData);
        
        // Use sendBeacon for reliable saving on page unload
        const blob = new Blob([JSON.stringify(apiData)], { type: 'application/json' });
        navigator.sendBeacon(`/api/organizer/events/${formEventId}`, blob);
        
        console.log('✅ [BEFORE UNLOAD] Successfully saved');
        
      } catch (error) {
        console.warn('⚠️ [BEFORE UNLOAD] Failed to save:', error);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formEventId, formData]);
  useEffect(() => {
    return () => {
      // Clear any pending auto-saves
      autoSaveForm.clearPending();
      
      // Note: We don't clear localStorage here as the user might want to recover
      // the draft later. It will expire after 24 hours automatically.
    };
  }, []);

  // Auto-save on field blur (enhanced with server-side draft creation)
  const { blurField } = useSelector(state => state.eventForm);
  
  useEffect(() => {
    if (blurField) {
      // Check if we need to create a server-side draft for better persistence
      const hasSignificantData = formData.title?.trim() || 
                                formData.description?.trim() || 
                                formData.location?.venueName?.trim() || 
                                formData.dates?.startDate;
      
      if (hasSignificantData && !formEventId) {
        // Create a session-based draft identifier
        const sessionDraftKey = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Save to localStorage with session identifier
        autoSaveForm.save(formData, sessionDraftKey);
        
        // Also attempt to create server-side draft for significant data
        saveDraftToServer(formData, false); // false = auto-save (not manual)
      } else {
        // Regular auto-save for existing drafts or complete forms
        autoSaveForm.save(formData, formEventId);
      }
      
      // Clear the blur field flag
      dispatch(setBlurField(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blurField, formData, formEventId, dispatch]);

  // Enhanced auto-save function that handles server-side draft creation
  const saveDraftToServer = useCallback(async (data, isManual = false) => {
    // Basic validation - only save meaningful data to server
    const hasSignificantData = data.title?.trim() || 
                               data.description?.trim() || 
                               data.location?.venueName?.trim() || 
                               data.dates?.startDate;
    
    if (!hasSignificantData) {
      return; // Not enough data to warrant a server-side draft
    }
    
    // Prevent duplicate saves
    if (autoSave.isSaving) {
      return;
    }
    
    try {
      dispatch(setSaving(true));
      
      // Transform form data to API format
      const apiData = formUtils.transformFormDataToAPI(data);
      
      if (formEventId && formEventId !== 'create') {
        // Update existing draft
        const res = await dispatch(updateEventDraft({ 
          eventId: formEventId, 
          eventData: apiData, 
          version 
        })).unwrap();
        if (res?.data?.version !== undefined) {
          dispatch(setVersion(res.data.version));
        }
      } else {
        // Create new draft for substantial data
        const result = await dispatch(createEventDraft(apiData)).unwrap();
        if (result.data?.id) {
          dispatch(setEventId(result.data.id));
          // Update localStorage with the new event ID
          formPersistence.saveFormData(data, result.data.id);
        }
        if (result?.data?.version !== undefined) {
          dispatch(setVersion(result.data.version));
        }
      }
      
      dispatch(setLastSaved(new Date().toISOString()));
      dispatch(setSaving(false));
      
      // Only show toast for manual saves
      if (isManual) {
        toast.success('Draft saved successfully');
      }
      
    } catch (error) {
      dispatch(setSaving(false));
      
      // Don't show error toast for auto-saves to avoid spamming user
      if (isManual) {
        toast.error('Failed to save draft');
      }
    }
  }, [eventId, formEventId, version, formData, dispatch, autoSave.isSaving]);

  // Auto-save function that triggers on step navigation
  const autoSaveOnStepChange = useCallback(async (newStep, previousStep) => {
    // Use route eventId if we're editing an existing event (prevents creating new draft)
    const effectiveEventId = (eventId && eventId !== 'create') ? eventId : formEventId;
    
    // Only auto-save if we have meaningful data and an event ID
    if (!effectiveEventId || !formData) return;
    
    const hasBasicData = formData.title || formData.description || formData.dates?.startDate;
    if (!hasBasicData) return;
    
    try {
      // Transform form data to API format
      const apiData = formUtils.transformFormDataToAPI(formData);
      
      // Update the event with current data, handle 409 with a retry (no version)
      let res = await dispatch(updateEventDraft({ 
        eventId: effectiveEventId, 
        eventData: apiData, 
        version 
      })).unwrap().catch(async (err) => {
        if (typeof err === 'string' && err.toLowerCase().includes('conflict')) {
          // Retry without version to get latest version from server
          return await dispatch(updateEventDraft({ eventId: effectiveEventId, eventData: apiData })).unwrap();
        }
        throw err;
      });
      if (res?.data?.version !== undefined) {
        dispatch(setVersion(res.data.version));
      }
      
      // Update last saved timestamp
      dispatch(setLastSaved(new Date().toISOString()));
      
    } catch (error) {
      // Don't show error to user for auto-save failures
    }
  }, [eventId, formEventId, formData, version, dispatch, currentEvent]);

  // Enhanced step navigation with auto-save
  const handleNextStep = async () => {
    // Basic validation for step 1
    if (currentStep === 1) {
      const hasBasicInfo = formData.title && formData.title.trim().length > 0;
      if (!hasBasicInfo) {
        toast.error('Please add an event title before continuing');
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      // Auto-save before moving to next step
      autoSaveOnStepChange(currentStep + 1, currentStep);
      
      dispatch(nextStep());
    } else {
      // We're at the last step (Preview), validate and call the parent submit handler
      if (isPublishing) {
        return;
      }
      
      // Final validation before submission
      const finalValidation = validateForm(formData);
      
      if (!finalValidation.isValid) {
        console.log('❌ [FINAL STEP] Validation failed:', finalValidation.errors);
        
        // Determine the first step that has blocking errors and navigate there
        const errors = finalValidation.errors || {};
        const errorFields = Object.keys(errors);

        const stepPriority = [
          { step: 1, fields: ['title', 'description'] },
          { step: 2, fields: ['venueName', 'city', 'country', 'address', 'state', 'postalCode'] },
          { step: 3, fields: ['startDate', 'endDate', 'timezone', 'dateRange'] },
          { step: 4, fields: ['capacity', 'price', 'currency'] },
          { step: 5, fields: ['ticketTypes', 'totalQuantity'] },
          { step: 6, fields: ['coverImageUrl', 'galleryUrls.0'] }
        ];

        let targetStep = null;
        for (const group of stepPriority) {
          if (errorFields.some(f => group.fields.some(gf => f.startsWith(gf)))) {
            targetStep = group.step;
            break;
          }
        }

        if (targetStep) {
          dispatch(setCurrentStep(targetStep));
        }

        // Build a concise message for the first problematic step
        let message = 'Please fix all errors before publishing';
        if (targetStep === 1) {
          message = 'Complete Basic Info: Title and Description required';
        } else if (targetStep === 2) {
          message = 'Complete Location: Venue name, City, Country';
        } else if (targetStep === 3) {
          message = 'Complete Schedule: Start date and End date';
        } else if (targetStep === 4) {
          message = 'Review Pricing & Tickets: capacity/price/currency';
        } else if (targetStep === 5) {
          message = 'Fix Ticket Types: names, prices, quantities';
        } else if (targetStep === 6) {
          message = 'Fix Media URLs if invalid';
        }

        toast.error(message);
        return;
      }
      
      try {
        setIsPublishing(true);
        if (onSubmit) {
          await onSubmit(formData);
        }
      } finally {
        setIsPublishing(false);
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      // Auto-save before moving to previous step
      autoSaveOnStepChange(currentStep - 1, currentStep);
      
      dispatch(previousStep());
    }
  };

  const handleStepClick = (step) => {
    // Only allow navigation to completed steps or current step
    if (step <= currentStep) {
      // Auto-save before changing steps
      autoSaveOnStepChange(step, currentStep);
      
      dispatch(setCurrentStep(step));
    }
  };

  const handleSaveDraft = async () => {
    try {
      // Check if we have meaningful data to save
      const hasBasicData = formData.title || formData.description || formData.dates?.startDate;
      if (!hasBasicData) {
        toast.error('Please add at least a title, description, or start date before saving');
        return;
      }
      
      const result = await saveDraft(formData, true); // Manual save
      
      // Navigate to edit page if this was a new event
      if (!formEventId && (result?.id)) {
        navigate(`/organizer/events/${result.id}/edit`);
      }
      
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save draft');
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      // Show recovery modal for unsaved changes
      setRecoveryModal({
        isOpen: true,
        type: 'recovery',
        lastSavedTime: autoSave.lastSaved,
        onRecover: () => {
          // Stay on the form
          setRecoveryModal(prev => ({ ...prev, isOpen: false }));
        },
        onDiscard: () => {
          // Navigate away
          navigate('/organizer');
          setRecoveryModal(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }
    
    navigate('/organizer');
  };


  // Loading state
  if (loading.loading) {
    return (
      <div className="container-modern">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading event details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-modern" {...swipeHandlers}>
      <SkipToContent />
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </button>
            
            <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {eventId && eventId !== 'create' ? 'Edit Event' : 'Create New Event'}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <SaveIndicator
                isDirty={isDirty}
                isSaving={autoSave.isSaving}
                lastSaved={autoSave.lastSaved}
                saveError={autoSave.saveError}
                autoSaveEnabled={true}
              />
            </div>
            
                      <EnhancedButton
                        variant="secondary"
                        onClick={handleSaveDraft}
                        disabled={autoSave.isSaving || organizerLoading.actions || loading.saving}
                        icon={Save}
                        loading={autoSave.isSaving || organizerLoading.actions || loading.saving}
                        className={`text-sm sm:text-base ${isTouchDevice ? 'min-h-[44px] min-w-[44px]' : ''}`}
                        aria-label="Save draft"
                      >
                        {autoSave.isSaving || organizerLoading.actions || loading.saving ? 'Saving...' : 'Save Draft'}
                      </EnhancedButton>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator
          currentStep={currentStep}
          totalSteps={totalSteps}
          onStepClick={handleStepClick}
          className="mb-6"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
              <button
                onClick={() => dispatch(clearError())}
                className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Validation Errors */}
      {!validation.isValid && Object.keys(validation.errors).length > 0 && (
        <div className="mb-6">
          <FormValidation
            errors={validation.errors}
            stepErrors={validation.stepErrors}
            currentStep={currentStep}
          />
        </div>
      )}

      {/* Form Content */}
      <div className="bg-web3-card rounded-xl p-6 mb-6">
        {children}
      </div>

                {/* Navigation Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <EnhancedButton
                    variant="secondary"
                    onClick={handlePreviousStep}
                    disabled={currentStep === 1}
                    icon={ArrowLeft}
                    className={`w-full sm:w-auto ${isTouchDevice ? 'min-h-[44px]' : ''}`}
                    aria-label="Go to previous step"
                  >
                    Previous
                  </EnhancedButton>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <EnhancedButton
                      variant="primary"
                      onClick={handleNextStep}
                      disabled={isPublishing}
                      loading={isPublishing}
                      className={`w-full sm:w-auto ${isTouchDevice ? 'min-h-[44px]' : ''}`}
                      aria-label={currentStep === totalSteps ? (currentEvent?.status === 'published' ? 'Update event' : 'Publish event') : 'Go to next step'}
                    >
                      {currentStep === totalSteps 
                        ? (isPublishing 
                          ? (currentEvent?.status === 'published' ? 'Updating…' : 'Publishing…')
                          : (currentEvent?.status === 'published' ? 'Update Event' : 'Publish Event'))
                        : 'Next Step'}
                    </EnhancedButton>
                  </div>
                </div>

      {/* Progress Info */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="hidden sm:inline">Step {currentStep} of {totalSteps} • </span>
          <span className="sm:ml-1">
            {Math.round(((currentStep - 1) / (totalSteps - 1)) * 100)}% Complete
          </span>
        </p>
      </div>

      {/* Recovery Modal */}
      <RecoveryModal
        isOpen={recoveryModal.isOpen}
        onClose={() => setRecoveryModal(prev => ({ ...prev, isOpen: false }))}
        onRecover={recoveryModal.onRecover}
        onDiscard={recoveryModal.onDiscard}
        lastSavedTime={recoveryModal.lastSavedTime}
        type={recoveryModal.type}
      />
    </div>
  );
};

export default EventFormWrapper;
