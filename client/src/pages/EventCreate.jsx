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
import { publishEvent, updateEventDraft } from '../store/slices/organizerSlice';
import { validateForm } from '../utils/eventValidation';
import organizerAPI, { formUtils } from '../utils/organizerAPI';

const EventCreate = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { eventId } = useParams();
  
  const { currentStep, formData, eventId: storedEventId, version } = useSelector(state => state.eventForm);

  // Handle form submission (publish event) with comprehensive error handling
  const handleSubmit = async (formData) => {
    try {
      // Show initial loading message
      toast.loading('Preparing to publish your event...', {
        id: 'publish-loading',
        duration: 0 // Keep loading until we dismiss it
      });

      // Final validation
      const validation = validateForm(formData);
      
      if (!validation.isValid) {
        toast.dismiss('publish-loading');
        toast.error('Please fix all errors before publishing');
        return;
      }

      // Determine effective eventId (route param may be 'create')
      const effectiveEventId = (eventId && eventId !== 'create') ? eventId : storedEventId;

      // Additional checks before publishing
      if (!effectiveEventId) {
        toast.dismiss('publish-loading');
        toast.error('Event ID is required for publishing');
        return;
      }

      // Transform form data for API
      const apiData = formUtils.transformFormDataToAPI(formData);
      
      // Validate that we have essential data
      if (!apiData.title || !apiData.description || !apiData.dates?.startDate) {
        toast.dismiss('publish-loading');
        toast.error('Title, description, and start date are required');
        return;
      }
      
      // Update loading message
      toast.loading('Saving final draft...', {
        id: 'publish-loading'
      });
      
      // First, ensure the latest form data is saved to the draft
      const saveRes = await dispatch(updateEventDraft({ 
        eventId: effectiveEventId, 
        eventData: apiData, 
        version: version || 0
      })).unwrap();
      // Sync version into form state before publish
      if (saveRes?.data?.version !== undefined) {
        // We cannot import setVersion here easily without circular deps; rely on final publish to work with server's latest version post-save.
      }
      
      // Update loading message
      toast.loading('Publishing your event...', {
        id: 'publish-loading'
      });
      
      // Publish the event
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
      
      // Navigate to organizer dashboard to see the published event
      // Note: Individual event detail pages are not yet implemented
      navigate('/organizer', { 
        state: { 
          justPublished: true,
          eventTitle: formData.title,
          eventId: result.data?.id || effectiveEventId
        } 
      });
      
    } catch (error) {
      console.error('Failed to publish event:', error);
      
      // Dismiss loading toast if it's still showing
      toast.dismiss('publish-loading');
      
      // Extract meaningful error message
      let errorMessage = 'Failed to publish event';
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
