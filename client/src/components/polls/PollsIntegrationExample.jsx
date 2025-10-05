import React from 'react';
import { useSelector } from 'react-redux';
import { PollList } from './index';

/**
 * Example integration of Polls feature into an existing page
 * This shows how to use the PollList component in your application
 */
const PollsIntegrationExample = ({ eventId }) => {
  const { user } = useSelector(state => state.auth);
  const isOrganizer = user?.role === 'organizer' || user?.events_organized?.includes(eventId);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Event Polls
        </h1>
        <p className="text-gray-600">
          Engage your audience with interactive polls and get real-time feedback
        </p>
      </div>

      {/* Polls Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <PollList eventId={eventId} />
      </div>

      {/* Additional Info for Organizers */}
      {isOrganizer && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Organizer Tips
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Create polls before your event to build anticipation</li>
            <li>• Use real-time results to engage your audience</li>
            <li>• Export results for post-event analysis</li>
            <li>• Enable anonymous voting for honest feedback</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default PollsIntegrationExample;
