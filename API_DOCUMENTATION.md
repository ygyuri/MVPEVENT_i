# Event-i Ticket Purchase & Checkout API

## Overview
This API provides comprehensive ticket purchase and checkout functionality with MPESA Daraja integration for seamless payment processing.

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Order Management

### Create Order
**POST** `/orders/create`

Creates a new order with calculated pricing and validates ticket availability.

**Request Body:**
```json
{
  "customer": {
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "254700000000"
  },
  "items": [
    {
      "eventId": "507f1f77bcf86cd799439011",
      "eventTitle": "Tech Conference 2024",
      "ticketType": "VIP",
      "quantity": 2,
      "unitPrice": 5000,
      "subtotal": 10000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "507f1f77bcf86cd799439012",
    "orderNumber": "ORD-1703123456789-ABC123",
    "pricing": {
      "subtotal": 10000,
      "serviceFee": 500,
      "total": 10500,
      "currency": "KES"
    },
    "status": "pending"
  }
}
```

### Initiate Payment
**POST** `/orders/:orderId/pay`

Initiates MPESA STK Push payment for an order.

**Request Body:**
```json
{
  "phoneNumber": "254700000000"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "checkoutRequestId": "ws_CO_123456789",
    "merchantRequestId": "12345-12345678-1",
    "customerMessage": "Success. Request accepted for processing",
    "orderNumber": "ORD-1703123456789-ABC123"
  }
}
```

### Get Order by ID
**GET** `/orders/:orderId`

Retrieves order details by order ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "orderNumber": "ORD-1703123456789-ABC123",
    "customer": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "customer@example.com",
      "phone": "254700000000"
    },
    "items": [
      {
        "eventId": {
          "id": "507f1f77bcf86cd799439011",
          "title": "Tech Conference 2024",
          "dates": {
            "startDate": "2024-01-15T09:00:00.000Z"
          },
          "location": {
            "venueName": "Nairobi Convention Centre"
          }
        },
        "ticketType": "VIP",
        "quantity": 2,
        "unitPrice": 5000,
        "subtotal": 10000
      }
    ],
    "pricing": {
      "subtotal": 10000,
      "serviceFee": 500,
      "total": 10500,
      "currency": "KES"
    },
    "status": "paid",
    "payment": {
      "status": "completed",
      "mpesaTransactionId": "QK123456789"
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get Order by Order Number
**GET** `/orders/number/:orderNumber`

Retrieves order details by order number.

**Response:** Same as Get Order by ID

### Get User Orders
**GET** `/orders/user/orders?page=1&limit=10`

Retrieves paginated list of orders for authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### Calculate Pricing
**POST** `/orders/calculate-pricing`

Calculates pricing breakdown for order items (service fees, totals).

**Request Body:**
```json
{
  "items": [
    {
      "subtotal": 10000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subtotal": 10000,
    "serviceFee": 500,
    "total": 10500,
    "currency": "KES",
    "breakdown": {
      "items": [
        {
          "subtotal": 10000,
          "serviceFee": 500
        }
      ],
      "totalServiceFee": 500
    }
  }
}
```

## MPESA Integration

### Callback Endpoint
**POST** `/orders/mpesa/callback`

MPESA callback endpoint for payment status updates.

**Request Body:** (MPESA callback format)
```json
{
  "Body": {
    "stkCallback": {
      "CheckoutRequestID": "ws_CO_123456789",
      "ResultCode": "0",
      "ResultDesc": "Success",
      "CallbackMetadata": {
        "Item": [
          {
            "Name": "Amount",
            "Value": 10500
          },
          {
            "Name": "MpesaReceiptNumber",
            "Value": "QK123456789"
          },
          {
            "Name": "PhoneNumber",
            "Value": "254700000000"
          }
        ]
      }
    }
  }
}
```

**Response:**
```json
{
  "ResultCode": "0",
  "ResultDesc": "Success"
}
```

## Error Responses

### Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "value": "",
      "msg": "Email is required",
      "path": "customer.email",
      "location": "body"
    }
  ]
}
```

### Business Logic Error
```json
{
  "success": false,
  "error": "Only 5 tickets remaining"
}
```

### Server Error
```json
{
  "success": false,
  "error": "Something went wrong!"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## Features

### ✅ Implemented Features
- **Guest Checkout**: Support for both authenticated and guest users
- **MPESA Integration**: Full Daraja API integration with STK Push
- **Price Breakdown**: Server-side calculation of subtotal, service fees, and total
- **Email Receipts**: Automated email sending for purchase confirmations and tickets
- **Inventory Validation**: Real-time validation of ticket availability
- **Order Management**: Complete order lifecycle management
- **Payment Processing**: Secure payment processing with callback handling

### 🔧 Technical Features
- **Server-side Pricing**: All calculations done server-side for security
- **Inventory Validation**: Pre-payment validation of ticket availability
- **Order Storage**: Complete order history with payment details
- **Ticket Generation**: Automatic ticket creation upon successful payment
- **Email Notifications**: Purchase receipts and individual ticket emails
- **Error Handling**: Comprehensive error handling and validation
- **Rate Limiting**: Built-in rate limiting for API protection
- **Logging**: Detailed logging for debugging and monitoring

## Environment Variables

Required environment variables for full functionality:

```env
# MPESA Configuration
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_PASSKEY=your-passkey
MPESA_SHORTCODE=your-shortcode
MPESA_CALLBACK_URL=https://your-domain.com/api/orders/mpesa/callback

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/event_i
JWT_SECRET=your-jwt-secret
```

## Best Practices Implemented

1. **Server-side Pricing**: All price calculations done server-side
2. **Inventory Validation**: Real-time validation before payment
3. **Secure Payment**: MPESA integration with proper callback handling
4. **Order Tracking**: Complete order lifecycle management
5. **Email Automation**: Automated receipt and ticket delivery
6. **Error Handling**: Comprehensive error handling and validation
7. **Rate Limiting**: API protection against abuse
8. **Logging**: Detailed logging for monitoring and debugging
9. **Clean Architecture**: Separation of concerns with services
10. **Validation**: Input validation and sanitization
