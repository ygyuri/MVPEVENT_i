import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, Eye, AlertCircle } from 'lucide-react';
import { useSwipeNavigation, useTouchOptimization } from '../common/MobileEnhancements';
import { useFocusManagement, SkipToContent } from '../common/AccessibilityEnhancements';
import StepIndicator from '../common/StepIndicator';
import SaveIndicator from '../common/SaveIndicator';
import FormValidation from '../common/FormValidation';
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
  setEventId,
  setLoading
} from '../../store/slices/eventFormSlice';
import { createEventDraft, updateEventDraft, getEventDetails } from '../../store/slices/organizerSlice';
import { validateForm } from '../../utils/eventValidation';
import { formUtils as eventFormUtils } from '../../utils/eventHelpers';
import organizerAPI, { formUtils } from '../../utils/organizerAPI';
import { useDebounce } from '../../utils/useDebounce';
import { formPersistence, autoSaveForm } from '../../utils/formPersistence';
import testAuth from '../../utils/testAuth';

const EventFormWrapper = ({ children, onSubmit }) => {
  // Mobile and accessibility enhancements
  const isTouchDevice = useTouchOptimization();
  useFocusManagement();
  
  // Swipe navigation for mobile
  const swipeHandlers = useSwipeNavigation(
    () => handleNextStep(), // Swipe left to go to next step
    () => handlePreviousStep(), // Swipe right to go to previous step
    { delta: 50 }
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { eventId } = useParams();
  
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
        console.log('💾 [RECOVERY] Form data saved to localStorage');
      } catch (error) {
        console.warn('⚠️ [RECOVERY] Failed to save to localStorage:', error);
      }
    }
  }, [formData, formEventId, currentStep, version]);

  // Check for recovery data on component mount
  useEffect(() => {
    try {
      const recoveryData = localStorage.getItem('eventForm_recovery');
      if (recoveryData) {
        const parsed = JSON.parse(recoveryData);
        const age = Date.now() - parsed.timestamp;
        
        // Only recover if data is less than 1 hour old
        if (age < 60 * 60 * 1000) {
          console.log('🔄 [RECOVERY] Found recent form data, age:', Math.round(age / 1000), 'seconds');
          
          // Check if current form is empty or different
          const currentFormEmpty = !formData.title && !formData.description;
          const isDifferentEvent = formEventId && formEventId !== parsed.eventId;
          
          if (currentFormEmpty || isDifferentEvent) {
            const shouldRecover = window.confirm(
              `Found unsaved changes from ${Math.round(age / 1000)} seconds ago. Would you like to recover them?`
            );
            
            if (shouldRecover) {
              dispatch(loadExistingEvent(parsed.formData));
              dispatch(setCurrentStep(parsed.currentStep));
              toast.success('Form data recovered successfully');
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ [RECOVERY] Failed to check recovery data:', error);
    }
  }, []); // Only run on mount
  
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
      
      // Always save to localStorage first for immediate persistence
      formPersistence.saveFormData(data, formEventId);
      
      // Transform form data to API format
      const apiData = formUtils.transformFormDataToAPI(data);
      console.log('📤 [SAVE DRAFT] API payload:', apiData);
      console.log('📍 [SAVE DRAFT] POST call location: EventFormWrapper.jsx - saveDraft function');
      console.log('🔄 [SAVE DRAFT] Current form data state:', data);
      
      let result;
      if (formEventId) {
        // Update existing draft
        console.log('🔄 [SAVE DRAFT] Updating existing draft...', formEventId);
        result = await dispatch(updateEventDraft({ 
          eventId: formEventId, 
          eventData: apiData, 
          version 
        })).unwrap();
        // Return the existing ID for callers
        console.log('✅ [SAVE DRAFT] Updated draft:', { id: formEventId, result });
        dispatch(setLastSaved(new Date().toISOString()));
        dispatch(setSaving(false));
        console.log('✅ [SAVE DRAFT] Success:', result);
        dispatch(setSaveError(null));
        if (isManual) toast.success('Draft saved successfully');
        return { id: formEventId };
      } else {
        // Create new draft
        console.log('🔄 [SAVE DRAFT] Creating new draft...');
        result = await dispatch(createEventDraft(apiData)).unwrap();
        console.log('✅ [SAVE DRAFT] Created draft result:', result);
        if (result.data?.id) {
          // Persist eventId in the correct place in state
          dispatch(setEventId(result.data.id));
          // Update localStorage with the new event ID
          formPersistence.saveFormData(data, result.data.id);
        }
        // Update last saved timestamp
        dispatch(setLastSaved(new Date().toISOString()));
        dispatch(setSaving(false));
        console.log('✅ [SAVE DRAFT] Success:', result);
        dispatch(setSaveError(null));
        if (isManual) toast.success('Draft saved successfully');
        return { id: result.data?.id };
      }

    } catch (error) {
      console.error('❌ [SAVE DRAFT] Error:', {
        message: error.message,
        error,
        data,
        timestamp: new Date().toISOString()
      });
      
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
  }, [formEventId, autoSave.isSaving, version, dispatch]);

  // Note: Auto-save is now handled by individual form fields using optimized persistence

  // Ensure user is authenticated
  useEffect(() => {
    const ensureAuth = async () => {
      if (!testAuth.isLoggedIn()) {
        try {
          await testAuth.ensureLoggedIn();
          console.log('✅ User authenticated for organizer access');
        } catch (error) {
          console.error('❌ Authentication failed:', error);
          toast.error('Please log in to access organizer features');
          navigate('/');
        }
      }
    };
    
    ensureAuth();
  }, [navigate]);

  // Load existing event if editing or check for saved drafts
  useEffect(() => {
    if (eventId && eventId !== 'create') {
      const loadEvent = async () => {
        try {
          console.log('🔄 [LOAD EVENT] Loading event with ID:', eventId);
          dispatch(setLoading({ key: 'loading', loading: true }));
          const eventData = await dispatch(getEventDetails(eventId)).unwrap();
          
          console.log('📥 [LOAD EVENT] Raw event data from API:', eventData);
          
          // Transform API data to form format
          const formData = formUtils.transformAPIToFormData(eventData);
          const combinedData = { ...eventData, ...formData };
          
          console.log('🔄 [LOAD EVENT] Combined data for loadExistingEvent:', combinedData);
          
          dispatch(loadExistingEvent(combinedData));
          
          dispatch(setLoading({ key: 'loading', loading: false }));
          console.log('✅ [LOAD EVENT] Event loaded successfully');
        } catch (error) {
          console.error('❌ [LOAD EVENT] Failed to load event:', error);
          toast.error('Failed to load event details');
          navigate('/organizer');
          dispatch(setLoading({ key: 'loading', loading: false }));
        }
      };
      
      loadEvent();
    } else {
      // Check for saved draft data for new events
      const savedData = formPersistence.loadFormData();
      if (savedData && savedData.formData) {
        // Show recovery dialog
        const shouldRecover = window.confirm(
          `You have a saved draft from ${savedData.ageText}. Would you like to recover it?`
        );
        
        if (shouldRecover) {
          // Load the saved form data
          dispatch(loadExistingEvent(savedData.formData));
          toast.success('Draft recovered successfully');
        } else {
          // Clear the saved data and start fresh
          formPersistence.clearFormData();
          dispatch(clearForm());
        }
      } else {
        // Clear form for new event
        dispatch(clearForm());
      }
    }
  }, [eventId, dispatch, navigate]);


  // Periodic auto-save (every 30 seconds)
  useEffect(() => {
    if (!formEventId || !formData) return;
    
    const hasBasicData = formData.title || formData.description || formData.dates?.startDate;
    if (!hasBasicData) return;
    
    const interval = setInterval(async () => {
      try {
        console.log('⏰ [PERIODIC AUTO-SAVE] Saving every 30 seconds');
        
        // Transform form data to API format
        const apiData = formUtils.transformFormDataToAPI(formData);
        console.log('📤 [PERIODIC AUTO-SAVE] API payload:', apiData);
        console.log('📍 [PERIODIC AUTO-SAVE] POST call location: EventFormWrapper.jsx - periodic auto-save useEffect');
        console.log('🔄 [PERIODIC AUTO-SAVE] Current form data state:', formData);
        
        // Update the draft with current data
        await dispatch(updateEventDraft({ 
          eventId: formEventId, 
          eventData: apiData, 
          version 
        })).unwrap();
        
        console.log('✅ [PERIODIC AUTO-SAVE] Successfully saved');
        
        // Update last saved timestamp
        dispatch(setLastSaved(new Date().toISOString()));
        
      } catch (error) {
        console.warn('⚠️ [PERIODIC AUTO-SAVE] Failed to save:', error);
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [formEventId, formData, version, dispatch]);

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

  // Auto-save function that triggers on step navigation
  const autoSaveOnStepChange = useCallback(async (newStep, previousStep) => {
    // Only auto-save if we have meaningful data and an event ID
    if (!formEventId || !formData) return;
    
    const hasBasicData = formData.title || formData.description || formData.dates?.startDate;
    if (!hasBasicData) return;
    
    try {
      console.log('💾 [AUTO-SAVE] Saving on step change:', { from: previousStep, to: newStep });
      
      // Transform form data to API format
      const apiData = formUtils.transformFormDataToAPI(formData);
      console.log('📤 [AUTO-SAVE] API payload:', apiData);
      console.log('📍 [AUTO-SAVE] POST call location: EventFormWrapper.jsx - autoSaveOnStepChange function');
      console.log('🔄 [AUTO-SAVE] Current form data state:', formData);
      
      // Update the draft with current data
      await dispatch(updateEventDraft({ 
        eventId: formEventId, 
        eventData: apiData, 
        version 
      })).unwrap();
      
      console.log('✅ [AUTO-SAVE] Successfully saved on step change');
      
      // Update last saved timestamp
      dispatch(setLastSaved(new Date().toISOString()));
      
    } catch (error) {
      console.warn('⚠️ [AUTO-SAVE] Failed to save on step change:', error);
      // Don't show error to user for auto-save failures
    }
  }, [formEventId, formData, version, dispatch]);

  // Enhanced step navigation with auto-save
  const handleNextStep = () => {
    console.log('🔄 [NEXT STEP] Button clicked', { 
      currentStep, 
      totalSteps, 
      formData: {
        title: formData.title,
        description: formData.description,
        category: formData.category
      }
    });
    
    // Basic validation for step 1
    if (currentStep === 1) {
      const hasBasicInfo = formData.title && formData.title.trim().length > 0;
      if (!hasBasicInfo) {
        console.log('❌ [NEXT STEP] Validation failed - no title');
        toast.error('Please add an event title before continuing');
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      console.log('✅ [NEXT STEP] Moving to next step');
      
      // Auto-save before moving to next step
      autoSaveOnStepChange(currentStep + 1, currentStep);
      
      dispatch(nextStep());
    } else {
      console.log('❌ [NEXT STEP] Already at last step');
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
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmLeave) return;
    }
    
    navigate('/organizer');
  };

  const handleSubmit = async () => {
    try {
      // Final validation
      const finalValidation = validateForm(formData);
      
      if (!finalValidation.isValid) {
        dispatch(setValidation({
          isValid: false,
          errors: finalValidation.errors,
          stepErrors: {}
        }));

        // Determine the first step that has blocking errors and navigate there
        const errors = finalValidation.errors || {};
        const errorFields = Object.keys(errors);

        const stepPriority = [
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
        if (targetStep === 2) {
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
      
      // Call parent submit handler
      if (onSubmit) {
        await onSubmit(formData);
      }
      
    } catch (error) {
      console.error('Submit failed:', error);
      toast.error('Failed to publish event');
    }
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
                    {currentStep === totalSteps ? (
                      <EnhancedButton
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!validation.isValid || organizerLoading.actions}
                        icon={Eye}
                        className={`btn-web3-primary w-full sm:w-auto ${isTouchDevice ? 'min-h-[44px]' : ''}`}
                        aria-label="Preview and publish event"
                      >
                        Preview & Publish
                      </EnhancedButton>
                    ) : (
                      <EnhancedButton
                        variant="primary"
                        onClick={handleNextStep}
                        disabled={false} // Temporarily disable validation to test navigation
                        className={`w-full sm:w-auto ${isTouchDevice ? 'min-h-[44px]' : ''}`}
                        aria-label="Go to next step"
                      >
                        Next Step
                      </EnhancedButton>
                    )}
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
    </div>
  );
};

export default EventFormWrapper;
