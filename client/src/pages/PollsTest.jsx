import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { PollList } from '../components/polls';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings, Users, TrendingUp } from 'lucide-react';

const PollsTest = () => {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const [testEventId, setTestEventId] = useState('test-event-123');

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please log in to test the polls feature.</p>
          <Link
            to="/auth-test"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Auth Test
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Polls Feature Test
            </h1>
            <p className="text-gray-600 mb-4">
              Test the complete polls functionality with real-time updates
            </p>
            
            {/* User Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">Current User</h3>
              <div className="text-sm text-blue-800">
                <p><strong>Name:</strong> {user?.name || user?.email}</p>
                <p><strong>Role:</strong> {user?.role}</p>
                <p><strong>Email:</strong> {user?.email}</p>
              </div>
            </div>

            {/* Event ID Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Event ID
              </label>
              <input
                type="text"
                value={testEventId}
                onChange={(e) => setTestEventId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter event ID to test polls"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use a real event ID from your database, or keep the default test ID
              </p>
            </div>
          </div>
        </div>

        {/* Test Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500" />
              Organizer Features
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Create new polls with different types</li>
              <li>• Set poll settings (anonymous, vote changes)</li>
              <li>• Close polls manually</li>
              <li>• View real-time results</li>
              <li>• Export poll data</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              Attendee Features
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Vote on active polls</li>
              <li>• See live results updates</li>
              <li>• Change votes if allowed</li>
              <li>• View final results</li>
              <li>• Participate anonymously</li>
            </ul>
          </div>
        </div>

        {/* Polls Component */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <PollList eventId={testEventId} />
        </div>

        {/* Testing Tips */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Testing Tips
          </h3>
          <div className="text-sm text-yellow-800 space-y-2">
            <p><strong>For Organizers:</strong> You can create, manage, and close polls. Test all poll types and settings.</p>
            <p><strong>For Attendees:</strong> You can vote and see real-time results. Test vote changes and anonymous voting.</p>
            <p><strong>Real-time:</strong> Open multiple browser tabs to see live updates when creating polls or voting.</p>
            <p><strong>Backend:</strong> Make sure your backend server is running and polls API endpoints are working.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollsTest;
