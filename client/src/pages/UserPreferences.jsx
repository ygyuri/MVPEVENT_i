import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchReminders, setReminderPreferences, deleteReminder, selectFilteredReminders } from '../store/slices/remindersSlice';

function PreferenceCard({ reminder, onUpdate, onDelete }) {
  const [method, setMethod] = useState(reminder.deliveryMethod || 'email');
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white/70 dark:bg-gray-900/60">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Event</div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{reminder.eventId?.title || 'Event'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(reminder.scheduledTime).toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={method}
            onChange={e => setMethod(e.target.value)}
            className="px-3 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 transition bg-white dark:bg-gray-800
              dark:text-white text-gray-900 border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="both">Both</option>
          </select>
          <button onClick={() => onUpdate(reminder, method)} className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm">Save</button>
          <button onClick={() => onDelete(reminder)} className="px-3 py-1 rounded-md bg-red-600 text-white text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function UserPreferences() {
  const dispatch = useDispatch();
  const user = useSelector(s => s.auth.user);
  const reminders = useSelector(selectFilteredReminders);
  const loading = useSelector(s => s.reminders.loading);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [defaultMethod, setDefaultMethod] = useState('email');
  const [defaultTimes, setDefaultTimes] = useState(['24h','2h','30m']);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    const userId = user?.id || user?._id;
    console.log('UserPreferences: user =', user);
    console.log('UserPreferences: userId =', userId);
    if (userId) {
      dispatch(fetchReminders(userId));
    }
  }, [user?.id, user?._id, dispatch]);

  const handleUpdate = (reminder, deliveryMethod) => {
    dispatch(setReminderPreferences({ id: reminder.id || reminder._id, deliveryMethod }));
  };

  const handleDelete = (reminder) => {
    dispatch(deleteReminder(reminder.id || reminder._id));
  };

  // Pagination
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return reminders.slice(start, start + pageSize);
  }, [reminders, page, pageSize]);
  useEffect(() => { setPage(1); }, [reminders.length]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Reminder Preferences</h1>
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Reminder Preferences</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Manage global reminder defaults and upcoming reminders.</p>

      {/* Global settings */}
      <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white/70 dark:bg-gray-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
            <input type="checkbox" checked={globalEnabled} onChange={e => setGlobalEnabled(e.target.checked)} />
            Enable reminders
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Default method</label>
            <select value={defaultMethod} onChange={e => setDefaultMethod(e.target.value)} className="px-3 py-2 rounded-md border text-sm bg-white dark:bg-gray-800 dark:text-white text-gray-900 border-gray-300 dark:border-gray-600">
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm text-gray-900 dark:text-gray-100 mb-2">Default times</div>
          <div className="flex flex-wrap gap-2">
            {['24h','2h','30m','3d','12h'].map(t => (
              <button key={t} onClick={() => setDefaultTimes(v => v.includes(t) ? v.filter(x => x !== t) : [...v, t])} className={`px-3 py-1.5 rounded-md text-sm border ${defaultTimes.includes(t) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <button className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm">Save defaults</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {paged.map(r => (
          <PreferenceCard key={r.id || r._id} reminder={r} onUpdate={handleUpdate} onDelete={handleDelete} />
        ))}
        {reminders.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">No upcoming reminders.</div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">{(reminders.length === 0) ? '0' : ((page - 1) * pageSize + 1)}–{Math.min(page * pageSize, reminders.length)} of {reminders.length}</div>
        <div className="flex items-center gap-2">
          <select className="text-sm rounded-md border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 px-2 py-1" value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value)); setPage(1); }}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-gray-800 disabled:opacity-50">Prev</button>
          <button disabled={page * pageSize >= reminders.length} onClick={() => setPage(page + 1)} className="px-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-gray-800 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}


