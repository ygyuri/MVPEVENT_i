# 🎨 M7 Analytics Dashboard - Frontend Requirements

## 📋 Overview
Comprehensive frontend requirements for the M7 Organizer Analytics Dashboard, covering React components, state management, data visualization, and Web3 integration.

## 🏗️ Frontend Architecture

### **Current Tech Stack Analysis**
Based on existing codebase:
- **React 18** with functional components and hooks
- **Redux Toolkit** for state management
- **Framer Motion** for animations
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Axios** for API calls
- **React Router** for navigation
- **React Hot Toast** for notifications

### **Missing Dependencies for Analytics**
```json
{
  "recharts": "^2.8.0",
  "chart.js": "^4.4.0",
  "react-chartjs-2": "^5.2.0",
  "date-fns": "^2.30.0",
  "react-datepicker": "^4.25.0",
  "react-select": "^5.8.0",
  "react-table": "^7.8.0",
  "file-saver": "^2.0.5",
  "jspdf": "^2.5.1",
  "xlsx": "^0.18.5"
}
```

## 📊 Core Components Required

### 1. **Analytics Dashboard Layout**
**File:** `client/src/pages/AnalyticsDashboard.jsx`

**Features:**
- Responsive grid layout (desktop/mobile)
- Sidebar navigation for different analytics views
- Header with event selector and date range picker
- Real-time data refresh indicators
- Export controls and settings

**State Management:**
```javascript
// Redux slice: analyticsSlice.js
const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    selectedEvent: null,
    dateRange: { start: null, end: null },
    period: 'daily',
    loading: false,
    error: null,
    lastUpdated: null,
    dashboardData: null,
    salesChartData: null,
    revenueData: null,
    exportJobs: []
  }
});
```

### 2. **Sales Chart Component**
**File:** `client/src/components/analytics/SalesChart.jsx`

**Features:**
- Interactive time series charts (Line, Bar, Area)
- Ticket type breakdown (Pie chart)
- Period selector (Daily/Weekly/Monthly)
- Zoom and pan functionality
- Data point tooltips
- Export chart as image

**Chart Types:**
- **Line Chart**: Sales over time
- **Bar Chart**: Daily/weekly/monthly comparison
- **Area Chart**: Cumulative sales
- **Pie Chart**: Ticket type distribution
- **Donut Chart**: Payment method breakdown

**Props Interface:**
```javascript
interface SalesChartProps {
  data: SalesChartData;
  period: 'daily' | 'weekly' | 'monthly';
  ticketType?: string;
  dateRange: { start: Date; end: Date };
  onPeriodChange: (period: string) => void;
  onTicketTypeFilter: (type: string) => void;
  loading?: boolean;
  error?: string;
}
```

### 3. **Revenue Overview Component**
**File:** `client/src/components/analytics/RevenueOverview.jsx`

**Features:**
- KPI cards (Total Revenue, Net Revenue, AOV, Orders)
- Payment method breakdown chart
- Revenue trend indicators
- Refund tracking
- Currency conversion support
- Real-time updates

**KPI Cards:**
```javascript
const KPICards = [
  {
    title: 'Total Revenue',
    value: 'formatCurrency',
    trend: 'percentage',
    icon: 'DollarSign',
    color: 'green'
  },
  {
    title: 'Net Revenue',
    value: 'formatCurrency',
    trend: 'percentage',
    icon: 'TrendingUp',
    color: 'blue'
  },
  {
    title: 'Average Order Value',
    value: 'formatCurrency',
    trend: 'percentage',
    icon: 'ShoppingCart',
    color: 'purple'
  },
  {
    title: 'Total Orders',
    value: 'number',
    trend: 'percentage',
    icon: 'Receipt',
    color: 'orange'
  }
];
```

### 4. **Attendee Export Component**
**File:** `client/src/components/analytics/AttendeeExport.jsx`

**Features:**
- Export format selector (CSV, Excel, PDF, JSON)
- Advanced filtering options
- Field selection for custom exports
- Progress tracking for large exports
- Download history
- Privacy compliance notices

**Filter Options:**
```javascript
const exportFilters = {
  status: ['all', 'active', 'used', 'cancelled', 'refunded'],
  ticketType: ['all', 'VIP', 'General', 'Early Bird'],
  dateRange: 'custom',
  fields: [
    'ticketNumber', 'holder.firstName', 'holder.lastName',
    'holder.email', 'holder.phone', 'ticketType', 'price',
    'orderNumber', 'purchaseDate', 'paymentMethod', 'status'
  ]
};
```

### 5. **Event Selector Component**
**File:** `client/src/components/analytics/EventSelector.jsx`

**Features:**
- Dropdown with search functionality
- Event status indicators
- Recent events quick access
- Multi-event comparison mode
- Event performance indicators

### 6. **Date Range Picker Component**
**File:** `client/src/components/analytics/DateRangePicker.jsx`

**Features:**
- Preset ranges (Last 7 days, Last 30 days, Last 3 months)
- Custom date range selection
- Calendar with date restrictions
- Timezone handling
- Quick date shortcuts

### 7. **Analytics Filters Component**
**File:** `client/src/components/analytics/AnalyticsFilters.jsx`

**Features:**
- Ticket type filter
- Payment method filter
- Status filter
- Date range filter
- Clear all filters
- Filter persistence

## 🔄 State Management Architecture

### **Analytics Redux Slice**
**File:** `client/src/store/slices/analyticsSlice.js`

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { analyticsAPI } from '../../utils/analyticsAPI';

// Async thunks
export const fetchDashboardOverview = createAsyncThunk(
  'analytics/fetchDashboardOverview',
  async (_, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getDashboardOverview();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch dashboard');
    }
  }
);

export const fetchSalesChart = createAsyncThunk(
  'analytics/fetchSalesChart',
  async ({ eventId, options }, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getSalesChart(eventId, options);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch sales data');
    }
  }
);

export const fetchRevenueOverview = createAsyncThunk(
  'analytics/fetchRevenueOverview',
  async ({ eventId }, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getRevenueOverview(eventId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch revenue data');
    }
  }
);

export const exportAttendees = createAsyncThunk(
  'analytics/exportAttendees',
  async ({ eventId, options }, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.exportAttendees(eventId, options);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Export failed');
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    // Dashboard state
    dashboardData: null,
    dashboardLoading: false,
    dashboardError: null,
    
    // Sales chart state
    salesChartData: null,
    salesChartLoading: false,
    salesChartError: null,
    
    // Revenue state
    revenueData: null,
    revenueLoading: false,
    revenueError: null,
    
    // Export state
    exportJobs: [],
    exportLoading: false,
    exportError: null,
    
    // UI state
    selectedEvent: null,
    dateRange: { start: null, end: null },
    period: 'daily',
    filters: {
      ticketType: 'all',
      paymentMethod: 'all',
      status: 'all'
    },
    lastUpdated: null
  },
  reducers: {
    setSelectedEvent: (state, action) => {
      state.selectedEvent = action.payload;
    },
    setDateRange: (state, action) => {
      state.dateRange = action.payload;
    },
    setPeriod: (state, action) => {
      state.period = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearAnalyticsError: (state) => {
      state.dashboardError = null;
      state.salesChartError = null;
      state.revenueError = null;
      state.exportError = null;
    },
    updateLastUpdated: (state) => {
      state.lastUpdated = new Date().toISOString();
    }
  },
  extraReducers: (builder) => {
    // Dashboard overview
    builder
      .addCase(fetchDashboardOverview.pending, (state) => {
        state.dashboardLoading = true;
        state.dashboardError = null;
      })
      .addCase(fetchDashboardOverview.fulfilled, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardData = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDashboardOverview.rejected, (state, action) => {
        state.dashboardLoading = false;
        state.dashboardError = action.payload;
      });
    
    // Sales chart
    builder
      .addCase(fetchSalesChart.pending, (state) => {
        state.salesChartLoading = true;
        state.salesChartError = null;
      })
      .addCase(fetchSalesChart.fulfilled, (state, action) => {
        state.salesChartLoading = false;
        state.salesChartData = action.payload;
      })
      .addCase(fetchSalesChart.rejected, (state, action) => {
        state.salesChartLoading = false;
        state.salesChartError = action.payload;
      });
    
    // Revenue overview
    builder
      .addCase(fetchRevenueOverview.pending, (state) => {
        state.revenueLoading = true;
        state.revenueError = null;
      })
      .addCase(fetchRevenueOverview.fulfilled, (state, action) => {
        state.revenueLoading = false;
        state.revenueData = action.payload;
      })
      .addCase(fetchRevenueOverview.rejected, (state, action) => {
        state.revenueLoading = false;
        state.revenueError = action.payload;
      });
    
    // Export attendees
    builder
      .addCase(exportAttendees.pending, (state) => {
        state.exportLoading = true;
        state.exportError = null;
      })
      .addCase(exportAttendees.fulfilled, (state, action) => {
        state.exportLoading = false;
        state.exportJobs.push(action.payload);
      })
      .addCase(exportAttendees.rejected, (state, action) => {
        state.exportLoading = false;
        state.exportError = action.payload;
      });
  }
});

export const {
  setSelectedEvent,
  setDateRange,
  setPeriod,
  setFilters,
  clearAnalyticsError,
  updateLastUpdated
} = analyticsSlice.actions;

export default analyticsSlice.reducer;
```

### **Analytics API Service**
**File:** `client/src/utils/analyticsAPI.js`

```javascript
import api from './api';

const analyticsAPI = {
  // Dashboard overview
  getDashboardOverview: () => api.get('/organizer/analytics/dashboard-overview'),
  
  // Sales chart
  getSalesChart: (eventId, options = {}) => {
    const params = new URLSearchParams();
    if (options.period) params.append('period', options.period);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.ticketType) params.append('ticketType', options.ticketType);
    
    return api.get(`/organizer/analytics/sales-chart/${eventId}?${params}`);
  },
  
  // Revenue overview
  getRevenueOverview: (eventId) => 
    api.get(`/organizer/analytics/revenue-overview/${eventId}`),
  
  // Revenue trends
  getRevenueTrends: (options = {}) => {
    const params = new URLSearchParams();
    if (options.period) params.append('period', options.period);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.eventIds) params.append('eventIds', JSON.stringify(options.eventIds));
    
    return api.get(`/organizer/analytics/revenue-trends?${params}`);
  },
  
  // Export attendees
  exportAttendees: (eventId, options = {}) => {
    const params = new URLSearchParams();
    if (options.format) params.append('format', options.format);
    if (options.status) params.append('status', options.status);
    if (options.ticketType) params.append('ticketType', options.ticketType);
    if (options.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options.dateTo) params.append('dateTo', options.dateTo);
    
    return api.get(`/organizer/analytics/export/attendees/${eventId}?${params}`);
  },
  
  // Create export job
  createExportJob: (eventId, options) => 
    api.post(`/organizer/analytics/export/attendees/${eventId}`, options),
  
  // Event summary
  getEventSummary: (eventId) => 
    api.get(`/organizer/analytics/events/${eventId}/summary`),
  
  // Cache management
  clearCache: () => api.get('/organizer/analytics/cache/clear'),
  clearEventCache: (eventId) => api.get(`/organizer/analytics/cache/clear/${eventId}`)
};

export default analyticsAPI;
```

## 🎨 UI/UX Requirements

### **Design System**
- **Color Palette**: Consistent with existing organizer dashboard
- **Typography**: Use existing font system (Inter/Sans-serif)
- **Spacing**: Tailwind spacing scale
- **Icons**: Lucide React icon set
- **Animations**: Framer Motion for smooth transitions

### **Responsive Design**
- **Desktop**: 4-column grid layout
- **Tablet**: 2-column grid layout
- **Mobile**: Single column with collapsible sections
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)

### **Accessibility**
- **ARIA labels** for all interactive elements
- **Keyboard navigation** support
- **Screen reader** compatibility
- **Color contrast** compliance (WCAG 2.1 AA)
- **Focus management** for modals and dropdowns

### **Loading States**
- **Skeleton loaders** for charts and cards
- **Progress indicators** for data fetching
- **Error boundaries** with retry functionality
- **Empty states** with helpful messaging

## 📱 Mobile Optimization

### **Touch Interactions**
- **Swipe gestures** for chart navigation
- **Pinch-to-zoom** for detailed chart views
- **Touch-friendly** button sizes (44px minimum)
- **Optimized scrolling** for long data lists

### **Performance**
- **Lazy loading** for chart components
- **Virtual scrolling** for large datasets
- **Image optimization** for chart exports
- **Bundle splitting** for analytics modules

## 🔧 Advanced Features

### **Real-time Updates**
- **WebSocket integration** for live data
- **Polling fallback** for data refresh
- **Optimistic updates** for better UX
- **Conflict resolution** for concurrent edits

### **Data Export**
- **Multiple formats**: CSV, Excel, PDF, JSON
- **Custom field selection**
- **Batch export** for multiple events
- **Scheduled exports** (future feature)
- **Export history** and management

### **Advanced Analytics**
- **Predictive analytics** (future feature)
- **Custom date ranges**
- **Multi-event comparison**
- **Drill-down capabilities**
- **Custom metrics** and KPIs

### **Caching Strategy**
- **Client-side caching** for frequently accessed data
- **Cache invalidation** on data updates
- **Offline support** for cached data
- **Background sync** when online

## 🧪 Testing Requirements

### **Unit Tests**
- Component rendering tests
- Redux action/reducer tests
- API service tests
- Utility function tests

### **Integration Tests**
- API integration tests
- Chart rendering tests
- Export functionality tests
- Error handling tests

### **E2E Tests**
- Complete analytics workflow
- Export process testing
- Mobile responsiveness
- Accessibility compliance

## 📊 Chart Library Integration

### **Recharts Implementation**
```javascript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SalesChart = ({ data, period, onPeriodChange }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data.chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="_id.date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="count" stroke="#8884d8" />
        <Line type="monotone" dataKey="revenue" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

### **Chart.js Implementation**
```javascript
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const SalesChart = ({ data }) => {
  const chartData = {
    labels: data.chartData.map(item => item._id.date),
    datasets: [
      {
        label: 'Tickets Sold',
        data: data.chartData.map(item => item.count),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
      {
        label: 'Revenue',
        data: data.chartData.map(item => item.revenue),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
      }
    ]
  };

  return <Line data={chartData} />;
};
```

## 🚀 Implementation Phases

### **Phase 1: Core Components (Week 1-2)**
- [ ] Analytics dashboard layout
- [ ] Basic sales chart component
- [ ] Revenue overview cards
- [ ] Event selector
- [ ] Date range picker

### **Phase 2: Advanced Features (Week 3-4)**
- [ ] Interactive charts with filters
- [ ] Attendee export functionality
- [ ] Real-time data updates
- [ ] Mobile optimization
- [ ] Error handling and loading states

### **Phase 3: Polish & Testing (Week 5-6)**
- [ ] Advanced chart interactions
- [ ] Export job management
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Accessibility compliance

## 📋 File Structure

```
client/src/
├── components/
│   └── analytics/
│       ├── AnalyticsDashboard.jsx
│       ├── SalesChart.jsx
│       ├── RevenueOverview.jsx
│       ├── AttendeeExport.jsx
│       ├── EventSelector.jsx
│       ├── DateRangePicker.jsx
│       ├── AnalyticsFilters.jsx
│       ├── KPICard.jsx
│       ├── ChartContainer.jsx
│       └── ExportModal.jsx
├── pages/
│   └── AnalyticsDashboard.jsx
├── store/
│   └── slices/
│       └── analyticsSlice.js
├── utils/
│   ├── analyticsAPI.js
│   ├── chartUtils.js
│   ├── exportUtils.js
│   └── analyticsHelpers.js
├── hooks/
│   ├── useAnalytics.js
│   ├── useChartData.js
│   └── useExport.js
└── styles/
    └── analytics.css
```

## 🎯 Success Metrics

### **Performance**
- **Initial load time**: < 2 seconds
- **Chart rendering**: < 500ms
- **Export generation**: < 5 seconds for 1000 records
- **Mobile responsiveness**: 100% on all devices

### **User Experience**
- **Intuitive navigation**: < 3 clicks to any feature
- **Error recovery**: Clear error messages with retry options
- **Accessibility**: WCAG 2.1 AA compliance
- **Mobile usability**: Touch-friendly interface

### **Functionality**
- **Data accuracy**: 100% match with backend data
- **Export reliability**: 99.9% success rate
- **Real-time updates**: < 5 second delay
- **Cross-browser compatibility**: Chrome, Firefox, Safari, Edge

This comprehensive frontend requirements document provides everything needed to build a world-class analytics dashboard that integrates seamlessly with the existing Event-i platform! 🚀


