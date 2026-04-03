import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { submitVote, fetchResults, closePoll } from '../../store/slices/pollsSlice';
import { useTheme } from '../../contexts/ThemeContext';
import VoteForm from './VoteForm';
import ResultsDisplay from './ResultsDisplay';
import PostVoteThankYou from './PostVoteThankYou';
import {
  Clock,
  Users,
  MoreVertical,
  Lock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { getPollOptionImageUrl, resolveMediaUrl } from '../../utils/resolveMediaUrl';

const PollCard = ({ poll, eventId, isOrganizer, isOrganizerView = false }) => {
  const { isDarkMode } = useTheme();

  if (!poll) {
    console.error('[PollCard] No poll data provided');
    return <div className="p-4 text-red-500">Error: No poll data</div>;
  }

  const pollOptions = poll.options_json || poll.options || [];
  if (pollOptions.length === 0) {
    console.warn('[PollCard] Poll has no options:', poll);
  }
  const dispatch = useDispatch();
  const { userVotes, pollResults, isVoting, isFetchingResults, errors } = useSelector(
    (state) => state.polls
  );
  const [showVoteForm, setShowVoteForm] = useState(false);

  const userVote = userVotes[poll.poll_id];
  const results = pollResults[poll.poll_id];
  const hasVoted = !!userVote;
  const isVotingInProgress = isVoting[poll.poll_id];
  const fetchingResults = isFetchingResults[poll.poll_id];

  // Load tallies only when the poll is closed (no live refresh loop for active polls)
  useEffect(() => {
    if (poll.status !== 'closed') return;
    const pid = poll.poll_id;
    if (results || fetchingResults) return;
    dispatch(fetchResults({ pollId: pid }));
  }, [poll.status, poll.poll_id, results, fetchingResults, dispatch]);

  const handleVote = async (optionIds) => {
    try {
      await dispatch(submitVote({ pollId: poll.poll_id, optionIds })).unwrap();
      setShowVoteForm(false);
    } catch (error) {
      console.error('Failed to submit vote:', error);
    }
  };

  const handleClosePoll = async () => {
    if (window.confirm('Are you sure you want to close this poll? This action cannot be undone.')) {
      try {
        await dispatch(closePoll({ pollId: poll.poll_id })).unwrap();
        dispatch(fetchResults({ pollId: poll.poll_id }));
      } catch (error) {
        console.error('Failed to close poll:', error);
      }
    }
  };

  const getTimeRemaining = () => {
    const closesAt = new Date(poll.closes_at);
    const now = new Date();
    const diff = closesAt - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getPollTypeLabel = (type) => {
    const types = {
      general: 'General Poll',
      artist_selection: 'Artist Selection',
      theme_selection: 'Theme Selection',
      feature_selection: 'Feature Selection'
    };
    return types[type] || 'General Poll';
  };

  const getStatusIcon = () => {
    switch (poll.status) {
      case 'active':
        return (
          <CheckCircle
            className={`w-5 h-5 ${isOrganizerView ? 'text-emerald-300' : 'text-green-500'}`}
          />
        );
      case 'closed':
        return (
          <Lock className={`w-5 h-5 ${isOrganizerView ? 'text-gray-300' : 'text-gray-500'}`} />
        );
      default:
        return (
          <AlertCircle
            className={`w-5 h-5 ${isOrganizerView ? 'text-amber-200' : 'text-yellow-500'}`}
          />
        );
    }
  };

  const getStatusColor = () => {
    switch (poll.status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const organizerStatusClass = () => {
    switch (poll.status) {
      case 'active':
        return 'border border-emerald-500/35 bg-emerald-500/10 text-emerald-200';
      case 'closed':
        return 'border border-white/15 bg-white/[0.07] text-gray-200';
      default:
        return 'border border-amber-500/35 bg-amber-500/10 text-amber-100';
    }
  };

  const cardSurface = isOrganizerView
    ? null
    : {
        background: 'var(--bg-card)',
        borderColor: 'var(--card-border)',
        color: isDarkMode ? 'var(--text-primary)' : 'var(--text-primary)'
      };

  const headerBorder = isOrganizerView ? 'border-white/10' : 'border-gray-100';

  const renderPollBody = () => {
    if (poll.status === 'closed') {
      return (
        <ResultsDisplay poll={poll} results={results} userVote={userVote} isLoading={fetchingResults} />
      );
    }

    if (hasVoted) {
      if (poll.allow_vote_changes && showVoteForm) {
        return (
          <VoteForm
            poll={poll}
            onVote={handleVote}
            onCancel={() => setShowVoteForm(false)}
            isVoting={isVotingInProgress}
            error={errors.vote}
          />
        );
      }
      return (
        <PostVoteThankYou
          poll={poll}
          userVote={userVote}
          allowChange={poll.allow_vote_changes}
          onChangeVote={poll.allow_vote_changes ? () => setShowVoteForm(true) : undefined}
          isOrganizerView={isOrganizerView}
        />
      );
    }

    if (showVoteForm && !isOrganizer) {
      return (
        <VoteForm
          poll={poll}
          onVote={handleVote}
          onCancel={() => setShowVoteForm(false)}
          isVoting={isVotingInProgress}
          error={errors.vote}
        />
      );
    }

    return (
      <div>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pollOptions.map((option, index) => {
            const optionImage = getPollOptionImageUrl(option);
            return (
            <div
              key={option.id || index}
              className={
                isOrganizerView
                  ? 'overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-sm backdrop-blur-sm transition-colors hover:border-white/15 hover:bg-white/[0.06]'
                  : isDarkMode
                    ? 'overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm'
                    : 'overflow-hidden rounded-xl border border-gray-200/80 bg-white/80 shadow-sm backdrop-blur-sm'
              }
            >
              {optionImage && (
                <div
                  className={`border-b ${
                    isOrganizerView
                      ? 'border-white/10'
                      : isDarkMode
                        ? 'border-white/10'
                        : 'border-gray-200/80'
                  }`}
                >
                  <img
                    src={resolveMediaUrl(optionImage)}
                    alt={option.label}
                    className="aspect-[16/10] w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={
                    isOrganizerView
                      ? 'flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-semibold text-gray-200'
                      : isDarkMode
                      ? 'flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-gray-300'
                      : 'flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600'
                  }
                >
                  {index + 1}
                </span>
                <span
                  className={
                    isOrganizerView ? 'font-medium text-white' : 'font-medium text-gray-900 dark:text-white'
                  }
                >
                  {option.label}
                </span>
              </div>
              {option.description && (
                <p
                  className={
                    isOrganizerView ? 'text-sm text-gray-400' : 'text-sm text-gray-600 dark:text-gray-400'
                  }
                >
                  {option.description}
                </p>
              )}
              </div>
            </div>
            );
          })}
        </div>

        {isOrganizer && poll.status === 'active' ? (
          <div
            className={`space-y-3 rounded-xl border p-4 text-center ${
              isOrganizerView
                ? 'border-white/10 bg-white/[0.04]'
                : 'border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5'
            }`}
          >
            <p
              className={`text-sm ${isOrganizerView ? 'text-gray-300' : 'text-gray-600 dark:text-gray-300'}`}
            >
              {isOrganizerView
                ? 'Ticket holders vote from the attendee polls experience for this event.'
                : 'Ticket holders vote on this poll. Share the attendee polls link so they can participate.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {isOrganizerView && (
                <Link
                  to={`/organizer/events/${eventId}/polls/${poll.poll_id}/results`}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#4f0f69] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5a1a75]"
                >
                  <BarChart3 className="h-4 w-4" />
                  Poll results
                </Link>
              )}
              {!isOrganizerView && (
                <a
                  href={`/events/${eventId}/polls`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm font-medium text-[#4f0f69] underline-offset-2 hover:underline hover:text-[#6b1a8a] dark:text-[#b388ff]"
                >
                  Preview as attendee
                </a>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowVoteForm(true)}
            disabled={isVotingInProgress}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4f0f69]/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isVotingInProgress ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing…
              </>
            ) : (
              'Vote now'
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      className={
        isOrganizerView
          ? 'rounded-xl border border-white/10 bg-slate-900/50 text-white shadow-sm backdrop-blur-sm transition-colors duration-200 hover:border-white/[0.14]'
          : 'rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md'
      }
      style={cardSurface || undefined}
    >
      <div className={`border-b p-6 ${headerBorder}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                  isOrganizerView ? organizerStatusClass() : getStatusColor()
                }`}
              >
                {getStatusIcon()}
                {poll.status.charAt(0).toUpperCase() + poll.status.slice(1)}
              </span>
              <span
                className={`rounded-full border px-2 py-1 text-xs ${
                  isOrganizerView
                    ? 'border-white/15 bg-white/10 text-gray-200'
                    : 'bg-gray-100 text-gray-500 dark:border-white/10 dark:bg-white/10 dark:text-gray-300'
                }`}
              >
                {getPollTypeLabel(poll.poll_type)}
              </span>
            </div>

            <h3
              className={`mb-2 text-lg font-semibold ${isOrganizerView ? 'text-white' : ''}`}
              style={
                isOrganizerView
                  ? undefined
                  : { color: isDarkMode ? 'var(--text-primary)' : 'var(--text-primary)' }
              }
            >
              {poll.question}
            </h3>

            {poll.description && (
              <p
                className={`mb-3 text-sm ${isOrganizerView ? 'text-gray-400' : ''}`}
                style={
                  isOrganizerView
                    ? undefined
                    : { color: isDarkMode ? 'var(--text-secondary)' : 'var(--text-secondary)' }
                }
              >
                {poll.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isOrganizerView && (
              <Link
                to={`/organizer/events/${eventId}/polls/${poll.poll_id}/results`}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                title="Open poll results page"
              >
                <BarChart3 className="h-5 w-5" />
              </Link>
            )}
            {isOrganizer && poll.status === 'active' && (
              <button
                onClick={handleClosePoll}
                className={
                  isOrganizerView
                    ? 'text-gray-400 transition-colors hover:text-white'
                    : 'text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300'
                }
                title="Close poll"
                type="button"
              >
                <Lock className="h-5 w-5" />
              </button>
            )}

            <button
              type="button"
              className={
                isOrganizerView
                  ? 'text-gray-500 transition-colors hover:text-white'
                  : 'text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300'
              }
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          className={`mt-4 flex flex-wrap items-center gap-4 text-sm ${
            isOrganizerView ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{poll.status === 'active' ? `Closes in ${getTimeRemaining()}` : 'Closed'}</span>
          </div>

          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>
              Max {poll.max_votes} vote{poll.max_votes > 1 ? 's' : ''}
            </span>
          </div>

          {poll.allow_anonymous && (
            <span
              className={
                isOrganizerView
                  ? 'rounded-full border border-blue-400/30 bg-blue-500/15 px-2 py-1 text-xs text-blue-100'
                  : 'rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
              }
            >
              Anonymous
            </span>
          )}

          {poll.allow_vote_changes && (
            <span
              className={
                isOrganizerView
                  ? 'rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-100'
                  : 'rounded-full bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-200'
              }
            >
              Vote changes
            </span>
          )}
        </div>
      </div>

      <div className="p-6">{renderPollBody()}</div>
    </div>
  );
};

export default PollCard;
