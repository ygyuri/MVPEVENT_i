import React from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PollList } from '../components/polls';
import { ArrowLeft, Users, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const PollsPage = () => {
  const { eventId } = useParams();
  const { user } = useSelector(state => state.auth);
  
  const isOrganizer = user?.role === 'organizer' || user?.events_organized?.includes(eventId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to={isOrganizer ? `/organizer/events/${eventId}` : `/events/${eventId}`}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Event
            </Link>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Event Polls
              </h1>
              <p className="text-gray-600">
                {isOrganizer 
                  ? "Create and manage interactive polls for your event"
                  : "Participate in event polls and see real-time results"
                }
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

        {/* Polls Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <PollList eventId={eventId} />
        </div>

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {isOrganizer ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  Organizer Features
                </h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• Create unlimited polls for your event</li>
                  <li>• Real-time results and analytics</li>
                  <li>• Export poll data for analysis</li>
                  <li>• Control poll settings and permissions</li>
                  <li>• Close polls manually or automatically</li>
                </ul>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  Best Practices
                </h3>
                <ul className="text-sm text-green-800 space-y-2">
                  <li>• Create polls before your event starts</li>
                  <li>• Use clear, specific questions</li>
                  <li>• Enable anonymous voting for honest feedback</li>
                  <li>• Share results to increase engagement</li>
                  <li>• Export data for post-event analysis</li>
                </ul>
              </div>
            </>
          ) : (
            <>
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
                  <li>• <strong>General:</strong> Basic questions and feedback</li>
                  <li>• <strong>Artist Selection:</strong> Choose performers</li>
                  <li>• <strong>Theme Selection:</strong> Pick event themes</li>
                  <li>• <strong>Feature Selection:</strong> Select event features</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollsPage;
