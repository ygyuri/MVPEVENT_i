# 🔧 Callback Issue - FIXED! ✅

## 🐛 What Went Wrong

### Root Cause:
The **server was sending `localhost` callback URL to PayHero** instead of the ngrok public URL.

### Evidence:
```
Server Logs:
PAYHERO Payment Request: {
  callback_url: 'http://localhost:5000/api/payhero/callback'  ❌ WRONG!
}
```

### Why This Happened:
1. We updated `docker-compose.yml` with the ngrok URL
2. But the **server container was already running**
3. The container didn't pick up the new environment variable
4. It continued using the old `localhost` URL

### Result:
- ✅ Payment went through on M-PESA
- ✅ Money deducted from customer
- ❌ PayHero tried to send callback to `localhost`
- ❌ Callback failed (can't reach localhost from internet)
- ❌ Server never received payment confirmation
- ❌ Order stuck in "processing" status
- ❌ No QR codes generated
- ❌ No emails sent
- ❌ Frontend stuck on "Processing Payment..."

---

## ✅ What We Fixed

### 1. Restarted Server Container
```bash
docker compose restart server
```
✅ Now reads `PAYHERO_CALLBACK_URL` from environment

### 2. Fixed Stuck Order
```bash
docker exec event_i_server node /app/scripts/fix-stuck-order.js 68e924c4c4cf95dd537e3550
```
✅ Order status: `processing` → `completed`
✅ Payment status: `processing` → `completed`
✅ M-PESA receipt added: `SGL0111478`

### 3. Current Configuration
```
Ngrok URL:      https://125fb8a73e04.ngrok-free.app
Callback URL:   https://125fb8a73e04.ngrok-free.app/api/payhero/callback
Channel ID:     3767
Server:         ✅ Using correct callback URL
PayHero:        ✅ Dashboard updated (you did this)
```

---

## 🧪 Test Again - Properly This Time!

### Step 1: Verify Server is Using Correct URL

**Check what the server will send to PayHero:**
```bash
docker logs event_i_server 2>&1 | grep "callback_url" | tail -1
```

**Should show:**
```
callback_url: 'https://125fb8a73e04.ngrok-free.app/api/payhero/callback'
```

### Step 2: Start Fresh Test

**Terminal**:
```bash
./run-payment-test.sh
```

**Browser**:
```
http://localhost:3000/events/test-this-end-to-end/checkout
```

### Step 3: Fill Form with NEW Email

**IMPORTANT**: Use a **different email** than before!

```
Email:       test.payment.$(date +%s)@example.com  ← MUST BE UNIQUE!
First Name:  Test
Last Name:   User
Country:     +254 (Kenya)
Phone:       703328938  ← YOUR actual M-PESA number
Ticket:      Early Bird (KES 300)
Quantity:    1
```

### Step 4: Submit & Watch Carefully

**What You'll See:**

#### Stage 1: Form Submit (0-2 seconds)
```
Browser: Loading spinner
Server:  "Order created"
Server:  "PAYHERO Payment Request: { callback_url: 'https://125fb8a73e04.ngrok-free.app/...' }"
```
✅ **Verify**: Server log shows **ngrok URL** (not localhost!)

#### Stage 2: Payment Status (2-5 seconds)
```
Browser: Redirect to /payment/ORDER_ID
Display: ⏰ "Waiting for Payment"
Message: "Please check your phone and enter your M-PESA PIN"
Phone:   📱 STK Push notification
```

#### Stage 3: Enter PIN (5-20 seconds)
```
Phone:   Enter M-PESA PIN
Browser: Still showing "Waiting..." with polling counter
Display: "🔄 Checking payment status... (3)"
```

#### Stage 4: Payment Confirmed (20-40 seconds)
```
Phone:   📱 M-PESA SMS "SGL123... Confirmed. KES 300.00 paid"
Display: "🔄 Processing Payment..."
Display: "🔄 Verifying payment... (6)"
```

#### Stage 5: Webhook Arrives! (30-60 seconds)
```
Terminal: "🔔 PAYHERO Callback received"
Terminal: "📝 Webhook Request Log:"
Terminal: "✅ Order status updated: completed"
Terminal: "📱 QR code generated for ticket: TKT-..."
Terminal: "📧 Welcome email sent to: test.user@example.com"
Terminal: "📧 Ticket email sent to: test.user@example.com"
Terminal: "📧 Receipt sent to: test.user@example.com"
```

#### Stage 6: Success! (60-70 seconds)
```
Browser: ✅ "Payment Successful! 🎉"
Display: Order Number: ORD-...
Display: Tickets: 1
Display: Amount Paid: KES 300
Display: "A confirmation email with your ticket(s) and QR code(s) has been sent to: test.user@example.com"
Buttons: [View My Tickets] [Browse More Events]
```

---

## 🎯 Success Checklist

After payment, verify ALL of these:

### ✅ Phone
- [ ] M-PESA SMS confirmation
- [ ] Receipt number (e.g., SGL12345678)
- [ ] Amount deducted (KES 300)

### ✅ Terminal (Server Logs)
- [ ] "PAYHERO Payment Request" shows **ngrok URL** (not localhost)
- [ ] "🔔 PAYHERO Callback received"
- [ ] "✅ Order status updated: completed"
- [ ] "📱 QR code generated"
- [ ] "📧 Welcome email sent"
- [ ] "📧 Ticket email sent"
- [ ] "📧 Receipt sent"

### ✅ Ngrok Dashboard (http://localhost:4040)
- [ ] POST /api/payhero/callback
- [ ] Status: 200 OK
- [ ] Response time: <1s

### ✅ Browser (Frontend)
- [ ] Status page shows "Payment Successful! 🎉"
- [ ] Green checkmark animation
- [ ] Order summary displayed
- [ ] Email confirmation message
- [ ] Can click "View My Tickets"

### ✅ Wallet Page (http://localhost:3000/wallet)
- [ ] Ticket card displayed
- [ ] QR code image visible
- [ ] Ticket number shown
- [ ] Status: "Active"
- [ ] Event details correct

### ✅ Emails (https://ethereal.email/messages)
- [ ] **Email 1**: Welcome (with temp password)
- [ ] **Email 2**: Ticket (with QR code image)
- [ ] **Email 3**: Receipt (with M-PESA receipt number)

### ✅ Database
Check order status:
```bash
docker exec event_i_server node /app/scripts/check-stuck-payment.js
```

Should show:
```
Status:          completed
Payment Status:  completed
M-PESA Receipt:  SGL12345678
QR:             ✅
```

---

## 🚨 If Webhook Still Doesn't Arrive

### Check 1: Is ngrok still running?
```bash
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.proto == "https") | .public_url'
```

Should show: `https://125fb8a73e04.ngrok-free.app`

### Check 2: Can PayHero reach your callback?
```bash
curl -X POST https://125fb8a73e04.ngrok-free.app/api/payhero/callback \
  -H "Content-Type: application/json" \
  -d '{"test": "ping"}'
```

Should return: `200 OK` or callback response

### Check 3: Is callback URL in PayHero dashboard correct?
Go to: **PayHero Merchant Dashboard → Settings → Webhooks**

Should be: `https://125fb8a73e04.ngrok-free.app/api/payhero/callback`

### Check 4: Server logs showing correct URL?
```bash
docker logs event_i_server 2>&1 | grep "callback_url" | tail -1
```

Should show: `callback_url: 'https://125fb8a73e04.ngrok-free.app/...'`

If it shows `localhost`, restart again:
```bash
docker compose restart server
```

---

## 📊 How the Fixed Flow Works

```
┌─────────────┐
│   CUSTOMER  │
│  Submits    │
│   Form      │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  BACKEND (Event-i Server)                       │
│  1. Creates order (status: processing)          │
│  2. Sends STK push request to PayHero           │
│  3. Includes callback URL:                      │
│     https://125fb8a73e04.ngrok-free.app/...  ✅│
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  PAYHERO API                                    │
│  1. Receives payment request                    │
│  2. Stores callback URL                         │
│  3. Sends STK push to phone                     │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   PHONE     │
│  Customer   │
│  Enters PIN │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  M-PESA                                         │
│  1. Processes payment                           │
│  2. Deducts KES 300                             │
│  3. Sends confirmation to PayHero               │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  PAYHERO API                                    │
│  1. Receives M-PESA confirmation                │
│  2. Sends webhook to stored callback URL:       │
│     POST https://125fb8a73e04.ngrok-free.app/...│
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  NGROK                                          │
│  1. Receives webhook from internet              │
│  2. Forwards to localhost:5000                  │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  BACKEND (Event-i Server)                       │
│  /api/payhero/callback endpoint                 │
│  1. Validates webhook                           │
│  2. Updates order: completed                    │
│  3. Generates QR codes                          │
│  4. Sends 3 emails                              │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│  CUSTOMER   │
│  Frontend   │
│  - Polling  │
│  - Detects  │
│    status   │
│    change   │
│  - Shows    │
│    success  │
└─────────────┘
```

---

## 🎯 Ready to Test!

**Everything is now configured correctly!**

Just run:
```bash
./run-payment-test.sh
```

Then make a payment with a **NEW email** and you should see:
1. ✅ STK push on phone
2. ✅ Enter PIN
3. ✅ M-PESA confirmation SMS
4. ✅ Terminal shows webhook received
5. ✅ Frontend shows "Payment Successful! 🎉"
6. ✅ 3 emails arrive
7. ✅ Ticket in wallet with QR code

**Let me know the results!** 🚀



