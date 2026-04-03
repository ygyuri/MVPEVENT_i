import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, BarChart3, RefreshCw, Loader2 } from 'lucide-react';
import { fetchPolls, fetchResults, clearError } from '../store/slices/pollsSlice';
import ResultsDisplay from '../components/polls/ResultsDisplay';

/**
 * Organizer-only: results load when you open the page; use Refresh to update (no polling).
 */
const OrganizerPollResultsPage = () => {
  const { eventId, pollId } = useParams();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { polls, pollResults, errors, isFetchingResults } = useSelector((s) => s.polls);

  const [pollListReady, setPollListReady] = useState(false);
  const initialFetchForPoll = useRef(null);

  useEffect(() => {
    initialFetchForPoll.current = null;
  }, [pollId]);

  const isImpersonating = typeof window !== 'undefined' && localStorage.getItem('impersonatingUserId');
  const isOrganizer =
    user?.role === 'organizer' ||
    user?.events_organized?.includes(eventId) ||
    (user?.role === 'admin' && isImpersonating);

  const poll = polls[pollId];
  const results = pollResults[pollId];
  const fetching = !!isFetchingResults[pollId];

  useEffect(() => {
    if (!eventId || !isOrganizer) return;
    setPollListReady(false);
    dispatch(fetchPolls({ eventId, status: 'all' }))
      .unwrap()
      .catch(() => {})
      .finally(() => setPollListReady(true));
  }, [dispatch, eventId, isOrganizer]);

  const loadResults = useCallback(() => {
    dispatch(clearError({ type: 'results' }));
    if (eventId) {
      dispatch(fetchPolls({ eventId, status: 'all' }));
    }
    dispatch(fetchResults({ pollId }));
  }, [dispatch, pollId, eventId]);

  useEffect(() => {
    if (!pollListReady || !poll || !pollId) return;
    if (initialFetchForPoll.current === pollId) return;
    initialFetchForPoll.current = pollId;
    dispatch(clearError({ type: 'results' }));
    dispatch(fetchResults({ pollId }));
  }, [dispatch, pollListReady, poll, pollId]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isOrganizer) {
    return <Navigate to={`/events/${eventId}/polls`} replace />;
  }

  if (!pollListReady) {
    return (
      <div className="min-h-screen text-white">
        <div className="container-modern flex min-h-[50vh] items-center justify-center py-8">
          <Loader2 className="h-12 w-12 animate-spin text-[#8A4FFF]" />
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen text-white">
        <div className="container-modern py-8">
          <Link
            to={`/events/${eventId}/polls`}
            className="mb-6 inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to event polls
          </Link>
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
            <p className="text-gray-300">Poll not found or you do not have access.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <div className="container-modern py-8">
        <div className="mb-8">
          <Link
            to={`/events/${eventId}/polls`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to event polls
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <BarChart3 className="h-8 w-8 text-[#8A4FFF]" />
                <h1 className="text-3xl font-bold text-white">Poll results</h1>
              </div>
              {poll && (
                <p className="max-w-3xl text-lg text-gray-200">{poll.question}</p>
              )}
              <p className="mt-2 max-w-xl text-sm text-gray-400">
                Poll list and counts load when you open this page. Use Refresh to pull the latest from
                the server—there is no background polling.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={loadResults}
                disabled={fetching || !poll}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {errors.results && poll && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-200">
            {errors.results}
            <button
              type="button"
              onClick={loadResults}
              className="ml-3 underline hover:text-white"
            >
              Try again
            </button>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8">
          <ResultsDisplay
            poll={poll}
            results={results}
            userVote={null}
            isLoading={fetching && !results}
            isOrganizerView
          />
        </div>
      </div>
    </div>
  );
};

export default OrganizerPollResultsPage;
