# End-to-End Checkout Test Guide 🧪

## 📧 Email Configuration

You're using **Ethereal Email** - a fake SMTP service for testing:
- **SMTP Host**: smtp.ethereal.email
- **SMTP User**: nova7@ethereal.email
- **View Emails**: https://ethereal.email/messages

---

## 🧪 Test 1: New User Checkout (Full Flow)

### Prerequisites
- Docker containers running (`docker ps`)
- Event with ticket types exists
- Browser at: http://localhost:3000

### Test Steps

#### Step 1: Start Log Monitoring
```bash
# Open a new terminal and run:
docker logs -f event_i_server | grep -E "(Order created|Payment|QR code|email|callback)" --line-buffered
```

#### Step 2: Go to Checkout
1. Navigate to: http://localhost:3000/events
2. Find "test this end to end" event
3. Click **"Buy Tickets"** button
4. You'll be at: http://localhost:3000/events/test-this-end-to-end/checkout

#### Step 3: Fill Checkout Form
**Use a NEW email** (not in database):
```
First Name: John
Last Name: Doe
Email: john.doe.test@example.com
Country Code: +254 (Kenya)
Phone: 712345678 (9 digits, no leading 0)
Ticket Type: General Admission
Quantity: 2
```

#### Step 4: Submit & Monitor
1. Click **"Proceed to Payment"**
2. Watch terminal logs for:
   ```
   ✅ Event found: test this end to end
   ✅ Ticket type found: General Admission
   ✅ New user created: { userId: '...', email: 'john.doe.test@example.com' }
   ✅ Order created: { orderId: '...', orderNumber: 'ORD-...' }
   ✅ Tickets created: { count: 2 }
   ✅ Payment initiated: { checkoutRequestId: '...' }
   ✅ Credentials email sent to: john.doe.test@example.com
   ```

#### Step 5: Check Payment Status Page
- Should redirect to: http://localhost:3000/payment/ORDER_ID
- Status shows: ⏳ **"Waiting for Payment"**
- You'll see: "Please check your phone and enter your M-PESA PIN"

#### Step 6: Simulate Payment
**Since we're testing, simulate the webhook**:

```bash
# Get your order ID from logs or status page URL
ORDER_ID="paste_order_id_here"

# Get the order details
docker exec -it event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --eval "
db.orders.findOne({ _id: ObjectId('$ORDER_ID') }, { 
  'payment.paymentReference': 1, 
  'payment.checkoutRequestId': 1 
}).pretty()
"
```

**Then simulate successful payment webhook**:
```bash
# Copy the paymentReference from above
PAYMENT_REF="paste_payment_reference_here"

# Simulate PayHero success webhook
curl -X POST http://localhost:5000/api/payhero/callback \
  -H "Content-Type: application/json" \
  -d '{
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "MpesaReceiptNumber": "TEST'$(date +%s)'",
    "TransactionDate": "'$(date -u +"%Y%m%d%H%M%S")'",
    "PhoneNumber": "254712345678",
    "Amount": 80,
    "external_reference": "'$PAYMENT_REF'",
    "checkout_request_id": "ws_CO_TEST123456789"
  }'
```

#### Step 7: Verify Webhook Processing
Watch logs for:
```
🔔 PAYHERO Callback received
📦 Order found: { orderId: '...', orderNumber: '...' }
✅ Order ... status updated: { paymentStatus: 'completed', orderStatus: 'paid' }
🎫 Processing 2 tickets for QR generation...
✅ QR code generated for ticket: TKT-...
✅ QR code generated for ticket: TKT-...
✅ All 2 QR codes generated successfully
✅ Ticket email sent successfully to: john.doe.test@example.com
✅ Payment receipt email sent successfully
```

#### Step 8: Check Status Page Updates
- Status should change to: ✅ **"Payment Successful! 🎉"**
- Shows:
  - Order Number
  - Number of tickets (2)
  - Total amount paid
  - Email confirmation message

#### Step 9: Verify Emails Sent

**Option A: Check Ethereal Email Web Interface**
1. Go to: https://ethereal.email/messages
2. Login with: nova7@ethereal.email / wHQmBVbbjdWPUX7vG4
3. You should see **3 emails**:
   - ✉️ "Welcome to Event-i - Your Account Has Been Created"
   - ✉️ "Your Tickets - test this end to end"
   - ✉️ "Payment Receipt - ORD-..."

**Option B: Check Server Logs**
```bash
docker logs event_i_server | grep "email sent" | tail -5
```

#### Step 10: Verify Email Contents

**Email 1: Welcome Email**
- Subject: "Welcome to Event-i - Your Account Has Been Created"
- Contains:
  - ✅ User's first name
  - ✅ Email address
  - ✅ Temporary password
  - ✅ Order number
  - ✅ Login link

**Email 2: Ticket Email**
- Subject: "Your Tickets - test this end to end"
- Contains:
  - ✅ Order number
  - ✅ 2 tickets listed
  - ✅ Each ticket has unique QR code (base64 image)
  - ✅ Event details (date, venue)
  - ✅ Ticket numbers (TKT-...)

**Email 3: Payment Receipt**
- Subject: "Payment Receipt - ORD-..."
- Contains:
  - ✅ MPESA receipt number
  - ✅ Transaction amount
  - ✅ Payment breakdown

#### Step 11: Verify Database

```bash
# Check order status
docker exec -it event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --eval "
db.orders.findOne({ _id: ObjectId('$ORDER_ID') }, {
  orderNumber: 1,
  status: 1,
  paymentStatus: 1,
  'payment.status': 1,
  'customer.email': 1
}).pretty()
"

# Expected:
# status: 'completed'
# paymentStatus: 'paid'
# payment.status: 'completed'
```

```bash
# Check tickets with QR codes
docker exec -it event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --eval "
db.tickets.find({ orderId: ObjectId('$ORDER_ID') }, {
  ticketNumber: 1,
  status: 1,
  qrCode: 1,
  qrCodeUrl: 1,
  'qr.nonce': 1
}).pretty()
"

# Expected:
# Each ticket has:
# - Unique ticketNumber
# - status: 'active'
# - qrCode: 'encrypted_string'
# - qrCodeUrl: 'data:image/png;base64,...'
# - qr.nonce: 'unique_hex_string'
```

#### Step 12: Verify User Created

```bash
docker exec -it event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --eval "
db.users.findOne({ email: 'john.doe.test@example.com' }, {
  email: 1,
  firstName: 1,
  accountStatus: 1,
  passwordResetRequired: 1
}).pretty()
"

# Expected:
# email: 'john.doe.test@example.com'
# firstName: 'John'
# accountStatus: 'pending_activation'
# passwordResetRequired: true
```

---

## 🧪 Test 2: Payment Failure (User Cancels)

### Test Steps

#### Step 1: Start New Checkout
- Use different email: jane.test@example.com
- Fill form and submit

#### Step 2: Monitor Logs
```bash
docker logs -f event_i_server | grep -E "(Order created|Payment|callback)"
```

#### Step 3: Simulate Payment Cancellation
```bash
# Get payment reference from logs
PAYMENT_REF="paste_payment_reference_here"

# Simulate PayHero cancellation webhook
curl -X POST http://localhost:5000/api/payhero/callback \
  -H "Content-Type: application/json" \
  -d '{
    "ResultCode": 1,
    "ResultDesc": "The service request was cancelled by user.",
    "external_reference": "'$PAYMENT_REF'",
    "checkout_request_id": "ws_CO_TEST123456789"
  }'
```

#### Step 4: Verify Failure Handling
Watch logs for:
```
🔔 PAYHERO Callback received
✅ Order ... status updated: { paymentStatus: 'cancelled', orderStatus: 'cancelled' }
```

#### Step 5: Check Status Page
- Should show: ❌ **"Payment Failed"**
- Shows retry button
- Shows order number

#### Step 6: Verify NO Emails Sent
```bash
docker logs event_i_server | grep "email sent" | tail -3

# Should NOT show ticket or receipt emails for this order
# Only welcome email (sent before payment attempt)
```

#### Step 7: Verify Order Status
```bash
docker exec -it event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --eval "
db.orders.findOne({ 'customer.email': 'jane.test@example.com' }, {
  orderNumber: 1,
  status: 1,
  paymentStatus: 1
}).sort({ createdAt: -1 }).limit(1).pretty()
"

# Expected:
# status: 'cancelled'
# paymentStatus: 'cancelled'
```

---

## 🧪 Test 3: QR Code Uniqueness

### Verify Each Ticket Has Unique QR

```bash
# Get tickets from successful order
docker exec -it event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --eval "
db.tickets.find({ 
  orderId: ObjectId('YOUR_SUCCESSFUL_ORDER_ID') 
}, {
  ticketNumber: 1,
  qrCode: 1,
  'qr.nonce': 1,
  'qr.signature': 1
}).pretty()
"
```

**Verify**:
- ✅ Each ticket has different `ticketNumber`
- ✅ Each ticket has different `qrCode` (encrypted data)
- ✅ Each ticket has different `qr.nonce`
- ✅ Each ticket has different `qr.signature`

### Visual Verification
1. Open ticket email in Ethereal
2. Look at the 2 QR codes side-by-side
3. They should look **completely different** (different patterns)

---

## 🧪 Test 4: Existing User Checkout

### Test Steps

#### Step 1: Use Existing Email
- Use email from Test 1: john.doe.test@example.com
- Fill form and submit

#### Step 2: Monitor Logs
Should see:
```
✅ Existing user found: { userId: '...', email: 'john.doe.test@example.com' }
```

Should NOT see:
```
✅ New user created
✅ Credentials email sent
```

#### Step 3: Simulate Payment Success
(Same as Test 1, Step 6)

#### Step 4: Verify Emails
Should receive **ONLY 2 emails**:
- ✉️ Ticket email (with QR codes)
- ✉️ Payment receipt

Should **NOT** receive:
- ❌ Welcome email (already registered)

---

## 📊 Test Checklist

### ✅ Test 1: New User Success
- [ ] Order created
- [ ] User auto-registered
- [ ] Payment initiated
- [ ] Welcome email sent (with temp password)
- [ ] Payment webhook received
- [ ] QR codes generated (unique)
- [ ] Ticket email sent (with QR codes)
- [ ] Payment receipt sent
- [ ] Status page shows success
- [ ] Can view tickets in /wallet

### ✅ Test 2: Payment Failure
- [ ] Order created
- [ ] Payment cancellation webhook received
- [ ] Order status = cancelled
- [ ] Status page shows failure
- [ ] NO ticket/receipt emails sent
- [ ] Only welcome email sent (if new user)

### ✅ Test 3: QR Uniqueness
- [ ] Each ticket has unique QR code
- [ ] Each ticket has unique nonce
- [ ] Each ticket has unique signature
- [ ] QR codes visually different

### ✅ Test 4: Existing User
- [ ] User found (not created)
- [ ] NO welcome email sent
- [ ] Ticket email sent
- [ ] Payment receipt sent

---

## 🐛 Troubleshooting

### Issue: No Emails Received

**Check SMTP Connection**:
```bash
docker exec event_i_server node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.verify().then(() => {
  console.log('✅ SMTP connection successful');
}).catch(err => {
  console.error('❌ SMTP error:', err);
});
"
```

**Check Email Logs**:
```bash
docker logs event_i_server 2>&1 | grep -i "email" | tail -20
```

### Issue: Webhook Not Processed

**Check Webhook Endpoint**:
```bash
curl -X POST http://localhost:5000/api/payhero/callback \
  -H "Content-Type: application/json" \
  -d '{"test": "ping"}'
```

Should return error (but confirms endpoint is reachable)

### Issue: QR Codes Not Generated

**Check QR Secret**:
```bash
docker exec event_i_server env | grep QR
```

**Check Logs**:
```bash
docker logs event_i_server | grep "QR code"
```

---

## 📧 View Test Emails

### Ethereal Email Web Interface
1. Go to: https://ethereal.email/login
2. Login:
   - Email: nova7@ethereal.email
   - Password: wHQmBVbbjdWPUX7vG4
3. View all captured emails

### Or Check Logs
```bash
docker logs event_i_server | grep "Message sent" -A 5
```

---

## 🎯 Expected Results Summary

### Successful Payment Flow:
1. ✅ Order created (status: pending)
2. ✅ User created/found
3. ✅ Payment initiated (status: processing)
4. ✅ Welcome email sent (new users only)
5. ✅ Webhook received (status: paid)
6. ✅ QR codes generated (unique)
7. ✅ Ticket email sent (with QRs)
8. ✅ Payment receipt sent
9. ✅ Status page shows success

### Failed Payment Flow:
1. ✅ Order created (status: pending)
2. ✅ Payment initiated
3. ✅ Welcome email sent (new users only)
4. ✅ Webhook received (status: cancelled)
5. ❌ NO QR codes generated
6. ❌ NO ticket email sent
7. ❌ NO payment receipt sent
8. ✅ Status page shows failure

---

**Last Updated**: $(date)
**Status**: Ready for E2E Testing





