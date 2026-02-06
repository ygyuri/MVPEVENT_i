# Fix SMTP Port Mismatch

## The Problem

The diagnostic test successfully sends emails using port 587, but the basic test fails because `SMTP_PORT` in your GitHub Secrets is set to a different port.

## The Solution

### Step 1: Go to GitHub Repository Settings

1. Open your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**

### Step 2: Update SMTP_PORT Secret

1. Find the `SMTP_PORT` secret
2. Click the **Edit** (pencil icon)
3. Change the value to: `587`
4. Click **Update secret**

### Step 3: Redeploy

1. Push any change to trigger deployment, or
2. Manually trigger the workflow from Actions tab

## Why This Happens

Your SMTP server (`mail.event-i.co.ke`) works on port 587 (Standard TLS), but the GitHub Secret was set to a different port (likely 465 or 25).

The diagnostic script tries multiple ports and finds that 587 works, but the basic test uses the port from the environment variable (GitHub Secret), which is the wrong port.

## Verification

After updating the secret and redeploying, you should see:

```
✅ Email configuration test passed
```

Instead of:

```
❌ SMTP Test Failed: Greeting never received
```

## Current Configuration

Based on your diagnostic output:

- **SMTP_HOST**: mail.event-i.co.ke
- **SMTP_PORT**: Should be `587` (currently set to something else)
- **SMTP_USER**: no-... (your email)
- **Working**: Port 587 with Standard TLS (secure: false)

## Quick Fix Command (if you have SSH access)

If you want to test locally on the server before updating the GitHub Secret:

```bash
# SSH into your production server
ssh your-server

# Edit the .env file
sudo nano /root/MVPEVENT_i/.env

# Change SMTP_PORT to 587
SMTP_PORT=587

# Restart the server container
cd /root/MVPEVENT_i
docker compose restart server

# Test
docker exec -it event_i_server_prod node scripts/test-email.js
```

But remember: The proper fix is to update the GitHub Secret so future deployments use the correct port.
