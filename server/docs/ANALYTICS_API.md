# 📊 Analytics API Documentation

## Overview
The Analytics API provides comprehensive analytics and reporting capabilities for organizers to track ticket sales, revenue, and export attendee data.

## Base URL
```
/api/organizer/analytics
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. Dashboard Overview
Get comprehensive dashboard overview for organizer.

**Endpoint:** `GET /dashboard-overview`

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "eventsCount": 5,
    "totalRevenue": 15000,
    "totalTicketsSold": 150,
    "upcomingEvents": [
      {
        "title": "Tech Conference 2024",
        "dates": {
          "startDate": "2024-03-15T09:00:00Z"
        },
        "capacity": 100,
        "currentAttendees": 75
      }
    ],
    "recentSales": [
      {
        "orderNumber": "ORD-123",
        "createdAt": "2024-02-01T10:30:00Z",
        "pricing": {
          "total": 500
        },
        "event": {
          "title": "Tech Conference 2024"
        },
        "items": [
          {
            "ticketType": "VIP",
            "quantity": 1
          }
        ]
      }
    ],
    "lastUpdated": "2024-02-01T12:00:00Z"
  }
}
```

### 2. Sales Chart
Get sales chart data for a specific event.

**Endpoint:** `GET /sales-chart/:eventId`

**Parameters:**
- `eventId` (path): Event ID (MongoDB ObjectId)

**Query Parameters:**
- `period` (optional): Time period - `daily`, `weekly`, `monthly` (default: `daily`)
- `startDate` (optional): Start date (ISO 8601 format)
- `endDate` (optional): End date (ISO 8601 format)
- `ticketType` (optional): Filter by ticket type

**Example:**
```
GET /sales-chart/507f1f77bcf86cd799439011?period=weekly&startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chartData": [
      {
        "_id": {
          "date": "2024-01-01",
          "ticketType": "VIP"
        },
        "count": 5,
        "revenue": 500,
        "orders": 3
      }
    ],
    "summary": {
      "totalTicketsSold": 25,
      "totalRevenue": 2500,
      "totalOrders": 15,
      "avgOrderValue": 166.67
    },
    "period": "daily",
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  }
}
```

### 3. Revenue Overview
Get comprehensive revenue overview for an event.

**Endpoint:** `GET /revenue-overview/:eventId`

**Parameters:**
- `eventId` (path): Event ID (MongoDB ObjectId)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 10000,
    "totalFees": 500,
    "netRevenue": 9500,
    "orderCount": 50,
    "avgOrderValue": 200,
    "paymentMethods": [
      {
        "_id": "mpesa",
        "count": 30,
        "revenue": 6000
      },
      {
        "_id": "pesapal",
        "count": 20,
        "revenue": 4000
      }
    ],
    "refunds": {
      "refundCount": 2,
      "refundAmount": 200
    },
    "ticketTypes": [
      {
        "_id": "VIP",
        "count": 25,
        "revenue": 5000
      },
      {
        "_id": "General",
        "count": 50,
        "revenue": 5000
      }
    ],
    "dailyTrend": [
      {
        "_id": {
          "date": "2024-01-01"
        },
        "revenue": 1000,
        "orders": 5
      }
    ]
  }
}
```

### 4. Revenue Trends
Get revenue trends across multiple events.

**Endpoint:** `GET /revenue-trends`

**Query Parameters:**
- `period` (optional): Time period - `daily`, `weekly`, `monthly` (default: `monthly`)
- `startDate` (optional): Start date (ISO 8601 format)
- `endDate` (optional): End date (ISO 8601 format)
- `eventIds` (optional): JSON string array of event IDs

**Example:**
```
GET /revenue-trends?period=monthly&eventIds=["507f1f77bcf86cd799439011","507f1f77bcf86cd799439012"]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "_id": {
          "period": "2024-01"
        },
        "totalRevenue": 15000,
        "totalOrders": 75,
        "avgOrderValue": 200
      }
    ],
    "eventBreakdown": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "eventTitle": "Tech Conference 2024",
        "revenue": 10000,
        "ticketsSold": 50
      }
    ],
    "period": "monthly",
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  }
}
```

### 5. Export Attendees (GET)
Export attendee list for an event.

**Endpoint:** `GET /export/attendees/:eventId`

**Parameters:**
- `eventId` (path): Event ID (MongoDB ObjectId)

**Query Parameters:**
- `format` (optional): Export format - `csv`, `excel`, `pdf`, `json` (default: `csv`)
- `status` (optional): Filter by ticket status - `all`, `active`, `used`, `cancelled`, `refunded`
- `ticketType` (optional): Filter by ticket type
- `dateFrom` (optional): Filter from date (ISO 8601 format)
- `dateTo` (optional): Filter to date (ISO 8601 format)

**Example:**
```
GET /export/attendees/507f1f77bcf86cd799439011?format=json&status=active&ticketType=VIP
```

**Response (JSON format):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "ticketNumber": "TKT-123456",
        "event": {
          "title": "Tech Conference 2024",
          "dates": {
            "startDate": "2024-03-15T09:00:00Z",
            "endDate": "2024-03-15T17:00:00Z"
          }
        },
        "ticketType": "VIP",
        "price": 100,
        "status": "active",
        "createdAt": "2024-02-01T10:30:00Z",
        "usedAt": null,
        "holder": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "phone": "+254712345678"
        },
        "order": {
          "orderNumber": "ORD-789",
          "createdAt": "2024-02-01T10:30:00Z",
          "payment": {
            "method": "mpesa",
            "status": "completed"
          }
        }
      }
    ],
    "format": "json",
    "totalCount": 1,
    "exportedAt": "2024-02-01T12:00:00Z",
    "filters": {
      "status": "active",
      "ticketType": "VIP"
    }
  }
}
```

### 6. Export Attendees (POST)
Create export job for large attendee lists.

**Endpoint:** `POST /export/attendees/:eventId`

**Parameters:**
- `eventId` (path): Event ID (MongoDB ObjectId)

**Request Body:**
```json
{
  "format": "csv",
  "filters": {
    "status": "active",
    "ticketType": "VIP",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31"
  },
  "fields": [
    "ticketNumber",
    "holder.firstName",
    "holder.lastName",
    "holder.email",
    "ticketType",
    "status"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Export job completed",
  "data": {
    "jobId": "export_507f1f77bcf86cd799439011_1704067200000",
    "format": "csv",
    "totalRecords": 25,
    "exportedAt": "2024-02-01T12:00:00Z",
    "downloadUrl": "/api/organizer/analytics/download/507f1f77bcf86cd799439011/csv"
  }
}
```

### 7. Event Summary
Get quick summary for a specific event.

**Endpoint:** `GET /events/:eventId/summary`

**Parameters:**
- `eventId` (path): Event ID (MongoDB ObjectId)

**Response:**
```json
{
  "success": true,
  "data": {
    "sales": {
      "totalTicketsSold": 25,
      "totalRevenue": 2500,
      "totalOrders": 15,
      "avgOrderValue": 166.67
    },
    "revenue": {
      "totalRevenue": 10000,
      "netRevenue": 9500,
      "orderCount": 50,
      "avgOrderValue": 200
    },
    "lastUpdated": "2024-02-01T12:00:00Z"
  }
}
```

### 8. Cache Management
Clear analytics cache (Admin only).

**Endpoint:** `GET /cache/clear`

**Headers:**
- `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "success": true,
  "message": "Analytics cache cleared successfully"
}
```

### 9. Event Cache Clear
Clear analytics cache for specific event.

**Endpoint:** `GET /cache/clear/:eventId`

**Parameters:**
- `eventId` (path): Event ID (MongoDB ObjectId)

**Response:**
```json
{
  "success": true,
  "message": "Analytics cache cleared for event 507f1f77bcf86cd799439011"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "msg": "Invalid event ID",
      "param": "eventId",
      "location": "params"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Access denied. No token provided."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Event not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to load sales chart data"
}
```

## Rate Limiting
- Analytics endpoints are rate limited to 100 requests per minute per user
- Export endpoints are rate limited to 10 requests per minute per user
- Cache clear endpoints are rate limited to 5 requests per minute per user

## Caching
- Analytics data is cached for 5 minutes
- Cache is automatically invalidated when new orders are created
- Manual cache clearing is available for admins

## Data Privacy
- Only event organizers can access their event analytics
- Admin users can access all analytics
- Attendee export data includes privacy notices
- GDPR compliance for EU attendees

## Performance Considerations
- Large exports (>1000 records) are processed asynchronously
- Database indexes are optimized for analytics queries
- Aggregation pipelines are used for efficient data processing
- Redis caching reduces database load

## Examples

### Get Sales Chart for Last 30 Days
```bash
curl -X GET \
  "https://api.event-i.com/api/organizer/analytics/sales-chart/507f1f77bcf86cd799439011?period=daily&startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer your_jwt_token"
```

### Export VIP Attendees as CSV
```bash
curl -X GET \
  "https://api.event-i.com/api/organizer/analytics/export/attendees/507f1f77bcf86cd799439011?format=csv&ticketType=VIP&status=active" \
  -H "Authorization: Bearer your_jwt_token"
```

### Create Export Job
```bash
curl -X POST \
  "https://api.event-i.com/api/organizer/analytics/export/attendees/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "excel",
    "filters": {
      "status": "active",
      "dateFrom": "2024-01-01",
      "dateTo": "2024-01-31"
    },
    "fields": ["ticketNumber", "holder.firstName", "holder.lastName", "holder.email", "ticketType"]
  }'
```


