# Ngrok Setup Guide for PayHero Callback 🚀

## 🎯 Current Status

### ✅ Completed:
1. ✅ Ngrok installed via Homebrew
2. ✅ Channel ID updated to **3767** in docker-compose.yml
3. ✅ Security middleware created (`server/middleware/payheroSecurity.js`)
4. ✅ Callback route enhanced with:
   - Request logging
   - Payload validation
   - Idempotency checks
   - Security features

### ⏳ Remaining:
1. ⏳ Authenticate ngrok (one-time setup)
2. ⏳ Start ngrok tunnel
3. ⏳ Update callback URL
4. ⏳ Test payment flow

---

## 📋 Step-by-Step Setup

### Step 1: Authenticate Ngrok (One-Time)

#### 1.1 Create Free Ngrok Account
```
1. Go to: https://dashboard.ngrok.com/signup
2. Sign up (free account is sufficient)
3. Verify your email
```

#### 1.2 Get Your Auth Token
```
1. Login to: https://dashboard.ngrok.com
2. Go to: https://dashboard.ngrok.com/get-started/your-authtoken
3. Copy your authtoken (looks like: 2a...)
```

#### 1.3 Configure Ngrok
```bash
# Run this command (replace YOUR_AUTH_TOKEN with actual token):
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Example:
# ngrok config add-authtoken 2aBC123XYZ456...
```

You should see:
```
Authtoken saved to configuration file: /Users/brix/.config/ngrok/ngrok.yml
```

---

### Step 2: Start Ngrok Tunnel

```bash
# Start ngrok (keeps running in background)
ngrok http 5000 --log=stdout > /tmp/ngrok.log 2>&1 &

# Wait for it to start
sleep 3

# Get your public URL
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.proto == "https") | .public_url'
```

**You'll get a URL like**:
```
https://abc123.ngrok-free.app
```

**Copy this URL!**

---

### Step 3: Update Callback URL in docker-compose.yml

```bash
# Automatically update (replace YOUR_NGROK_URL with actual URL):
NGROK_URL="https://YOUR_NGROK_URL.ngrok-free.app"

sed -i '' "s|PAYHERO_CALLBACK_URL:.*|PAYHERO_CALLBACK_URL: ${NGROK_URL}/api/payhero/callback|" docker-compose.yml

# Verify the change
cat docker-compose.yml | grep PAYHERO_CALLBACK_URL
```

---

### Step 4: Restart Server

```bash
# Restart server to apply new callback URL
docker restart event_i_server

# Wait for server to start
sleep 8

# Verify server is running
docker ps | grep event_i_server
```

---

### Step 5: Verify Configuration

```bash
# Run diagnostic
docker exec event_i_server node /app/scripts/diagnose-payhero.js

# Should show:
# ✅ Channel ID: 3767
# ✅ Callback URL: https://YOUR_NGROK_URL.ngrok-free.app/api/payhero/callback
```

---

### Step 6: Update PayHero Dashboard

**CRITICAL**: You must update PayHero's callback URL setting:

1. Login to: https://dashboard.payhero.co.ke
2. Navigate to: **Payment Channels** → **Channel 3767**
3. Find: **Callback URL** / **Webhook URL** field
4. Update to:
   ```
   https://YOUR_NGROK_URL.ngrok-free.app/api/payhero/callback
   ```
5. Save changes

---

## 🧪 Test the Flow

### Monitor Webhooks

**Terminal 1: Server Logs**
```bash
docker logs -f event_i_server | grep -E "(PAYHERO|callback|Payment|QR|email)" --line-buffered
```

**Terminal 2: Ngrok Dashboard**
```bash
# Open in browser:
open http://localhost:4040

# Or view in terminal:
curl -s http://localhost:4040/api/requests/http | jq '.requests[] | {method, uri, status}'
```

### Make Test Payment

1. Go to: http://localhost:3000/events/test-this-end-to-end/checkout
2. Fill form with **NEW email** (e.g., `test$(date +%s)@example.com`)
3. Phone: `703328938` (your real M-PESA number, 9 digits)
4. Submit

### What You'll See:

**Server Logs (Terminal 1)**:
```
✅ Order created: { orderId: '...', orderNumber: 'ORD-...' }
✅ Payment initiated: { checkoutRequestId: '...' }
PAYHERO Payment Request: { channel_id: 3767 } ← Correct channel!
✅ Credentials email sent

[After you enter PIN on phone]
🔔 PAYHERO Callback received at: 2025-10-09...
📦 Order found: { orderId: '...', orderNumber: '...' }
✅ Order ... status updated: { paymentStatus: 'completed' }
🎫 Processing X tickets for QR generation...
✅ QR code generated
✅ Ticket email sent
✅ Payment receipt sent
```

**Ngrok Dashboard (http://localhost:4040)**:
```
POST /api/payhero/callback → 200 OK
```

**Payment Status Page**:
```
⏳ Waiting for Payment
   ↓ (you enter PIN)
🔄 Processing...
   ↓ (webhook received)
✅ Payment Successful! 🎉
```

---

## 🔧 Quick Commands

### Check if ngrok is running:
```bash
pgrep -fl ngrok
```

### Get ngrok URL:
```bash
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url'
```

### View ngrok dashboard:
```bash
open http://localhost:4040
```

### Stop ngrok:
```bash
pkill ngrok
```

### Restart ngrok:
```bash
pkill ngrok
ngrok http 5000 > /tmp/ngrok.log 2>&1 &
```

---

## 📊 Current Configuration

| Setting | Value | Status |
|---------|-------|--------|
| Channel ID | 3767 | ✅ Updated |
| Callback URL | localhost (needs ngrok) | ⏳ Pending |
| Security Middleware | Created | ✅ Ready |
| Ngrok | Installed | ✅ Ready |
| Auth Token | Not configured | ⏳ You need to do this |

---

## 🎯 What You Need To Do NOW:

### 1. Authenticate Ngrok (2 minutes)
```bash
# Get auth token from: https://dashboard.ngrok.com/get-started/your-authtoken
# Then run:
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### 2. Start Ngrok
```bash
ngrok http 5000
```

Keep this terminal open! You'll see:
```
Session Status: online
Account: your@email.com
Forwarding: https://abc123.ngrok-free.app -> http://localhost:5000
```

### 3. Copy the HTTPS URL
```
https://abc123.ngrok-free.app
```

### 4. Update docker-compose.yml
```bash
# Replace with your actual ngrok URL:
NGROK_URL="https://abc123.ngrok-free.app"

sed -i '' "s|PAYHERO_CALLBACK_URL:.*|PAYHERO_CALLBACK_URL: ${NGROK_URL}/api/payhero/callback|" docker-compose.yml
```

### 5. Restart Server
```bash
docker restart event_i_server
sleep 5
```

### 6. Update PayHero Dashboard
- Login to PayHero
- Set callback URL to: `https://abc123.ngrok-free.app/api/payhero/callback`

### 7. Test!
- Make a payment
- Watch logs: `docker logs -f event_i_server`
- Watch ngrok: `http://localhost:4040`

---

**After these steps, payments will work correctly!** 🎉





