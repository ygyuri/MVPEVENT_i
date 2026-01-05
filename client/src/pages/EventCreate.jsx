import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import EventFormWrapper from '../components/organizer/EventFormWrapper';
import BasicInfoStep from '../components/organizer/steps/BasicInfoStep';
import LocationStep from '../components/organizer/steps/LocationStep';
import ScheduleStep from '../components/organizer/steps/ScheduleStep';
import PricingAndTicketsStep from '../components/organizer/steps/PricingAndTicketsStep';
import RecurrenceStep from '../components/organizer/steps/RecurrenceStep';
import MediaStep from '../components/organizer/steps/MediaStep';
import PreviewStep from '../components/organizer/steps/PreviewStep';
import { publishEvent, updateEventDraft, createEventDraft } from '../store/slices/organizerSlice';
import { setEventId, clearForm } from '../store/slices/eventFormSlice';
import { validateForm } from '../utils/eventValidation';
import organizerAPI, { formUtils } from '../utils/organizerAPI';

const EventCreate = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { eventId } = useParams();
  
  const { currentStep, formData, eventId: storedEventId, version } = useSelector(state => state.eventForm);
  const { currentEvent } = useSelector(state => state.organizer);

  // Handle form submission (publish draft or update published event)
  const handleSubmit = async (formData) => {
    try {
      // Determine effective eventId (route param takes priority when editing)
      let effectiveEventId = (eventId && eventId !== 'create') ? eventId : storedEventId;

      // Check if event is already published
      const eventStatus = currentEvent?.status || 'draft';
      const isPublished = eventStatus === 'published';

      // Final validation
      const validation = validateForm(formData);
      
      if (!validation.isValid) {
        toast.error(isPublished ? 'Please fix all errors before updating' : 'Please fix all errors before publishing');
        return;
      }

      // Transform form data for API
      const apiData = formUtils.transformFormDataToAPI(formData);
      
      // Validate that we have essential data
      if (!apiData.title || !apiData.description || !apiData.dates?.startDate) {
        toast.error('Title, description, and start date are required');
        return;
      }
      
      // Show appropriate loading message
      const loadingMessage = isPublished ? 'Updating your event...' : 'Preparing to publish your event...';
      toast.loading(loadingMessage, {
        id: 'publish-loading',
        duration: 0
      });
      
      // If no eventId exists, create a draft first (for new events)
      if (!effectiveEventId) {
        // console.log('📝 [PUBLISH] No eventId found, creating draft first...');
        try {
          const draftResult = await dispatch(createEventDraft(apiData)).unwrap();
          if (draftResult.data?.id) {
            effectiveEventId = draftResult.data.id;
            // Update Redux state with the new eventId
            dispatch(setEventId(effectiveEventId));
            // console.log('✅ [PUBLISH] Draft created with ID:', effectiveEventId);
          } else {
            throw new Error('Failed to create draft: No event ID returned');
          }
        } catch (error) {
          toast.dismiss('publish-loading');
          const errorMessage = error.response?.data?.error || error.message || 'Failed to create draft';
          toast.error(errorMessage);
          return;
        }
      }
      
      // Update the event (works for both drafts and published events now)
      // Handle version conflict by retrying without version if needed
      let saveRes;
      try {
        saveRes = await dispatch(updateEventDraft({ 
          eventId: effectiveEventId, 
          eventData: apiData, 
          version: version || 0
        })).unwrap();
      } catch (error) {
        // If version conflict, retry without version to get latest from server
        if (error.response?.status === 409 || (typeof error === 'string' && error.toLowerCase().includes('conflict'))) {
          saveRes = await dispatch(updateEventDraft({ 
            eventId: effectiveEventId, 
            eventData: apiData
          })).unwrap();
        } else {
          throw error;
        }
      }

      // If event is already published, we're done - just update it
      if (isPublished) {
        toast.dismiss('publish-loading');
        toast.success(
          <div className="space-y-2">
            <div className="font-semibold text-green-800">✅ Event Updated Successfully!</div>
            <div className="text-sm text-green-700">
              Your changes to "{formData.title}" have been saved.
            </div>
          </div>,
          {
            duration: 5000,
            position: 'top-center',
            style: {
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              color: '#166534',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
            }
          }
        );
        
        navigate('/organizer', { 
          state: { 
            justUpdated: true,
            eventTitle: formData.title,
            eventId: effectiveEventId
          } 
        });
        return;
      }

      // For drafts, proceed with publishing
      toast.loading('Publishing your event...', {
        id: 'publish-loading'
      });
      
      // Publish the event (only for drafts)
      const result = await dispatch(publishEvent(effectiveEventId)).unwrap();
      
      // Dismiss loading toast
      toast.dismiss('publish-loading');
      
      // Show comprehensive success message
      toast.success(
        <div className="space-y-2">
          <div className="font-semibold text-green-800">🎉 Event Published Successfully!</div>
          <div className="text-sm text-green-700">
            Your event "{formData.title}" is now live and ready for attendees.
          </div>
          <div className="text-xs text-green-600">
            You'll receive an email confirmation shortly.
          </div>
        </div>,
        {
          duration: 8000,
          position: 'top-center',
          style: {
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#166534',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
          }
        }
      );
      
      // Clear the form before navigating away
      dispatch(clearForm());
      // Clear localStorage recovery data
      localStorage.removeItem('eventForm_recovery');
      localStorage.removeItem('eventForm_draft');
      
      // Navigate to organizer dashboard to see the published event
      navigate('/organizer', { 
        state: { 
          justPublished: true,
          eventTitle: formData.title,
          eventId: result.data?.id || effectiveEventId
        } 
      });
      
    } catch (error) {
      // Dismiss loading toast if it's still showing
      toast.dismiss('publish-loading');
      
      // Extract meaningful error message
      const eventStatus = currentEvent?.status || 'draft';
      const isPublished = eventStatus === 'published';
      let errorMessage = isPublished ? 'Failed to update event' : 'Failed to publish event';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast.error(errorMessage);
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoStep />;
      case 2:
        return <LocationStep />;
      case 3:
        return <ScheduleStep />;
      case 4:
        return <PricingAndTicketsStep />;
      case 5:
        return <RecurrenceStep />;
      case 6:
        return <MediaStep />;
      case 7:
        return <PreviewStep onSubmit={handleSubmit} />;
      default:
        return <BasicInfoStep />;
    }
  };

  return (
    <EventFormWrapper onSubmit={handleSubmit}>
      {renderCurrentStep()}
    </EventFormWrapper>
  );
};

export default EventCreate;
