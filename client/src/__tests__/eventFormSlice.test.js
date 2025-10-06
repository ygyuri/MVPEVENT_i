import eventFormReducer, {
  setCurrentStep,
  nextStep,
  previousStep,
  goToStep,
  updateFormData,
  updateNestedFormData,
  setValidation,
  setStepValidation,
  setDirty,
  setSaving,
  setSaveError,
  setLastSaved,
  clearError,
  loadExistingEvent,
  clearForm,
  setEventId,
  setLoading,
} from '../store/slices/eventFormSlice';

describe('eventFormSlice', () => {
  const initialState = eventFormReducer(undefined, { type: '@@INIT' });

  it('should return the initial state', () => {
    expect(eventFormReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setCurrentStep', () => {
    const actual = eventFormReducer(initialState, setCurrentStep(3));
    expect(actual.currentStep).toEqual(3);
    expect(actual.formData.metadata.currentStep).toEqual(3);
    expect(actual.formData.metadata.lastStepChange).toBeDefined();
  });

  it('should handle nextStep', () => {
    const actual = eventFormReducer(initialState, nextStep());
    expect(actual.currentStep).toEqual(2);
    expect(actual.formData.metadata.currentStep).toEqual(2);
  });

  it('should handle previousStep', () => {
    const stateWithStep2 = eventFormReducer(initialState, setCurrentStep(2));
    const actual = eventFormReducer(stateWithStep2, previousStep());
    expect(actual.currentStep).toEqual(1);
    expect(actual.formData.metadata.currentStep).toEqual(1);
  });

  it('should handle goToStep', () => {
    const actual = eventFormReducer(initialState, goToStep(5));
    expect(actual.currentStep).toEqual(5);
    expect(actual.formData.metadata.currentStep).toEqual(5);
  });

  it('should handle updateFormData', () => {
    const newData = { title: 'New Title', description: 'New Description' };
    const actual = eventFormReducer(initialState, updateFormData(newData));
    expect(actual.formData.title).toEqual('New Title');
    expect(actual.formData.description).toEqual('New Description');
    expect(actual.isDirty).toBe(true);
  });

  it('should handle updateNestedFormData', () => {
    const actual = eventFormReducer(
      initialState,
      updateNestedFormData({ path: 'location.venueName', value: 'Test Venue' })
    );
    expect(actual.formData.location.venueName).toEqual('Test Venue');
    expect(actual.isDirty).toBe(true);
  });

  it('should handle setValidation', () => {
    const validation = { isValid: true, errors: {}, stepErrors: {} };
    const actual = eventFormReducer(initialState, setValidation(validation));
    expect(actual.validation).toEqual(validation);
  });

  it('should handle setStepValidation', () => {
    const actual = eventFormReducer(
      initialState,
      setStepValidation({ step: 1, isValid: true, errors: {} })
    );
    expect(actual.validation.stepErrors[1]).toEqual({ isValid: true, errors: {} });
  });

  it('should handle setDirty', () => {
    const actual = eventFormReducer(initialState, setDirty(true));
    expect(actual.isDirty).toBe(true);
  });

  it('should handle setSaving', () => {
    const actual = eventFormReducer(initialState, setSaving(true));
    expect(actual.autoSave.isSaving).toBe(true);
  });

  it('should handle setSaveError', () => {
    const error = 'Save failed';
    const actual = eventFormReducer(initialState, setSaveError(error));
    expect(actual.autoSave.saveError).toEqual(error);
  });

  it('should handle setLastSaved', () => {
    const timestamp = new Date().toISOString();
    const actual = eventFormReducer(initialState, setLastSaved(timestamp));
    expect(actual.autoSave.lastSaved).toEqual(timestamp);
  });

  it('should handle clearError', () => {
    const stateWithError = eventFormReducer(initialState, setSaveError('Error'));
    const actual = eventFormReducer(stateWithError, clearError());
    expect(actual.error).toBeNull();
  });

  it('should handle loadExistingEvent', () => {
    const existingEvent = {
      _id: 'event123',
      title: 'Existing Event',
      description: 'Existing Description',
      status: 'draft',
      metadata: { currentStep: 3 },
    };
    const actual = eventFormReducer(initialState, loadExistingEvent(existingEvent));
    expect(actual.eventId).toEqual('event123');
    expect(actual.formData.title).toEqual('Existing Event');
    expect(actual.formData.description).toEqual('Existing Description');
    expect(actual.currentStep).toEqual(3);
  });

  it('should handle clearForm', () => {
    const stateWithData = eventFormReducer(initialState, updateFormData({ title: 'Test' }));
    const actual = eventFormReducer(stateWithData, clearForm());
    expect(actual.formData.title).toEqual('');
    expect(actual.currentStep).toEqual(1);
    expect(actual.isDirty).toBe(false);
  });

  it('should handle setEventId', () => {
    const actual = eventFormReducer(initialState, setEventId('event456'));
    expect(actual.eventId).toEqual('event456');
  });

  it('should handle setLoading', () => {
    const actual = eventFormReducer(initialState, setLoading({ key: 'saving', loading: true }));
    expect(actual.loading.saving).toBe(true);
  });

  it('should not go to step 0 or negative', () => {
    const actual = eventFormReducer(initialState, goToStep(0));
    expect(actual.currentStep).toEqual(1);
  });

  it('should not go beyond total steps', () => {
    const actual = eventFormReducer(initialState, goToStep(10));
    expect(actual.currentStep).toEqual(7); // totalSteps is 7
  });

  it('should handle nested form data updates correctly', () => {
    const actual = eventFormReducer(
      initialState,
      updateNestedFormData({ path: 'pricing.price', value: 25 })
    );
    expect(actual.formData.pricing.price).toEqual(25);
  });

  it('should handle array updates in nested form data', () => {
    const actual = eventFormReducer(
      initialState,
      updateNestedFormData({ path: 'tags', value: ['tag1', 'tag2'] })
    );
    expect(actual.formData.tags).toEqual(['tag1', 'tag2']);
  });

  it('should preserve existing nested data when updating', () => {
    const stateWithLocation = eventFormReducer(
      initialState,
      updateNestedFormData({ path: 'location.city', value: 'New York' })
    );
    const actual = eventFormReducer(
      stateWithLocation,
      updateNestedFormData({ path: 'location.country', value: 'USA' })
    );
    expect(actual.formData.location.city).toEqual('New York');
    expect(actual.formData.location.country).toEqual('USA');
  });
});

