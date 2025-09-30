import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Users,
  Receipt,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const RevenueOverview = ({ data, loading, error }) => {
  const [activeMetric, setActiveMetric] = useState('revenue');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-KE').format(num);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  // KPI Cards data
  const kpiCards = [
    {
      title: 'Total Revenue',
      value: data?.totalRevenue || 0,
      icon: DollarSign,
      color: 'green',
      trend: '+12.5%',
      trendDirection: 'up'
    },
    {
      title: 'Net Revenue',
      value: data?.netRevenue || 0,
      icon: TrendingUp,
      color: 'blue',
      trend: '+8.2%',
      trendDirection: 'up'
    },
    {
      title: 'Average Order Value',
      value: data?.avgOrderValue || 0,
      icon: Receipt,
      color: 'purple',
      trend: '+5.1%',
      trendDirection: 'up'
    },
    {
      title: 'Total Orders',
      value: data?.orderCount || 0,
      icon: Users,
      color: 'orange',
      trend: '+15.3%',
      trendDirection: 'up'
    }
  ];

  // Payment method colors
  const paymentColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  // Process payment method data for charts
  const paymentMethodData = data?.paymentMethods?.map((method, index) => ({
    name: method._id.toUpperCase(),
    value: method.revenue,
    count: method.count,
    color: paymentColors[index % paymentColors.length]
  })) || [];

  // Process ticket type revenue data
  const ticketTypeData = data?.ticketTypes?.map((type, index) => ({
    name: type._id,
    revenue: type.revenue,
    tickets: type.count,
    color: paymentColors[index % paymentColors.length]
  })) || [];

  // Daily revenue trend data
  const dailyTrendData = data?.dailyTrend?.map(item => ({
    date: new Date(item._id.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
    revenue: item.revenue,
    orders: item.orders
  })) || [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.dataKey.includes('revenue') ? formatCurrency(entry.value) : formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error Loading Revenue Data
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Revenue Data
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No revenue data available for the selected period.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          const colorClasses = {
            green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
            blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
            purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
            orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400'
          };

          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {card.title.includes('Revenue') || card.title.includes('Value') 
                      ? formatCurrency(card.value) 
                      : formatNumber(card.value)
                    }
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[card.color]}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              
              <div className="mt-4 flex items-center">
                {card.trendDirection === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${
                  card.trendDirection === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {card.trend}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  vs last period
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Payment Methods
          </h3>
          
          {paymentMethodData.length > 0 ? (
            <div className="space-y-4">
              {/* Pie Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Method Details */}
              <div className="space-y-2">
                {paymentMethodData.map((method, index) => (
                  <div key={method.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: method.color }}
                      ></div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {method.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(method.value)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatNumber(method.count)} orders
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No payment data available</p>
            </div>
          )}
        </div>

        {/* Ticket Type Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Revenue by Ticket Type
          </h3>
          
          {ticketTypeData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6B7280"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    tickFormatter={(value) => `₵${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No ticket type data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Revenue Trend */}
      {dailyTrendData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Daily Revenue Trend
          </h3>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6B7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6B7280"
                  tickFormatter={(value) => `₵${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="revenue" fill="#82ca9d" name="Revenue" />
                <Bar dataKey="orders" fill="#8884d8" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Refunds Section */}
      {data.refunds && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Refunds
            </h3>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {data.refunds.refundCount} refunds
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <TrendingDown className="h-6 w-6 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Refund Amount
                  </p>
                  <p className="text-xl font-bold text-red-800 dark:text-red-300">
                    {formatCurrency(data.refunds.refundAmount)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Refund Rate
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {data.totalRevenue > 0 
                      ? formatPercentage((data.refunds.refundAmount / data.totalRevenue) * 100)
                      : '0%'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueOverview;


