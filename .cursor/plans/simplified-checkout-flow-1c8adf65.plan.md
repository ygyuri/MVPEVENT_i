<!-- 1c8adf65-5594-4203-87de-aff845c48533 f4defa08-7dd9-40d2-bb09-20a33e08f8a1 -->
# Simplified Customer Journey Implementation Plan

## Overview

Transform the ticketing platform from cart-based to direct checkout, enabling customers to purchase tickets in 3 simple steps: click event link → enter details + select quantity → pay → receive QR ticket via email.

## Phase 1: Backend Data Layer Updates

### 1.1 Update User Model (`server/models/User.js`)

Add fields to support auto-account creation:

- `tempPassword` (String, nullable) - temporary password sent via email
- `accountStatus` (String, enum: 'pending_activation', 'active', 'suspended')
- `passwordResetRequired` (Boolean, default true for auto-created accounts)

Keep all existing fields intact (walletAddress, role, etc.).

### 1.2 Update Ticket Model (`server/models/Ticket.js`)

Ensure QR code fields are robust:

- Verify `qrCode` field exists (already present)
- Add `qrCodeUrl` (String) - URL to generated QR image (S3/Cloudinary)
- Add `scannedBy` reference (already exists as `usedBy`)
- Keep existing scan history tracking

### 1.3 Update Order Model (`server/models/Order.js`)

Add simplified checkout support:

- Add `purchaseSource` (String, enum: 'direct_checkout', 'cart', 'admin') - track purchase type
- Add `affiliateTracking.referralCode` (String, nullable)
- Add `affiliateTracking.affiliateId` (ObjectId, nullable)
- Keep all existing payment fields for PayHero compatibility

## Phase 2: Backend API Routes

### 2.1 Direct Checkout Event Endpoint

**File**: `server/routes/events.js` (modify existing or create new)

**Endpoint**: `GET /api/events/:slug/checkout`

**Logic**:

- Fetch event by slug with ticket types
- Check if `?ref=CODE` query param exists
- If affiliate code present:
  - Validate against `ReferralLink` model
  - Check if code is active and not expired
  - Log click in `ReferralClick` model
  - Return `{ event, affiliateTracked: true }` (don't expose commission details)
- Return event data with available ticket types

### 2.2 Direct Purchase Endpoint

**File**: `server/routes/tickets.js` (create new or modify)

**Endpoint**: `POST /api/tickets/direct-purchase`

**Request Body**:

```javascript
{
  eventId, ticketType, quantity,
  email, phone, firstName, lastName,
  referralCode // hidden field from URL param
}
```

**Logic**:

1. Validate ticket availability (check event.ticketTypes quantity)
2. Check if user exists by email:

   - If exists: use existing userId
   - If new: create User with tempPassword, accountStatus='pending_activation'

3. Calculate total price (ticketPrice × quantity)
4. Calculate affiliate commission if referralCode provided
5. Create Order record with status='pending', purchaseSource='direct_checkout'
6. Create Ticket records (quantity count) with orderId reference
7. Call PayHero service to initiate payment
8. Return `{ orderId, paymentUrl, isNewUser }`

### 2.3 PayHero Webhook Enhancement

**File**: `server/routes/payhero.js` (modify existing callback handler)

**Endpoint**: `POST /api/payhero/callback` (already exists)

**Add to existing logic**:

1. When payment succeeds, for each ticket in order:

   - Generate encrypted QR code payload: `{ ticketId, eventId, userId, timestamp }`
   - Use `crypto.createCipher('aes-256-cbc', QR_SECRET)`
   - Generate QR image using `qrcode` library
   - Upload QR image to S3/Cloudinary (or store base64)
   - Update ticket with `qrCode` and `qrCodeUrl`

2. Generate PDF ticket with QR code
3. Send emails:

   - If new user: send welcome email with credentials
   - Always: send ticket email with QR PDF attachment

4. If affiliate conversion: create `ReferralConversion` record

### 2.4 QR Scanner Endpoint

**File**: `server/routes/tickets.js`

**Endpoint**: `POST /api/tickets/scan`

**Request Body**: `{ qrCodeData, eventId }`

**Logic**:

1. Decrypt QR payload
2. Extract ticketId, eventId from payload
3. Verify organizer owns the event (check JWT user)
4. Check ticket status (not already scanned, payment completed)
5. Mark ticket as `status='used'`, `usedAt=now`, `usedBy=organizerId`
6. Return `{ success: true, ticketType, holderName }`

## Phase 3: Email Service Integration

### 3.1 Email Templates

**File**: `server/services/emailService.js` (modify existing)

**New templates needed**:

1. **Welcome Email** (new account):

   - Subject: "Welcome to Event-i - Your Account Details"
   - Content: firstName, email, tempPassword, login link
   - CTA: "Login and change your password"

2. **Ticket Email** (with QR):

   - Subject: "Your Ticket for {eventName}"
   - Content: Event details, ticket type, QR code image
   - Attachment: PDF ticket with QR
   - CTA: "Add to Wallet" or "Download Ticket"

## Phase 4: Frontend - Direct Checkout Page

### 4.1 Create Direct Checkout Page

**File**: `client/src/pages/DirectCheckout.jsx` (new)

**Route**: `/events/:slug/checkout`

**Components**:

1. Event header (image, title, date, venue)
2. Ticket selection (dropdown of ticket types from event.ticketTypes)
3. Quantity selector (1-10, default 1)
4. Customer form: firstName, lastName, email, phone
5. Price summary (updates based on quantity)
6. Hidden field for referralCode (from URL `?ref=`)
7. "Proceed to Payment" button

**Logic**:

- Fetch event on mount: `GET /api/events/:slug/checkout?ref=CODE`
- On submit: `POST /api/tickets/direct-purchase`
- Redirect to PayHero payment URL from response

### 4.2 Update Event Details Page

**File**: `client/src/pages/EventDetails.jsx` (modify)

**Change**:

- Replace "Add to Cart" button with "Buy Tickets" button
- Button links to `/events/:slug/checkout` (not cart)

### 4.3 Deprecate Cart Components

**Files to modify**:

- `client/src/pages/Checkout.jsx` - add deprecation notice or remove
- `client/src/components/Cart.jsx` - remove or hide
- `client/src/store/slices/checkoutSlice.js` - keep for backward compatibility but don't use

### 4.4 Customer Ticket Wallet

**File**: `client/src/pages/MyTickets.jsx` (create new or modify)

**Route**: `/my-tickets`

**Display**:

- List all tickets for logged-in user
- Each ticket card shows: event name, date, venue, QR code
- "Show QR Code" button to display for scanning
- "Download PDF" link
- Status badge (Valid/Used)

## Phase 5: QR Code Generation & Security

### 5.1 QR Service

**File**: `server/services/qrService.js` (new)

**Functions**:

- `generateTicketQR(ticketId, eventId, userId)` - creates encrypted QR
- `decryptQR(qrCodeData)` - validates and decrypts QR
- Uses AES-256-CBC encryption with `QR_ENCRYPTION_KEY` from env

### 5.2 Upload Service

**File**: `server/services/uploadService.js` (modify or create)

**Function**: `uploadQRImage(base64Data, filename)` - uploads to S3/Cloudinary

- Returns public URL for QR image

## Phase 6: Environment & Configuration

### 6.1 Environment Variables

**File**: `.env`

Add:

```
QR_ENCRYPTION_KEY=your-32-character-secret-key
AWS_S3_BUCKET=event-i-tickets (or use existing)
EMAIL_FROM=tickets@yourdomain.com
FRONTEND_URL=http://localhost:5173
```

## Phase 7: Testing Strategy

### 7.1 API Tests

- Test direct purchase flow with new user
- Test direct purchase with existing user
- Test affiliate code tracking
- Test PayHero webhook with QR generation
- Test QR scanner validation

### 7.2 Frontend Tests

- Test checkout page with quantity selection
- Test form validation
- Test affiliate code from URL
- Test ticket wallet display

## Implementation Order

1. ✅ Update models (User, Ticket, Order)
2. ✅ Create QR service
3. ✅ Build direct checkout API endpoint
4. ✅ Enhance PayHero webhook for QR generation
5. ✅ Add QR scanner endpoint
6. ✅ Update email service with new templates
7. ✅ Build frontend direct checkout page
8. ✅ Update event details page routing
9. ✅ Create ticket wallet page
10. ✅ Test end-to-end flow
11. ✅ Deprecate cart components

## Key Files to Modify/Create

**Backend** (11 files):

- `server/models/User.js` - add temp password fields
- `server/models/Ticket.js` - ensure QR fields
- `server/models/Order.js` - add purchase source tracking
- `server/routes/events.js` - add checkout endpoint
- `server/routes/tickets.js` - add direct purchase + scanner
- `server/routes/payhero.js` - enhance webhook
- `server/services/qrService.js` - NEW
- `server/services/emailService.js` - add templates
- `server/services/uploadService.js` - QR upload (NEW or modify existing)
- `server/services/pdfService.js` - NEW (ticket PDF generation)
- `server/index.js` - register new routes

**Frontend** (6 files):

- `client/src/pages/DirectCheckout.jsx` - NEW main checkout page
- `client/src/pages/EventDetails.jsx` - change routing
- `client/src/pages/MyTickets.jsx` - NEW ticket wallet
- `client/src/App.jsx` - add new routes
- `client/src/store/slices/ticketSlice.js` - NEW for ticket management
- `client/src/components/QRDisplay.jsx` - NEW for showing QR codes

## Migration Notes

- Existing cart-based orders will continue to work
- `purchaseSource` field allows distinguishing old vs new flow
- All existing PayHero integration remains functional
- Affiliate tracking builds on existing ReferralLink/ReferralConversion models

### To-dos

- [ ] Update User, Ticket, and Order models to support simplified checkout flow with temp passwords, QR codes, and purchase source tracking
- [ ] Create QR service for generating encrypted QR codes and PDF tickets
- [ ] Build direct checkout API endpoint that handles event fetching, user auto-creation, and order initialization
- [ ] Enhance PayHero webhook to generate QR codes, create tickets, and send email notifications
- [ ] Create QR scanner endpoint for organizers to validate tickets at events
- [ ] Add email templates for welcome messages (with credentials) and ticket delivery (with QR)
- [ ] Build DirectCheckout page with ticket selection, quantity picker, and customer form
- [ ] Update EventDetails page to route to direct checkout instead of cart, and add new routes to App.jsx
- [ ] Create MyTickets page for customers to view and display QR codes for their purchased tickets
- [ ] Test complete flow: event link → checkout → payment → QR generation → email delivery → ticket scanning