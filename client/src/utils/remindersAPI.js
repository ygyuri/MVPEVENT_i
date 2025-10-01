import api from './api';

export const scheduleReminders = (order, timezone) =>
  api.post('/api/reminders/schedule', { order, timezone }).then(r => r.data);

export const getUserReminders = (userId) =>
  api.get(`/api/reminders/user/${userId}`).then(r => r.data);

export const updateReminderPreferences = (id, payload) =>
  api.patch(`/api/reminders/${id}/preferences`, payload).then(r => r.data);

export const cancelReminder = (id) =>
  api.delete(`/api/reminders/${id}`).then(r => r.data);

export const monitorQueue = () =>
  api.get('/api/reminders/_monitor').then(r => r.data);




