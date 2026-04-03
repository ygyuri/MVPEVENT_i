import React from 'react';
import { CheckCircle2, Sparkles, PenLine } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';
import { getPollOptionImageUrl, resolveMediaUrl } from '../../utils/resolveMediaUrl';

/**
 * Shown after an attendee votes on an active poll — no live results / refresh loop.
 * Full tallies appear once the poll is closed (ResultsDisplay on PollCard).
 */
const PostVoteThankYou = ({ poll, userVote, onChangeVote, allowChange, isOrganizerView }) => {
  const { isDarkMode } = useTheme();
  const options = poll.options_json || poll.options || [];
  const selected = Array.isArray(userVote) ? userVote : [];
  const chosen = options.filter((o) => selected.includes(o.id));

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-6 md:p-8 text-center',
        isOrganizerView
          ? 'border-white/15 bg-white/[0.07] backdrop-blur-md'
          : isDarkMode
            ? 'border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl'
            : 'border-gray-200/80 bg-gradient-to-br from-white via-gray-50/90 to-indigo-50/40 backdrop-blur-md shadow-lg shadow-gray-200/40'
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl',
          isOrganizerView || isDarkMode ? 'bg-[#8A4FFF]/25' : 'bg-[#8A4FFF]/20'
        )}
      />

      <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
        <CheckCircle2 className="h-9 w-9 text-white" strokeWidth={2.2} />
      </div>

      <h3
        className={cn(
          'text-xl font-semibold tracking-tight md:text-2xl',
          isOrganizerView || isDarkMode ? 'text-white' : 'text-gray-900'
        )}
      >
        Thanks for voting!
      </h3>
      <p
        className={cn(
          'mx-auto mt-2 max-w-md text-sm',
          isOrganizerView || isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}
      >
        Your response was recorded. In this event, detailed results are shown after the poll closes so
        everyone gets a fair vote.
      </p>

      {chosen.length > 0 && (
        <div className="mt-6 text-left">
          <p
            className={cn(
              'mb-3 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wider',
              isOrganizerView || isDarkMode ? 'text-gray-400' : 'text-gray-500'
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#8A4FFF]" />
            Your choice{chosen.length > 1 ? 's' : ''}
          </p>
          <ul className="mx-auto flex max-w-lg flex-col gap-2 sm:mx-0">
            {chosen.map((opt) => {
              const thumb = getPollOptionImageUrl(opt);
              return (
              <li
                key={opt.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm',
                  isOrganizerView || isDarkMode
                    ? 'border-white/10 bg-white/5 text-gray-100'
                    : 'border-gray-200/90 bg-white/80 text-gray-900 shadow-sm'
                )}
              >
                {thumb ? (
                  <img
                    src={resolveMediaUrl(thumb)}
                    alt={opt.label}
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                ) : null}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 font-medium">{opt.label}</span>
              </li>
              );
            })}
          </ul>
        </div>
      )}

      {allowChange && onChangeVote && (
        <button
          type="button"
          onClick={onChangeVote}
          className={cn(
            'mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all',
            'border focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4FFF]/50',
            isOrganizerView || isDarkMode
              ? 'border-white/20 bg-white/10 text-white hover:bg-white/15'
              : 'border-gray-300 bg-white text-gray-800 hover:border-[#4f0f69]/40 hover:bg-gray-50'
          )}
        >
          <PenLine className="h-4 w-4" />
          Change my vote
        </button>
      )}
    </div>
  );
};

export default PostVoteThankYou;
