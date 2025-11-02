import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Calendar,
  DollarSign,
  User,
  Mail,
  QrCode,
} from "lucide-react";
import api from "../utils/api";
import { toast } from "react-hot-toast";
import OrderTicketsModal from "../components/admin/OrderTicketsModal";

const AdminOrders = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [sendingReminders, setSendingReminders] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showTicketsModal, setShowTicketsModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== "admin") {
      navigate("/");
      return;
    }
    fetchOrders();
  }, [isAuthenticated, user, navigate, page, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);

      const response = await api.get(`/api/admin/orders?${params.toString()}`);
      if (response.data?.success) {
        setOrders(response.data.data.orders);
        setTotal(response.data.data.pagination.total);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError(err.response?.data?.error || "Failed to load orders");
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    completed:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    refunded: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  };

  const paymentStatusColors = {
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    refunded: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        setPage(1);
        fetchOrders();
      } else {
        fetchOrders();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  if (loading && orders.length === 0) {
    return (
      <div className="container-modern py-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f0f69] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading orders...
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
              <ShoppingBag className="w-8 h-8 text-[#4f0f69]" />
              Order Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View and manage all orders and transactions
            </p>
          </div>
          <button
            onClick={fetchOrders}
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

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number, email, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4f0f69] focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4f0f69] focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {orders.length} of {total} orders
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
            <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No orders found
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <motion.div
              key={order._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Order Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {order.orderNumber || `Order ${order._id.slice(-8)}`}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium capitalize ${
                            statusColors[order.status] || statusColors.pending
                          }`}
                        >
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium capitalize ${
                            paymentStatusColors[order.paymentStatus] ||
                            paymentStatusColors.pending
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>

                      {order.customer && (
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {order.customer.email && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{order.customer.email}</span>
                            </div>
                          )}
                          {order.customer.name && (
                            <span>{order.customer.name}</span>
                          )}
                        </div>
                      )}

                      {order.items && order.items.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {order.items.length}{" "}
                            {order.items.length === 1 ? "ticket" : "tickets"}
                            {" • "}
                            {order.items.map((item, idx) => (
                              <span key={idx}>
                                {item.eventId?.title || item.eventTitle}
                                {idx < order.items.length - 1 && ", "}
                              </span>
                            ))}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {order.pricing?.currency || "KES"}{" "}
                          {(
                            order.totalAmount ||
                            order.pricing?.total ||
                            0
                          ).toLocaleString()}
                        </span>
                        {order.pricing?.transactionFee &&
                          order.pricing.transactionFee > 0 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              Subtotal:{" "}
                              {(order.pricing.subtotal || 0).toLocaleString()} +
                              Fee:{" "}
                              {order.pricing.transactionFee.toLocaleString()}
                              {order.pricing.transactionFeeDetails
                                ?.tierName && (
                                <span className="ml-1">
                                  (
                                  {order.pricing.transactionFeeDetails.tierName}
                                  )
                                </span>
                              )}
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* View Tickets & QR Codes */}
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowTicketsModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                    title="View all tickets and QR codes for this order"
                  >
                    <QrCode className="w-4 h-4" />
                    View Tickets
                  </button>
                  {/* Show button for any order - backend will validate if tickets exist */}
                  <button
                    onClick={() => handleSendReminders(order._id)}
                    disabled={sendingReminders[order._id]}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send reminder emails to ticket holders for this order"
                  >
                    {sendingReminders[order._id] ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Reminder
                      </>
                    )}
                  </button>
                  <a
                    href={`/payment/${order._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </a>
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

      {/* Order Tickets Modal */}
      <OrderTicketsModal
        isOpen={showTicketsModal}
        onClose={() => {
          setShowTicketsModal(false);
          setSelectedOrder(null);
        }}
        orderId={selectedOrder?._id}
        orderNumber={selectedOrder?.orderNumber}
      />
    </div>
  );
};

export default AdminOrders;
