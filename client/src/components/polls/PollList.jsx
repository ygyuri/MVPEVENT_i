import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPolls, clearPolls } from '../../store/slices/pollsSlice';
import { usePollSocket } from '../../hooks/usePollSocket';
import { useTheme } from '../../contexts/ThemeContext';
import PollCard from './PollCard';
import SimplePollCreator from './SimplePollCreator';
import { Plus, Wifi, WifiOff, AlertCircle } from 'lucide-react';

const PollList = ({ eventId }) => {
  const { isDarkMode } = useTheme();
  const dispatch = useDispatch();
  const { polls, activePolls, loading, errors } = useSelector(state => state.polls);
  const { user } = useSelector(state => state.auth);
  const { isConnected, connectionError } = usePollSocket(eventId);
  
  const [showCreator, setShowCreator] = useState(false);
  const [filter, setFilter] = useState('active'); // active, closed, all

  const isOrganizer = user?.role === 'organizer' || user?.events_organized?.includes(eventId);

  useEffect(() => {
    if (eventId) {
      dispatch(fetchPolls({ eventId, status: filter === 'all' ? undefined : filter }));
    }

    return () => {
      dispatch(clearPolls());
    };
  }, [eventId, filter, dispatch]);

  const handleCreatePoll = () => {
    setShowCreator(true);
  };

  const handleCloseCreator = () => {
    setShowCreator(false);
  };

  const getPollsToShow = () => {
    const pollIds = filter === 'all' ? Object.keys(polls) : activePolls;
    return pollIds.map(id => polls[id]).filter(Boolean);
  };

  const pollsToShow = getPollsToShow();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 
            className="text-2xl font-bold"
            style={{ color: isDarkMode ? 'var(--text-primary)' : 'var(--text-primary)' }}
          >
            Event Polls
          </h2>
          <p 
            className="text-sm"
            style={{ color: isDarkMode ? 'var(--text-secondary)' : 'var(--text-secondary)' }}
          >
            Engage your audience with interactive polls
          </p>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">Offline</span>
              </>
            )}
          </div>

          {isOrganizer && (
            <button
              onClick={handleCreatePoll}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Poll
            </button>
          )}
        </div>
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Connection Issue</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Real-time updates may be delayed. {connectionError}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {['active', 'closed', 'all'].map(filterType => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filter === filterType
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading.polls && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">Loading polls...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {errors.polls && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Failed to load polls</h3>
              <p className="text-sm text-red-700 mt-1">{errors.polls}</p>
              <button
                onClick={() => dispatch(fetchPolls({ eventId, status: filter === 'all' ? undefined : filter }))}
                className="text-sm text-red-600 hover:text-red-800 underline mt-2"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Polls Grid */}
      {!loading.polls && !errors.polls && (
        <>
          {pollsToShow.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No polls yet</h3>
              <p className="text-gray-600 mb-4">
                {filter === 'active' 
                  ? "No active polls at the moment."
                  : filter === 'closed'
                  ? "No closed polls yet."
                  : "No polls have been created for this event."
                }
              </p>
              {isOrganizer && filter !== 'active' && (
                <button
                  onClick={handleCreatePoll}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
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
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Poll Creator Modal */}
      {showCreator && (
        <SimplePollCreator
          eventId={eventId}
          onClose={handleCloseCreator}
          onSuccess={() => {
            // Refresh polls after successful creation
            dispatch(fetchPolls({ eventId, status: filter === 'all' ? undefined : filter }));
          }}
        />
      )}
    </div>
  );
};

export default PollList;
