import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { checkAndFixAuth, quickLogin } from '../utils/authFix';

const DebugAuth = () => {
  const { user, token } = useSelector(state => state.auth);
  const [authStatus, setAuthStatus] = useState('checking...');
  const [visible, setVisible] = useState(true);

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

  // Collapsible floating debug widget positioned bottom-right, non-blocking
  return (
    <div style={{ position: 'fixed', bottom: 10, right: 10, zIndex: 9999, pointerEvents: 'none' }}>
      {/* Toggle pill */}
      {!visible && (
        <button
          onClick={() => setVisible(true)}
          style={{
            pointerEvents: 'auto',
            background: 'rgba(0,0,0,0.75)',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            padding: '6px 10px',
            fontSize: '12px',
            fontFamily: 'monospace',
            cursor: 'pointer'
          }}
        >
          🔍 Auth Debug
        </button>
      )}

      {visible && (
        <div style={{
          pointerEvents: 'auto',
          background: 'rgba(0,0,0,0.85)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          minWidth: '220px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontWeight: 600 }}>🔍 Auth Debug</div>
            <button
              onClick={() => setVisible(false)}
              title="Hide"
              style={{
                background: 'transparent',
                color: '#fff',
                border: 0,
                fontSize: 14,
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          <div>Status: {authStatus}</div>
          <div>User: {user ? user.email : 'None'}</div>
          <div>Token: {token || localStorage.getItem('authToken') ? 'Present' : 'Missing'}</div>
          {authStatus.includes('❌') && (
            <button 
              onClick={handleQuickLogin}
              style={{
                marginTop: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Quick Login
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DebugAuth;
