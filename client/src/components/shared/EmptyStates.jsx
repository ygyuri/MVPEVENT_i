import React from 'react';
import { Inbox, Vote, CheckCircle } from 'lucide-react';

export const NoActivePolls = ({ isOrganizer, onCreatePoll }) => (
  <div className="text-center py-16">
    <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
      <Vote className="w-10 h-10 text-purple-600" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Active Polls</h3>
    <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
      {isOrganizer
        ? 'Create your first poll to engage with your attendees and gather their preferences.'
        : 'There are no active polls at the moment. Check back later!'}
    </p>
    {isOrganizer && (
      <button
        onClick={onCreatePoll}
        className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
      >
        Create Poll
      </button>
    )}
  </div>
);

export const NoClosedPolls = () => (
  <div className="text-center py-16">
    <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
      <Inbox className="w-10 h-10 text-gray-400" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Closed Polls Yet</h3>
    <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">Polls that have ended will appear here for you to review past results.</p>
  </div>
);

export const VoteSubmitted = ({ onViewResults }) => (
  <div className="text-center py-12">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
      <CheckCircle className="w-8 h-8 text-green-600" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Vote Submitted!</h3>
    <p className="text-gray-600 dark:text-gray-300 mb-4">Your vote has been recorded successfully.</p>
    <button onClick={onViewResults} className="text-purple-600 hover:text-purple-700 dark:text-purple-300 dark:hover:text-purple-200 font-medium">View Live Results →</button>
  </div>
);
