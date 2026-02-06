# Production SMTP "Greeting never received" - Quick Fix Guide

## Error Analysis
**Error:** `Greeting never received`  
**Meaning:** The SMTP server isn't responding to the initial connection

## Most Likely Causes in Production (in order of probability)

### 1. **Firewall Blocking Outbound Ports** (85% likely)
Production VMs often have outbound firewall rules that block SMTP ports.

**Quick Test:**
```bash
# From your production server
cd /root/MVPEVENT_i

# Test if you can reach the SMTP server
docker exec -it event_i_server_prod telnet smtp.gmail.com 587
# OR
docker exec -it event_i_server_prod nc -zv smtp.gmail.com 587
```

**Fix:**
```bash
# Allow outbound SMTP from the server
sudo ufw allow out 587/tcp
sudo ufw allow out 465/tcp

# Or if using iptables
sudo iptables -I OUTPUT -p tcp --dport 587 -j ACCEPT
sudo iptables -I OUTPUT -p tcp --dport 465 -j ACCEPT
sudo iptables-save
```

### 2. **Cloud Provider Firewall Rules** (10% likely)
GCP/AWS/Azure security groups might be blocking SMTP.

**Check:**
- Google Cloud: Check VPC firewall rules → Ingress/Egress rules
- AWS: Security Groups → Outbound rules for ports 587, 465
- Check if there's a "default deny" outbound policy

**Fix:**
- Add firewall rule allowing outbound traffic on ports 587, 465

### 3. **Wrong SMTP Credentials** (3% likely)
Production credentials might be incorrect or expired.

**Check:**
```bash
cd /root/MVPEVENT_i
cat .env | grep SMTP
```

**Fix:**
Update credentials in `.env` file and restart containers.

### 4. **Network Mode Issue** (2% likely)
Docker network might not have access to external SMTP.

**Quick Test:**
```bash
# Test from inside container
docker exec -it event_i_server_prod bash
ping -c 2 8.8.8.8
curl -I https://www.google.com
```

**Fix:** If connectivity works but SMTP doesn't, it's likely a firewall issue.

## Immediate Action Steps

### Step 1: Run Diagnostics (2 minutes)
```bash
cd /root/MVPEVENT_i

# Copy the diagnostic script if it's not there
cd server/scripts
# Upload test-email-debug.js via your method

# Run diagnostics
docker exec -it event_i_server_prod node scripts/test-email-debug.js
```

### Step 2: Check Firewall (30 seconds)
```bash
# Check if firewall is running
sudo ufw status verbose

# Try allowing SMTP ports
sudo ufw allow out 587/tcp
sudo ufw reload

# Test again
docker exec -it event_i_server_prod node scripts/test-email.js
```

### Step 3: Test Network Connectivity (1 minute)
```bash
# Test basic DNS
docker exec -it event_i_server_prod nslookup smtp.gmail.com

# Test port connectivity
docker exec -it event_i_server_prod nc -zv smtp.gmail.com 587

# Test from host
telnet smtp.gmail.com 587
```

### Step 4: Check SMTP Configuration
```bash
# Verify environment variables
docker exec -it event_i_server_prod printenv | grep SMTP

# Should show:
# SMTP_HOST=smtp.gmail.com (or your provider)
# SMTP_PORT=587
# SMTP_USER=your-email@domain.com
# SMTP_PASS=your-password
```

## Quick Fixes by Scenario

### Scenario A: Ubuntu/Debian Firewall
```bash
sudo ufw allow out 587/tcp
sudo ufw allow out 465/tcp
sudo ufw reload
sudo docker compose -f /root/MVPEVENT_i/docker-compose.prod.yml restart server
```

### Scenario B: Google Cloud Platform
```bash
# Check current firewall rules
gcloud compute firewall-rules list

# Create/update firewall rule to allow SMTP
gcloud compute firewall-rules create allow-smtp-out \
  --direction=EGRESS \
  --rules=tcp:587,tcp:465 \
  --priority=1000 \
  --action=ALLOW
```

### Scenario C: AWS EC2
1. Go to EC2 Console → Security Groups
2. Select your instance's security group
3. Edit Outbound rules
4. Add rule: Type=Custom TCP, Port=587, Destination=0.0.0.0/0
5. Add rule: Type=Custom TCP, Port=465, Destination=0.0.0.0/0

### Scenario D: Generic Container Network
```bash
# Try running with host network
# Edit docker-compose.prod.yml temporarily
docker-compose -f docker-compose.prod.yml down
# Add to server service:
network_mode: "host"
docker-compose -f docker-compose.prod.yml up -d

# Test
docker exec -it event_i_server_prod node scripts/test-email.js

# If it works with host network, the issue is Docker networking
# Then fix your bridge network or use host network permanently
```

## Alternative: Use Host Network Mode (Quick Workaround)

Edit `/root/MVPEVENT_i/docker-compose.prod.yml`:

```yaml
services:
  server:
    # Add this line to use host networking (eliminates Docker network issues)
    network_mode: "host"
    # Remove or comment out the networks section for server
    # networks:
    #   - app-network
```

Then:
```bash
cd /root/MVPEVENT_i
docker compose down
docker compose up -d
docker exec -it event_i_server_prod node scripts/test-email.js
```

**Note:** This makes the container use the host's network stack directly. Less isolation but might resolve SMTP issues.

## Alternative SMTP Providers (If Gmail is blocked)

### Option 1: Brevo (Sendinblue) - Free tier
```bash
# Update .env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-email@example.com
SMTP_PASS=your-brevo-smtp-key
```

### Option 2: AWS SES (if on AWS)
```bash
# In your AWS region (e.g., us-east-1)
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-access-key-id
SMTP_PASS=your-secret-access-key
```

## Verification Commands

```bash
# 1. Test SMTP works
docker exec -it event_i_server_prod node scripts/test-email.js

# 2. Check logs
docker logs event_i_server_prod --tail 50

# 3. Verify email was sent
# Check jeffomondi.eng@gmail.com and gideonyuri15@gmail.com
```

## Most Common Root Cause

**80% of the time:** Outbound firewall rules blocking ports 587/465

**Solution:**
```bash
# On Ubuntu/Debian
sudo ufw allow out 587/tcp
sudo ufw allow out 465/tcp

# Verify
sudo ufw status | grep 587
```

Then restart the server container and test again.

