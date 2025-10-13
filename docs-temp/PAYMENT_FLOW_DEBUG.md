# Payment Flow & Debugging Guide

## 🎯 Overview
This document explains the complete payment flow from checkout to ticket delivery, with debugging instructions.

## 📋 Current Flow (FIXED)

### Step 1: Checkout Initiation
**Location**: `/events/:slug/checkout`
**Component**: `DirectCheckout.jsx`

1. ✅ User fills form (name, email, phone, quantity, ticket type)
2. ✅ Phone number formatted with country code (e.g., +254712345678)
3. ✅ Form validated (9 digits for East Africa, 10 for USA/UK)
4. ✅ Submit to `/api/tickets/direct-purchase`

**Debug Points**:
```javascript
// In DirectCheckout.jsx line ~310
console.log('✅ Order created:', response.data.data);
```

### Step 2: Order Creation & Payment Initiation
**Endpoint**: `POST /api/tickets/direct-purchase`
**File**: `server/routes/tickets.js`

**What Happens**:
1. ✅ Validate event & ticket availability
2. ✅ Create/find user (with temp password if new)
3. ✅ Handle affiliate tracking (if ref code present)
4. ✅ Calculate pricing
5. ✅ **Create order** (status: `pending`, paymentStatus: `pending`)
6. ✅ **Create ticket records** (status: `active` but not paid yet)
7. ✅ **Initiate PayHero STK push**
8. ✅ **Update order** (paymentStatus: `processing`)
9. ✅ **Send welcome email** (if new user, async - don't wait)
10. ✅ **Return orderId** to frontend

**Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "68da...",
    "orderNumber": "ORD-...",
    "totalAmount": 1500,
    "currency": "KES",
    "paymentUrl": null,
    "paymentReference": "TKT-...",
    "checkoutRequestId": "...",
    "paymentStatus": "processing"
  }
}
```

**Debug Points**:
```bash
# Check server logs
docker logs -f event_i_server

# Look for:
# ✅ Event found: ...
# ✅ Ticket type found: ...
# ✅ New user created: ... (or) ✅ Existing user found: ...
# 💰 Pricing calculated: ...
# ✅ Order created: ...
# ✅ Tickets created: ...
# ✅ Payment initiated: ...
```

### Step 3: Payment Status Page
**Route**: `/payment/:orderId`
**Component**: `PaymentStatus.jsx`

**What Happens**:
1. ✅ User redirected to payment status page
2. ✅ **Polling starts** (every 2 seconds)
3. ✅ Check order status via `GET /api/orders/:orderId/status`
4. ✅ Display current status:
   - ⏳ **Pending**: "Please check your phone and enter M-PESA PIN"
   - 🔄 **Processing**: "Your payment is being confirmed..."
   - ✅ **Paid**: "Payment Successful! 🎉" + redirect to wallet
   - ❌ **Failed**: "Payment Failed" + retry button

**Polling Logic**:
- Checks every **2 seconds**
- Stops when: `paymentStatus === 'paid'` OR `paymentStatus === 'failed'`
- Max attempts: **60** (2 minutes total)
- After timeout: Shows message to check email/wallet

**Debug Points**:
```javascript
// In PaymentStatus.jsx
console.log('📊 Order status:', data);
// Shows: { paymentStatus: 'processing', ticketCount: 2, ... }
```

### Step 4: PayHero Webhook (Payment Confirmation)
**Endpoint**: `POST /api/payhero/callback`
**File**: `server/routes/payhero.js`

**What Happens When Payment is Confirmed**:
1. ✅ Receive webhook from PayHero
2. ✅ Validate webhook signature
3. ✅ Find order by checkout_request_id
4. ✅ **Update order status**:
   - `status`: `completed`
   - `paymentStatus`: `paid`
   - `payment.status`: `completed`
5. ✅ **Generate QR codes** for all tickets (AES-256-CBC encrypted)
6. ✅ **Save QR as base64** in ticket.qrCodeUrl
7. ✅ **Send ticket email** with QR codes embedded
8. ✅ **Process affiliate conversion** (if applicable)
9. ✅ **Send payment receipt**

**Email Flow**:
- **If new user**: Already sent welcome email in Step 2
- **Always**: Send ticket email with QR codes
- **Always**: Send payment receipt

**Debug Points**:
```bash
# Check webhook logs
docker logs -f event_i_server | grep "PayHero"

# Look for:
# 📥 PayHero callback received
# ✅ Payment successful for order: ...
# 🎫 Generating QR codes for X tickets
# ✅ QR code generated and saved
# ✅ Ticket email sent to: ...
# ✅ Payment receipt sent
```

### Step 5: Status Update & Notification
**What Happens**:
1. ✅ Webhook updates order to `paid`
2. ✅ Frontend polling detects status change
3. ✅ PaymentStatus page shows **Success** 🎉
4. ✅ User can click "View My Tickets" → goes to `/wallet`

---

## 🐛 Debugging Checklist

### Issue: STK Push Not Received
**Check**:
```bash
# 1. Verify PayHero credentials
docker exec event_i_server env | grep PAYHERO

# 2. Check phone number format
# Should be: 254712345678 (12 digits, starts with 254)

# 3. Check PayHero logs
docker logs -f event_i_server | grep "Payment initiated"
```

### Issue: Payment Status Stuck on "Processing"
**Check**:
```bash
# 1. Check if webhook was received
docker logs -f event_i_server | grep "PayHero callback"

# 2. Manually check order status in MongoDB
docker exec event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i

# In MongoDB:
db.orders.findOne({ _id: ObjectId("YOUR_ORDER_ID") })
# Check: paymentStatus, payment.status, payment.checkoutRequestId
```

### Issue: No Email Received
**Check**:
```bash
# 1. Check email service logs
docker logs -f event_i_server | grep "email"

# 2. Check SMTP settings
docker exec event_i_server env | grep SMTP

# 3. Check email queue/errors
docker logs -f event_i_server | grep "Failed to send"
```

### Issue: QR Code Not Generated
**Check**:
```bash
# 1. Check QR generation logs
docker logs -f event_i_server | grep "QR code"

# 2. Check ticket records
# In MongoDB:
db.tickets.find({ orderId: ObjectId("YOUR_ORDER_ID") })
# Check: qrCodeUrl should have base64 data
```

---

## 🔍 Monitoring Order Flow

### 1. Check Order Status via API
```bash
# Get order status
curl http://localhost:5000/api/orders/YOUR_ORDER_ID/status
```

### 2. Check Order in MongoDB
```bash
docker exec -it event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i

# In MongoDB shell:
db.orders.findOne({ 
  _id: ObjectId("YOUR_ORDER_ID") 
}, {
  orderNumber: 1,
  status: 1,
  paymentStatus: 1,
  'payment.status': 1,
  'payment.checkoutRequestId': 1,
  createdAt: 1,
  updatedAt: 1
})
```

### 3. Check Tickets
```javascript
db.tickets.find({ 
  orderId: ObjectId("YOUR_ORDER_ID") 
}, {
  ticketNumber: 1,
  status: 1,
  qrCodeUrl: 1,
  createdAt: 1
})
```

### 4. Real-time Logs
```bash
# Watch all logs
docker logs -f event_i_server

# Filter specific events
docker logs -f event_i_server | grep -E "(Order created|Payment initiated|PayHero callback|QR code|email)"
```

---

## 📊 Order Status Values

### Order.status
- `pending` - Order created, waiting for payment
- `completed` - Payment successful
- `cancelled` - Payment failed or cancelled
- `refunded` - Order refunded

### Order.paymentStatus
- `pending` - Just created
- `processing` - STK push sent, waiting for user to pay
- `paid` - Payment successful
- `failed` - Payment failed
- `refunded` - Payment refunded

### Ticket.status
- `active` - Ticket created (valid)
- `used` - Ticket scanned/used
- `cancelled` - Ticket cancelled

---

## 🎯 Success Criteria

**A successful payment flow should show**:
1. ✅ Order created with `paymentStatus: 'pending'`
2. ✅ PayHero STK push sent → `paymentStatus: 'processing'`
3. ✅ User pays on phone
4. ✅ Webhook received → `paymentStatus: 'paid'`
5. ✅ QR codes generated for all tickets
6. ✅ Emails sent (welcome + tickets + receipt)
7. ✅ Frontend shows success page
8. ✅ User can see tickets in wallet

---

## 📧 Email Templates

### 1. Welcome Email (New Users Only)
**Sent**: Immediately after order creation (async)
**Contains**:
- Temporary password
- Order number
- Login instructions

### 2. Ticket Email (All Users)
**Sent**: After payment confirmation (webhook)
**Contains**:
- Order details
- QR codes (embedded as base64 images)
- Event details
- Download link

### 3. Payment Receipt (All Users)
**Sent**: After payment confirmation (webhook)
**Contains**:
- Order number
- Amount paid
- Payment reference
- Transaction details

---

## 🔧 Environment Variables (Docker)

```bash
# PayHero Settings
PAYHERO_API_KEY=your_api_key
PAYHERO_BASE_URL=https://api.payhero.co.ke
PAYHERO_BUSINESS_NUMBER=your_business_number

# Email Settings
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password

# QR Encryption
TICKET_QR_SECRET=your_secret
TICKET_QR_ENC_KEY=base64_32byte_key

# API Settings
API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

---

## 🚀 Testing the Flow

### Test with Real Payment:
1. Go to: `http://localhost:3000/events/test-this-end-to-end/checkout`
2. Fill form with valid phone: `712345678` (9 digits)
3. Select country code: `+254` (Kenya)
4. Submit and watch:
   - STK push on phone
   - Status page shows "Processing..."
   - Enter PIN on phone
   - Status changes to "Success" 🎉
   - Check email for tickets
5. Go to `/wallet` to see tickets with QR codes

### Test Webhook Locally:
```bash
# Use ngrok to expose local server
ngrok http 5000

# Update PayHero callback URL to: https://your-ngrok-url.ngrok.io/api/payhero/callback
```

---

## 📝 Notes

- **No tickets/emails sent before payment confirmed**
- **Polling stops automatically** when status changes
- **Debug mode shows full order data** at bottom of status page
- **All times are UTC** in database
- **QR codes are encrypted** with AES-256-CBC
- **Country codes validated** per region (9 or 10 digits)

---

**Last Updated**: $(date)
**Author**: Development Team





