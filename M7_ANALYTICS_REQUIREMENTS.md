# 📊 M7 Organizer Analytics Dashboard - Requirements

## 🎯 Objective
Create a comprehensive analytics dashboard for organizers to visualize ticket sales, revenue trends, and export attendee data.

## 📦 Core Features

### 1. Ticket Sales Chart
**Purpose**: Visualize ticket sales over time with interactive charts

#### Data Requirements:
- **Time Series Data**: Daily/weekly/monthly ticket sales
- **Ticket Type Breakdown**: Sales by ticket type (VIP, General, Early Bird, etc.)
- **Event Comparison**: Compare sales across multiple events
- **Sales Velocity**: Track sales momentum and trends

#### Backend Endpoints Needed:
```javascript
// GET /api/organizer/analytics/sales-chart/:eventId
// Query Parameters: period (daily|weekly|monthly), startDate, endDate
// Response: Time series data with ticket type breakdown

// GET /api/organizer/analytics/sales-summary/:eventId
// Response: Total sales, conversion rates, peak sales periods
```

#### Database Aggregation Queries:
```javascript
// Daily sales aggregation
db.orders.aggregate([
  { $match: { 
    "items.eventId": ObjectId("eventId"),
    "status": "paid",
    "createdAt": { $gte: startDate, $lte: endDate }
  }},
  { $unwind: "$items" },
  { $group: {
    _id: {
      date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      ticketType: "$items.ticketType"
    },
    count: { $sum: "$items.quantity" },
    revenue: { $sum: "$items.subtotal" }
  }},
  { $sort: { "_id.date": 1 } }
])
```

### 2. Revenue Overview
**Purpose**: Comprehensive financial dashboard with revenue metrics

#### Key Metrics:
- **Total Revenue**: Gross revenue from all ticket sales
- **Net Revenue**: Revenue after platform fees (5% service fee)
- **Revenue by Payment Method**: MPESA, PesaPal, PayHero breakdown
- **Refund Tracking**: Cancelled/refunded amounts
- **Revenue Trends**: Month-over-month growth
- **Average Order Value**: AOV calculations

#### Backend Endpoints Needed:
```javascript
// GET /api/organizer/analytics/revenue-overview/:eventId
// Response: Revenue metrics, payment method breakdown, refunds

// GET /api/organizer/analytics/revenue-trends
// Query Parameters: period, eventIds (array)
// Response: Revenue trends across events
```

#### Database Aggregation Queries:
```javascript
// Revenue overview aggregation
db.orders.aggregate([
  { $match: { 
    "items.eventId": ObjectId("eventId"),
    "status": { $in: ["paid", "confirmed"] }
  }},
  { $group: {
    _id: null,
    totalRevenue: { $sum: "$pricing.subtotal" },
    totalFees: { $sum: "$pricing.serviceFee" },
    netRevenue: { $sum: "$pricing.total" },
    orderCount: { $sum: 1 },
    avgOrderValue: { $avg: "$pricing.total" }
  }}
])

// Payment method breakdown
db.orders.aggregate([
  { $match: { 
    "items.eventId": ObjectId("eventId"),
    "status": "paid"
  }},
  { $group: {
    _id: "$payment.method",
    count: { $sum: 1 },
    revenue: { $sum: "$pricing.total" }
  }}
])
```

### 3. Export Attendee List
**Purpose**: Export comprehensive attendee data for external use

#### Export Formats:
- **CSV**: For spreadsheet analysis
- **Excel**: For advanced reporting
- **PDF**: For official documentation
- **JSON**: For API integration

#### Data Fields to Export:
```javascript
// Attendee Export Schema
{
  "ticketNumber": "TKT-123456",
  "eventTitle": "Tech Conference 2024",
  "eventDate": "2024-03-15",
  "ticketType": "VIP",
  "price": 5000,
  "holder": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+254712345678"
  },
  "orderNumber": "ORD-789",
  "purchaseDate": "2024-02-01T10:30:00Z",
  "paymentMethod": "mpesa",
  "status": "active",
  "usedAt": null,
  "qrCode": "encrypted_qr_string"
}
```

#### Backend Endpoints Needed:
```javascript
// GET /api/organizer/analytics/export/attendees/:eventId
// Query Parameters: format (csv|excel|pdf|json), status (all|active|used)
// Response: File download or JSON data

// POST /api/organizer/analytics/export/attendees/:eventId
// Body: { format, filters, fields }
// Response: Export job ID for async processing
```

## 🏗️ Backend Implementation Plan

### 1. New Analytics Service
Create `server/services/analyticsService.js`:

```javascript
class AnalyticsService {
  // Sales chart data
  async getSalesChart(eventId, options = {}) {
    const { period = 'daily', startDate, endDate } = options;
    // Implementation with MongoDB aggregation
  }

  // Revenue overview
  async getRevenueOverview(eventId) {
    // Calculate all revenue metrics
  }

  // Export attendees
  async exportAttendees(eventId, options = {}) {
    const { format = 'csv', filters = {} } = options;
    // Generate export file
  }

  // Revenue trends across events
  async getRevenueTrends(organizerId, options = {}) {
    // Multi-event revenue analysis
  }
}
```

### 2. New Analytics Routes
Create `server/routes/analytics.js`:

```javascript
const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');

const router = express.Router();

// Sales chart endpoint
router.get('/sales-chart/:eventId', verifyToken, requireRole(['organizer', 'admin']), async (req, res) => {
  // Implementation
});

// Revenue overview endpoint
router.get('/revenue-overview/:eventId', verifyToken, requireRole(['organizer', 'admin']), async (req, res) => {
  // Implementation
});

// Export attendees endpoint
router.get('/export/attendees/:eventId', verifyToken, requireRole(['organizer', 'admin']), async (req, res) => {
  // Implementation
});

module.exports = router;
```

### 3. Database Indexes for Performance
```javascript
// Add indexes for analytics queries
db.orders.createIndex({ "items.eventId": 1, "createdAt": 1, "status": 1 });
db.orders.createIndex({ "items.eventId": 1, "payment.method": 1, "status": 1 });
db.tickets.createIndex({ "eventId": 1, "status": 1, "createdAt": 1 });
db.tickets.createIndex({ "eventId": 1, "ticketType": 1, "status": 1 });
```

## 📊 Frontend Requirements

### 1. Analytics Dashboard Page
- **Route**: `/organizer/analytics/:eventId`
- **Components**: 
  - SalesChart component (using Chart.js or similar)
  - RevenueOverview component
  - ExportControls component
  - AnalyticsFilters component

### 2. Chart Library Integration
- **Recommended**: Chart.js or Recharts
- **Chart Types**: Line charts, bar charts, pie charts, area charts
- **Interactivity**: Zoom, filter, drill-down capabilities

### 3. Export Functionality
- **Download Button**: Trigger export with format selection
- **Progress Indicator**: For large exports
- **Preview Modal**: Show export preview before download

## 🔒 Security & Privacy Considerations

### 1. Data Access Control
- Only event organizers can access their event analytics
- Admin users can access all analytics
- Proper authentication and authorization checks

### 2. Data Privacy
- Attendee data export should include privacy notices
- GDPR compliance for EU attendees
- Data retention policies for exports

### 3. Rate Limiting
- Implement rate limiting for analytics endpoints
- Prevent abuse of export functionality
- Cache frequently accessed analytics data

## 📈 Performance Optimization

### 1. Caching Strategy
- Cache analytics data for 5-15 minutes
- Use Redis for caching aggregated data
- Implement cache invalidation on new orders

### 2. Database Optimization
- Use MongoDB aggregation pipelines efficiently
- Implement proper indexing
- Consider data archiving for old events

### 3. Async Processing
- Use background jobs for large exports
- Implement progress tracking for long-running operations
- Queue system for export requests

## 🧪 Testing Requirements

### 1. Unit Tests
- Test analytics service methods
- Test aggregation queries
- Test export functionality

### 2. Integration Tests
- Test analytics endpoints
- Test data accuracy
- Test export file generation

### 3. Performance Tests
- Test with large datasets
- Test concurrent analytics requests
- Test export performance

## 📋 Implementation Phases

### Phase 1: Basic Analytics (Week 1-2)
- [ ] Create analytics service
- [ ] Implement sales chart endpoint
- [ ] Basic revenue overview
- [ ] Simple CSV export

### Phase 2: Enhanced Features (Week 3-4)
- [ ] Interactive charts
- [ ] Multiple export formats
- [ ] Revenue trends
- [ ] Performance optimization

### Phase 3: Advanced Analytics (Week 5-6)
- [ ] Predictive analytics
- [ ] Advanced filtering
- [ ] Real-time updates
- [ ] Mobile optimization

## 🔗 Integration Points

### 1. Existing Systems
- **Order Service**: Leverage existing order processing
- **Ticket Service**: Use existing ticket management
- **Email Service**: Integrate with notification system

### 2. External Services
- **Payment Providers**: MPESA, PesaPal, PayHero integration
- **File Storage**: For export file management
- **Caching**: Redis for performance

## 📝 API Documentation

### Analytics Endpoints
```yaml
/api/organizer/analytics/sales-chart/:eventId:
  get:
    summary: Get sales chart data
    parameters:
      - name: period
        in: query
        schema:
          type: string
          enum: [daily, weekly, monthly]
      - name: startDate
        in: query
        schema:
          type: string
          format: date
      - name: endDate
        in: query
        schema:
          type: string
          format: date
    responses:
      200:
        description: Sales chart data
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: object
                  properties:
                    chartData:
                      type: array
                    summary:
                      type: object
```

This comprehensive requirements document provides the foundation for implementing the M7 Organizer Analytics Dashboard with all necessary backend endpoints, database queries, and frontend considerations.


