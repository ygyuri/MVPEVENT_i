import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  RefreshCw,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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

const SalesChart = ({ 
  data, 
  loading, 
  error, 
  period, 
  onPeriodChange 
}) => {
  const [chartType, setChartType] = useState('line');
  const [showTicketBreakdown, setShowTicketBreakdown] = useState(false);

  // Chart type options
  const chartTypes = [
    { id: 'line', label: 'Line Chart', icon: TrendingUp },
    { id: 'area', label: 'Area Chart', icon: BarChart3 },
    { id: 'bar', label: 'Bar Chart', icon: BarChart3 }
  ];

  // Process chart data
  const chartData = useMemo(() => {
    if (!data?.chartData) return [];

    // Group data by date and aggregate ticket types
    const groupedData = data.chartData.reduce((acc, item) => {
      const date = item._id.date;
      const ticketType = item._id.ticketType;
      
      if (!acc[date]) {
        acc[date] = {
          date,
          totalTickets: 0,
          totalRevenue: 0,
          totalOrders: 0
        };
      }
      
      acc[date].totalTickets += item.count;
      acc[date].totalRevenue += item.revenue;
      acc[date].totalOrders += item.orders;
      
      // Add individual ticket type data
      acc[date][`${ticketType}_tickets`] = item.count;
      acc[date][`${ticketType}_revenue`] = item.revenue;
      
      return acc;
    }, {});

    return Object.values(groupedData).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [data?.chartData]);

  // Ticket type breakdown data
  const ticketBreakdownData = useMemo(() => {
    if (!data?.chartData) return [];

    const breakdown = data.chartData.reduce((acc, item) => {
      const ticketType = item._id.ticketType;
      
      if (!acc[ticketType]) {
        acc[ticketType] = {
          name: ticketType,
          tickets: 0,
          revenue: 0
        };
      }
      
      acc[ticketType].tickets += item.count;
      acc[ticketType].revenue += item.revenue;
      
      return acc;
    }, {});

    return Object.values(breakdown);
  }, [data?.chartData]);

  // Colors for different ticket types
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-KE').format(value);
  };

  const formatDate = (date) => {
    const d = new Date(date);
    switch (period) {
      case 'daily':
        return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
      case 'weekly':
        return `Week ${d.getWeek()}`;
      case 'monthly':
        return d.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' });
      default:
        return d.toLocaleDateString('en-KE');
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white mb-2">
            {formatDate(label)}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey.includes('tickets') ? 'Tickets' : 'Revenue'}: {entry.dataKey.includes('revenue') ? formatCurrency(entry.value) : formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke="#6B7280"
            />
            <YAxis stroke="#6B7280" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="totalTickets" 
              stroke="#8884d8" 
              strokeWidth={2}
              name="Tickets Sold"
            />
            <Line 
              type="monotone" 
              dataKey="totalRevenue" 
              stroke="#82ca9d" 
              strokeWidth={2}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke="#6B7280"
            />
            <YAxis stroke="#6B7280" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="totalTickets" 
              stackId="1"
              stroke="#8884d8" 
              fill="#8884d8"
              fillOpacity={0.6}
              name="Tickets Sold"
            />
            <Area 
              type="monotone" 
              dataKey="totalRevenue" 
              stackId="2"
              stroke="#82ca9d" 
              fill="#82ca9d"
              fillOpacity={0.6}
              name="Revenue"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke="#6B7280"
            />
            <YAxis stroke="#6B7280" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="totalTickets" fill="#8884d8" name="Tickets Sold" />
            <Bar dataKey="totalRevenue" fill="#82ca9d" name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  const renderTicketBreakdown = () => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={ticketBreakdownData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="tickets"
          >
            {ticketBreakdownData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatNumber(value)} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
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
            <BarChart3 className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error Loading Chart
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data || !chartData.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Sales Data
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No sales data available for the selected period.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Chart Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sales Chart
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {data.summary && (
                  <>
                    {formatNumber(data.summary.totalTicketsSold)} tickets sold • 
                    {formatCurrency(data.summary.totalRevenue)} revenue • 
                    {formatNumber(data.summary.totalOrders)} orders
                  </>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Chart Type Selector */}
              <div className="flex items-center space-x-2">
                {chartTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setChartType(type.id)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        chartType === type.id
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Period Selector */}
              <select
                value={period}
                onChange={(e) => onPeriodChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chart Content */}
        <div className="p-6">
          {renderChart()}
        </div>
      </div>

      {/* Ticket Breakdown */}
      {ticketBreakdownData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ticket Type Breakdown
              </h3>
              <button
                onClick={() => setShowTicketBreakdown(!showTicketBreakdown)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <span>Toggle Breakdown</span>
                {showTicketBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          {showTicketBreakdown && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                    Tickets by Type
                  </h4>
                  {renderTicketBreakdown()}
                </div>

                {/* Data Table */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                    Breakdown Details
                  </h4>
                  <div className="space-y-3">
                    {ticketBreakdownData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: colors[index % colors.length] }}
                          ></div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatNumber(item.tickets)} tickets
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(item.revenue)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SalesChart;


