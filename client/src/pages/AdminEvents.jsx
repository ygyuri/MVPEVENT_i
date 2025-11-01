import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Search,
  Star,
  TrendingUp,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Users,
  Ticket,
  MapPin,
  Clock,
  Edit,
  MoreVertical,
  ShoppingBag,
  BarChart3,
  Filter,
  X,
  Mail,
  Phone,
  Globe,
  Tag,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";
import api from "../utils/api";
import { toast } from "react-hot-toast";

const AdminEvents = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [updating, setUpdating] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState({});

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== "admin") {
      navigate("/");
      return;
    }
    fetchEvents();
  }, [isAuthenticated, user, navigate, page, statusFilter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);

      const response = await api.get(`/api/admin/events?${params.toString()}`);
      if (response.data?.success) {
        setEvents(response.data.data.events);
        setTotal(response.data.data.pagination.total);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setError(err.response?.data?.error || "Failed to load events");
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const updateEventFlags = async (eventId, flagType, value) => {
    try {
      setUpdating({ ...updating, [eventId]: true });
      const response = await api.patch(`/api/admin/events/${eventId}/flags`, {
        [flagType]: value,
      });
      if (response.data?.success) {
        toast.success(
          `Event ${
            flagType === "isFeatured" ? "featured" : "trending"
          } status updated`
        );
        fetchEvents();
      }
    } catch (err) {
      console.error("Failed to update flags:", err);
      toast.error(err.response?.data?.error || "Failed to update event");
    } finally {
      setUpdating({ ...updating, [eventId]: false });
    }
  };

  const updateEventStatus = async (eventId, status) => {
    try {
      setUpdating({ ...updating, [eventId]: true });
      const response = await api.patch(`/api/admin/events/${eventId}/status`, {
        status,
      });
      if (response.data?.success) {
        toast.success(`Event status updated to ${status}`);
        fetchEvents();
        setShowStatusMenu({ ...showStatusMenu, [eventId]: false });
        // Update event details if modal is open
        if (eventDetails && eventDetails._id === eventId) {
          setEventDetails({ ...eventDetails, status });
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error(err.response?.data?.error || "Failed to update event status");
    } finally {
      setUpdating({ ...updating, [eventId]: false });
    }
  };

  const fetchEventDetails = async (eventId) => {
    try {
      setLoadingDetails(true);
      const response = await api.get(`/api/organizer/events/${eventId}`);
      if (response.data?.success || response.data?.data) {
        setEventDetails(response.data.data || response.data.event);
        setShowEventModal(true);
      }
    } catch (err) {
      console.error("Failed to fetch event details:", err);
      toast.error("Failed to load event details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewEvent = (event) => {
    setSelectedEvent(event);
    fetchEventDetails(event._id);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const statusColors = {
    published:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };

  const statusOptions = [
    { value: "draft", label: "Draft", icon: Edit },
    { value: "published", label: "Published", icon: CheckCircle },
    { value: "cancelled", label: "Cancelled", icon: XCircle },
    { value: "completed", label: "Completed", icon: CheckCircle },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        setPage(1);
        fetchEvents();
      } else {
        fetchEvents();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  if (loading && events.length === 0) {
    return (
      <div className="container-modern py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f0f69] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading events...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-modern py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Calendar className="w-8 h-8 text-[#4f0f69]" />
              Event Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage and monitor all events on the platform
            </p>
          </div>
          <button
            onClick={fetchEvents}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Events
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {total}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Published
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {events.filter((e) => e.status === "published").length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Tickets
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {events.reduce(
                  (sum, e) => sum + (e.stats?.ticketsCount || 0),
                  0
                )}
              </p>
            </div>
            <Ticket className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(
                  events.reduce((sum, e) => sum + (e.stats?.revenue || 0), 0)
                )}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search events by title or slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4f0f69] focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4f0f69] focus:border-transparent appearance-none"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {events.length} of {total} events
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No events found
            </p>
          </div>
        ) : (
          events.map((event) => (
            <motion.div
              key={event._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Event Image */}
                  {event.coverImageUrl && (
                    <div className="w-full lg:w-48 h-48 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={event.coverImageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 truncate">
                          {event.title}
                        </h3>
                        {event.shortDescription && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                            {event.shortDescription}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          {event.organizer && (
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>
                                {event.organizer.firstName
                                  ? `${event.organizer.firstName} ${
                                      event.organizer.lastName || ""
                                    }`
                                  : event.organizer.email}
                              </span>
                            </div>
                          )}
                          {event.dates?.startDate && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {new Date(
                                  event.dates.startDate
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {event.location?.venueName && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span className="truncate">
                                {event.location.venueName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status and Actions */}
                      <div className="flex items-start gap-2 ml-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap ${
                            statusColors[event.status] || statusColors.draft
                          }`}
                        >
                          {event.status}
                        </span>
                        <div className="relative">
                          <button
                            onClick={() =>
                              setShowStatusMenu({
                                ...showStatusMenu,
                                [event._id]: !showStatusMenu[event._id],
                              })
                            }
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                          <AnimatePresence>
                            {showStatusMenu[event._id] && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() =>
                                    setShowStatusMenu({
                                      ...showStatusMenu,
                                      [event._id]: false,
                                    })
                                  }
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20"
                                >
                                  <div className="py-1">
                                    <p className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                      Change Status
                                    </p>
                                    {statusOptions.map((option) => (
                                      <button
                                        key={option.value}
                                        onClick={() => {
                                          if (event.status !== option.value) {
                                            updateEventStatus(
                                              event._id,
                                              option.value
                                            );
                                          }
                                        }}
                                        disabled={
                                          event.status === option.value ||
                                          updating[event._id]
                                        }
                                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${
                                          event.status === option.value
                                            ? "bg-[#4f0f69] text-white"
                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                      >
                                        <option.icon className="w-4 h-4" />
                                        {option.label}
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    {event.stats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <ShoppingBag className="w-4 h-4 text-blue-500" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Orders
                            </span>
                          </div>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {event.stats.ordersCount || 0}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Ticket className="w-4 h-4 text-purple-500" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Tickets
                            </span>
                          </div>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {event.stats.ticketsCount || 0}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Revenue
                            </span>
                          </div>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(event.stats.revenue || 0)}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-orange-500" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Capacity
                            </span>
                          </div>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {event.currentAttendees || 0}
                            {event.capacity && ` / ${event.capacity}`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() =>
                          updateEventFlags(
                            event._id,
                            "isFeatured",
                            !event.flags?.isFeatured
                          )
                        }
                        disabled={updating[event._id]}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          event.flags?.isFeatured
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-yellow-100 dark:hover:bg-yellow-900"
                        } disabled:opacity-50`}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            event.flags?.isFeatured ? "fill-current" : ""
                          }`}
                        />
                        Featured
                      </button>

                      <button
                        onClick={() =>
                          updateEventFlags(
                            event._id,
                            "isTrending",
                            !event.flags?.isTrending
                          )
                        }
                        disabled={updating[event._id]}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          event.flags?.isTrending
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-purple-100 dark:hover:bg-purple-900"
                        } disabled:opacity-50`}
                      >
                        <TrendingUp
                          className={`w-4 h-4 ${
                            event.flags?.isTrending ? "fill-current" : ""
                          }`}
                        />
                        Trending
                      </button>

                      <button
                        onClick={() => handleViewEvent(event)}
                        disabled={loadingDetails}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>

                      {event.organizer?.role === "organizer" && (
                        <Link
                          to={`/organizer/events/${event._id}/edit`}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-gray-600 dark:text-gray-400">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Event Details Modal */}
      <AnimatePresence>
        {showEventModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => {
                setShowEventModal(false);
                setEventDetails(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {loadingDetails ? (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f0f69] mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Loading event details...
                      </p>
                    </div>
                  </div>
                ) : eventDetails ? (
                  <div>
                    {/* Header */}
                    <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Event Details
                      </h2>
                      <button
                        onClick={() => {
                          setShowEventModal(false);
                          setEventDetails(null);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Cover Image */}
                      {eventDetails.media?.coverImageUrl && (
                        <div className="w-full h-64 rounded-xl overflow-hidden">
                          <img
                            src={eventDetails.media.coverImageUrl}
                            alt={eventDetails.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Title and Status */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {eventDetails.title}
                          </h3>
                          {eventDetails.shortDescription && (
                            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                              {eventDetails.shortDescription}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap ${
                            statusColors[eventDetails.status] ||
                            statusColors.draft
                          }`}
                        >
                          {eventDetails.status}
                        </span>
                      </div>

                      {/* Stats Grid */}
                      {selectedEvent?.stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <ShoppingBag className="w-5 h-5 text-blue-500" />
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Orders
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {selectedEvent.stats.ordersCount || 0}
                            </p>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Ticket className="w-5 h-5 text-purple-500" />
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Tickets
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {selectedEvent.stats.ticketsCount || 0}
                            </p>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign className="w-5 h-5 text-green-500" />
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Revenue
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(selectedEvent.stats.revenue || 0)}
                            </p>
                          </div>
                          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-5 h-5 text-orange-500" />
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Attendees
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {eventDetails.currentAttendees || 0}
                              {eventDetails.capacity &&
                                ` / ${eventDetails.capacity}`}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {eventDetails.description && (
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Description
                          </h4>
                          <div
                            className="text-gray-600 dark:text-gray-400 prose dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: eventDetails.description.replace(
                                /\n/g,
                                "<br />"
                              ),
                            }}
                          />
                        </div>
                      )}

                      {/* Event Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Date & Time */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Date & Time
                          </h4>
                          <div className="space-y-2 text-sm">
                            {eventDetails.dates?.startDate && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">
                                  Start:{" "}
                                </span>
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {new Date(
                                    eventDetails.dates.startDate
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {eventDetails.dates?.endDate && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">
                                  End:{" "}
                                </span>
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {new Date(
                                    eventDetails.dates.endDate
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {eventDetails.dates?.timezone && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">
                                  Timezone:{" "}
                                </span>
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {eventDetails.dates.timezone}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Location */}
                        {eventDetails.location && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              Location
                            </h4>
                            <div className="space-y-2 text-sm">
                              {eventDetails.location.venueName && (
                                <div className="text-gray-900 dark:text-white font-medium">
                                  {eventDetails.location.venueName}
                                </div>
                              )}
                              {eventDetails.location.address && (
                                <div className="text-gray-600 dark:text-gray-400">
                                  {eventDetails.location.address}
                                </div>
                              )}
                              {(eventDetails.location.city ||
                                eventDetails.location.state ||
                                eventDetails.location.country) && (
                                <div className="text-gray-600 dark:text-gray-400">
                                  {[
                                    eventDetails.location.city,
                                    eventDetails.location.state,
                                    eventDetails.location.country,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}
                                </div>
                              )}
                              {eventDetails.location.postalCode && (
                                <div className="text-gray-600 dark:text-gray-400">
                                  {eventDetails.location.postalCode}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Organizer */}
                        {eventDetails.organizer && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Organizer
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="text-gray-900 dark:text-white font-medium">
                                {eventDetails.organizer.firstName
                                  ? `${eventDetails.organizer.firstName} ${
                                      eventDetails.organizer.lastName || ""
                                    }`
                                  : eventDetails.organizer.username ||
                                    eventDetails.organizer.email}
                              </div>
                              {eventDetails.organizer.email && (
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                  <Mail className="w-4 h-4" />
                                  {eventDetails.organizer.email}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Category */}
                        {eventDetails.category && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <Tag className="w-4 h-4" />
                              Category
                            </h4>
                            <div className="text-sm">
                              <span className="text-gray-900 dark:text-white font-medium">
                                {eventDetails.category.name}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ticket Types */}
                      {eventDetails.ticketTypes &&
                        eventDetails.ticketTypes.length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                              Ticket Types
                            </h4>
                            <div className="space-y-2">
                              {eventDetails.ticketTypes.map((ticket, idx) => (
                                <div
                                  key={idx}
                                  className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
                                >
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="font-semibold text-gray-900 dark:text-white">
                                        {ticket.name}
                                      </div>
                                      {ticket.description && (
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                          {ticket.description}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                                        <span>
                                          Price:{" "}
                                          <span className="font-medium text-gray-900 dark:text-white">
                                            {ticket.currency || "KES"}{" "}
                                            {(
                                              ticket.price || 0
                                            ).toLocaleString()}
                                          </span>
                                        </span>
                                        {ticket.quantity && (
                                          <span>
                                            Available:{" "}
                                            <span className="font-medium text-gray-900 dark:text-white">
                                              {ticket.quantity}
                                            </span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Flags */}
                      <div className="flex items-center gap-2">
                        {eventDetails.flags?.isFeatured && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            <Star className="w-4 h-4 fill-current" />
                            Featured
                          </span>
                        )}
                        {eventDetails.flags?.isTrending && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            <TrendingUp className="w-4 h-4 fill-current" />
                            Trending
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <a
                          href={`/events/${eventDetails.slug}/checkout`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-[#4f0f69] text-white rounded-lg hover:bg-[#6b1a8a] transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Public Page
                        </a>
                        {eventDetails.organizer?.role === "organizer" && (
                          <Link
                            to={`/organizer/events/${eventDetails._id}/edit`}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            Edit Event
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminEvents;
