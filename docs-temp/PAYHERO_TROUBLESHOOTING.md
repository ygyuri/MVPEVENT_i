# PayHero Payment Troubleshooting Guide 🔧

## 🚨 Your Current Issue

**Symptoms**:
- ✅ STK push received on phone
- ✅ Entered PIN and confirmed payment
- ❌ Payment not reflected in PayHero balance
- ❌ Amount not deducted from M-PESA
- ⚠️ Changed channel ID from 3424 to 3767

**Most Likely Causes**:
1. **Wrong Channel ID** - Using test/inactive channel
2. **Callback URL not accessible** - PayHero can't send confirmation
3. **Test Mode** - PayHero in test/sandbox mode
4. **Channel Configuration** - New channel not properly set up

---

## ✅ FIXED: Channel ID Update

**What was changed**:
- **Old Channel ID**: 3424
- **New Channel ID**: 3767 ✅
- **File Updated**: `.env`
- **Server Status**: Restarted and healthy

**Verify the update**:
```bash
# Check .env file
cat .env | grep PAYHERO_CHANNEL_ID
# Should show: PAYHERO_CHANNEL_ID=3767

# Check server is using it (after next payment attempt)
docker logs event_i_server | grep "channel_id" | tail -5
```

---

## 🔍 Root Cause Analysis

### Issue 1: Callback URL is Localhost
```bash
# Current callback URL in .env:
callback_url: 'http://localhost:5000/api/payhero/callback'
```

**Problem**: PayHero CANNOT reach `localhost` from their servers!
- `localhost` only works on your computer
- PayHero needs a **public URL** to send payment confirmations

**Solutions**:
1. **Use ngrok** (for testing)
2. **Deploy to production** (for live)
3. **Use PayHero's test environment** (for development)

---

## 🛠️ Fix 1: Use Ngrok for Testing

### Step 1: Install Ngrok
```bash
# macOS
brew install ngrok

# Or download from: https://ngrok.com/download
```

### Step 2: Start Ngrok
```bash
# Expose your local server
ngrok http 5000
```

**You'll get a URL like**:
```
https://abc123.ngrok.io → http://localhost:5000
```

### Step 3: Update Callback URL
```bash
# Update .env with ngrok URL
# Replace PAYHERO_CALLBACK_URL with your ngrok URL
sed -i.bak 's|PAYHERO_CALLBACK_URL=.*|PAYHERO_CALLBACK_URL=https://YOUR_NGROK_URL.ngrok.io/api/payhero/callback|' .env

# Restart server
docker restart event_i_server
```

### Step 4: Test Payment
Now when you make a payment:
1. STK push sent ✅
2. You enter PIN ✅
3. PayHero processes payment ✅
4. **PayHero sends callback to ngrok URL** ✅
5. Ngrok forwards to localhost:5000 ✅
6. Your server receives callback ✅
7. QR codes generated ✅
8. Emails sent ✅

---

## 🔍 Diagnostic Checklist

### Check 1: PayHero Channel Status
```bash
# Check channel ID configuration
curl -X GET "https://backend.payhero.co.ke/api/v2/payment_channels/3767" \
  -H "Authorization: Basic UHFJS1FRaDg3bDA4WWVrbEIwbE46WDRBSDFLRGY0ODI2Q3VoNW9FQ1QybFd0bzJ6WTVVZElNekVyYlNpMA==" \
  | jq '.'
```

**What to check**:
- `status`: Should be "active"
- `id`: Should be 3767
- `provider`: Should be "m-pesa"
- `account_id`: Should match your account

### Check 2: Recent Payments
```bash
# Check recent payment attempts
docker logs event_i_server | grep "PAYHERO Payment" -A 10 | tail -30
```

**Look for**:
- `channel_id: 3767` (correct channel)
- `status: 'QUEUED'` (payment initiated)
- `CheckoutRequestID` (STK push ID)

### Check 3: Webhook Callbacks
```bash
# Check if any callbacks received
docker logs event_i_server | grep "PAYHERO Callback" -A 20 | tail -50
```

**If NO callbacks**:
- ❌ PayHero cannot reach your callback URL
- 🔧 You MUST use ngrok or public URL

**If callbacks exist**:
- Check `ResultCode`:
  - `0` = Success
  - `1` = Cancelled/Failed

### Check 4: Database Order Status
```bash
# Check your recent order
docker exec -it event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --eval "
db.orders.find({}, {
  orderNumber: 1,
  status: 1,
  paymentStatus: 1,
  'payment.paymentReference': 1,
  'payment.checkoutRequestId': 1,
  createdAt: 1
}).sort({ createdAt: -1 }).limit(3).pretty()
"
```

**Check**:
- `paymentStatus`: 
  - `pending` = Not initiated
  - `processing` = STK sent, waiting
  - `paid` = ✅ Payment confirmed
  - `failed` = ❌ Payment failed

---

## 🚨 Why Payment May Not Complete

### Scenario 1: Callback URL Unreachable (Most Likely)
**Symptoms**:
- STK push received ✅
- PIN entered ✅
- No callback in logs ❌
- Order stuck in "processing" ❌

**Solution**: Use ngrok (see above)

### Scenario 2: Test/Sandbox Mode
**Symptoms**:
- Payment works but no real money moved
- No M-PESA confirmation SMS
- PayHero shows test transaction

**Solution**: Confirm with PayHero if account is in production mode

### Scenario 3: Wrong Channel ID
**Symptoms**:
- Payment initiated but never completes
- No error messages
- Channel may be inactive

**Solution**: ✅ Already fixed (changed to 3767)

### Scenario 4: M-PESA Number Not Registered
**Symptoms**:
- STK push fails
- "Invalid phone number" error

**Solution**: Use registered M-PESA number (07XX XXX XXX or 01XX XXX XXX)

---

## 📊 Payment Flow Breakdown

### What SHOULD Happen:
```
1. User submits checkout
   ↓
2. Server calls PayHero API
   - channel_id: 3767 ✅
   - phone: 254XXXXXXXXX
   - amount: XX
   - callback_url: YOUR_PUBLIC_URL ← CRITICAL!
   ↓
3. PayHero sends STK push to phone
   ↓
4. User enters PIN
   ↓
5. M-PESA processes payment
   ↓
6. PayHero sends callback to YOUR_PUBLIC_URL
   - ResultCode: 0 (success) or 1 (failed)
   - MpesaReceiptNumber: ABC123
   ↓
7. Your server receives callback
   ↓
8. Generate QR codes
   ↓
9. Send emails
   ↓
10. Update order status to "paid"
```

### What's CURRENTLY Happening:
```
1-4: ✅ Working
5: ✅ M-PESA receives request
6: ❌ FAILS - PayHero tries to send to localhost
   - Cannot reach http://localhost:5000
   - Callback never arrives
7-10: ❌ Never executes
```

---

## 🔧 Quick Fixes

### Fix 1: Use Ngrok (Recommended for Testing)
```bash
# Terminal 1: Start ngrok
ngrok http 5000

# Terminal 2: Update and restart
NGROK_URL="https://YOUR_NGROK_ID.ngrok.io"
sed -i '' "s|PAYHERO_CALLBACK_URL=.*|PAYHERO_CALLBACK_URL=${NGROK_URL}/api/payhero/callback|" .env
docker restart event_i_server

# Test payment again
```

### Fix 2: Check PayHero Dashboard
1. Login to: https://dashboard.payhero.co.ke
2. Go to Payment Channels
3. Find channel **3767**
4. Verify:
   - Status: Active
   - Provider: M-PESA
   - Callback URL: Should be your ngrok URL

### Fix 3: Verify Channel with API
```bash
# Create diagnostic script
cat > check-payhero.sh << 'EOF'
#!/bin/bash

echo "🔍 PayHero Configuration Check"
echo "================================"

AUTH="Basic UHFJS1FRaDg3bDA4WWVrbEIwbE46WDRBSDFLRGY0ODI2Q3VoNW9FQ1QybFd0bzJ6WTVVZElNekVyYlNpMA=="
BASE_URL="https://backend.payhero.co.ke/api/v2"
CHANNEL_ID="3767"

echo ""
echo "📱 Checking Channel $CHANNEL_ID..."
curl -s -X GET "$BASE_URL/payment_channels/$CHANNEL_ID" \
  -H "Authorization: $AUTH" | jq '.'

echo ""
echo "💰 Checking Wallet Balance..."
curl -s -X GET "$BASE_URL/wallets" \
  -H "Authorization: $AUTH" | jq '.data[] | {id, account_name, balance, currency}'

EOF

chmod +x check-payhero.sh
./check-payhero.sh
```

---

## 📝 Testing with Ngrok

### Complete Test Flow:

#### Step 1: Start Ngrok
```bash
ngrok http 5000
# Copy the https URL (e.g., https://abc123.ngrok.io)
```

#### Step 2: Update .env
```bash
# Replace with your actual ngrok URL
NGROK_URL="https://abc123.ngrok.io"

# Update callback URL
cat > /tmp/update-callback.sh << EOF
#!/bin/bash
sed -i.bak "s|PAYHERO_CALLBACK_URL=.*|PAYHERO_CALLBACK_URL=${NGROK_URL}/api/payhero/callback|" .env
echo "✅ Updated callback URL to: ${NGROK_URL}/api/payhero/callback"
EOF

chmod +x /tmp/update-callback.sh
/tmp/update-callback.sh
```

#### Step 3: Restart Server
```bash
docker restart event_i_server
sleep 5
docker logs event_i_server --tail 20
```

#### Step 4: Monitor Webhooks
```bash
# Terminal 1: Watch server logs
docker logs -f event_i_server | grep -E "(PAYHERO|callback|Payment)"

# Terminal 2: Watch ngrok traffic
# Open: http://localhost:4040 (ngrok web interface)
```

#### Step 5: Test Payment
1. Go to checkout: http://localhost:3000/events/test-this-end-to-end/checkout
2. Fill form and submit
3. Enter PIN when STK appears
4. Watch Terminal 1 for callback
5. Check ngrok dashboard (http://localhost:4040) for incoming requests

---

## ✅ Success Indicators

After fixing callback URL, you should see:

### In Server Logs:
```
PAYHERO Payment Request: { channel_id: 3767 } ✅
PAYHERO Payment Response: { status: 'QUEUED' } ✅
🔔 PAYHERO Callback received ✅
ResultCode: 0 ✅
Order ... status updated: { paymentStatus: 'completed' } ✅
QR code generated ✅
email sent ✅
```

### In M-PESA:
- Confirmation SMS received
- Amount deducted
- Transaction ref: ABC123XXX

### In PayHero Dashboard:
- Transaction appears
- Status: Completed
- Amount credited to your account

---

## 🆘 Still Not Working?

### Check These:

1. **Ngrok is running**:
   ```bash
   curl http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'
   ```

2. **Callback URL updated**:
   ```bash
   cat .env | grep PAYHERO_CALLBACK_URL
   ```

3. **Server restarted**:
   ```bash
   docker ps | grep event_i_server
   ```

4. **Firewall/Security**:
   - Ngrok not blocked
   - Port 5000 accessible
   - Docker network OK

5. **PayHero Account**:
   - Account active
   - Channel 3767 exists
   - Sufficient balance (if required)
   - Production mode enabled

---

## 📞 Contact PayHero Support

If still failing:

**Email**: support@payhero.co.ke

**Provide**:
- Account ID: 3140
- Channel ID: 3767
- Transaction Reference: (from logs)
- Error Description: "Webhook callbacks not being received"
- Request: Verify channel configuration and callback URL

---

## 🎯 Next Steps

1. **Immediate**: Set up ngrok and update callback URL
2. **Test**: Make a small payment (KES 10)
3. **Monitor**: Watch logs for callback
4. **Verify**: Check M-PESA SMS and PayHero dashboard
5. **Production**: Deploy to server with public domain

---

**Last Updated**: $(date)
**Channel ID**: 3767 ✅
**Status**: Callback URL needs fixing (localhost → public URL)





