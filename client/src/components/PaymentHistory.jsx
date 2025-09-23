import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  CreditCard, 
  Download, 
  Eye, 
  Calendar, 
  MapPin, 
  Users, 
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Receipt,
  ExternalLink
} from 'lucide-react';

const PaymentHistory = () => {
  const { isDarkMode } = useTheme();
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    method: 'all',
    dateRange: 'all'
  });

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockPayments = [
      {
        id: 1,
        transactionId: 'TXN-2024-001',
        eventTitle: 'Tech Conference 2024',
        eventDate: '2024-12-15',
        eventLocation: 'San Francisco, CA',
        amount: 299.98,
        currency: 'USD',
        status: 'completed',
        paymentMethod: 'Credit Card',
        paymentProvider: 'Stripe',
        last4: '4242',
        paidAt: '2024-09-10T10:30:00Z',
        tickets: 2,
        fees: 8.99,
        subtotal: 290.99,
        receiptUrl: '/receipts/TXN-2024-001.pdf',
        refundable: true
      },
      {
        id: 2,
        transactionId: 'TXN-2024-002',
        eventTitle: 'Music Festival',
        eventDate: '2024-11-20',
        eventLocation: 'Los Angeles, CA',
        amount: 149.99,
        currency: 'USD',
        status: 'completed',
        paymentMethod: 'PayPal',
        paymentProvider: 'PayPal',
        last4: null,
        paidAt: '2024-09-08T14:15:00Z',
        tickets: 1,
        fees: 4.50,
        subtotal: 145.49,
        receiptUrl: '/receipts/TXN-2024-002.pdf',
        refundable: true
      },
      {
        id: 3,
        transactionId: 'TXN-2024-003',
        eventTitle: 'Business Workshop',
        eventDate: '2024-10-05',
        eventLocation: 'New York, NY',
        amount: 199.99,
        currency: 'USD',
        status: 'pending',
        paymentMethod: 'Bank Transfer',
        paymentProvider: 'Pesapal',
        last4: null,
        paidAt: '2024-09-05T09:45:00Z',
        tickets: 1,
        fees: 6.00,
        subtotal: 193.99,
        receiptUrl: null,
        refundable: false
      },
      {
        id: 4,
        transactionId: 'TXN-2024-004',
        eventTitle: 'Art Exhibition',
        eventDate: '2024-12-05',
        eventLocation: 'Chicago, IL',
        amount: 45.00,
        currency: 'USD',
        status: 'refunded',
        paymentMethod: 'Credit Card',
        paymentProvider: 'Stripe',
        last4: '4242',
        paidAt: '2024-09-12T16:20:00Z',
        refundedAt: '2024-09-15T11:30:00Z',
        tickets: 1,
        fees: 1.35,
        subtotal: 43.65,
        receiptUrl: '/receipts/TXN-2024-004.pdf',
        refundable: false
      }
    ];
    setPayments(mockPayments);
    setFilteredPayments(mockPayments);
  }, []);

  useEffect(() => {
    let filtered = payments.filter(payment => {
      const matchesSearch = payment.eventTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           payment.eventLocation.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filters.status === 'all' || payment.status === filters.status;
      const matchesMethod = filters.method === 'all' || payment.paymentMethod === filters.method;
      
      return matchesSearch && matchesStatus && matchesMethod;
    });

    setFilteredPayments(filtered);
  }, [payments, searchTerm, filters]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'refunded':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'refunded':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatEventDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDownloadReceipt = (paymentId) => {
    // TODO: Implement receipt download
    console.log('Downloading receipt for payment:', paymentId);
  };

  const handleViewDetails = (paymentId) => {
    // TODO: Implement payment details view
    console.log('Viewing details for payment:', paymentId);
  };

  const handleRequestRefund = (paymentId) => {
    // TODO: Implement refund request
    console.log('Requesting refund for payment:', paymentId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Payment History
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            View and manage your payment transactions
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            } transition-colors`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 space-y-4`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-600 border-gray-500 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Payment Method
                </label>
                <select
                  value={filters.method}
                  onChange={(e) => setFilters(prev => ({ ...prev, method: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-600 border-gray-500 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="all">All Methods</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Mobile Money">Mobile Money</option>
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-600 border-gray-500 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="all">All Time</option>
                  <option value="last7days">Last 7 Days</option>
                  <option value="last30days">Last 30 Days</option>
                  <option value="last3months">Last 3 Months</option>
                  <option value="lastyear">Last Year</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Spent</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                ${payments.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0).toFixed(2)}
              </p>
            </div>
            <CreditCard className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
          </div>
        </div>
        
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Events</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {payments.filter(p => p.status === 'completed').length}
              </p>
            </div>
            <Calendar className={`w-8 h-8 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} />
          </div>
        </div>
        
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Pending</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {payments.filter(p => p.status === 'pending').length}
              </p>
            </div>
            <Clock className={`w-8 h-8 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
          </div>
        </div>
        
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Refunded</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {payments.filter(p => p.status === 'refunded').length}
              </p>
            </div>
            <XCircle className={`w-8 h-8 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-4">
        {filteredPayments.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No payments found</p>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg border ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              } overflow-hidden`}
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Payment Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                          {payment.eventTitle}
                        </h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Transaction ID: {payment.transactionId}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(payment.status)}
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                          {formatEventDate(payment.eventDate)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <MapPin className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                          {payment.eventLocation}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <CreditCard className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                          {payment.paymentMethod} {payment.last4 && `****${payment.last4}`}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Users className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                          {payment.tickets} ticket{payment.tickets !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Details */}
                  <div className="lg:w-80">
                    <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 space-y-3`}>
                      <div className="flex justify-between text-sm">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Subtotal:</span>
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>${payment.subtotal}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Fees:</span>
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>${payment.fees}</span>
                      </div>
                      <div className={`border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} pt-3`}>
                        <div className="flex justify-between">
                          <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Total:</span>
                          <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            ${payment.amount}
                          </span>
                        </div>
                      </div>
                      
                      <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        Paid on {formatDate(payment.paidAt)}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex space-x-2 mt-4">
                      <button
                        onClick={() => handleViewDetails(payment.id)}
                        className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-xl border ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' 
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        } transition-colors`}
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                      
                      {payment.receiptUrl && (
                        <button
                          onClick={() => handleDownloadReceipt(payment.id)}
                          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-xl border ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' 
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          } transition-colors`}
                        >
                          <Download className="w-4 h-4" />
                          <span>Receipt</span>
                        </button>
                      )}
                    </div>
                    
                    {payment.refundable && payment.status === 'completed' && (
                      <button
                        onClick={() => handleRequestRefund(payment.id)}
                        className={`w-full mt-2 px-4 py-2 rounded-xl border ${
                          isDarkMode 
                            ? 'bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/30' 
                            : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                        } transition-colors text-sm font-medium`}
                      >
                        Request Refund
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
