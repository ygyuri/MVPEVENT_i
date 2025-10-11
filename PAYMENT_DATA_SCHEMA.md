# Payment Data Schema - What Gets Saved ✅

## 🎯 Overview

On a successful payment, the system saves data across **5 main collections** in MongoDB:

1. **Users** - Customer account (if new)
2. **Orders** - Payment transaction record
3. **Tickets** - Individual ticket records with QR codes
4. **ReferralClick** - Affiliate tracking (if ref code used)
5. **ReferralConversion** - Commission calculation (if affiliate)

---

## 1️⃣ USER Collection (New Users Only)

### When Created:
- Only if email doesn't exist in database
- Created during checkout (before payment)
- Status: `pending_activation`

### Data Saved:

```javascript
{
  _id: ObjectId("68da..."),
  
  // Basic Info
  email: "gideonyuri15@gmail.com",           // Normalized to lowercase
  username: "gideonyuri15",                  // Auto-generated from email
  firstName: "Gideon",
  lastName: "Ochieng",
  
  // Profile
  profile: {
    phone: "+254703328938",                  // Full international format
    bio: null,
    avatar: null,
    location: null
  },
  
  // Account Status
  role: "customer",                          // Default role
  accountStatus: "pending_activation",       // Requires password change
  passwordResetRequired: true,               // Must change temp password
  emailVerified: false,
  
  // Security (Temporary Password - NOT visible in normal queries)
  tempPassword: "Temp_gid_ABC123XYZ",       // Hashed, select: false
  password: "[hashed_temp_password]",        // Bcrypt hash
  
  // Timestamps
  createdAt: ISODate("2025-10-09T14:22:18.000Z"),
  updatedAt: ISODate("2025-10-09T14:22:18.000Z"),
  
  // Metadata
  lastLogin: null,
  loginAttempts: 0,
  lockUntil: null
}
```

### Important Notes:
- ✅ **Temp password is HASHED** (bcrypt) before storage
- ✅ **Email is normalized** to lowercase
- ✅ **Username is unique** (auto-incremented if conflict)
- ✅ **Sent via email** (not exposed via API)

---

## 2️⃣ ORDER Collection

### When Created:
- During checkout submission (before payment)
- Updated after payment confirmation (webhook)

### Data Saved:

```javascript
{
  _id: ObjectId("68db..."),
  
  // Order Identification
  orderNumber: "ORD-1760012538925-R4QRYN",   // Unique, human-readable
  
  // Customer Information
  customer: {
    userId: ObjectId("68da..."),             // Reference to User
    email: "gideonyuri15@gmail.com",
    firstName: "Gideon",
    lastName: "Ochieng",
    phone: "+254703328938"
  },
  
  // Order Type
  isGuestOrder: true,                        // true if new user
  purchaseSource: "direct_checkout",         // vs "cart" or "admin"
  
  // Order Items
  items: [
    {
      eventId: ObjectId("68da..."),          // Reference to Event
      eventTitle: "test this end to end",
      ticketType: "Early Bird",
      quantity: 2,
      unitPrice: 300,
      subtotal: 600
    }
  ],
  
  // Pricing Breakdown
  pricing: {
    subtotal: 600,
    serviceFee: 0,
    tax: 0,
    discount: 0,
    total: 600,
    currency: "KES"
  },
  totalAmount: 600,                          // For PayHero compatibility
  
  // Order Status
  status: "completed",                       // pending → completed (after payment)
  paymentStatus: "paid",                     // pending → processing → paid
  
  // Payment Details
  payment: {
    method: "payhero",
    provider: "m-pesa",
    status: "completed",                     // pending → processing → completed
    
    // Payment References
    paymentReference: "TKT-1760012538945-7UUJ6H",    // Our internal ref
    checkoutRequestId: "ws_CO_09102025152220...",    // PayHero's request ID
    mpesaReceiptNumber: "SGL12345678",               // M-PESA transaction code
    
    // Payment Metadata
    paymentData: {
      amount: 600,
      phoneNumber: "254703328938",
      customerName: "Gideon Ochieng"
    },
    
    // Payment Response (Full webhook data)
    paymentResponse: {
      resultCode: 0,                         // 0 = success
      resultDesc: "The service request is processed successfully.",
      mpesaReceiptNumber: "SGL12345678",
      transactionDate: "20251009152245",
      phoneNumber: "254703328938",
      amount: 600,
      externalReference: "TKT-1760012538945-7UUJ6H",
      checkoutRequestId: "ws_CO_09102025152220..."
    },
    
    // Timestamps
    initiatedAt: ISODate("2025-10-09T15:22:20.000Z"),
    paidAt: ISODate("2025-10-09T15:22:45.000Z")  // When webhook confirmed
  },
  
  // Affiliate Tracking (if referral code used)
  affiliateTracking: {
    referralCode: "REF123",                  // Referral code used (or null)
    affiliateId: ObjectId("68dc..."),        // Affiliate who gets commission
    commissionCalculated: true,              // Has commission been computed
    commissionAmount: 30                     // Total commission (KES)
  },
  
  // Metadata
  metadata: {
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0...",
    source: "web",
    deviceType: "desktop",
    purchaseDate: ISODate("2025-10-09T15:22:20.000Z")
  },
  
  // Timestamps
  createdAt: ISODate("2025-10-09T15:22:20.000Z"),      // When order created
  updatedAt: ISODate("2025-10-09T15:22:45.000Z"),      // Last update
  completedAt: ISODate("2025-10-09T15:22:45.000Z"),    // When payment confirmed
  
  // Soft Delete
  deleted: false,
  deletedAt: null
}
```

### Order Status Flow:
```
1. Created:    status: 'pending',     paymentStatus: 'pending'
2. STK Sent:   status: 'pending',     paymentStatus: 'processing'
3. Paid:       status: 'completed',   paymentStatus: 'paid'
4. Failed:     status: 'cancelled',   paymentStatus: 'failed'
```

---

## 3️⃣ TICKET Collection

### When Created:
- During checkout submission (after order created)
- Updated after payment (QR codes added via webhook)

### Data Saved (Per Ticket):

```javascript
{
  _id: ObjectId("68dc..."),
  
  // Ticket Identification
  ticketNumber: "TKT-1760012540123-ABC123",  // Unique ticket number
  
  // References
  orderId: ObjectId("68db..."),              // Reference to Order
  eventId: ObjectId("68da..."),              // Reference to Event
  ownerUserId: ObjectId("68da..."),          // Reference to User
  
  // Ticket Holder Information
  holder: {
    firstName: "Gideon",
    lastName: "Ochieng",
    email: "gideonyuri15@gmail.com",
    phone: "+254703328938"
  },
  
  // Ticket Details
  ticketType: "Early Bird",
  price: 300,
  currency: "KES",
  
  // Ticket Status
  status: "active",                          // active, used, cancelled, refunded
  
  // QR Code Data (Added AFTER payment confirmation)
  qrCode: "a1b2c3d4e5f6...",                // Encrypted QR payload (hex string)
  qrCodeUrl: "data:image/png;base64,iVBORw0KGgo...",  // Base64 QR image
  
  // QR Security Metadata
  qr: {
    nonce: "f8e7d6c5b4a3...",               // Unique random nonce (32 bytes hex)
    issuedAt: ISODate("2025-10-09T15:22:45.000Z"),
    expiresAt: ISODate("2025-10-07T13:00:00.000Z"),  // Event end date
    signature: "9a8b7c6d5e4f...",           // HMAC-SHA256 signature
    algorithm: "aes-256-cbc",               // Encryption algorithm
    version: 1                               // QR schema version
  },
  
  // Usage Tracking
  usedBy: null,                              // Scanner userId (when scanned)
  usedAt: null,                              // Timestamp of scan
  scanHistory: [],                           // Array of scan attempts
  
  // Metadata
  metadata: {
    purchaseDate: ISODate("2025-10-09T15:22:20.000Z"),
    validFrom: ISODate("2025-10-07T09:00:00.000Z"),   // Event start
    validUntil: ISODate("2025-10-07T13:00:00.000Z"),  // Event end
    downloadCount: 0,
    lastDownload: null
  },
  
  // Transfer Tracking
  transferHistory: [],                       // If ticket transferred
  currentOwner: ObjectId("68da..."),        // Current owner
  originalOwner: ObjectId("68da..."),       // Original purchaser
  
  // Timestamps
  createdAt: ISODate("2025-10-09T15:22:20.000Z"),
  updatedAt: ISODate("2025-10-09T15:22:45.000Z"),
  
  // Soft Delete
  deleted: false,
  deletedAt: null
}
```

### QR Code Payload (Encrypted):
```javascript
// What's encrypted in qrCode field:
{
  ticketId: "68dc...",
  eventId: "68da...",
  userId: "68da...",
  ticketNumber: "TKT-1760012540123-ABC123",
  timestamp: 1760012545000
}

// Encryption: AES-256-CBC
// Key: Derived from TICKET_QR_SECRET
// IV: Random 16 bytes (unique per ticket)
// Output: hex string
```

### QR Code Security Features:
1. ✅ **Encrypted payload** - Can't be forged
2. ✅ **Unique nonce** - Prevents replay attacks
3. ✅ **HMAC signature** - Verifies authenticity
4. ✅ **Timestamp** - Time-based validation
5. ✅ **Expires with event** - Auto-invalidates

---

## 4️⃣ REFERRAL CLICK Collection (If Affiliate Link Used)

### When Created:
- When user clicks event link with `?ref=CODE`
- Tracked before checkout

### Data Saved:

```javascript
{
  _id: ObjectId("68dd..."),
  
  // Link Information
  link_id: ObjectId("68de..."),              // Reference to ReferralLink
  referral_code: "REF123",                   // The ref code used
  
  // Affiliate Information
  affiliate_id: ObjectId("68df..."),         // Marketer who gets commission
  agency_id: ObjectId("68dg..."),           // Agency (if applicable)
  
  // Event
  event_id: ObjectId("68da..."),
  
  // Visitor Tracking
  user_id: ObjectId("68da..."),             // User who clicked (after login)
  visitor_id: "uuid-v4-string",              // Anonymous visitor ID (cookie)
  session_id: "session-uuid",
  
  // Click Metadata
  ip_address: "192.168.1.1",
  user_agent: "Mozilla/5.0...",
  referrer: "https://google.com",
  landing_page: "/events/test-this-end-to-end?ref=REF123",
  
  // Conversion Tracking
  converted: true,                           // Set to true after payment
  conversion_id: ObjectId("68dh..."),       // Reference to ReferralConversion
  
  // Timestamps
  clicked_at: ISODate("2025-10-09T15:20:00.000Z"),
  converted_at: ISODate("2025-10-09T15:22:45.000Z")
}
```

---

## 5️⃣ REFERRAL CONVERSION Collection (If Affiliate Link Used)

### When Created:
- After successful payment (in webhook)
- One conversion per ticket purchased

### Data Saved (Per Ticket):

```javascript
{
  _id: ObjectId("68dh..."),
  
  // References
  click_id: ObjectId("68dd..."),             // Which click led to this
  link_id: ObjectId("68de..."),              // Which link was used
  event_id: ObjectId("68da..."),
  ticket_id: ObjectId("68dc..."),            // Specific ticket
  
  // Affiliate Information
  affiliate_id: ObjectId("68df..."),         // Who gets commission
  agency_id: ObjectId("68dg..."),           // Primary agency
  tier_2_affiliate_id: null,                 // Sub-affiliate (if multi-tier)
  
  // Attribution
  attribution_model_used: "last_click",      // Attribution model
  
  // Customer Information
  customer_id: ObjectId("68da..."),
  customer_email: "gideonyuri15@gmail.com",
  
  // Financial Breakdown
  ticket_price: 300,                         // Original ticket price (KES)
  platform_fee: 0,                           // Platform's cut
  organizer_revenue: 300,                    // What organizer gets (gross)
  
  // Commission Calculations
  primary_agency_commission: 9,              // 3% of 300 = 9 KES
  affiliate_commission: 15,                  // 5% of 300 = 15 KES
  tier_2_affiliate_commission: 0,            // Multi-tier (if enabled)
  organizer_net: 276,                        // 300 - 9 - 15 = 276 KES
  
  // Commission Configuration Snapshot
  commission_config_snapshot: {
    event_id: ObjectId("68da..."),
    organizer_id: ObjectId("68di..."),
    affiliate_commission_rate: 0.05,         // 5%
    primary_agency_commission_rate: 0.03,    // 3%
    tier_2_commission_rate: 0,
    commission_tiers: []
  },
  
  // Calculation Breakdown (for transparency)
  calculation_breakdown: {
    ticketPrice: 300,
    affiliateRate: 0.05,
    agencyRate: 0.03,
    affiliateCommission: 15,
    agencyCommission: 9,
    organizerNet: 276
  },
  
  // Conversion Status
  conversion_status: "confirmed",            // pending, confirmed, disputed
  
  // Payout Tracking
  affiliate_payout_status: "pending",        // pending, scheduled, paid
  agency_payout_status: "pending",
  affiliate_payout_id: null,                 // Set when payout made
  agency_payout_id: null,
  
  // Timestamps
  converted_at: ISODate("2025-10-09T15:22:45.000Z"),
  confirmed_at: ISODate("2025-10-09T15:22:45.000Z"),
  affiliate_payout_scheduled_at: null,
  affiliate_payout_completed_at: null,
  
  // Metadata
  conversion_metadata: {
    time_to_conversion_seconds: 165,         // Time from click to purchase
    device_type: "desktop",
    browser: "Chrome"
  }
}
```

### Commission Example (2 tickets):
```
Ticket 1: KES 300
- Affiliate: KES 15 (5%)
- Agency: KES 9 (3%)
- Organizer Net: KES 276

Ticket 2: KES 300
- Affiliate: KES 15 (5%)
- Agency: KES 9 (3%)
- Organizer Net: KES 276

Total Order: KES 600
- Total Affiliate Commission: KES 30
- Total Agency Commission: KES 18
- Total Organizer Net: KES 552
```

---

## 📊 Complete Payment Flow Data

### Timeline & Data Changes:

#### T+0s: User Submits Checkout
```javascript
// USER (created if new)
{
  email: "gideonyuri15@gmail.com",
  accountStatus: "pending_activation",
  tempPassword: "Temp_gid_ABC123"  // Hashed
}

// ORDER (created)
{
  status: "pending",
  paymentStatus: "pending",
  payment: { status: "pending" }
}

// TICKETS (created)
{
  status: "active",
  qrCode: null,           // Not yet generated
  qrCodeUrl: null
}
```

#### T+1s: Payment Initiated
```javascript
// ORDER (updated)
{
  status: "pending",
  paymentStatus: "processing",  // Changed!
  payment: {
    status: "processing",        // Changed!
    paymentReference: "TKT-...",
    checkoutRequestId: "ws_CO_...",
    paymentData: { amount: 600, phone: "254703328938" }
  }
}

// Email sent: Welcome email (if new user)
```

#### T+30s: User Enters PIN, Payment Confirmed
```javascript
// WEBHOOK RECEIVED from PayHero
{
  ResultCode: 0,
  ResultDesc: "Success",
  MpesaReceiptNumber: "SGL12345678",
  Amount: 600,
  ExternalReference: "TKT-..."
}

// ORDER (updated by webhook)
{
  status: "completed",            // Changed!
  paymentStatus: "paid",          // Changed!
  payment: {
    status: "completed",          // Changed!
    mpesaReceiptNumber: "SGL12345678",  // Added!
    paidAt: ISODate("2025-10-09T15:22:45.000Z"),  // Added!
    paymentResponse: { /* full webhook data */ }
  },
  completedAt: ISODate("2025-10-09T15:22:45.000Z")
}

// TICKETS (updated)
{
  qrCode: "a1b2c3d4...",         // Generated!
  qrCodeUrl: "data:image/png;base64,...",  // Generated!
  qr: {
    nonce: "unique...",
    issuedAt: ISODate("..."),
    signature: "hmac..."
  }
}

// REFERRAL CLICK (updated if ref used)
{
  converted: true,               // Changed!
  conversion_id: ObjectId("...") // Added!
}

// REFERRAL CONVERSION (created if ref used)
{
  ticket_id: ObjectId("..."),
  affiliate_commission: 15,
  conversion_status: "confirmed"
}

// Emails sent:
// - Ticket email (with QR codes)
// - Payment receipt
```

---

## 📋 Data Validation & Constraints

### User
- ✅ **Email**: Unique, normalized
- ✅ **Username**: Unique, auto-generated
- ✅ **Phone**: International format validation
- ✅ **Temp Password**: Min 12 chars, hashed

### Order
- ✅ **OrderNumber**: Unique, indexed
- ✅ **Total Amount**: Must match items total
- ✅ **Status transitions**: Validated state machine
- ✅ **Payment reference**: Unique, indexed

### Ticket
- ✅ **TicketNumber**: Unique, indexed
- ✅ **QR Code**: Unique encrypted data
- ✅ **QR Nonce**: Unique 32-byte hex
- ✅ **Status**: Validated enum

---

## 🔍 Query Examples

### Get Complete Payment Data:

```javascript
// In MongoDB shell
const orderId = ObjectId("68db...");

// 1. Get Order with full details
db.orders.findOne({ _id: orderId });

// 2. Get Associated Tickets
db.tickets.find({ orderId: orderId });

// 3. Get Customer
const order = db.orders.findOne({ _id: orderId });
db.users.findOne({ _id: order.customer.userId });

// 4. Get Affiliate Conversions (if any)
db.referralconversions.find({ 
  customer_id: order.customer.userId,
  event_id: order.items[0].eventId
});
```

### API Endpoint to Get Payment Data:

```javascript
GET /api/orders/:orderId/status

Response:
{
  orderId: "68db...",
  orderNumber: "ORD-...",
  status: "completed",
  paymentStatus: "paid",
  totalAmount: 600,
  currency: "KES",
  ticketCount: 2,
  customer: {
    email: "gideonyuri15@gmail.com",
    firstName: "Gideon",
    lastName: "Ochieng"
  },
  payment: {
    method: "payhero",
    status: "completed",
    paymentReference: "TKT-...",
    checkoutRequestId: "ws_CO_...",
    mpesaReceiptNumber: "SGL12345678"  // Available after payment
  },
  createdAt: "2025-10-09T15:22:20.000Z",
  updatedAt: "2025-10-09T15:22:45.000Z"
}
```

---

## 📧 Email Data Sent

### Email 1: Welcome (New Users)
```
To: gideonyuri15@gmail.com
Subject: Welcome to Event-i - Your Account Has Been Created

Data Included:
- Email: gideonyuri15@gmail.com
- Temporary Password: Temp_gid_ABC123XYZ
- Order Number: ORD-1760012538925-R4QRYN
- Login URL: http://localhost:3000/login
```

### Email 2: Tickets (After Payment)
```
To: gideonyuri15@gmail.com
Subject: Your Tickets - test this end to end

Data Included:
- Order Number: ORD-...
- Event: test this end to end
- Date: October 7, 2025
- Venue: Umoja litt

For Each Ticket:
- Ticket Number: TKT-...
- QR Code Image (base64 embedded)
- Event Details
- Validity Period
```

### Email 3: Payment Receipt
```
To: gideonyuri15@gmail.com
Subject: Payment Receipt - ORD-...

Data Included:
- Order Number: ORD-...
- M-PESA Receipt: SGL12345678
- Amount: KES 600
- Date/Time: Oct 9, 2025 3:22 PM
- Payment Method: M-PESA
```

---

## 🔒 Security & Privacy

### Data Encryption:
- ✅ **Passwords**: Bcrypt (10 rounds)
- ✅ **QR Codes**: AES-256-CBC
- ✅ **Temp Passwords**: Not returned in API responses (`select: false`)

### PII Protection:
- ✅ **Phone numbers**: Stored in international format
- ✅ **Email**: Normalized to lowercase
- ✅ **Payment data**: Restricted to order owner

### Audit Trail:
- ✅ **All webhooks logged** with timestamp
- ✅ **IP addresses stored** for fraud detection
- ✅ **Status transitions tracked** 
- ✅ **Scan history recorded** for tickets

---

## 📊 Database Indexes

For performance, these indexes are created:

```javascript
// Orders
orders.createIndex({ orderNumber: 1 }, { unique: true });
orders.createIndex({ 'customer.userId': 1, createdAt: -1 });
orders.createIndex({ 'payment.paymentReference': 1 });
orders.createIndex({ status: 1, paymentStatus: 1 });

// Tickets
tickets.createIndex({ ticketNumber: 1 }, { unique: true });
tickets.createIndex({ orderId: 1, eventId: 1 });
tickets.createIndex({ ownerUserId: 1, status: 1 });
tickets.createIndex({ qrCode: 1 }, { unique: true, sparse: true });
tickets.createIndex({ eventId: 1, status: 1 });

// Users
users.createIndex({ email: 1 }, { unique: true });
users.createIndex({ username: 1 }, { unique: true });
users.createIndex({ accountStatus: 1 });
```

---

## 🎯 Data Retention

### Active Data:
- **Orders**: Kept indefinitely
- **Tickets**: Until event + 30 days
- **Users**: Until account deletion
- **Conversions**: Kept for payout tracking

### Soft Deletes:
- Orders can be "soft deleted" (`deleted: true`)
- Tickets can be cancelled but retained
- Users can be deactivated but retained

---

## 📈 Analytics Data Points

From successful payments, you can track:

1. **Revenue Metrics**:
   - Total sales per event
   - Average order value
   - Revenue by ticket type
   - Commission payouts

2. **Customer Metrics**:
   - New vs returning customers
   - Purchase frequency
   - Conversion rate
   - Cart abandonment

3. **Affiliate Metrics**:
   - Click-through rate
   - Conversion rate
   - Commission earned
   - ROI per affiliate

4. **Payment Metrics**:
   - Success rate
   - Failure reasons
   - Average processing time
   - Peak purchase times

---

## ✅ Data Saved Summary

| Collection | Records Created | Key Data |
|------------|----------------|----------|
| **Users** | 1 (if new) | Email, temp password, phone |
| **Orders** | 1 | Payment status, amount, M-PESA receipt |
| **Tickets** | N (quantity) | QR codes, ticket numbers, holder info |
| **ReferralClick** | 1 (if ref) | Click tracking, conversion flag |
| **ReferralConversion** | N (if ref) | Commission per ticket |

### Storage per Payment:
- **Without affiliate**: ~3KB per order + ~1KB per ticket
- **With affiliate**: +~2KB for conversion tracking
- **QR codes**: ~2KB per ticket (base64 image)

**Example** (2 tickets, no affiliate):
```
1 Order:  ~3KB
2 Tickets: ~6KB (includes QR images)
Total: ~9KB per transaction
```

---

## 🔐 Sensitive Data Handling

### Never Stored:
- ❌ M-PESA PIN
- ❌ Credit card numbers (N/A for M-PESA)
- ❌ Unencrypted passwords
- ❌ Full card details

### Stored but Protected:
- 🔒 Temporary passwords (hashed, select: false)
- 🔒 QR payloads (encrypted)
- 🔒 Payment responses (restricted to order owner)

### Logged for Audit:
- ✅ Webhook requests
- ✅ Payment attempts
- ✅ Status changes
- ✅ Email deliveries

---

**Now you have complete visibility into what data is saved!** 📊

Ready to test a real payment? 🚀





