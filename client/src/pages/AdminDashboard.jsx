import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  Activity,
  Shield,
  TrendingUp,
  Eye,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  ShoppingBag,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Mail,
  Ticket,
} from "lucide-react";
import api from "../utils/api";
import { toast } from "react-hot-toast";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingReminders, setSendingReminders] = useState({});

  useEffect(() => {
    // Check if user is admin
    if (!isAuthenticated || !user || user.role !== "admin") {
      navigate("/");
      return;
    }

    fetchOverview();
  }, [isAuthenticated, user, navigate]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/api/admin/overview");
      if (response.data?.ok) {
        setOverview(response.data.overview);
      }
    } catch (err) {
      console.error("Failed to fetch admin overview:", err);
      setError(err.response?.data?.error || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminders = async (orderId) => {
    if (
      !window.confirm(
        "Send reminder emails to all ticket holders for this order?"
      )
    ) {
      return;
    }

    try {
      setSendingReminders({ ...sendingReminders, [orderId]: true });
      const response = await api.post(
        `/api/admin/orders/${orderId}/send-reminders`
      );

      if (response.data?.success) {
        toast.success(response.data.message || "Reminders sent successfully!");
      } else {
        toast.error(response.data?.error || "Failed to send reminders");
      }
    } catch (err) {
      console.error("Failed to send reminders:", err);
      toast.error(err.response?.data?.error || "Failed to send reminders");
    } finally {
      setSendingReminders({ ...sendingReminders, [orderId]: false });
    }
  };


  if (loading) {
    return (
      <div className="container-modern py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f0f69] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading dashboard...
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
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 dark:text-red-200 mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchOverview}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const stats = [
    {
      label: "Total Users",
      value: overview?.usersCount || 0,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      link: "/admin/users",
    },
    {
      label: "Total Events",
      value: overview?.eventsCount || 0,
      icon: Calendar,
      color: "from-purple-500 to-purple-600",
      link: "/admin/events",
    },
    {
      label: "Total Orders",
      value: overview?.ordersCount || 0,
      icon: ShoppingBag,
      color: "from-orange-500 to-orange-600",
      link: "/admin/orders",
    },
    {
      label: "Total Tickets",
      value: overview?.ticketsCount || 0,
      icon: Ticket,
      color: "from-pink-500 to-pink-600",
      link: "/admin/orders",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(overview?.totalRevenue || 0),
      icon: DollarSign,
      color: "from-green-500 to-green-600",
      link: "/admin/orders",
      isCurrency: true,
    },
    {
      label: "Active Sessions",
      value: overview?.activeSessions || 0,
      icon: Activity,
      color: "from-indigo-500 to-indigo-600",
      link: "/admin/scans",
    },
  ];

  const quickActions = [
    {
      title: "Manage Users",
      description: "View, edit, and manage user accounts",
      icon: Users,
      link: "/admin/users",
      color: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
    },
    {
      title: "Manage Events",
      description: "Review and manage all events",
      icon: Calendar,
      link: "/admin/events",
      color: "hover:bg-purple-50 dark:hover:bg-purple-900/20",
    },
    {
      title: "View Orders",
      description: "View all orders and transactions",
      icon: ShoppingBag,
      link: "/admin/orders",
      color: "hover:bg-orange-50 dark:hover:bg-orange-900/20",
    },
    {
      title: "Scan Logs",
      description: "View QR code scan history",
      icon: Eye,
      link: "/admin/scans",
      color: "hover:bg-green-50 dark:hover:bg-green-900/20",
    },
  ];

  const additionalStats = [
    {
      label: "Completed Orders",
      value: overview?.completedOrdersCount || 0,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "Pending Orders",
      value: overview?.pendingOrdersCount || 0,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
    },
    {
      label: "Company Revenue (Fees)",
      value: formatCurrency(overview?.companyRevenue?.totalEarned || 0),
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Paid to Organizers",
      value: formatCurrency(overview?.companyRevenue?.totalPaidToOrganizers || 0),
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Pending Payouts",
      value: formatCurrency(overview?.companyRevenue?.pendingRevenue || 0),
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Completed Payouts",
      value: overview?.companyRevenue?.completedPayoutsCount || 0,
      icon: CheckCircle,
      color: "text-purple-600 dark:text-purple-400",
    },
  ];

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
              <Shield className="w-8 h-8 text-[#4f0f69]" />
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Welcome back, {user?.name || user?.email}. Manage your platform.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] rounded-lg">
              <CheckCircle className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">Admin</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={stat.link}>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                  >
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.isCurrency ? stat.value : stat.value.toLocaleString()}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Additional Stats */}
      {overview?.ordersCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        >
          {additionalStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
            >
              <Link to={action.link}>
                <div
                  className={`bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 cursor-pointer ${action.color}`}
                >
                  <action.icon className="w-8 h-8 text-[#4f0f69] mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {action.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Orders */}
      {overview?.recentOrders && overview.recentOrders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Recent Orders
            </h2>
            <Link
              to="/admin/orders"
              className="text-sm font-medium text-[#4f0f69] hover:text-[#6b1a8a] transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {overview.recentOrders.map((order) => (
                    <tr
                      key={order._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {order.orderNumber || `#${order._id.slice(-8)}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {order.customer?.name ||
                            `${order.customer?.firstName || ""} ${
                              order.customer?.lastName || ""
                            }`.trim() ||
                            "N/A"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {order.customer?.email || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {order.items?.[0]?.eventId?.title ||
                            order.items?.[0]?.eventTitle ||
                            "N/A"}
                        </div>
                        {order.items && order.items.length > 1 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            +{order.items.length - 1} more
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {order.pricing?.currency || "KES"}{" "}
                          {(
                            order.totalAmount ||
                            order.pricing?.total ||
                            0
                          ).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            order.status === "completed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : order.status === "pending"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* Show button for all orders - backend will validate if tickets exist */}
                        <button
                          onClick={() => handleSendReminders(order._id)}
                          disabled={sendingReminders[order._id]}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Send reminder emails to ticket holders for this order"
                        >
                          {sendingReminders[order._id] ? (
                            <>
                              <Clock className="w-3 h-3 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="w-3 h-3" />
                              Remind
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* System Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-[#4f0f69] to-[#6b1a8a] rounded-xl p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              System Status
            </h3>
            <p className="text-purple-100">
              All systems operational. Last checked:{" "}
              {new Date().toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-semibold">Online</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
