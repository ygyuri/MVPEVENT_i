import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";
import { ThemeProvider } from "./contexts/ThemeContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AuthModal from "./components/AuthModal";
import ModernBackground from "./components/common/ModernBackground";
import Home from "./pages/Home";
import Events from "./pages/Events";
import DirectCheckout from "./pages/DirectCheckout";
import PaymentStatus from "./pages/PaymentStatus";
import AuthTest from "./pages/AuthTest";
import UserProfile from "./pages/UserProfile";
import TicketWallet from "./pages/TicketWallet";
import Scanner from "./pages/Scanner";
import AdminScans from "./pages/AdminScans";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminEvents from "./pages/AdminEvents";
import AdminOrders from "./pages/AdminOrders";
import EventQRSettings from "./pages/EventQRSettings";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import EventCreate from "./pages/EventCreate";
import EventManagement from "./pages/EventManagement";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import OrganizerCommissionSetup from "./pages/OrganizerCommissionSetup";
import AffiliateAnalytics from "./pages/AffiliateAnalytics";
import ReferralLinksManager from "./pages/ReferralLinksManager";
import UserPreferences from "./pages/UserPreferences";
import ReminderHistory from "./pages/ReminderHistory";
import PollsPage from "./pages/PollsPage";
import PollsTest from "./pages/PollsTest";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import Error404 from "./pages/Error404";
import {
  OrganizerUpdatesDashboard,
  AttendeeUpdatesView,
} from "./pages/EventUpdates";
import { getCurrentUser, setAuthToken } from "./store/slices/authSlice";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { ToastProvider } from "./components/shared/Toast";
import ScrollToTop from "./components/shared/ScrollToTop";
import { useNavigate, useLocation } from "react-router-dom";

function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and load user data
    const token = localStorage.getItem("authToken");
    if (token) {
      dispatch(getCurrentUser());
    }
  }, [dispatch]);

  // Handle OAuth callback fallback (when window.opener is not available)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const oauthStatus = searchParams.get("oauth");
    const provider = searchParams.get("provider");
    const tokensParam = searchParams.get("tokens");

    if (oauthStatus === "success" && provider === "google") {
      console.log("🔄 [OAUTH FALLBACK] Detected OAuth success in URL");
      
      // If tokens are in URL, decode and store them
      if (tokensParam) {
        try {
          // Decode base64url in browser
          const base64Url = tokensParam.replace(/-/g, "+").replace(/_/g, "/");
          const padded = base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4);
          const binaryString = atob(padded);
          const tokens = JSON.parse(binaryString);
          
          console.log("🔐 [OAUTH FALLBACK] Tokens found in URL, storing...");
          
          if (tokens.accessToken && tokens.refreshToken) {
            localStorage.setItem("authToken", tokens.accessToken);
            localStorage.setItem("refreshToken", tokens.refreshToken);
            dispatch(setAuthToken(tokens.accessToken));
            console.log("✅ [OAUTH FALLBACK] Tokens stored successfully");
          }
        } catch (error) {
          console.error("❌ [OAUTH FALLBACK] Failed to decode tokens:", error);
        }
      }
      
      // Remove OAuth params from URL
      const newSearchParams = new URLSearchParams(location.search);
      newSearchParams.delete("oauth");
      newSearchParams.delete("provider");
      newSearchParams.delete("tokens");
      const newSearch = newSearchParams.toString();
      const newPath = location.pathname + (newSearch ? `?${newSearch}` : "");
      window.history.replaceState({}, "", newPath);

      // Fetch user from backend (session should be active)
      dispatch(getCurrentUser())
        .unwrap()
        .then((user) => {
          console.log("✅ [OAUTH FALLBACK] User fetched successfully:", user);
        })
        .catch((error) => {
          console.error("❌ [OAUTH FALLBACK] Failed to fetch user:", error);
        });
    }
  }, [location, dispatch, navigate]);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <ThemeProvider>
          <ModernBackground />
          <div className="min-h-screen theme-transition relative">
            <div className="relative z-10">
              <Navbar onOpenAuthModal={() => setIsAuthModalOpen(true)} />
              <main className="relative">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/events" element={<Events />} />
                  <Route
                    path="/events/:slug/checkout"
                    element={<DirectCheckout />}
                  />
                  <Route path="/payment/:orderId" element={<PaymentStatus />} />
                  <Route path="/auth-test" element={<AuthTest />} />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/wallet" element={<TicketWallet />} />
                  <Route path="/scanner" element={<Scanner />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/events" element={<AdminEvents />} />
                  <Route path="/admin/orders" element={<AdminOrders />} />
                  <Route path="/admin/scans" element={<AdminScans />} />
                  <Route path="/organizer" element={<OrganizerDashboard />} />
                  <Route
                    path="/organizer/dashboard"
                    element={<OrganizerDashboard />}
                  />
                  <Route
                    path="/organizer/events"
                    element={<EventManagement />}
                  />
                  <Route
                    path="/organizer/events/create"
                    element={<EventCreate />}
                  />
                  <Route
                    path="/organizer/events/:eventId/edit"
                    element={<EventCreate />}
                  />
                  <Route
                    path="/organizer/events/:eventId/qr-settings"
                    element={<EventQRSettings />}
                  />
                  <Route
                    path="/organizer/events/:eventId/commission-setup"
                    element={<OrganizerCommissionSetup />}
                  />
                  <Route
                    path="/organizer/analytics"
                    element={<AnalyticsDashboard />}
                  />
                  {/* Affiliate features - temporarily hidden for production */}
                  {/* <Route path="/affiliate-analytics" element={<AffiliateAnalytics />} /> */}
                  {/* <Route path="/affiliate/referral-links" element={<ReferralLinksManager />} /> */}
                  <Route
                    path="/preferences/reminders"
                    element={<UserPreferences />}
                  />
                  <Route
                    path="/reminders/history"
                    element={<ReminderHistory />}
                  />
                  {/* Updates features - temporarily hidden for production */}
                  {/* <Route path="/organizer/events/:eventId/updates" element={<OrganizerUpdatesDashboard />} /> */}
                  {/* <Route path="/events/:eventId/updates" element={<AttendeeUpdatesView />} /> */}
                  <Route
                    path="/events/:eventId/polls"
                    element={<PollsPage />}
                  />
                  <Route path="/polls-test" element={<PollsTest />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/cookies" element={<CookiePolicy />} />
                  <Route path="*" element={<Error404 />} />
                </Routes>
              </main>
              <Footer />
            </div>
            <ScrollToTop />
            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={() => setIsAuthModalOpen(false)}
            />
          </div>
        </ThemeProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
