# 🚀 PAYMENT FLOW TEST - READY TO RUN

## ✅ System Status - ALL READY!

- ✅ **Ngrok**: Running at `https://125fb8a73e04.ngrok-free.app`
- ✅ **Server**: Running on port 5000
- ✅ **MongoDB**: Connected
- ✅ **Channel ID**: 3767
- ✅ **Callback URL**: `https://125fb8a73e04.ngrok-free.app/api/payhero/callback`
- ✅ **Security**: Enhanced middleware active
- ✅ **Email**: SMTP configured and tested

---

## ⚠️ BEFORE YOU TEST - CRITICAL STEP!

### 🔴 You MUST Update PayHero Dashboard First!

**Without this step, payments will still fail!**

1. **Login**: https://dashboard.payhero.co.ke
2. **Navigate**: Payment Channels → Channel 3767 (or your active M-PESA channel)
3. **Update Callback URL to**:
   ```
   https://125fb8a73e04.ngrok-free.app/api/payhero/callback
   ```
4. **Verify**:
   - Channel Status: Active
   - Provider: M-PESA
   - Callback URL: Updated with ngrok URL
5. **Save Changes**

**Have you done this?** 
- ✅ YES → Proceed to test below
- ❌ NO → Do it now, then continue

---

## 🧪 TEST 1: Complete Payment Flow

### Step 1: Start Monitoring

**Terminal 1** - Run this command:
```bash
./run-payment-test.sh
```

This will show color-coded, real-time updates:
- 🎫 Order creation
- 👤 User creation
- 💳 Payment initiation
- 🔔 Webhook received
- ✅ Payment confirmed
- 📱 QR generation
- 📧 Emails sent

### Step 2: Open Ngrok Dashboard

**In browser**, open:
```
http://localhost:4040
```

This shows all HTTP requests hitting your server, including PayHero webhooks.

### Step 3: Make Test Payment

**Open checkout page**:
```
http://localhost:3000/events/test-this-end-to-end/checkout
```

**Fill form with**:
```
First Name:    Test
Last Name:     Payment
Email:         test.payment.$(date +%s)@example.com  ← Use unique email
Country Code:  +254 (Kenya)
Phone:         703328938  ← Your real M-PESA (9 digits, NO leading 0)
Ticket Type:   Early Bird
Quantity:      1  ← Start with 1 to minimize cost
```

**Click**: "Proceed to Payment"

### Step 4: Complete M-PESA Payment

1. **STK Push appears** on phone (0703328938)
2. **Enter your M-PESA PIN**
3. **Wait 10-30 seconds**

### Step 5: Watch Terminal 1 (Monitoring)

You should see this sequence:

```bash
🎫 Order created: { orderId: '...', orderNumber: 'ORD-...' }

👤 New user created: { userId: '...', email: 'test.payment...@example.com' }
   OR
👤 Existing user found: { userId: '...', email: '...' }

💳 Payment initiated: { checkoutRequestId: 'ws_CO_...' }

📧 Credentials email sent to: test.payment...@example.com  ← If new user

[10-30 seconds pause while you enter PIN]

🔔 PAYHERO Callback received at: 2025-10-09T...

✅ Order ... status updated: { paymentStatus: 'completed', orderStatus: 'paid' }

📱 QR code generated for ticket: TKT-...

📧 Ticket email sent successfully to: test.payment...@example.com

📧 Payment receipt email sent successfully

🎉 Payment processing completed in XXXms
```

### Step 6: Watch Ngrok Dashboard (http://localhost:4040)

You should see:
```
POST /api/payhero/callback
Status: 200 OK
Size: ~800 bytes
Duration: ~2-3s
```

Click on the request to see:
- **Request body** (PayHero's webhook data)
- **Response body** (your server's response)
- **Headers**
- **Timing**

### Step 7: Verify Payment Status Page

Browser should show:
```
⏳ Waiting for Payment
   ↓ (after ~10-30 seconds)
✅ Payment Successful! 🎉

Order Number: ORD-...
Tickets: 1
Amount Paid: KES 300

Email confirmation sent to: test.payment...@example.com

[View My Tickets] [Browse More Events]
```

---

## 🔍 Verification Steps

### 1. Check Your Phone (M-PESA)

You should receive **2 SMS messages**:

**SMS 1: M-PESA Confirmation**
```
SGL12345678 Confirmed.
You have paid KES 300.00 to PAYHERO...
Transaction cost: KES 0.00
New M-Pesa balance: KES XXX.XX
```

**SMS 2: PayHero Notification** (maybe)
```
Payment successful...
```

### 2. Check Emails (Ethereal)

**Open**: https://ethereal.email/messages
**Login**: nova7@ethereal.email / wHQmBVbbjdWPUX7vG4

**You should see 3 emails**:

✉️ **Email 1**: "Welcome to Event-i - Your Account Has Been Created"
- Contains temp password
- Example: `Temp_tes_ABC123XYZ`

✉️ **Email 2**: "Your Tickets - test this end to end"
- Contains QR code image
- Ticket number
- Event details

✉️ **Email 3**: "Payment Receipt - ORD-..."
- M-PESA receipt number
- Transaction amount
- Payment breakdown

### 3. Verify Order in Database

```bash
# Get latest order
docker exec -it event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --eval "
db.orders.findOne({}, {
  orderNumber: 1,
  status: 1,
  paymentStatus: 1,
  'payment.status': 1,
  'payment.mpesaReceiptNumber': 1,
  'customer.email': 1,
  totalAmount: 1
}, { sort: { createdAt: -1 } }).pretty()
"
```

**Expected output**:
```javascript
{
  _id: ObjectId("..."),
  orderNumber: "ORD-...",
  status: "completed",           // ← Should be completed
  paymentStatus: "paid",         // ← Should be paid
  totalAmount: 300,
  customer: {
    email: "test.payment...@example.com"
  },
  payment: {
    status: "completed",         // ← Should be completed
    mpesaReceiptNumber: "SGL..." // ← Should have M-PESA receipt
  }
}
```

### 4. Verify Tickets with QR Codes

```bash
# Get tickets from latest order
docker exec -it event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --eval "
const latestOrder = db.orders.findOne({}, { _id: 1 }, { sort: { createdAt: -1 } });
db.tickets.find({ orderId: latestOrder._id }, {
  ticketNumber: 1,
  status: 1,
  qrCode: 1,
  qrCodeUrl: 1,
  'qr.nonce': 1,
  'qr.issuedAt': 1,
  'holder.email': 1
}).pretty()
"
```

**Expected output**:
```javascript
{
  _id: ObjectId("..."),
  ticketNumber: "TKT-...",
  status: "active",
  holder: {
    email: "test.payment...@example.com"
  },
  qrCode: "a1b2c3d4e5f6...",                    // ← Should exist (encrypted hex)
  qrCodeUrl: "data:image/png;base64,iVBOR...", // ← Should exist (base64 image)
  qr: {
    nonce: "unique_hex_string...",             // ← Should be unique
    issuedAt: ISODate("2025-10-09T...")
  }
}
```

### 5. Verify User Created (If New)

```bash
docker exec -it event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --eval "
db.users.findOne({ 
  email: 'test.payment.YOUR_TIMESTAMP@example.com'  // Replace with actual email
}, {
  email: 1,
  firstName: 1,
  accountStatus: 1,
  passwordResetRequired: 1,
  'profile.phone': 1
}).pretty()
"
```

**Expected output**:
```javascript
{
  _id: ObjectId("..."),
  email: "test.payment...@example.com",
  firstName: "Test",
  accountStatus: "pending_activation",  // ← Requires password change
  passwordResetRequired: true,
  profile: {
    phone: "+254703328938"
  }
}
```

---

## 📊 What You'll See at Each Step

### When You Submit Checkout:

**Browser**:
```
✅ Form validated
→ Redirecting to payment status...
→ URL: http://localhost:3000/payment/ORDER_ID
→ Status: ⏳ "Waiting for Payment"
```

**Terminal 1 (Monitoring)**:
```bash
🎫 Order created: { orderId: '68db...', orderNumber: 'ORD-...' }
👤 New user created: { email: 'test.payment...@example.com' }
💳 Payment initiated: { checkoutRequestId: 'ws_CO_...' }
📧 Credentials email sent to: test.payment...@example.com
```

**Your Phone**:
```
📱 STK Push notification:
   "Enter PIN to pay KES 300 to PAYHERO"
```

### After Entering PIN:

**Browser**:
```
Status updates: 🔄 "Processing Payment..."
```

**Terminal 1**:
```bash
🔔 PAYHERO Callback received at: 2025-10-09T15:XX:XX
✅ Order ... status updated: { paymentStatus: 'completed' }
📱 QR code generated for ticket: TKT-...
📧 Ticket email sent successfully
📧 Payment receipt email sent successfully
🎉 Payment processing completed in 2341ms
```

**Ngrok Dashboard (http://localhost:4040)**:
```
POST /api/payhero/callback
200 OK
```

**Your Phone**:
```
📱 M-PESA SMS:
   "SGL12345678 Confirmed.
    You have paid KES 300.00 to PAYHERO...
    New balance: KES XXX.XX"
```

**Browser**:
```
Status updates: ✅ "Payment Successful! 🎉"

Shows:
- Order Number: ORD-...
- Tickets: 1
- Amount Paid: KES 300
- Email sent to: test.payment...@example.com

[View My Tickets] [Browse More Events]
```

---

## 🎯 Test Checklist

After payment completes, verify:

### ✅ Payment Confirmation
- [ ] M-PESA SMS received on phone (0703328938)
- [ ] Money deducted (KES 300)
- [ ] M-PESA transaction code received (e.g., SGL12345678)

### ✅ Webhook Received
- [ ] Terminal shows "PAYHERO Callback received"
- [ ] Ngrok dashboard shows POST to `/api/payhero/callback`
- [ ] Response status: 200 OK

### ✅ Order Updated
- [ ] Database shows: `status: "completed"`
- [ ] Database shows: `paymentStatus: "paid"`
- [ ] M-PESA receipt number saved

### ✅ Tickets Generated
- [ ] QR code exists (encrypted string)
- [ ] QR code URL exists (base64 image)
- [ ] Unique nonce generated
- [ ] HMAC signature created

### ✅ Emails Sent
- [ ] Welcome email (with temp password) - if new user
- [ ] Ticket email (with QR code image)
- [ ] Payment receipt (with transaction details)

### ✅ User Interface
- [ ] Status page shows "Success"
- [ ] Can view tickets in wallet
- [ ] QR codes visible

---

## 🐛 If Something Fails

### Issue: No Webhook Received

**Check**:
```bash
# 1. Verify ngrok is running
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url'

# 2. Check PayHero dashboard
# Callback URL must be: https://125fb8a73e04.ngrok-free.app/api/payhero/callback

# 3. Test callback manually
curl -X POST https://125fb8a73e04.ngrok-free.app/api/payhero/callback \
  -H "Content-Type: application/json" \
  -d '{"response":{"ResultCode":0,"ExternalReference":"TEST"}}'
```

### Issue: Payment Fails

**Check server logs**:
```bash
docker logs event_i_server | tail -100 | grep -E "(error|Error|ERROR|failed|Failed)"
```

### Issue: No Emails

**Check email logs**:
```bash
docker logs event_i_server | grep "email" | tail -20
```

---

## 🎯 START THE TEST NOW!

### Quick 3-Step Test:

**Step 1**: Start monitoring
```bash
./run-payment-test.sh
```

**Step 2**: Make payment
```
Browser: http://localhost:3000/events/test-this-end-to-end/checkout
Email: test.payment.$(date +%s)@example.com
Phone: 703328938
Amount: KES 300 (Early Bird ticket)
```

**Step 3**: Verify
- Check terminal for webhook
- Check phone for M-PESA SMS
- Check Ethereal for emails
- Check database for data

---

## 📋 Post-Test Data Verification

After successful payment, run this to see ALL saved data:

```bash
# Create verification script
cat > verify-payment-data.sh << 'EOF'
#!/bin/bash

echo "🔍 Payment Data Verification"
echo "==========================="
echo ""

# Get latest order ID
ORDER_ID=$(docker exec -i event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --quiet --eval "
db.orders.findOne({}, { _id: 1 }, { sort: { createdAt: -1 } })._id
" 2>/dev/null | tr -d '\n' | grep -oE '[0-9a-f]{24}')

echo "📦 Latest Order ID: $ORDER_ID"
echo ""

# 1. Order Details
echo "1️⃣ ORDER DATA:"
echo "=============="
docker exec -i event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --quiet --eval "
db.orders.findOne({ _id: ObjectId('$ORDER_ID') }, {
  orderNumber: 1,
  status: 1,
  paymentStatus: 1,
  totalAmount: 1,
  'customer.email': 1,
  'payment.status': 1,
  'payment.mpesaReceiptNumber': 1,
  'payment.paidAt': 1,
  createdAt: 1,
  completedAt: 1
}).pretty()
"

echo ""
echo "2️⃣ TICKET DATA (with QR codes):"
echo "==============================="
docker exec -i event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --quiet --eval "
db.tickets.find({ orderId: ObjectId('$ORDER_ID') }, {
  ticketNumber: 1,
  status: 1,
  ticketType: 1,
  price: 1,
  'holder.email': 1,
  qrCode: { \$substr: ['\$qrCode', 0, 50] },  // First 50 chars
  'qr.nonce': { \$substr: ['\$qr.nonce', 0, 20] },
  'qr.issuedAt': 1
}).pretty()
"

echo ""
echo "3️⃣ USER DATA:"
echo "============="
docker exec -i event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --quiet --eval "
const order = db.orders.findOne({ _id: ObjectId('$ORDER_ID') });
db.users.findOne({ _id: order.customer.userId }, {
  email: 1,
  firstName: 1,
  lastName: 1,
  accountStatus: 1,
  passwordResetRequired: 1,
  'profile.phone': 1,
  createdAt: 1
}).pretty()
"

echo ""
echo "✅ Verification Complete!"
echo ""
EOF

chmod +x verify-payment-data.sh
./verify-payment-data.sh
```

---

## 🎉 Success Indicators

### You know it worked when:

**Phone (M-PESA)**:
- ✅ SMS: "SGL123... Confirmed. You have paid KES 300.00"
- ✅ Balance reduced by KES 300

**Terminal**:
- ✅ "PAYHERO Callback received"
- ✅ "Order status updated: paid"
- ✅ "QR code generated"
- ✅ "email sent" (×3)

**Ngrok Dashboard**:
- ✅ POST /api/payhero/callback → 200 OK

**Browser**:
- ✅ Status page: "Payment Successful! 🎉"

**Database**:
- ✅ Order: `paymentStatus: "paid"`
- ✅ Ticket: Has `qrCode` and `qrCodeUrl`
- ✅ User: Created (if new)

**Emails (Ethereal)**:
- ✅ 3 emails received
- ✅ QR code visible in ticket email
- ✅ Temp password in welcome email

---

## 🚨 Common Issues & Quick Fixes

### Issue 1: No Webhook After Payment
**Cause**: PayHero dashboard not updated
**Fix**: Update callback URL in PayHero dashboard

### Issue 2: Webhook Returns 400 Error
**Cause**: Invalid payload structure
**Fix**: Check ngrok dashboard for actual payload received

### Issue 3: QR Codes Not Generated
**Cause**: Webhook processing error
**Fix**: Check logs for "QR code generation failed"

### Issue 4: No Emails
**Cause**: SMTP error
**Fix**: Run `docker exec event_i_server node /app/scripts/test-email-simple.js`

---

## 🎯 Ready to Test?

Run this command to start:

```bash
./run-payment-test.sh
```

Then make a payment and watch the magic happen! ✨

---

**After test completes, tell me**:
1. Did you receive M-PESA confirmation SMS? 
2. Did webhook appear in terminal?
3. Did status page show success?
4. Did you receive all 3 emails?

Then we'll verify the data was saved correctly! 🚀





