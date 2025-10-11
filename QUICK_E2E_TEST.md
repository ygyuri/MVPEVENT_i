# Quick E2E Checkout Test Guide ⚡

## ✅ Email Service Verified!

Your SMTP is working correctly:
- **Provider**: Ethereal Email (test SMTP)
- **View Emails**: https://ethereal.email/messages
- **Login**: `nova7@ethereal.email` / `wHQmBVbbjdWPUX7vG4`

---

## 🚀 Quick Test (5 Minutes)

### Step 1: Test SMTP (Already Done ✅)
```bash
docker exec event_i_server node /app/scripts/test-email-simple.js
```

**Result**: ✅ Test email sent successfully!

---

### Step 2: Run Checkout Flow

#### 2.1 Open Browser
Go to: http://localhost:3000/events/test-this-end-to-end/checkout

#### 2.2 Fill Form (Use NEW Email)
```
First Name: John
Last Name: Test
Email: john.test123@example.com    ← Use unique email
Phone: 712345678                     ← 9 digits, no leading 0
Country: +254 (Kenya)
Ticket Type: General Admission
Quantity: 2
```

#### 2.3 Submit
Click **"Proceed to Payment"**

---

### Step 3: Monitor Logs

**Open Terminal 1 (Server Logs)**:
```bash
docker logs -f event_i_server | grep -E "(Order created|Payment|QR code|email|callback)" --line-buffered
```

**You should see**:
```
✅ Event found: test this end to end
✅ New user created: { email: 'john.test123@example.com' }
✅ Order created: { orderId: '...', orderNumber: 'ORD-...' }
✅ Payment initiated
✅ Credentials email sent to: john.test123@example.com
```

---

### Step 4: Get Payment Reference

**From logs**, copy the payment reference (looks like: `TKT-1234567890`)

**OR use helper script**:
```bash
./test-checkout.sh
# Choose option 1: Get latest order details
# Copy the paymentReference value
```

---

### Step 5: Simulate Payment Success

**Terminal 2**:
```bash
# Replace YOUR_PAYMENT_REF with actual value
curl -X POST http://localhost:5000/api/payhero/callback \
  -H "Content-Type: application/json" \
  -d '{
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "MpesaReceiptNumber": "TEST'$(date +%s)'",
    "TransactionDate": "'$(date -u +"%Y%m%d%H%M%S")'",
    "PhoneNumber": "254712345678",
    "Amount": 80,
    "external_reference": "YOUR_PAYMENT_REF",
    "checkout_request_id": "ws_CO_TEST123"
  }'
```

**OR use helper script**:
```bash
./test-checkout.sh
# Choose option 2: Simulate successful payment
# Press Enter to use latest order
```

---

### Step 6: Verify Webhook Processing

**Terminal 1 (logs) should show**:
```
🔔 PAYHERO Callback received
✅ Order ... status updated: { paymentStatus: 'completed' }
🎫 Processing 2 tickets for QR generation...
✅ QR code generated for ticket: TKT-...
✅ QR code generated for ticket: TKT-...
✅ Ticket email sent successfully to: john.test123@example.com
✅ Payment receipt email sent successfully
```

---

### Step 7: Check Payment Status Page

**Browser should update to**:
- ✅ **"Payment Successful! 🎉"**
- Shows order number
- Shows 2 tickets
- Shows amount paid
- Email confirmation message

---

### Step 8: View Emails

**Open**: https://ethereal.email/messages

**Login**: nova7@ethereal.email / wHQmBVbbjdWPUX7vG4

**You should see 3 emails**:

#### Email 1: Welcome Email
- ✉️ Subject: "Welcome to Event-i - Your Account Has Been Created"
- Contains:
  - Email address
  - **Temporary password** (like: `Temp_joh_ABC123`)
  - Order number
  - Login link

#### Email 2: Ticket Email
- ✉️ Subject: "Your Tickets - test this end to end"
- Contains:
  - 2 tickets listed
  - Each ticket has **UNIQUE QR code** (visual image)
  - Event details
  - Ticket numbers

#### Email 3: Payment Receipt
- ✉️ Subject: "Payment Receipt - ORD-..."
- Contains:
  - MPESA receipt number
  - Amount paid
  - Transaction details

---

## 🧪 Test 2: Payment Failure

### Quick Test
```bash
# 1. Start new checkout with different email
# 2. Get payment reference
# 3. Simulate failure:

curl -X POST http://localhost:5000/api/payhero/callback \
  -H "Content-Type: application/json" \
  -d '{
    "ResultCode": 1,
    "ResultDesc": "User cancelled request",
    "external_reference": "YOUR_PAYMENT_REF"
  }'
```

### Expected Result
- Status page shows: ❌ **"Payment Failed"**
- **NO ticket email sent**
- **NO receipt email sent**
- Only welcome email sent (if new user)

---

## 📊 Verification Checklist

### ✅ Success Flow
- [ ] Order created
- [ ] Welcome email received (with temp password)
- [ ] Payment webhook processed
- [ ] QR codes generated (unique for each ticket)
- [ ] Ticket email received (with QR images)
- [ ] Payment receipt received
- [ ] Status page shows success
- [ ] All 3 emails in Ethereal inbox

### ✅ Failure Flow
- [ ] Order created
- [ ] Payment cancellation processed
- [ ] Status page shows failure
- [ ] NO ticket email (only welcome if new user)
- [ ] Order status = 'cancelled' in DB

---

## 🛠️ Helper Scripts

### Test Email Service
```bash
docker exec event_i_server node /app/scripts/test-email-simple.js
```

### Interactive Test Menu
```bash
./test-checkout.sh

# Options:
# 1. Get latest order
# 2. Simulate success
# 3. Simulate failure
# 4. Check order status
# 5. View email logs
# 6. Watch live logs
# 7. Open Ethereal inbox
# 8. Test SMTP
```

### Watch Logs
```bash
docker logs -f event_i_server | grep -E "(Order|Payment|QR|email)" --line-buffered
```

### Check Latest Order
```bash
docker exec -it event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --eval "
db.orders.findOne({}, { 
  orderNumber: 1, 
  status: 1, 
  paymentStatus: 1,
  'payment.paymentReference': 1,
  'customer.email': 1 
}, { sort: { createdAt: -1 } }).pretty()
"
```

### Check Tickets with QR
```bash
docker exec -it event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --eval "
db.tickets.find({}, {
  ticketNumber: 1,
  qrCode: 1,
  'qr.nonce': 1
}, { sort: { createdAt: -1 }, limit: 5 }).pretty()
"
```

---

## 🎯 Expected Timeline (Success)

```
T+0s   → Order created
T+1s   → Welcome email sent (new user)
T+1s   → Payment initiated
T+1s   → Status: "Waiting for Payment"
T+5s   → (You simulate payment success)
T+6s   → Webhook received
T+7s   → QR codes generated
T+8s   → Ticket email sent
T+9s   → Payment receipt sent
T+10s  → Status: "Success! 🎉"
```

---

## 📧 Email Preview URLs

After sending, check logs for preview URLs:
```bash
docker logs event_i_server | grep "preview" -i
```

Or manually view at:
https://ethereal.email/messages

---

## ✅ All Tests Passed!

If you see all 3 emails with:
- ✅ Temporary password in welcome email
- ✅ Unique QR codes in ticket email
- ✅ Transaction details in receipt

**You're ready for production!** 🚀

---

**Need Help?**
- Check: `E2E_CHECKOUT_TEST.md` (detailed guide)
- Check: `PAYMENT_VERIFICATION.md` (technical details)
- Check: `PAYMENT_FLOW_DEBUG.md` (debugging guide)





