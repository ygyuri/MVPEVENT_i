import eventFormSlice, {
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
  const initialState = eventFormSlice.getInitialState();

  it('should return the initial state', () => {
    expect(eventFormSlice.reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setCurrentStep', () => {
    const actual = eventFormSlice.reducer(initialState, setCurrentStep(3));
    expect(actual.currentStep).toEqual(3);
    expect(actual.formData.metadata.currentStep).toEqual(3);
    expect(actual.formData.metadata.lastStepChange).toBeDefined();
  });

  it('should handle nextStep', () => {
    const actual = eventFormSlice.reducer(initialState, nextStep());
    expect(actual.currentStep).toEqual(2);
    expect(actual.formData.metadata.currentStep).toEqual(2);
  });

  it('should handle previousStep', () => {
    const stateWithStep2 = eventFormSlice.reducer(initialState, setCurrentStep(2));
    const actual = eventFormSlice.reducer(stateWithStep2, previousStep());
    expect(actual.currentStep).toEqual(1);
    expect(actual.formData.metadata.currentStep).toEqual(1);
  });

  it('should handle goToStep', () => {
    const actual = eventFormSlice.reducer(initialState, goToStep(5));
    expect(actual.currentStep).toEqual(5);
    expect(actual.formData.metadata.currentStep).toEqual(5);
  });

  it('should handle updateFormData', () => {
    const newData = { title: 'New Title', description: 'New Description' };
    const actual = eventFormSlice.reducer(initialState, updateFormData(newData));
    expect(actual.formData.title).toEqual('New Title');
    expect(actual.formData.description).toEqual('New Description');
    expect(actual.isDirty).toBe(true);
  });

  it('should handle updateNestedFormData', () => {
    const actual = eventFormSlice.reducer(
      initialState,
      updateNestedFormData({ path: 'location.venueName', value: 'Test Venue' })
    );
    expect(actual.formData.location.venueName).toEqual('Test Venue');
    expect(actual.isDirty).toBe(true);
  });

  it('should handle setValidation', () => {
    const validation = { isValid: true, errors: {} };
    const actual = eventFormSlice.reducer(initialState, setValidation(validation));
    expect(actual.validation).toEqual(validation);
  });

  it('should handle setStepValidation', () => {
    const stepValidation = { isValid: true, errors: {} };
    const actual = eventFormSlice.reducer(
      initialState,
      setStepValidation({ step: 1, validation: stepValidation })
    );
    expect(actual.validation.stepErrors[1]).toEqual(stepValidation);
  });

  it('should handle setDirty', () => {
    const actual = eventFormSlice.reducer(initialState, setDirty(true));
    expect(actual.isDirty).toBe(true);
  });

  it('should handle setSaving', () => {
    const actual = eventFormSlice.reducer(initialState, setSaving(true));
    expect(actual.autoSave.isSaving).toBe(true);
  });

  it('should handle setSaveError', () => {
    const error = 'Save failed';
    const actual = eventFormSlice.reducer(initialState, setSaveError(error));
    expect(actual.autoSave.saveError).toEqual(error);
  });

  it('should handle setLastSaved', () => {
    const timestamp = new Date().toISOString();
    const actual = eventFormSlice.reducer(initialState, setLastSaved(timestamp));
    expect(actual.autoSave.lastSaved).toEqual(timestamp);
  });

  it('should handle clearError', () => {
    const stateWithError = eventFormSlice.reducer(initialState, setSaveError('Error'));
    const actual = eventFormSlice.reducer(stateWithError, clearError());
    expect(actual.autoSave.saveError).toBeNull();
  });

  it('should handle loadExistingEvent', () => {
    const existingEvent = {
      _id: 'event123',
      title: 'Existing Event',
      description: 'Existing Description',
      status: 'draft',
      metadata: { currentStep: 3 },
    };
    const actual = eventFormSlice.reducer(initialState, loadExistingEvent(existingEvent));
    expect(actual.eventId).toEqual('event123');
    expect(actual.formData.title).toEqual('Existing Event');
    expect(actual.formData.description).toEqual('Existing Description');
    expect(actual.currentStep).toEqual(3);
  });

  it('should handle clearForm', () => {
    const stateWithData = eventFormSlice.reducer(initialState, updateFormData({ title: 'Test' }));
    const actual = eventFormSlice.reducer(stateWithData, clearForm());
    expect(actual.formData.title).toEqual('');
    expect(actual.currentStep).toEqual(1);
    expect(actual.isDirty).toBe(false);
  });

  it('should handle setEventId', () => {
    const actual = eventFormSlice.reducer(initialState, setEventId('event456'));
    expect(actual.eventId).toEqual('event456');
  });

  it('should handle setLoading', () => {
    const actual = eventFormSlice.reducer(initialState, setLoading({ key: 'saving', loading: true }));
    expect(actual.loading.saving).toBe(true);
  });

  it('should not go to step 0 or negative', () => {
    const actual = eventFormSlice.reducer(initialState, goToStep(0));
    expect(actual.currentStep).toEqual(1);
  });

  it('should not go beyond total steps', () => {
    const actual = eventFormSlice.reducer(initialState, goToStep(10));
    expect(actual.currentStep).toEqual(initialState.totalSteps);
  });

  it('should handle nested form data updates correctly', () => {
    const actual = eventFormSlice.reducer(
      initialState,
      updateNestedFormData({ path: 'pricing.price', value: 25 })
    );
    expect(actual.formData.pricing.price).toEqual(25);
  });

  it('should handle array updates in nested form data', () => {
    const actual = eventFormSlice.reducer(
      initialState,
      updateNestedFormData({ path: 'tags', value: ['tag1', 'tag2'] })
    );
    expect(actual.formData.tags).toEqual(['tag1', 'tag2']);
  });

  it('should preserve existing nested data when updating', () => {
    const stateWithLocation = eventFormSlice.reducer(
      initialState,
      updateNestedFormData({ path: 'location.city', value: 'New York' })
    );
    const actual = eventFormSlice.reducer(
      stateWithLocation,
      updateNestedFormData({ path: 'location.country', value: 'USA' })
    );
    expect(actual.formData.location.city).toEqual('New York');
    expect(actual.formData.location.country).toEqual('USA');
  });
});

