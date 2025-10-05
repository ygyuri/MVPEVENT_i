import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Loader, AlertCircle } from 'lucide-react';
import PollCard from './PollCard';
import { usePollSocket } from '../../hooks/usePollSocket';
import { fetchPolls, handleNewPoll, handleVoteUpdate, handlePollClosed } from '../../store/slices/pollsSlice';

const ActivePollsWidget = ({ eventId }) => {
  const dispatch = useDispatch();
  const { polls, activePolls, loading, errors } = useSelector(state => state.polls);
  const { isConnected, socket } = usePollSocket(eventId);
  const [newPollIds, setNewPollIds] = useState(() => new Set());

  // Derived list of poll entities for rendering
  const activePollEntities = useMemo(() => {
    return activePolls
      .map(id => polls[id])
      .filter(Boolean);
  }, [activePolls, polls]);

  // Fetch polls on mount / when event changes
  useEffect(() => {
    if (!eventId) return;
    dispatch(fetchPolls({ eventId, status: 'active' }));
  }, [dispatch, eventId]);

  // Subscribe to real-time poll events
  useEffect(() => {
    if (!socket || !eventId) return;

    const unsubCreated = socket.on('poll:created', (poll) => {
      dispatch(handleNewPoll(poll));
      setNewPollIds(prev => {
        const updated = new Set(prev);
        if (poll?.poll_id) updated.add(poll.poll_id);
        return updated;
      });
      // Remove badge after 10s
      if (poll?.poll_id) {
        setTimeout(() => {
          setNewPollIds(prev => {
            const updated = new Set(prev);
            updated.delete(poll.poll_id);
            return updated;
          });
        }, 10000);
      }
    });

    const unsubVote = socket.on('poll:vote_update', (data) => {
      dispatch(handleVoteUpdate(data));
    });

    const unsubClosed = socket.on('poll:closed', (data) => {
      dispatch(handlePollClosed(data));
    });

    return () => {
      if (typeof unsubCreated === 'function') unsubCreated();
      if (typeof unsubVote === 'function') unsubVote();
      if (typeof unsubClosed === 'function') unsubClosed();
    };
  }, [socket, eventId, dispatch]);

  if (loading?.polls) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader className="w-5 h-5 animate-spin text-primary-600" />
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Loading polls...</span>
      </div>
    );
  }

  if (errors?.polls) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg border text-red-700 bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">Failed to load polls: {errors.polls}</span>
      </div>
    );
  }

  if (!activePollEntities.length) {
    return (
      <div className="text-center py-10">
        <p className="text-base text-gray-600 dark:text-gray-300">No active polls at the moment</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Check back later for new polls</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Active Polls</h3>
        <div className={`flex items-center gap-2 text-xs ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
          <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-600' : 'bg-gray-400'}`} />
          {isConnected ? 'Live' : 'Connecting...'}
        </div>
      </div>

      {/* Responsive grid: 1 col on mobile, 2 on md+ */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
        {activePollEntities.map((poll) => (
          <div key={poll.poll_id} className="relative">
            {newPollIds.has(poll.poll_id) && (
              <span className="absolute -top-2 -right-2 z-10 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-600 text-white shadow">
                New
              </span>
            )}
            <PollCard poll={poll} eventId={eventId} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivePollsWidget;
