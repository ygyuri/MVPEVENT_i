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
import TicketWallet from './pages/TicketWallet';
import Scanner from './pages/Scanner';
import AdminScans from './pages/AdminScans';
import EventQRSettings from './pages/EventQRSettings';
import OrganizerDashboard from './pages/OrganizerDashboard';
import EventCreate from './pages/EventCreate';
import EventManagement from './pages/EventManagement';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import { getCurrentUser } from './store/slices/authSlice';
import './utils/testAuth'; // Load test authentication helper

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
            <Route path="/wallet" element={<TicketWallet />} />
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/admin/scans" element={<AdminScans />} />
            <Route path="/organizer" element={<OrganizerDashboard />} />
            <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
            <Route path="/organizer/events" element={<EventManagement />} />
            <Route path="/organizer/events/create" element={<EventCreate />} />
            <Route path="/organizer/events/:eventId/edit" element={<EventCreate />} />
            <Route path="/organizer/events/:eventId/qr-settings" element={<EventQRSettings />} />
            <Route path="/organizer/analytics" element={<AnalyticsDashboard />} />
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