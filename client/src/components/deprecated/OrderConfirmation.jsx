import React from 'react';
import { useSelector } from 'react-redux';
import { CheckCircle, Download, Mail, Calendar, MapPin, User, Ticket } from 'lucide-react';

const OrderConfirmation = () => {
  const { currentOrder } = useSelector((state) => state.checkout);

  if (!currentOrder) {
    return (
      <div className="min-h-screen bg-web3-primary flex items-center justify-center p-4 theme-transition">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-web3-primary mb-2">Order Confirmed!</h2>
          <p className="text-web3-blue">Your order has been successfully processed.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-web3-primary p-4 theme-transition">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 blob-primary"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 blob-secondary"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-web3-primary mb-4">
            Payment Successful! 🎉
          </h1>
          <p className="text-web3-blue text-lg">
            Your order has been confirmed and tickets are being sent to your email
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-web3-primary mb-4 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-web3-blue" />
                Order Summary
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-web3-blue text-sm">Order Number</p>
                  <p className="text-web3-primary font-mono font-semibold">
                    {currentOrder.orderNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-web3-blue text-sm">Order Date</p>
                  <p className="text-web3-primary font-semibold">
                    {formatDate(currentOrder.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-web3-blue text-sm">Payment Status</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Paid
                  </span>
                </div>
                <div>
                  <p className="text-web3-blue text-sm">Payment Method</p>
                  <p className="text-web3-primary font-semibold">MPESA</p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-web3-primary mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-web3-blue" />
                Customer Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-web3-blue text-sm">Full Name</p>
                  <p className="text-web3-primary font-semibold">
                    {currentOrder.customer?.firstName && currentOrder.customer?.lastName 
                      ? `${currentOrder.customer.firstName} ${currentOrder.customer.lastName}`
                      : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-web3-blue text-sm">Email</p>
                  <p className="text-web3-primary font-semibold">
                    {currentOrder.customer?.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-web3-blue text-sm">Phone</p>
                  <p className="text-web3-primary font-semibold">
                    {currentOrder.customer?.phone || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Event Details */}
            {currentOrder.items && currentOrder.items.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-web3-primary mb-4">Event Details</h3>
                
                {currentOrder.items.map((item, index) => (
                  <div key={index} className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20 mb-4 last:mb-0">
                    <h4 className="font-semibold text-web3-primary mb-2">
                      {item.eventTitle || 'Event'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-web3-blue">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(item.eventDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-web3-blue">
                        <MapPin className="w-4 h-4" />
                        <span>{item.eventLocation || 'Location TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-web3-blue">
                        <Ticket className="w-4 h-4" />
                        <span>{item.ticketType} × {item.quantity}</span>
                      </div>
                      <div className="text-web3-cyan font-medium">
                        KES {item.subtotal?.toLocaleString() || '0'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Pricing Breakdown */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-web3-primary mb-4">Pricing Breakdown</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-web3-blue">
                  <span>Subtotal</span>
                  <span>KES {currentOrder.pricing?.subtotal?.toLocaleString() || '0'}</span>
                </div>
                
                <div className="flex justify-between text-web3-blue">
                  <span>Service Fee</span>
                  <span>KES {currentOrder.pricing?.serviceFee?.toLocaleString() || '0'}</span>
                </div>
                
                <div className="border-t border-blue-500/20 pt-3">
                  <div className="flex justify-between text-web3-primary font-semibold text-lg">
                    <span>Total Paid</span>
                    <span>KES {currentOrder.pricing?.total?.toLocaleString() || '0'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-web3-primary mb-4">Next Steps</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-web3-primary font-medium">Check Your Email</p>
                    <p className="text-web3-blue text-sm">Tickets will be sent to {currentOrder.customer?.email || 'your email'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-web3-primary font-medium">Download Tickets</p>
                    <p className="text-web3-blue text-sm">Save tickets to your phone or print them</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-web3-primary font-medium">Attend Event</p>
                    <p className="text-web3-blue text-sm">Present your ticket at the event entrance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button className="btn-web3-primary w-full py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                Download Receipt
              </button>
              
              <button className="btn-web3-secondary w-full py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2">
                <Mail className="w-5 h-5" />
                Resend Email
              </button>
            </div>
          </div>
        </div>

        {/* Footer Message */}
        <div className="mt-12 text-center">
          <div className="glass rounded-2xl p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-web3-primary mb-3">
              Thank you for your purchase! 🎉
            </h3>
            <p className="text-web3-blue">
              We're excited to see you at the event. If you have any questions, please don't hesitate to contact our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
