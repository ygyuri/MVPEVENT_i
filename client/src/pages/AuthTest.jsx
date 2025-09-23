import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout, getCurrentUser } from '../store/slices/authSlice';

const AuthTest = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading, error } = useSelector(state => state.auth);

  const handleRefreshUser = () => {
    dispatch(getCurrentUser());
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🔐 M1 Authentication System Test
          </h1>
          
          {/* Authentication Status */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status:</p>
                <p className={`font-medium ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                  {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Loading:</p>
                <p className={`font-medium ${loading ? 'text-blue-600' : 'text-gray-600'}`}>
                  {loading ? '⏳ Loading...' : '✅ Ready'}
                </p>
              </div>
            </div>
          </div>

          {/* User Information */}
          {isAuthenticated && user && (
            <div className="mb-8 p-6 bg-blue-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">User Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name:</p>
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Username:</p>
                  <p className="font-medium">{user.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email:</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Role:</p>
                  <p className="font-medium capitalize text-blue-600">{user.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-red-800 font-medium">Error:</h3>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Test Actions */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Test Actions</h2>
            
            {isAuthenticated ? (
              <div className="space-x-4">
                <button
                  onClick={handleRefreshUser}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Refresh User Data
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  <strong>To test authentication:</strong>
                </p>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-yellow-700">
                  <li>Click the "Sign In" button in the navbar</li>
                  <li>Switch to "Sign up" to create a new account</li>
                  <li>Fill in the registration form and submit</li>
                  <li>You'll be automatically logged in after registration</li>
                  <li>Or use the login form with existing credentials</li>
                </ol>
              </div>
            )}
          </div>

          {/* Token Information */}
          {isAuthenticated && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Token Information</h2>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Access Token:</p>
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                    {localStorage.getItem('authToken')?.substring(0, 50)}...
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Refresh Token:</p>
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                    {localStorage.getItem('refreshToken')?.substring(0, 50)}...
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthTest;
