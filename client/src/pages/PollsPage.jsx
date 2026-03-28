import React from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PollList } from '../components/polls';
import { ArrowLeft, Users, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const PollsPage = () => {
  const { eventId } = useParams();
  const { user } = useSelector(state => state.auth);

  const isOrganizer =
    user?.role === 'organizer' || user?.events_organized?.includes(eventId);

  if (isOrganizer) {
    return (
      <div className="min-h-screen text-white">
        <div className="container-modern py-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link
                to={`/organizer/events/${eventId}`}
                className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Event
              </Link>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Event Polls</h1>
                <p className="text-gray-300 max-w-xl">
                  Create and manage interactive polls for your event
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#8A4FFF]" />
                  <span>Live Results</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#8A4FFF]" />
                  <span>Real-time Updates</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 md:p-6">
            <PollList eventId={eventId} isOrganizerView />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-[#8A4FFF]/25 bg-[#4f0f69]/15 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Organizer features
              </h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• Create polls for your event (up to 5 active)</li>
                <li>• Real-time results as ticket holders vote</li>
                <li>• Close polls early when you are ready</li>
                <li>• Share the polls URL with attendees who have tickets</li>
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Best practices
              </h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• Publish polls before or during the event</li>
                <li>• Use clear questions and distinct options</li>
                <li>• Anonymous voting can encourage honest feedback</li>
                <li>• Close polls to lock in final counts for planning</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to={`/events/${eventId}`}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Event
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Polls</h1>
              <p className="text-gray-600">
                Participate in event polls and see real-time results
              </p>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Live Results</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Real-time Updates</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <PollList eventId={eventId} />
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              How to Participate
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• Vote on active polls</li>
              <li>• See live results as votes come in</li>
              <li>• Change your vote if allowed</li>
              <li>• View final results when polls close</li>
              <li>• Participate anonymously if enabled</li>
            </ul>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-3">
              Poll Types
            </h3>
            <ul className="text-sm text-purple-800 space-y-2">
              <li>
                • <strong>General:</strong> Basic questions and feedback
              </li>
              <li>
                • <strong>Artist Selection:</strong> Choose performers
              </li>
              <li>
                • <strong>Theme Selection:</strong> Pick event themes
              </li>
              <li>
                • <strong>Feature Selection:</strong> Select event features
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollsPage;
