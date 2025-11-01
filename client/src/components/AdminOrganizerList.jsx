import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  UserCheck,
  LogOut,
  RefreshCw,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import api from "../utils/api";
import { toast } from "react-hot-toast";
import {
  impersonateOrganizer,
  stopImpersonation,
} from "../store/slices/authSlice";
import { useTheme } from "../contexts/ThemeContext";

const AdminOrganizerList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useSelector(
    (state) => state.auth
  );
  const { isDarkMode } = useTheme();
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [impersonatingUserId, setImpersonatingUserId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !currentUser || currentUser.role !== "admin") {
      navigate("/");
      return;
    }
    fetchOrganizers();
  }, [isAuthenticated, currentUser, navigate]);

  const fetchOrganizers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/api/admin/users");
      // Filter for organizers only
      const organizerUsers = response.data.users.filter(
        (u) => u.role === "organizer"
      );
      setOrganizers(organizerUsers);
    } catch (err) {
      console.error("Failed to fetch organizers:", err);
      setError(err.response?.data?.error || "Failed to load organizers");
      toast.error("Failed to load organizers");
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (organizer) => {
    if (
      !window.confirm(
        `Impersonate ${organizer.email}? You'll view their organizer dashboard. You can stop impersonation at any time.`
      )
    ) {
      return;
    }

    try {
      setImpersonatingUserId(organizer._id);

      // Set impersonation in localStorage and Redux
      localStorage.setItem("impersonatingUserId", organizer._id);
      localStorage.setItem("impersonatingUserEmail", organizer.email);
      localStorage.setItem("originalUserId", currentUser._id);

      // Dispatch impersonation action
      dispatch(impersonateOrganizer(organizer));

      toast.success(`Now viewing as ${organizer.email}`);

      // Reload the page to refresh all data as the organizer
      window.location.reload();
    } catch (err) {
      console.error("Failed to impersonate:", err);
      toast.error("Failed to impersonate organizer");
      setImpersonatingUserId(null);
    }
  };

  const filteredOrganizers = organizers.filter((org) => {
    const matchesSearch =
      org.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${org.firstName || ""} ${org.lastName || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="container-modern py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f0f69] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading organizers...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-modern py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchOrganizers}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
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
              <Users className="w-8 h-8 text-[#4f0f69]" />
              Organizer Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View and impersonate organizers to manage their events
            </p>
          </div>
          <button
            onClick={fetchOrganizers}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search organizers by email, username, or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4f0f69] focus:border-transparent"
          />
        </div>
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredOrganizers.length} of {organizers.length} organizers
        </div>
      </div>

      {/* Organizers List */}
      <div className="space-y-4">
        {filteredOrganizers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {searchTerm
                ? "No organizers found matching your search"
                : "No organizers found"}
            </p>
          </div>
        ) : (
          filteredOrganizers.map((organizer) => (
            <motion.div
              key={organizer._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Organizer Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#4f0f69] to-[#6b1a8a] rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {organizer.username || organizer.email.split("@")[0]}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="w-4 h-4" />
                          <span>{organizer.email}</span>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 capitalize">
                          {organizer.role}
                        </span>
                        {organizer.isActive ? (
                          <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            <span>Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                            <XCircle className="w-4 h-4" />
                            <span>Suspended</span>
                          </div>
                        )}
                      </div>
                      {organizer.firstName || organizer.lastName ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {`${organizer.firstName || ""} ${
                            organizer.lastName || ""
                          }`.trim()}
                        </p>
                      ) : null}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Joined:{" "}
                        {new Date(organizer.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleImpersonate(organizer)}
                    disabled={
                      impersonatingUserId === organizer._id ||
                      !organizer.isActive
                    }
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      !organizer.isActive
                        ? "Cannot impersonate suspended organizer"
                        : "Impersonate this organizer"
                    }
                  >
                    {impersonatingUserId === organizer._id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Impersonating...
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Impersonate
                      </>
                    )}
                  </button>
                  <Link
                    to={`/admin/users`}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    title="View full user details"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Link>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminOrganizerList;
