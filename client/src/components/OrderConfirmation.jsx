import React from 'react';
import { useSelector } from 'react-redux';
import { CheckCircle, Calendar, User, CreditCard, ArrowRight, Home, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';

const OrderConfirmation = () => {
  const { currentOrder } = useSelector((state) => state.checkout);

  if (!currentOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Order Not Found</h2>
          <p className="text-blue-200 mb-8 max-w-md">
            We couldn't find your order details. Please check your email or contact support.
          </p>
          <Link
            to="/"
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 inline-flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Order Confirmed! 🎉
          </h1>
          <p className="text-blue-200 text-lg">
            Thank you for your purchase. Your tickets are on their way!
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 mb-6">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
                <Receipt className="w-6 h-6 text-blue-400" />
                Order Details
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-blue-200 font-medium mb-2">Order Number</h3>
                  <p className="text-white font-mono text-lg bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20">
                    {currentOrder.orderNumber || 'N/A'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-blue-200 font-medium mb-2">Order Date</h3>
                  <p className="text-white">
                    {currentOrder.createdAt ? new Date(currentOrder.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-blue-200 font-medium mb-2">Status</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/30">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmed
                  </span>
                </div>
                
                <div>
                  <h3 className="text-blue-200 font-medium mb-2">Payment Method</h3>
                  <p className="text-white">MPESA Mobile Money</p>
                </div>
              </div>

              {/* Customer Information */}
              <div className="border-t border-blue-500/20 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  Customer Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-blue-200 text-sm">Name</p>
                    <p className="text-white font-medium">
                      {currentOrder.customer?.firstName || 'N/A'} {currentOrder.customer?.lastName || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-sm">Email</p>
                    <p className="text-white font-medium">{currentOrder.customer?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-blue-200 text-sm">Phone</p>
                    <p className="text-white font-medium">{currentOrder.customer?.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tickets Purchased */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-400" />
                Tickets Purchased
              </h2>
              
              <div className="space-y-4">
                {currentOrder.items && currentOrder.items.length > 0 ? (
                  currentOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-white mb-1">
                            {item.eventTitle || 'Event Title N/A'}
                          </h4>
                          <p className="text-blue-200 text-sm">
                            {item.ticketType || 'Ticket Type N/A'} Ticket × {item.quantity || 0}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">
                            KES {(item.subtotal || 0).toLocaleString()}
                          </p>
                          <p className="text-blue-300 text-sm">
                            KES {(item.unitPrice || 0).toLocaleString()} each
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-blue-300">No ticket information available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 sticky top-4">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" />
                Payment Summary
              </h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-blue-200">
                  <span>Subtotal</span>
                  <span>KES {(currentOrder.pricing?.subtotal || 0).toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between text-blue-200">
                  <span>Service Fee</span>
                  <span>KES {(currentOrder.pricing?.serviceFee || 0).toLocaleString()}</span>
                </div>
                
                <div className="border-t border-blue-500/20 pt-3">
                  <div className="flex justify-between text-white font-semibold text-lg">
                    <span>Total Paid</span>
                    <span>KES {(currentOrder.pricing?.total || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">Payment Successful</p>
                    <p className="text-green-400 text-sm">
                      MPESA Transaction ID: {currentOrder.payment?.mpesaTransactionId || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What's Next Section */}
        <div className="mt-12 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            What's Next? 🚀
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <Receipt className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Check Your Email</h3>
              <p className="text-blue-200 text-sm">
                You'll receive a confirmation email with your tickets attached
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Save Your Tickets</h3>
              <p className="text-blue-200 text-sm">
                Download and save your tickets to your phone or print them
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Attend the Event</h3>
              <p className="text-blue-200 text-sm">
                Present your ticket at the event entrance for entry
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 border border-white/20 hover:border-white/30 flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Continue Shopping
          </Link>
          
          <Link
            to="/orders"
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            View My Orders
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Support Notice */}
        <div className="mt-8 text-center">
          <p className="text-blue-300 text-sm">
            Need help? Contact us at{' '}
            <a href="mailto:support@event-i.com" className="text-cyan-400 hover:underline">
              support@event-i.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
