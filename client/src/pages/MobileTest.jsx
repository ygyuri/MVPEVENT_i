import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const MobileTest = () => {
  const [apiStatus, setApiStatus] = useState('Testing...');
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    testApiConnection();
  }, []);

  const testApiConnection = async () => {
    try {
      setApiStatus('Testing API connection...');
      
      // Test health endpoint
      const healthResponse = await api.get('/api/health');
      console.log('Health check response:', healthResponse.data);
      
      setApiStatus('API connected! Testing events...');
      
      // Test events endpoint
      const eventsResponse = await api.get('/api/events');
      console.log('Events response:', eventsResponse.data);
      
      setEvents(eventsResponse.data.events || []);
      setApiStatus('✅ All tests passed! API is working correctly.');
      setError(null);
      
    } catch (err) {
      console.error('API test failed:', err);
      setError(err.message);
      setApiStatus('❌ API connection failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container-modern py-8">
        <div className="text-center-modern mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            📱 Mobile API Test
          </h1>
          <p className="text-lg text-gray-600">
            Testing API connectivity for mobile devices
          </p>
        </div>

        <div className="card-modern mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            API Status
          </h2>
          <div className="text-center p-4">
            <div className={`text-lg font-semibold ${
              apiStatus.includes('✅') ? 'text-green-600' : 
              apiStatus.includes('❌') ? 'text-red-600' : 'text-blue-600'
            }`}>
              {apiStatus}
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">Error Details:</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        {events.length > 0 && (
          <div className="card-modern">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Events from API ({events.length})
            </h2>
            <div className="space-y-4">
              {events.slice(0, 5).map((event) => (
                <div key={event.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <p className="text-gray-600 text-sm">{event.description}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    ID: {event.id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card-modern mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            Debug Information
          </h2>
          <div className="space-y-2 text-sm">
            <div><strong>Current URL:</strong> {window.location.href}</div>
            <div><strong>Hostname:</strong> {window.location.hostname}</div>
            <div><strong>Port:</strong> {window.location.port}</div>
            <div><strong>User Agent:</strong> {navigator.userAgent}</div>
            <div><strong>Network:</strong> {navigator.connection ? navigator.connection.effectiveType : 'Unknown'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileTest;
