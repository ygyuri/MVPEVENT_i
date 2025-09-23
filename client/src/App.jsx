import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Checkout from './pages/Checkout';
import AuthTest from './pages/AuthTest';
import UserProfile from './pages/UserProfile';
import { getCurrentUser } from './store/slices/authSlice';

function App() {
  const dispatch = useDispatch();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and load user data
    const token = localStorage.getItem('authToken');
    if (token) {
      dispatch(getCurrentUser());
    }
  }, [dispatch]);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-web3-primary theme-transition">
        <Navbar onOpenAuthModal={() => setIsAuthModalOpen(true)} />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:slug" element={<EventDetails />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/auth-test" element={<AuthTest />} />
            <Route path="/profile" element={<UserProfile />} />
          </Routes>
        </main>
        
        {/* AuthModal rendered at root level */}
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
        />
      </div>
    </ThemeProvider>
  );
}

export default App; 