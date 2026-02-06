# SMTP Connection Troubleshooting Guide

## Understanding the "Greeting never received" Error

### What It Means
The "Greeting never received" error occurs when:
1. The SMTP server doesn't send its initial greeting (usually "220 service ready")
2. The connection is established but no response is received
3. There's a timeout before the server responds

### Common Causes

#### 1. **Network/Firewall Issues** (Most Common)
- Firewall blocking outbound SMTP connections
- Corporate network restrictions
- Cloud provider security groups blocking ports
- Docker network configuration issues

**Solution:**
```bash
# Test port connectivity from your server
telnet smtp.gmail.com 587
# or
nc -zv smtp.gmail.com 587
```

#### 2. **Wrong Port or Protocol Configuration**
- Using SSL port with non-SSL connection
- Using non-SSL port with SSL enabled
- Port is blocked by ISP or cloud provider

**Solution:**
- Port 587: Use with `secure: false` and `requireTLS: true`
- Port 465: Use with `secure: true`
- Port 25: Usually blocked, avoid if possible

#### 3. **SMTP Server Unavailable**
- The SMTP server might be down
- Scheduled maintenance
- Rate limiting or IP banning

**Solution:**
- Test with a different SMTP provider
- Use Ethereal.email for testing
- Check SMTP provider status page

#### 4. **Docker/Container Network Issues**
- Container cannot reach external SMTP servers
- DNS resolution problems
- Network mode restrictions

**Solution:**
```bash
# From inside the container
docker exec -it event_i_server_prod nslookup smtp.gmail.com
docker exec -it event_i_server_prod telnet smtp.gmail.com 587
```

#### 5. **Authentication Issues**
- Incorrect credentials
- 2FA enabled without app-specific password (Gmail)
- Account locked or suspended

**Solution:**
- Verify credentials are correct
- For Gmail, generate an App Password
- Check SMTP account status

## Quick Diagnostic Steps

### Step 1: Test Basic Connectivity
```bash
# From your production server
nc -zv <SMTP_HOST> <SMTP_PORT>

# Example
nc -zv smtp.gmail.com 587
```

Expected output:
```
Connection to smtp.gmail.com port 587 [tcp/submission] succeeded!
```

### Step 2: Test SMTP Greeting
```bash
telnet <SMTP_HOST> <SMTP_PORT>

# Type after connection
EHLO test
QUIT
```

Expected response should start with:
```
220 ... ESMTP ...
250-...
250-...
...
```

### Step 3: Run Diagnostic Script
```bash
# Inside your container
docker exec -it event_i_server_prod node scripts/test-email-debug.js
```

### Step 4: Check Environment Variables
```bash
# Verify environment variables are set correctly
docker exec -it event_i_server_prod printenv | grep SMTP
```

## Recommended SMTP Configurations

### 1. Gmail
```javascript
{
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'  // NOT your Gmail password
  },
  requireTLS: true
}
```

**Note:** You need to:
1. Enable 2FA on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password in SMTP_PASS

### 2. Brevo (Sendinblue)
```javascript
{
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@example.com',
    pass: 'your-smtp-key'
  }
}
```

### 3. Ethereal Email (Testing Only)
```javascript
{
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
}
```

### 4. AWS SES
```javascript
{
  host: 'email-smtp.us-east-1.amazonaws.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-access-key',
    pass: 'your-secret-key'
  }
}
```

## Production Troubleshooting for Event-i

### Current Error
Emergency: SMTP test fails with "Greeting never received"

### Immediate Actions

1. **Check if running in Docker:**
```bash
# Check container network
docker network inspect MVPEVENT_i_default
```

2. **Verify SMTP credentials in production:**
```bash
# From the deployment
cd /root/MVPEVENT_i
grep SMTP .env
```

3. **Test from inside the container:**
```bash
docker exec -it event_i_server_prod bash
# Then run diagnostics
node scripts/test-email-debug.js
```

4. **Check firewall rules on VM:**
```bash
# Ubuntu/Debian
sudo ufw status
sudo ufw allow out 587/tcp
```

5. **Try alternative SMTP configuration:**
```bash
# Edit .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-password-here

# Restart containers
docker compose down
docker compose up -d
```

## Network-Specific Solutions

### Docker Network
If SMTP fails from within Docker:
```bash
# Use host network mode (not recommended for production)
docker run --network host ...
```

Or configure Docker to allow external SMTP:
```yaml
# In docker-compose.yml
services:
  server:
    network_mode: "bridge"  # or "host"
```

### Cloud Provider (GCP/AWS/Azure)
Ensure security groups/firewall rules allow outbound SMTP:
- Port 587 (SMTP submission)
- Port 465 (SMTP SSL)
- Port 25 (usually blocked)

### Corporate Network
If behind a corporate firewall:
1. Use SMTP relay instead of direct SMTP
2. Configure SMTP proxy
3. Contact IT for outbound SMTP access

## Testing Commands

### Full Connection Test
```bash
node scripts/test-email-debug.js
```

### Quick Test
```bash
node scripts/test-email.js
```

### Manual SMTP Test
```bash
openssl s_client -connect smtp.gmail.com:587 -starttls smtp
```

## Common Fixes

### Fix 1: Add Connection Options
```javascript
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,  // 10 seconds
  greetingTimeout: 10000,     // 10 seconds
  socketTimeout: 10000,       // 10 seconds
  requireTLS: true,
  tls: {
    rejectUnauthorized: false  // For self-signed certs
  }
});
```

### Fix 623: Use Different Network Mode
```yaml
# docker-compose.prod.yml
services:
  server:
    network_mode: "host"
```

### Fix 3: Configure DNS
```bash
# Add to /etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}

# Restart Docker
sudo systemctl restart docker
```

## Prevention

1. **Always test SMTP in staging before production**
2. **Use a reliable SMTP provider** (Gmail, Brevo, AWS SES)
3. **Monitor email delivery rates**
4. **Set up email alerts for failed deliveries**
5. **Keep SMTP credentials secure** and rotate regularly

## Need More Help?

1. Run the diagnostic script: `node scripts/test-email-debug.js`
2. Check provider documentation
3. Test with Ethereal.email first
4. Verify network connectivity
5. Review logs: `docker logs event_i_server_prod`

