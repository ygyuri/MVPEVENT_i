import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import {
  Plus,
  Calendar,
  Users,
  TrendingUp,
  Eye,
  MessageSquare,
  Clock,
  Bell,
  CheckCircle,
} from "lucide-react";
import EnhancedButton from "../components/EnhancedButton";
import EventStatusBadge from "../components/organizer/EventStatusBadge";
import UpdateComposer from "../components/organizer/UpdateComposer";
import {
  getOrganizerOverview,
  fetchMyEvents,
} from "../store/slices/organizerSlice";
import { dateUtils } from "../utils/eventHelpers";
import { useEventUpdates } from "../hooks/useEventUpdates";
import { useSocket } from "../hooks/useSocket";

const OrganizerDashboard = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    loading: authLoading,
  } = useSelector((state) => state.auth);
  const { overview, events, loading } = useSelector((state) => state.organizer);

  // Check if user just published an event
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);
  const [publishedEventTitle, setPublishedEventTitle] = useState("");

  // Update composer state
  const [showUpdateComposer, setShowUpdateComposer] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Recent updates state
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [allEventUpdates, setAllEventUpdates] = useState({});

  // Handle post-publish celebration
  useEffect(() => {
    if (location.state?.justPublished) {
      setShowPublishSuccess(true);
      setPublishedEventTitle(location.state.eventTitle || "Your event");
      // Clear the state so it doesn't show again on refresh
      window.history.replaceState({}, document.title);
      // Auto-hide after 10 seconds
      setTimeout(() => setShowPublishSuccess(false), 10000);
    }
  }, [location]);

  useEffect(() => {
    // Only load data if user is authenticated and user data is loaded
    if (!isAuthenticated || !user || authLoading) {
      return;
    }

    // Check if user is an organizer
    if (user.role !== "organizer") {
      return;
    }

    // Check if overview is already loaded
    if (!overview || Object.keys(overview).length === 0) {
      dispatch(getOrganizerOverview());
    }

    // Check if events are already loaded
    if (!events || events.length === 0) {
      dispatch(fetchMyEvents({ page: 1, pageSize: 6 }));
    }
  }, [dispatch, isAuthenticated, user, authLoading, overview, events]);

  // Show loading state while authentication is in progress
  if (authLoading || !isAuthenticated) {
    return (
      <div className="container-modern">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if user is not an organizer
  if (user && user.role !== "organizer") {
    return (
      <div className="container-modern">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              You need organizer privileges to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const recentEvents = events.slice(0, 5);

  // Handle update composer
  const handlePostUpdate = (eventId) => {
    setSelectedEventId(eventId);
    setShowUpdateComposer(true);
  };

  const handleUpdateCreated = (update) => {
    // Add the new update to recent updates
    const newUpdate = {
      ...update,
      eventTitle:
        events.find((e) => e._id === update.eventId)?.title || "Unknown Event",
      eventId: update.eventId,
    };

    setRecentUpdates((prev) => [newUpdate, ...prev].slice(0, 5)); // Keep only 5 most recent

    // Update the specific event's updates
    setAllEventUpdates((prev) => ({
      ...prev,
      [update.eventId]: [newUpdate, ...(prev[update.eventId] || [])].slice(
        0,
        3
      ),
    }));
  };

  const handleCloseComposer = () => {
    setShowUpdateComposer(false);
    setSelectedEventId(null);
  };

  const stats = [
    {
      label: "Total Events",
      value: overview.myEventsCount || 0,
      icon: Calendar,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Published Events",
      value: events.filter((event) => event.status === "published").length,
      icon: Eye,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "Draft Events",
      value: events.filter((event) => event.status === "draft").length,
      icon: Users,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    },
    {
      label: "This Month",
      value: events.filter((event) => {
        const eventDate = new Date(event.dates?.startDate);
        const now = new Date();
        return (
          eventDate.getMonth() === now.getMonth() &&
          eventDate.getFullYear() === now.getFullYear()
        );
      }).length,
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
  ];

  return (
    <div className="container-modern">
      {/* Success Banner - Show after publishing an event */}
      {showPublishSuccess && (
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">
                🎉 Event Published Successfully!
              </h3>
              <p className="text-green-800 dark:text-green-200 mb-3">
                <strong>{publishedEventTitle}</strong> is now live and ready for
                attendees to discover and purchase tickets!
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/organizer/events"
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 font-medium text-sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View All Events
                </Link>
                <button
                  onClick={() => setShowPublishSuccess(false)}
                  className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200 font-medium border border-gray-300 dark:border-gray-600 text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.firstName || "Organizer"}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your events and track your performance
            </p>
          </div>

          <Link to="/organizer/events/create">
            <EnhancedButton
              variant="primary"
              size="lg"
              icon={Plus}
              className="btn-web3-primary"
            >
              Create New Event
            </EnhancedButton>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-web3-card rounded-xl p-6 hover:bg-web3-card-hover transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Events */}
        <div className="lg:col-span-2">
          <div className="bg-web3-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Events
              </h2>
              <Link
                to="/organizer/events"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
              >
                View All
              </Link>
            </div>

            {loading.events ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : recentEvents.length > 0 ? (
              <div className="space-y-4">
                {recentEvents.map((event) => (
                  <div
                    key={event._id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 border border-gray-200/20 dark:border-gray-700/20"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {event.title || "Untitled Event"}
                        </h3>
                        <EventStatusBadge status={event.status} size="small" />
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {event.dates?.startDate && (
                          <span>
                            {dateUtils.formatDate(event.dates.startDate, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}

                        {event.location?.city && (
                          <span>📍 {event.location.city}</span>
                        )}

                        {event.pricing && (
                          <span>
                            {event.pricing.isFree
                              ? "Free"
                              : `$${event.pricing.price}`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Post Update feature - temporarily hidden for production */}
                      {/* <button
                        onClick={() => handlePostUpdate(event._id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                        disabled={event.status === 'cancelled'}
                      >
                        <MessageSquare className="w-4 h-4" />
                        Post Update
                      </button> */}
                      <Link
                        to={`/organizer/events/${event._id}/edit`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        Edit
                      </Link>
                      {/* Live Updates feature - temporarily hidden for production */}
                      {/* <Link
                        to={`/organizer/events/${event._id}/updates`}
                        className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm font-medium"
                      >
                        Live Updates
                      </Link> */}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No events yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Create your first event to get started
                </p>
                <Link to="/organizer/events/create">
                  <EnhancedButton variant="primary" icon={Plus}>
                    Create Event
                  </EnhancedButton>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-web3-card rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>

            <div className="space-y-3">
              <Link
                to="/organizer/events/create"
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Create Event
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Start a new event
                  </p>
                </div>
              </Link>

              <Link
                to="/organizer/events"
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              >
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Manage Events
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    View all your events
                  </p>
                </div>
              </Link>

              <Link
                to="/organizer/analytics"
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              >
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Analytics
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    View performance
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Updates Card - temporarily hidden for production */}
          {/* <div className="bg-web3-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Updates
              </h3>
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            
            {recentUpdates.length > 0 ? (
              <div className="space-y-3">
                {recentUpdates.map((update, index) => (
                  <div key={update._id || index} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {update.eventTitle}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {update.content?.length > 100 
                            ? `${update.content.substring(0, 100)}...` 
                            : update.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {update.priority === 'urgent' && (
                          <span className="text-red-500 text-xs">🔴</span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(update.createdAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/organizer/events/${update.eventId}/updates`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      View all updates →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <MessageSquare className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No updates posted yet
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Post your first update to see it here
                </p>
              </div>
            )}
          </div> */}

          {/* Tips Card */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              💡 Pro Tip
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              Save your events as drafts to work on them over time. You can
              publish them when you're ready to go live!
            </p>
          </div>
        </div>
      </div>

      {/* Update Composer Modal - temporarily hidden for production */}
      {/* {showUpdateComposer && selectedEventId && (
        <UpdateComposer
          eventId={selectedEventId}
          isOpen={showUpdateComposer}
          onClose={handleCloseComposer}
          onUpdateCreated={handleUpdateCreated}
          eventStatus={events.find(e => e._id === selectedEventId)?.status || 'published'}
        />
      )} */}
    </div>
  );
};

export default OrganizerDashboard;
