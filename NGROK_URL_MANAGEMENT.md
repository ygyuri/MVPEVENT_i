# 🌐 Ngrok URL Management - Critical Issue Explained

## ❓ **Why Did the Ngrok URL Change?**

### **The Problem:**

**Free ngrok URLs are TEMPORARY and RANDOM!**

```
Session 1: https://125fb8a73e04.ngrok-free.app  ← Started earlier
Session 2: https://9d279fade132.ngrok-free.app  ← Restarted later
Session 3: https://abc123def456.ngrok-free.app  ← Next restart
```

**What Happened:**
1. You started ngrok earlier → Got URL ending in `125fb8a73e04`
2. At some point, ngrok crashed or was restarted
3. When ngrok restarts, it generates a **NEW random URL**
4. The old URL (`125fb8a73e04`) is now **DEAD**
5. PayHero is still sending webhooks to the **OLD URL**
6. That's why webhooks weren't arriving!

---

## 🚨 **Why This Is a CRITICAL Problem**

### **Impact on Your Payment Flow:**

```
1. You update PayHero dashboard with ngrok URL
2. Ngrok restarts (computer sleeps, network change, etc.)
3. Ngrok gets NEW random URL
4. PayHero still uses OLD URL
5. Webhooks fail → Payments stuck → Customer complaints
```

**Symptoms:**
- ✅ Payments go through on M-PESA
- ✅ Money deducted
- ❌ Webhooks don't arrive
- ❌ Orders stuck in "processing"
- ❌ No emails sent
- ❌ No QR codes generated
- ❌ Customers angry!

---

## 🎯 **Solutions (3 Options)**

### **Option 1: Ngrok Paid Plan** 💰 **BEST for Production**

**Cost:** $8-10/month

**Features:**
```
✅ Fixed subdomain (never changes!)
   Example: https://yourapp.ngrok.io

✅ Survives restarts
✅ Custom domains
✅ Better performance
✅ More concurrent connections
```

**Setup:**
```bash
# 1. Sign up for paid plan at ngrok.com
# 2. Reserve subdomain: "eventi-payments"
# 3. Start ngrok with subdomain:

ngrok http 5000 --subdomain=eventi-payments

# Result: https://eventi-payments.ngrok.io
# This URL NEVER changes! ✅
```

**Update PayHero Once:**
```
Callback: https://eventi-payments.ngrok.io/api/payhero/callback
           ↑ This URL is PERMANENT!
```

**Benefits:**
- ✅ **Set and forget** - update PayHero once
- ✅ **Survives restarts** - URL never changes
- ✅ **Production-ready** - reliable
- ✅ **No manual updates** needed

**Recommendation:** 🌟 **USE THIS FOR PRODUCTION!**

---

### **Option 2: Use Your Own Domain** 🌐 **BEST Overall**

**If you have a domain (e.g., event-i.com):**

**Setup:**
```bash
# 1. Point subdomain to your server
DNS: api.event-i.com → Your server IP

# 2. Use reverse proxy (nginx)
server {
    listen 80;
    server_name api.event-i.com;
    
    location /api/payhero/callback {
        proxy_pass http://localhost:5000/api/payhero/callback;
    }
}

# 3. Add SSL certificate (Let's Encrypt)
certbot --nginx -d api.event-i.com
```

**Update PayHero:**
```
Callback: https://api.event-i.com/api/payhero/callback
           ↑ This is YOUR domain - permanent!
```

**Benefits:**
- ✅ **Completely free** (no ngrok cost)
- ✅ **Your own domain** (professional)
- ✅ **Permanent URL** - never changes
- ✅ **SSL included** - secure
- ✅ **Full control** - no third party

**Recommendation:** 🌟 **USE THIS FOR PRODUCTION!**

---

### **Option 3: Auto-Update PayHero** 🔧 **For Development**

**Keep free ngrok but auto-update PayHero:**

**Problem:** Free ngrok URL changes on restart

**Solution:** Automatically update PayHero callback via API

**Create:** `server/scripts/update-payhero-callback.js`

```javascript
const payheroService = require('../services/payheroService');

async function updatePayHeroCallback() {
  try {
    const callbackUrl = process.env.PAYHERO_CALLBACK_URL;
    
    if (!callbackUrl || callbackUrl.includes('localhost')) {
      console.error('❌ Invalid callback URL:', callbackUrl);
      process.exit(1);
    }

    console.log('🔄 Updating PayHero callback URL to:', callbackUrl);

    // Update via PayHero API (if they support it)
    // Note: Check PayHero API docs for webhook update endpoint
    
    // Example:
    const response = await payheroService.updateWebhookUrl(callbackUrl);
    
    console.log('✅ PayHero callback URL updated successfully');
    console.log('New URL:', callbackUrl);
    
  } catch (error) {
    console.error('❌ Failed to update PayHero callback:', error.message);
    console.log('\n⚠️  Manual update required!');
    console.log('Go to: https://payhero.co.ke/dashboard');
    console.log('Update callback to:', process.env.PAYHERO_CALLBACK_URL);
  }
}

updatePayHeroCallback();
```

**Add to startup:**
```javascript
// server/index.js
if (process.env.AUTO_UPDATE_PAYHERO_CALLBACK === 'true') {
  require('./scripts/update-payhero-callback');
}
```

**Limitations:**
- ⚠️ Requires PayHero API support (may not exist)
- ⚠️ Still manual if API doesn't support it
- ⚠️ Not recommended for production

---

## 🎯 **My Recommendation for You**

### **For Development (Now):**

**Use ngrok authtoken to preserve URLs longer:**

```bash
# 1. Get your authtoken from ngrok.com (free account)
ngrok config add-authtoken YOUR_AUTH_TOKEN

# 2. Start ngrok
ngrok http 5000

# Benefits:
# ✅ URL persists across restarts for 24 hours
# ✅ Better than random URLs
# ⚠️ Still changes eventually
```

---

### **For Production:**

**Option A: Paid Ngrok** ($10/month)
```bash
ngrok http 5000 --subdomain=eventi-payments

# Permanent URL: https://eventi-payments.ngrok.io
# Set PayHero callback once, never update again
```

**Option B: Your Own Domain** (Free!)
```
1. Get cheap domain ($10/year) - e.g., event-i.com
2. Point DNS to your server
3. Use reverse proxy (nginx)
4. Add free SSL (Let's Encrypt)

Callback: https://api.event-i.com/api/payhero/callback
          ↑ This is YOURS - permanent and professional!
```

**I recommend Option B** - more professional, cheaper long-term, full control.

---

## 🔧 **Temporary Fix (For Testing Now)**

### **Every Time Ngrok Restarts:**

**1. Get new ngrok URL:**
```bash
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.proto == "https") | .public_url'
```

**2. Update docker-compose.yml:**
```yaml
PAYHERO_CALLBACK_URL: https://NEW_NGROK_URL/api/payhero/callback
```

**3. Restart server:**
```bash
docker compose restart server
```

**4. Update PayHero dashboard:**
```
Go to: PayHero Dashboard → Settings → Webhooks
Update callback to new ngrok URL
Save
```

**This is manual and tedious** - hence why paid ngrok or own domain is better!

---

## 🛠️ **Automated Solution for Dev Environment**

**Create:** `sync-ngrok-url.sh`

```bash
#!/bin/bash

# Get current ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.proto == "https") | .public_url')

if [ -z "$NGROK_URL" ]; then
    echo "❌ Ngrok not running!"
    exit 1
fi

CALLBACK_URL="${NGROK_URL}/api/payhero/callback"

echo "📡 Current Ngrok URL: $NGROK_URL"
echo "🔗 Callback URL: $CALLBACK_URL"

# Update docker-compose.yml
sed -i.bak "s|PAYHERO_CALLBACK_URL:.*|PAYHERO_CALLBACK_URL: $CALLBACK_URL|" docker-compose.yml

echo "✅ Updated docker-compose.yml"

# Restart server
echo "🔄 Restarting server..."
docker compose restart server

echo ""
echo "✅ Server restarted with new callback URL!"
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "   Update PayHero dashboard with:"
echo "   $CALLBACK_URL"
```

**Usage:**
```bash
chmod +x sync-ngrok-url.sh
./sync-ngrok-url.sh
```

**This automates steps 1-3**, but you still need to update PayHero manually.

---

## 📊 **URL Change Impact Analysis**

### **When Ngrok URL Changes:**

**What Breaks:**
```
❌ PayHero webhooks (404 error)
❌ New payments get stuck
❌ Old payments still waiting
❌ Frontend polling times out
```

**What Still Works:**
```
✅ Server is running
✅ Database is working
✅ Order creation works
✅ STK push works
✅ Money gets deducted
   (but no confirmation arrives!)
```

**Detection:**
```bash
# Check if URLs match
NGROK=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.proto == "https") | .public_url')
SERVER=$(docker exec event_i_server printenv PAYHERO_CALLBACK_URL)

if [[ "$NGROK" != "${SERVER%/api/payhero/callback}" ]]; then
    echo "❌ URLs DON'T MATCH!"
    echo "Ngrok:  $NGROK"
    echo "Server: $SERVER"
fi
```

---

## 🎯 **Long-Term Solution Plan**

### **Phase 1: Development (Now)**
Use free ngrok with manual updates:
```bash
# Check URL before each test
./sync-ngrok-url.sh
# Then update PayHero dashboard manually
```

### **Phase 2: Staging**
Get paid ngrok subscription:
```bash
# $10/month for fixed subdomain
ngrok http 5000 --subdomain=eventi-staging
# URL: https://eventi-staging.ngrok.io (permanent!)
```

### **Phase 3: Production**
Deploy to cloud with your own domain:
```bash
# Deploy to AWS/DigitalOcean/Heroku
# Use your domain: https://api.event-i.com
# Set callback once, never change
```

---

## 🚀 **Immediate Action Required**

### **To Test Right Now:**

**1. Update PayHero Dashboard:**
```
Current ngrok URL: https://9d279fade132.ngrok-free.app
Update callback to: https://9d279fade132.ngrok-free.app/api/payhero/callback
```

**2. Keep ngrok Running:**
```bash
# Don't restart ngrok during testing!
# Check if running:
curl -s http://localhost:4040/status

# If stopped, restart and update everything:
ngrok http 5000 &
# Get new URL
# Update docker-compose.yml
# Restart server
# Update PayHero dashboard
```

**3. Monitor for Changes:**
```bash
# Add this to your terminal startup
alias check-ngrok='curl -s http://localhost:4040/api/tunnels | jq -r ".tunnels[] | select(.proto == \"https\") | .public_url"'

# Then just run:
check-ngrok
```

---

## 💡 **Best Practice Recommendation**

### **For Production, You Should:**

1. ✅ **Get a domain** ($10/year)
   - Example: event-i.com
   - Professional and permanent

2. ✅ **Deploy to cloud**
   - AWS, DigitalOcean, Heroku, etc.
   - Point domain to server

3. ✅ **Use HTTPS**
   - Free SSL with Let's Encrypt
   - Required by PayHero

4. ✅ **Set callback URL once**
   - https://api.event-i.com/api/payhero/callback
   - Never changes again!

### **For Development (Now):**

**Quick Fix:**
```bash
# Create a startup script that checks and warns
#!/bin/bash
# check-ngrok-sync.sh

NGROK=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.proto == "https") | .public_url')
SERVER=$(docker exec event_i_server printenv PAYHERO_CALLBACK_URL | sed 's|/api/payhero/callback||')

if [[ "$NGROK" != "$SERVER" ]]; then
    echo "⚠️  WARNING: Ngrok URL changed!"
    echo "Old: $SERVER"
    echo "New: $NGROK"
    echo ""
    echo "Run: ./sync-ngrok-url.sh"
    echo "Then update PayHero dashboard!"
fi
```

---

## 🎯 **Summary**

### **Why URL Changed:**
- ✅ Free ngrok gives **random URL** each session
- ✅ Ngrok restarted → new random URL assigned
- ✅ Old URL (`125fb8a73e04`) is now dead
- ✅ New URL (`9d279fade132`) is active now

### **How to Fix:**
1. **Immediate:** Update PayHero dashboard with current URL
2. **Short-term:** Create `sync-ngrok-url.sh` helper script
3. **Long-term:** Get paid ngrok ($10/mo) or own domain (free)

### **Current Status:**
```
Ngrok URL:      https://9d279fade132.ngrok-free.app
Server Config:  https://9d279fade132.ngrok-free.app/api/payhero/callback
PayHero:        ⚠️  Needs manual update!
```

**Update PayHero dashboard now, then test!** 🚀

