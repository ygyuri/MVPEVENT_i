# 🚀 START PAYMENT TEST - QUICK GUIDE

## ✅ Current Status

Everything is configured and ready:

```
✅ Ngrok:        https://125fb8a73e04.ngrok-free.app
✅ Callback URL:  https://125fb8a73e04.ngrok-free.app/api/payhero/callback
✅ Server:       Running on port 5000
✅ Channel ID:   3767
✅ Security:     Enhanced middleware active
✅ Email:        SMTP tested and working
```

---

## ⚠️ STEP 0: Update PayHero Dashboard (REQUIRED!)

**Before testing, you MUST**:

1. **Login**: https://dashboard.payhero.co.ke
   - Email: gideonyuri15@gmail.com

2. **Navigate**: Payment Channels

3. **Find**: Channel 3767 (or your active M-PESA channel)

4. **Update Callback URL**:
   ```
   https://125fb8a73e04.ngrok-free.app/api/payhero/callback
   ```

5. **Save Changes**

**Without this step, webhooks won't be received!**

---

## 🧪 TEST PAYMENT (3 Easy Steps)

### Step 1: Start Monitoring (Terminal)

```bash
./run-payment-test.sh
```

**You'll see**:
- Real-time colored output
- All payment events logged
- Easy to follow progress

**Keep this terminal open!**

---

### Step 2: Make Payment (Browser)

#### Open Checkout:
```
http://localhost:3000/events/test-this-end-to-end/checkout
```

#### Fill Form:
```
First Name:    Test
Last Name:     User
Email:         test.$(date +%s)@example.com  ← Unique!
Country:       +254 (Kenya)
Phone:         703328938  ← 9 digits, no leading 0
Ticket Type:   Early Bird
Quantity:      1  ← Start with 1 ticket (KES 300)
```

#### Submit:
- Click "Proceed to Payment"
- Status page appears: "Waiting for Payment"

#### Pay on Phone:
- STK push appears on 0703328938
- Enter your M-PESA PIN
- Wait 10-30 seconds

---

### Step 3: Watch & Verify

**Watch Terminal** (real-time updates):
```
🎫 Order created
👤 User created
💳 Payment initiated
📧 Welcome email sent
🔔 Callback received  ← Key moment!
✅ Status updated: paid
📱 QR codes generated
📧 Ticket email sent
📧 Receipt sent
🎉 Complete!
```

**Watch Ngrok Dashboard**: http://localhost:4040
- See webhook request from PayHero
- Status: 200 OK

**Watch Browser**:
- Status updates to: "Payment Successful! 🎉"

**Check Phone**:
- M-PESA confirmation SMS

---

## 📊 Data Saved on Success

### What Gets Saved:

| Collection | Records | Key Data |
|------------|---------|----------|
| **users** | 1 (if new) | Email, temp password, phone |
| **orders** | 1 | Payment status, M-PESA receipt, total |
| **tickets** | 1 | QR code (encrypted), ticket number |

### Example Data:

**Order**:
```javascript
{
  orderNumber: "ORD-1760...",
  status: "completed",
  paymentStatus: "paid",
  totalAmount: 300,
  payment: {
    mpesaReceiptNumber: "SGL12345678",
    paidAt: "2025-10-09T15:22:45.000Z"
  }
}
```

**Ticket**:
```javascript
{
  ticketNumber: "TKT-1760...",
  qrCode: "a1b2c3d4...",  // Encrypted
  qrCodeUrl: "data:image/png;base64,...",  // Base64 image
  qr: {
    nonce: "unique...",
    signature: "hmac..."
  }
}
```

**User** (if new):
```javascript
{
  email: "test.user@example.com",
  tempPassword: "Temp_tes_ABC123",  // Hashed
  accountStatus: "pending_activation",
  phone: "+254703328938"
}
```

---

## 🔍 Verify Data After Test

Run this after payment completes:

```bash
# Quick verification script
cat > quick-verify.sh << 'EOF'
#!/bin/bash
echo "🔍 Quick Payment Verification"
echo ""

# Get latest order
echo "📦 Latest Order:"
docker exec -i event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --quiet --eval "
db.orders.findOne({}, {
  orderNumber: 1,
  status: 1,
  paymentStatus: 1,
  'payment.mpesaReceiptNumber': 1,
  'customer.email': 1,
  totalAmount: 1
}, { sort: { createdAt: -1 } }).pretty()
" 2>/dev/null

echo ""
echo "🎫 Tickets with QR:"
docker exec -i event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --quiet --eval "
const order = db.orders.findOne({}, {}, { sort: { createdAt: -1 } });
db.tickets.find({ orderId: order._id }, {
  ticketNumber: 1,
  status: 1,
  'holder.email': 1,
  qrCode: { \$exists: true },
  'qr.nonce': 1
}).pretty()
" 2>/dev/null

echo ""
echo "📧 Email Logs:"
docker logs event_i_server 2>&1 | grep "email sent" | tail -5

echo ""
echo "✅ Done!"
EOF

chmod +x quick-verify.sh
./quick-verify.sh
```

---

## 🎯 What You Should See

### ✅ Success Flow (30 seconds total):

```
T+0s    → Submit checkout
T+1s    → Order created, user created
T+2s    → Payment initiated, STK sent
T+3s    → Welcome email sent
T+5s    → [You enter PIN on phone]
T+15s   → M-PESA processes payment
T+20s   → PayHero sends webhook to ngrok
T+21s   → Your server receives callback
T+22s   → Order updated to "paid"
T+23s   → QR codes generated
T+24s   → Ticket email sent
T+25s   → Receipt email sent
T+26s   → Status page shows "Success! 🎉"
```

### ✅ Data Verification:

**Order**: `paymentStatus: "paid"` ✅
**Ticket**: Has QR code ✅
**User**: Created with temp password ✅
**Emails**: 3 emails sent ✅
**M-PESA**: Money deducted ✅

---

## 🚀 LET'S TEST NOW!

### Commands to Run:

**Terminal 1** (Main monitor):
```bash
./run-payment-test.sh
```

**Terminal 2** (Optional - detailed logs):
```bash
docker logs -f event_i_server
```

**Browser 1** (Ngrok dashboard):
```
http://localhost:4040
```

**Browser 2** (Checkout):
```
http://localhost:3000/events/test-this-end-to-end/checkout
```

---

## 📝 Test Results Template

After your test, fill this out:

```
PAYMENT TEST RESULTS
====================

☐ M-PESA SMS received?         YES / NO
☐ Amount deducted?             YES / NO (KES 300)
☐ Webhook in terminal?         YES / NO
☐ Webhook in ngrok?            YES / NO
☐ Status page success?         YES / NO
☐ Welcome email received?      YES / NO (if new user)
☐ Ticket email received?       YES / NO
☐ Receipt email received?      YES / NO
☐ QR code visible in email?    YES / NO
☐ Database order status?       pending / paid / failed
☐ Database ticket has QR?      YES / NO

M-PESA Receipt Number: _______________
Order Number: _______________
Webhook Response Time: _____ seconds

Issues (if any):
_________________________________
_________________________________
```

---

**Ready? Start with**: `./run-payment-test.sh`

Then make a payment and watch everything happen in real-time! 🎉





