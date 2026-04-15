import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { fetchMyEvents } from '../store/slices/organizerSlice';

export default function OrganizerMarketingPartners() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { events, loading } = useSelector((s) => s.organizer);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    dispatch(fetchMyEvents({ page: 1, pageSize: 100, sort: 'createdAt', order: 'desc' }));
  }, [dispatch]);

  const go = () => {
    if (!selectedId) return;
    navigate(`/organizer/events/${selectedId}/marketing`);
  };

  const eventLabel = (ev) =>
    ev.title || ev.name || ev.shortTitle || 'Untitled event';

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 pb-16">
      <Link
        to="/organizer"
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-6 hover:text-[#4f0f69] dark:hover:text-violet-300"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <span className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
          <Megaphone className="w-8 h-8" />
        </span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marketing partners</h1>
      </div>

      <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
        Partners, commission splits, independent marketers, referral links, and rules are set{' '}
        <strong>per event</strong>. Choose an event to open the step-by-step marketing hub.
      </p>

      <div className="space-y-4 rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/50 dark:bg-gray-900/30 p-5 sm:p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Event</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={loading?.events}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white"
        >
          <option value="">{loading?.events ? 'Loading events…' : 'Select an event…'}</option>
          {(events || []).map((ev) => (
            <option key={ev._id} value={ev._id}>
              {eventLabel(ev)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={go}
          disabled={!selectedId}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#4f0f69] text-white font-medium hover:bg-[#6b1a8a] disabled:opacity-50"
        >
          Open marketing hub
        </button>
        {(!events || events.length === 0) && !loading?.events && (
          <p className="text-sm text-gray-500">
            No events yet.{' '}
            <Link to="/organizer/events/create" className="text-violet-600 dark:text-violet-400 hover:underline">
              Create an event
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
