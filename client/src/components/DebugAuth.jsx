import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { checkAndFixAuth, quickLogin } from '../utils/authFix';

const DebugAuth = () => {
  const { user, token } = useSelector(state => state.auth);
  const [authStatus, setAuthStatus] = useState('checking...');

  useEffect(() => {
    const checkAuth = async () => {
      const result = await checkAndFixAuth();
      if (result.isAuthenticated) {
        setAuthStatus('✅ Token valid');
      } else {
        setAuthStatus('❌ Authentication needed');
      }
    };

    checkAuth();
  }, [token, user]);

  const handleQuickLogin = async () => {
    setAuthStatus('🔄 Logging in...');
    const result = await quickLogin();
    if (result.success) {
      setAuthStatus('✅ Login successful');
      window.location.reload(); // Refresh to update Redux state
    } else {
      setAuthStatus(`❌ Login failed: ${result.error}`);
    }
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <div>🔍 Auth Debug</div>
      <div>Status: {authStatus}</div>
      <div>User: {user ? user.email : 'None'}</div>
      <div>Token: {token || localStorage.getItem('authToken') ? 'Present' : 'Missing'}</div>
      {authStatus.includes('❌') && (
        <button 
          onClick={handleQuickLogin}
          style={{
            marginTop: '5px',
            padding: '2px 6px',
            fontSize: '10px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Quick Login
        </button>
      )}
    </div>
  );
};

export default DebugAuth;
