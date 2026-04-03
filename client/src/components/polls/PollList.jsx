import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPolls, clearPolls } from '../../store/slices/pollsSlice';
import PollCard from './PollCard';
import SimplePollCreator from './SimplePollCreator';
import { Plus, AlertCircle } from 'lucide-react';

const PollList = ({ eventId, isOrganizerView = false }) => {
  const dispatch = useDispatch();
  const { polls, loading, errors } = useSelector(state => state.polls);
  const { user } = useSelector(state => state.auth);
  const [filter, setFilter] = useState('active');
  const [showCreator, setShowCreator] = useState(false);
  const prevEventIdRef = useRef(null);

  const isOrganizer =
    user?.role === 'organizer' || user?.events_organized?.includes(eventId);

  useEffect(() => {
    if (prevEventIdRef.current && prevEventIdRef.current !== eventId) {
      dispatch(clearPolls());
    }
    prevEventIdRef.current = eventId;
  }, [eventId, dispatch]);

  useEffect(() => {
    if (eventId) {
      dispatch(fetchPolls({ eventId, status: filter === 'all' ? 'all' : filter }));
    }
  }, [eventId, filter, dispatch]);

  const handleCreatePoll = () => {
    setShowCreator(true);
  };

  const handleCloseCreator = () => {
    setShowCreator(false);
  };

  const getPollsToShow = () => {
    const list = Object.values(polls).filter(Boolean);
    if (filter === 'all') return list;
    if (filter === 'active') return list.filter((p) => p.status === 'active');
    if (filter === 'closed') return list.filter((p) => p.status === 'closed');
    return list;
  };

  const pollsToShow = getPollsToShow();

  const org = isOrganizerView;

  const filterBtn = (active, inactive) =>
    org
      ? active
        ? 'bg-[#4f0f69]/40 text-white border border-[#8A4FFF]/50'
        : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
      : active
        ? 'bg-blue-100 text-blue-700'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200';

  return (
    <div className="space-y-6">
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end"
      >
        <div className="flex flex-wrap items-center gap-4">
          {isOrganizer && (
            <button
              type="button"
              onClick={handleCreatePoll}
              className={
                org
                  ? 'inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[#4f0f69]/25 transition hover:opacity-95'
                  : 'flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700'
              }
            >
              <Plus className="h-4 w-4" />
              Create Poll
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['active', 'closed', 'all'].map(filterType => (
          <button
            key={filterType}
            type="button"
            onClick={() => setFilter(filterType)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${filterBtn(filter === filterType, filter !== filterType)}`}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
          </button>
        ))}
      </div>

      {loading.polls && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div
              className={`h-6 w-6 animate-spin rounded-full border-2 border-t-transparent ${org ? 'border-[#8A4FFF]' : 'border-blue-600'}`}
            />
            <span className={org ? 'text-gray-300' : 'text-gray-600'}>Loading polls...</span>
          </div>
        </div>
      )}

      {errors.polls && (
        <div
          className={
            org
              ? 'rounded-lg border border-red-500/30 bg-red-950/40 p-4'
              : 'rounded-lg border border-red-200 bg-red-50 p-4'
          }
        >
          <div className="flex items-start gap-3">
            <AlertCircle className={`mt-0.5 h-5 w-5 flex-shrink-0 ${org ? 'text-red-400' : 'text-red-600'}`} />
            <div>
              <h3 className={`text-sm font-medium ${org ? 'text-red-200' : 'text-red-800'}`}>
                Failed to load polls
              </h3>
              <p className={`mt-1 text-sm ${org ? 'text-red-300/90' : 'text-red-700'}`}>{errors.polls}</p>
              <button
                type="button"
                onClick={() =>
                  dispatch(fetchPolls({ eventId, status: filter === 'all' ? 'all' : filter }))
                }
                className={`mt-2 text-sm underline ${org ? 'text-[#8A4FFF] hover:text-white' : 'text-red-600 hover:text-red-800'}`}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading.polls && !errors.polls && (
        <>
          {pollsToShow.length === 0 ? (
            <div className="py-12 text-center">
              <div
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${org ? 'bg-white/10' : 'bg-gray-100'}`}
              >
                <Plus className={`h-8 w-8 ${org ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <h3 className={`mb-2 text-lg font-medium ${org ? 'text-white' : 'text-gray-900'}`}>
                No polls yet
              </h3>
              <p className={`mb-4 ${org ? 'text-gray-400' : 'text-gray-600'}`}>
                {filter === 'active'
                  ? 'No active polls at the moment.'
                  : filter === 'closed'
                    ? 'No closed polls yet.'
                    : 'No polls have been created for this event.'}
              </p>
              {isOrganizer && filter !== 'active' && (
                <button
                  type="button"
                  onClick={handleCreatePoll}
                  className={
                    org
                      ? 'inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] px-4 py-2 text-sm font-medium text-white transition hover:opacity-95'
                      : 'inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700'
                  }
                >
                  <Plus className="h-4 w-4" />
                  Create your first poll
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6">
              {pollsToShow.map(poll => (
                <PollCard
                  key={poll.poll_id}
                  poll={poll}
                  eventId={eventId}
                  isOrganizer={isOrganizer}
                  isOrganizerView={isOrganizerView}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showCreator && (
        <SimplePollCreator
          eventId={eventId}
          onClose={handleCloseCreator}
          onSuccess={() => {
            dispatch(fetchPolls({ eventId, status: filter === 'all' ? 'all' : filter }));
          }}
        />
      )}
    </div>
  );
};

export default PollList;
