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
  Ticket,
  Download,
  TrendingUp,
  Building2,
  Wallet,
  Users,
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
  const [eventFilter, setEventFilter] = useState("all");
  const [events, setEvents] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [limit] = useState(20);
  const [sendingReminders, setSendingReminders] = useState({});
  const [resendingTickets, setResendingTickets] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const [viewMode, setViewMode] = useState("orders"); // "orders" or "payouts"

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== "admin") {
      navigate("/");
      return;
    }
    fetchEvents();
    fetchOrders();
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (isAuthenticated && user && user.role === "admin") {
      fetchOrders();
    }
  }, [page, statusFilter, eventFilter]);

  const fetchEvents = async () => {
    try {
      const response = await api.get(`/api/admin/events?limit=100`);
      if (response.data?.success) {
        setEvents(response.data.data.events || []);
        // Extract unique organizers
        const uniqueOrganizers = [...new Map(
          response.data.data.events
            .filter(e => e.organizer)
            .map(e => [e.organizer._id, e.organizer])
        ).values()];
        setOrganizers(uniqueOrganizers);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (eventFilter !== "all") params.append("eventId", eventFilter);
      if (searchTerm) params.append("search", searchTerm);

      const response = await api.get(`/api/admin/orders?${params.toString()}`);
      if (response.data?.success) {
        setOrders(response.data.data.orders);
        setTotal(response.data.data.pagination.total);
        setTotalRevenue(response.data.data.totalRevenue || 0);
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
    paid: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    confirmed:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
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

  const handleResendTickets = async (orderId) => {
    if (
      !window.confirm(
        "Resend ticket email to the customer? This will send all tickets for this order."
      )
    ) {
      return;
    }

    try {
      setResendingTickets({ ...resendingTickets, [orderId]: true });
      const response = await api.post(
        `/api/admin/orders/${orderId}/resend-tickets`
      );

      if (response.data?.success) {
        toast.success(
          response.data.message ||
            `Ticket email resent to ${response.data.data?.email || "customer"}`
        );
      } else {
        toast.error(response.data?.error || "Failed to resend tickets");
      }
    } catch (err) {
      console.error("Failed to resend tickets:", err);
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.details ||
          "Failed to resend tickets"
      );
    } finally {
      setResendingTickets({ ...resendingTickets, [orderId]: false });
    }
  };

  const calculatePayoutSummary = () => {
    const summary = {};

    orders
      .filter(order => order.paymentStatus === "paid" || order.status === "completed")
      .forEach(order => {
        order.items?.forEach(item => {
          const event = item.eventId;
          if (!event || !event.organizer) return;

          const organizerId = event.organizer._id;
          if (!summary[organizerId]) {
            summary[organizerId] = {
              organizer: event.organizer,
              events: new Set(),
              totalOrders: 0,
              totalRevenue: 0,
              totalFees: 0,
              netPayout: 0,
              orders: []
            };
          }

          // Calculate order amounts
          const orderAmount = order.totalAmount || order.pricing?.total || 0;
          // Platform takes serviceFee (currently 0%) + transactionFee (payment processing)
          const serviceFee = order.pricing?.serviceFee || 0;
          const transactionFee = order.pricing?.transactionFee || 0;
          const totalFees = serviceFee + transactionFee;
          const netAmount = orderAmount - totalFees;

          summary[organizerId].events.add(event.title);
          summary[organizerId].totalOrders++;
          summary[organizerId].totalRevenue += orderAmount;
          summary[organizerId].totalFees += totalFees;
          summary[organizerId].netPayout += netAmount;
          summary[organizerId].orders.push({
            orderNumber: order.orderNumber,
            customer: order.customer?.email,
            amount: orderAmount,
            fee: totalFees,
            serviceFee: serviceFee,
            transactionFee: transactionFee,
            net: netAmount,
            date: order.createdAt,
            event: event.title
          });
        });
      });

    // Convert Set to Array for events
    Object.keys(summary).forEach(key => {
      summary[key].events = Array.from(summary[key].events);
    });

    return summary;
  };

  const exportPayoutData = () => {
    const summary = calculatePayoutSummary();

    // Create CSV content
    let csv = "Organizer Name,Email,Total Orders,Total Revenue (KES),Platform Fees (KES),Net Payout (KES),Events\n";

    Object.values(summary).forEach(org => {
      csv += `"${org.organizer.name || org.organizer.email}",`;
      csv += `"${org.organizer.email}",`;
      csv += `${org.totalOrders},`;
      csv += `${org.totalRevenue.toFixed(2)},`;
      csv += `${org.totalFees.toFixed(2)},`;
      csv += `${org.netPayout.toFixed(2)},`;
      csv += `"${org.events.join(', ')}"\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-i-payouts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Payout data exported successfully!');
  };

  const exportDetailedPayoutData = (organizerId) => {
    const summary = calculatePayoutSummary();
    const orgData = summary[organizerId];

    if (!orgData) return;

    // Create detailed CSV for specific organizer
    let csv = "Order Number,Customer Email,Event,Order Amount (KES),Service Fee (0%),Transaction Fee,Total Fees (KES),Net Amount (KES),Date\n";

    orgData.orders.forEach(order => {
      csv += `"${order.orderNumber}",`;
      csv += `"${order.customer}",`;
      csv += `"${order.event}",`;
      csv += `${order.amount.toFixed(2)},`;
      csv += `${order.serviceFee.toFixed(2)},`;
      csv += `${order.transactionFee.toFixed(2)},`;
      csv += `${order.fee.toFixed(2)},`;
      csv += `${order.net.toFixed(2)},`;
      csv += `"${new Date(order.date).toLocaleDateString()}"\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `payout-details-${orgData.organizer.name?.replace(/\s+/g, '-') || 'organizer'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success(`Detailed payout data exported for ${orgData.organizer.name || orgData.organizer.email}!`);
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
              {viewMode === "orders"
                ? "View and manage all orders and transactions"
                : "View organizer payout summary for paid orders"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                Total: {total} orders
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-500">
                Revenue: {totalRevenue.toLocaleString()} KES
              </span>
            </div>
            {viewMode === "payouts" && (
              <button
                onClick={exportPayoutData}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Payouts
              </button>
            )}
            <button
              onClick={fetchOrders}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode("orders")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === "orders"
                ? "bg-[#4f0f69] text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Orders View
          </button>
          <button
            onClick={() => setViewMode("payouts")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === "payouts"
                ? "bg-[#4f0f69] text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <Wallet className="w-4 h-4" />
            Payout Summary
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Event Filter */}
          <select
            value={eventFilter}
            onChange={(e) => {
              setEventFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4f0f69] focus:border-transparent"
          >
            <option value="all">All Events</option>
            {events.map((event) => (
              <option key={event._id} value={event._id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {orders.length} of {total} orders
        </div>
      </div>

      {/* Payout Summary View */}
      {viewMode === "payouts" && (
        <div className="space-y-4 mb-8">
          {(() => {
            const summary = calculatePayoutSummary();
            const summaryArray = Object.values(summary);

            if (summaryArray.length === 0) {
              return (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                  <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    No paid orders found to calculate payouts
                  </p>
                </div>
              );
            }

            return summaryArray.map((org) => (
              <motion.div
                key={org.organizer._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#4f0f69]/10 rounded-lg">
                      <Building2 className="w-6 h-6 text-[#4f0f69]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {org.organizer.name || "Unnamed Organizer"}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {org.organizer.email}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {org.totalOrders} orders
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {org.events.length} event(s): {org.events.join(", ")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => exportDetailedPayoutData(org.organizer._id)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export Details
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Total Revenue */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs font-medium">Total Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {org.totalRevenue.toLocaleString()} KES
                    </p>
                  </div>

                  {/* Platform Fees */}
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs font-medium">Transaction Fees</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {org.totalFees.toLocaleString()} KES
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {org.totalRevenue > 0 ? ((org.totalFees / org.totalRevenue) * 100).toFixed(1) : 0}% of revenue (Payment processing only)
                    </p>
                  </div>

                  {/* Net Payout */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 md:col-span-2">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                      <Wallet className="w-5 h-5" />
                      <span className="text-sm font-medium">Net Payout (Amount to Transfer)</span>
                    </div>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {org.netPayout.toLocaleString()} KES
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Full ticket revenue minus payment processing fees only
                    </p>
                  </div>
                </div>

                {/* Order Breakdown */}
                <div className="mt-4">
                  <button
                    onClick={() => {
                      const elem = document.getElementById(`orders-${org.organizer._id}`);
                      if (elem) {
                        elem.classList.toggle("hidden");
                      }
                    }}
                    className="text-sm text-[#4f0f69] dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View {org.orders.length} order details
                  </button>
                  <div id={`orders-${org.organizer._id}`} className="hidden mt-3">
                    <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Order</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Event</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Customer</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Amount</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Service Fee (0%)</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Total Fees</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Net</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {org.orders.map((order, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{order.orderNumber}</td>
                              <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{order.event}</td>
                              <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{order.customer}</td>
                              <td className="px-3 py-2 text-xs text-gray-900 dark:text-white text-right">{order.amount.toLocaleString()}</td>
                              <td className="px-3 py-2 text-xs text-orange-600 dark:text-orange-400 text-right" title={`Service: ${order.serviceFee.toLocaleString()} + Transaction: ${order.transactionFee.toLocaleString()}`}>
                                {order.serviceFee.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-xs text-orange-600 dark:text-orange-400 text-right font-semibold">{order.fee.toLocaleString()}</td>
                              <td className="px-3 py-2 text-xs font-semibold text-green-600 dark:text-green-400 text-right">{order.net.toLocaleString()}</td>
                              <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{new Date(order.date).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            ));
          })()}
        </div>
      )}

      {/* Orders List */}
      {viewMode === "orders" && (
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
                        {order.pricing?.serviceFee && order.pricing.serviceFee > 0 && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            Subtotal:{" "}
                            {(order.pricing.subtotal || 0).toLocaleString()} +
                            Fee:{" "}
                            {order.pricing.serviceFee.toLocaleString()}
                            {order.pricing.transactionFee > 0 && (
                              <span> + {order.pricing.transactionFee.toLocaleString()}</span>
                            )}
                            {order.pricing.transactionFeeDetails?.tierName && (
                              <span className="ml-1">
                                ({order.pricing.transactionFeeDetails.tierName})
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
                  {/* Resend Tickets - Only show for paid orders */}
                  {(order.paymentStatus === "paid" ||
                    order.paymentStatus === "completed" ||
                    (order.status === "completed" &&
                      order.paymentStatus !== "pending")) && (
                    <button
                      onClick={() => handleResendTickets(order._id)}
                      disabled={resendingTickets[order._id]}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Resend ticket email to customer"
                    >
                      {resendingTickets[order._id] ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Ticket className="w-4 h-4" />
                          Resend Tickets
                        </>
                      )}
                    </button>
                  )}
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
      )}

      {/* Pagination */}
      {viewMode === "orders" && total > limit && (
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
