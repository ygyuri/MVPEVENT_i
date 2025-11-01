import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  QrCode,
  User,
  Calendar,
  MapPin,
  Ticket,
  Download,
  Copy,
  AlertCircle,
} from "lucide-react";
import api from "../../utils/api";
import { toast } from "react-hot-toast";

const OrderTicketsModal = ({ isOpen, onClose, orderId, orderNumber }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState(null);

  // Helper function to format location (handles both string and object)
  const formatLocation = (location) => {
    if (!location) return null;
    if (typeof location === "string") return location;
    if (typeof location === "object") {
      const parts = [];
      if (location.venueName) parts.push(location.venueName);
      if (location.address) parts.push(location.address);
      if (location.city) parts.push(location.city);
      if (location.state) parts.push(location.state);
      if (location.country) parts.push(location.country);
      if (location.postalCode) parts.push(location.postalCode);
      return parts.length > 0 ? parts.join(", ") : null;
    }
    return null;
  };

  useEffect(() => {
    if (isOpen && orderId) {
      fetchTickets();
    } else {
      setTickets([]);
      setError(null);
    }
  }, [isOpen, orderId]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/admin/orders/${orderId}/tickets`);
      if (response.data?.success) {
        setTickets(response.data.data.tickets || []);
        setOrderData(response.data.data);
      } else {
        setError(response.data?.error || "Failed to load tickets");
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
      setError(err.response?.data?.error || "Failed to load tickets");
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyQR = (qrCodeUrl) => {
    if (qrCodeUrl) {
      navigator.clipboard.writeText(qrCodeUrl);
      toast.success("QR code data copied to clipboard");
    }
  };

  const handleDownloadQR = (qrCodeUrl, ticketNumber) => {
    if (qrCodeUrl) {
      const link = document.createElement("a");
      link.href = qrCodeUrl;
      link.download = `ticket-${ticketNumber}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("QR code downloaded");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "used":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "refunded":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Order Tickets
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {orderNumber || `Order ${orderId?.slice(-8)}`}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4f0f69] mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Loading tickets...
                      </p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-red-600 dark:text-red-400 mb-4">
                      {error}
                    </p>
                    <button
                      onClick={fetchTickets}
                      className="px-4 py-2 bg-[#4f0f69] text-white rounded-lg hover:bg-[#6b1a8a] transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No tickets found for this order
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Payment Status Warning */}
                    {orderData && !orderData.isPaid && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                              Payment Pending
                            </h3>
                            <p className="text-sm text-yellow-700 dark:text-yellow-400">
                              QR codes are only generated for paid tickets. This
                              order status is:{" "}
                              <strong>
                                {orderData.paymentStatus ||
                                  orderData.orderStatus}
                              </strong>
                              . QR codes will be available once payment is
                              completed.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Showing {tickets.length}{" "}
                      {tickets.length === 1 ? "ticket" : "tickets"}
                      {orderData?.isPaid && (
                        <span className="ml-2 text-green-600 dark:text-green-400">
                          (All paid - QR codes available)
                        </span>
                      )}
                    </div>
                    {tickets.map((ticket, index) => (
                      <motion.div
                        key={ticket.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left: Ticket Info */}
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Ticket className="w-5 h-5 text-[#4f0f69]" />
                                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Ticket #{ticket.ticketNumber || index + 1}
                                  </h3>
                                </div>
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                                    ticket.status
                                  )}`}
                                >
                                  {ticket.status}
                                </span>
                              </div>
                            </div>

                            {/* Event Info */}
                            {ticket.event && (
                              <div className="space-y-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  {ticket.event.title}
                                </h4>
                                {ticket.event.startDate && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(
                                      ticket.event.startDate
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                )}
                                {formatLocation(ticket.event.location) && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <MapPin className="w-4 h-4" />
                                    {formatLocation(ticket.event.location)}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Holder Info */}
                            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <User className="w-4 h-4" />
                                <span className="font-medium">
                                  {ticket.holder.firstName}{" "}
                                  {ticket.holder.lastName}
                                </span>
                              </div>
                              {ticket.holder.email && (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {ticket.holder.email}
                                </div>
                              )}
                              {ticket.holder.phone && (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {ticket.holder.phone}
                                </div>
                              )}
                            </div>

                            {/* Ticket Details */}
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-600">
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  Ticket Type
                                </div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {ticket.ticketType}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  Price
                                </div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  KES {ticket.price?.toLocaleString() || "0"}
                                </div>
                              </div>
                            </div>

                            {ticket.usedAt && (
                              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  Used At
                                </div>
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {new Date(ticket.usedAt).toLocaleString()}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right: QR Code */}
                          <div className="flex flex-col items-center justify-center space-y-4">
                            {ticket.qrCodeUrl ? (
                              <>
                                <div className="bg-white rounded-xl p-4 shadow-lg">
                                  <img
                                    src={ticket.qrCodeUrl}
                                    alt={`QR Code for ticket ${ticket.ticketNumber}`}
                                    className="w-48 h-48 object-contain"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      handleCopyQR(ticket.qrCodeUrl)
                                    }
                                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                                  >
                                    <Copy className="w-4 h-4" />
                                    Copy
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDownloadQR(
                                        ticket.qrCodeUrl,
                                        ticket.ticketNumber
                                      )
                                    }
                                    className="flex items-center gap-2 px-3 py-1.5 bg-[#4f0f69] text-white rounded-lg hover:bg-[#6b1a8a] transition-colors text-sm"
                                  >
                                    <Download className="w-4 h-4" />
                                    Download
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="text-center py-8 px-4">
                                <QrCode className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  QR Code Not Available
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                                  {orderData && !orderData.isPaid
                                    ? "QR codes are generated after payment is completed"
                                    : "QR code has not been generated for this ticket"}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OrderTicketsModal;
