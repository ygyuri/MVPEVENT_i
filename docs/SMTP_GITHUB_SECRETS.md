# SMTP Configuration with GitHub Secrets

## Current Setup
SMTP credentials are stored in GitHub Secrets and injected during deployment via GitHub Actions workflow.

## GitHub Secrets Required

Add these secrets in your GitHub repository:

### Required Secrets
1. `SMTP_HOST` - Your SMTP server (e.g., `smtp.gmail.com`)
2. `SMTP_PORT` - SMTP port (usually `587` or `465`)
3. `SMTP_USER` - SMTP username/email
4. `SMTP_PASS` - SMTP password or app password
5. `EMAIL_FROM` - From email address

### How to Add GitHub Secrets
1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each SMTP secret

## Common SMTP Providers

### Gmail
```
SMTP_HOST: smtp.gmail.com
SMTP_PORT: 587
SMTP_USER: your-email@gmail.com
SMTP_PASS: [Generate App Password from https://myaccount.google.com/apppasswords]
EMAIL_FROM: your-email@gmail.com
```

**Important for Gmail:**
- Enable 2-Factor Authentication first
- Generate an App Password (not your regular password)
- App passwords are 16 characters without spaces

### Brevo (formerly Sendinblue)
```
SMTP_HOST: smtp-relay.brevo.com
SMTP_PORT: 587
SMTP_USER: your-email@example.com
SMTP_PASS: [SMTP Key from Brevo dashboard]
EMAIL_FROM: your-email@example.com
```

### AWS SES
```
SMTP_HOST: email-smtp.us-east-1.amazonaws.com  [Your region]
SMTP_PORT: 587
SMTP_USER: [AWS Access Key ID]
SMTP_PASS: [AWS Secret Access Key]
EMAIL_FROM: verified-email@example.com
```

## Troubleshooting "Greeting never received" Error

Since credentials come from GitHub Secrets (so they're likely correct), the error usually means:

### 1. Firewall Issue (Most Common)
The deployment workflow now automatically tries to fix this by adding firewall rules during deployment:

```bash
# The workflow now runs:
sudo ufw allow out 587/tcp
sudo ufw allow out 465/t队
```

### 2. Cloud Provider Firewall
If on GCP/AWS/Azure, check cloud-level firewall rules:

**Google Cloud Platform:**
```bash
# Check VPC firewall rules
gcloud compute firewall-rules list --filter="direction=EGRESS"

# Create egress rule for SMTP if missing
gcloud compute firewall-rules create allow-smtp-out \
  --direction=EGRESS \
  --rules=tcp:587,tcp:465 \
  --priority=1000 \
  --action=ALLOW
```

**AWS:**
- EC2 Console → Security Groups → Your instance's SG
- Edit Outbound Rules
- Add: Type=Custom TCP, Port=587, Destination=0.0.0.0/0

### 3. Network Connectivity
The deployment workflow now tests connectivity before testing email:

```bash
# Automatically tests:
nc -zv ${SMTP_HOST} ${SMTP_PORT}
```

## Testing Locally Before Deployment

If you want to test SMTP credentials locally:

1. Create a local `.env` file (don't commit it):
```bash
cp .env.example .env
```

2. Add the same values as your GitHub Secrets

3. Test:
```bash
cd server
node scripts/test-email-debug.js
```

## Deployment Flow

During deployment, the workflow:

1. ✅ Injects SMTP secrets into `.env` file
2. ✅ Tries to fix firewall rules (UFW/iptables)
3. ✅ Tests network connectivity to SMTP server
4. ✅ Runs diagnostic script
5. ✅ Tests SMTP connection
6. ⚠️ Shows detailed error if it fails

## Quick Fix After Deployment

If SMTP still fails after deployment:

### Step 1: SSH into your server
```bash
ssh your-server
cd /root/MVPEVENT_i
```

### Step  FAST 2: Check firewall
```bash
sudo ufw status | grep 587
```

If nothing shows, add the rules:
```bash
sudo ufw allow out 587/tcp
sudo ufw allow out 465/tcp
sudo ufw reload
```

### Step 3: Test from container
```bash
sudo docker exec -it event_i_server_prod bash

# Inside container
node scripts/test-email-debug.js
```

### Step 4: Check credentials are loaded
```bash
# From inside container
printenv | grep SMTP

# Should show (with your actual values):
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=*****
```

## Verifying GitHub Secrets

To verify your GitHub Secrets are set correctly:

1. Go to repository Settings → Secrets and variables → Actions
2. Verify all SMTP secrets exist
3. Note: You can't view secret values (security), only verify they exist

## Testing Updated Workflow

The deployment workflow has been updated to:

1. ✅ Automatically fix firewall issues
2. ✅ Test connectivity before SMTP test
3. ✅ Run comprehensive diagnostics
4. ✅ Provide better error messages

Just push your code and the next deployment will automatically try to fix SMTP issues.

