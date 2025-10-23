# GitHub Secrets Setup Guide

This document outlines all the secrets that need to be configured in your GitHub repository settings for secure deployment.

## How to Add Secrets

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret with the exact name and value as specified below

## Required Secrets

### VM Deployment Secrets (Already Configured)
- `VM_HOST` - Your VM hostname/IP address
- `VM_USER` - SSH username for VM access
- `VM_SSH_KEY` - Private SSH key for VM access

### Application Configuration
- `NODE_ENV` - Set to `production`
- `SERVER_PORT` - Set to `5001`
- `FRONTEND_URL` - Your production frontend URL (e.g., `https://event-i.co.ke`)
- `BASE_URL` - Your production base URL (e.g., `https://event-i.co.ke`)

### GKE Configuration
- `KUBERNETES_NAMESPACE` - Set to `event-i`
- `GKE_CLUSTER_NAME` - Set to `event-i-cluster`
- `GKE_ZONE` - Set to `us-central1-a`
- `PROJECT_ID` - Your GCP project ID

### Nginx Configuration
- `NGINX_HTTP_PORT` - Set to `80`
- `NGINX_HTTPS_PORT` - Set to `443`

### Database Configuration
- `MONGO_ROOT_USERNAME` - MongoDB root username (e.g., `admin`)
- `MONGO_ROOT_PASSWORD` - **SECURE** MongoDB root password
- `MONGODB_URI` - Complete MongoDB connection string

### Redis Configuration
- `REDIS_URL` - Complete Redis connection string

### JWT Configuration (Generate Strong Secrets)
- `JWT_SECRET` - **SECURE** JWT signing secret (use `openssl rand -base64 32`)
- `JWT_REFRESH_SECRET` - **SECURE** JWT refresh secret (use `openssl rand -base64 32`)
- `JWT_EXPIRES_IN` - Set to `1h`
- `JWT_REFRESH_EXPIRES_IN` - Set to `7d`

### PayHero Payment Configuration
- `PAYHERO_API_USERNAME` - Your PayHero API username
- `PAYHERO_API_PASSWORD` - Your PayHero API password
- `PAYHERO_ACCOUNT_ID` - Your PayHero account ID
- `PAYHERO_BASIC_AUTH_TOKEN` - Your PayHero basic auth token
- `PAYHERO_CHANNEL_ID` - Your PayHero channel ID
- `PAYHERO_CALLBACK_URL` - PayHero callback URL
- `PAYHERO_SUCCESS_URL` - PayHero success redirect URL
- `PAYHERO_FAILED_URL` - PayHero failure redirect URL

### MPESA Configuration
- `MPESA_BASE_URL` - Set to `https://api.safaricom.co.ke`
- `MPESA_CONSUMER_KEY` - Your MPESA consumer key
- `MPESA_CONSUMER_SECRET` - Your MPESA consumer secret
- `MPESA_PASSKEY` - Your MPESA passkey
- `MPESA_SHORTCODE` - Your MPESA shortcode
- `MPESA_CALLBACK_URL` - MPESA callback URL
- `MPESA_TIMEOUT_URL` - MPESA timeout URL

### Email Configuration
- `SMTP_HOST` - Your SMTP host (e.g., `smtp-relay.brevo.com`)
- `SMTP_PORT` - SMTP port (e.g., `587`)
- `SMTP_USER` - Your SMTP username
- `SMTP_PASS` - Your SMTP password/app password
- `EMAIL_FROM` - From email address

### Security Configuration (Generate Strong Secrets)
- `TICKET_QR_SECRET` - **SECURE** QR ticket secret (use `openssl rand -base64 32`)
- `TICKET_QR_ENC_KEY` - **SECURE** QR encryption key (use `openssl rand -base64 32`)
- `TICKET_QR_AUTO_ROTATE_MS` - Set to `60000`

### Rate Limiting
- `RATE_LIMIT_WINDOW_MS` - Set to `900000`
- `RATE_LIMIT_MAX_REQUESTS` - Set to `100`

### Debug Configuration
- `DEBUG` - Set to `false`
- `LOG_LEVEL` - Set to `error`

### Monitoring and Logging (Optional)
- `SENTRY_DSN` - Your Sentry DSN for error tracking
- `LOG_TO_FILE` - Set to `true`
- `LOG_FILE_PATH` - Set to `/var/log/event-i/app.log`

## Security Notes

⚠️ **IMPORTANT SECURITY CONSIDERATIONS:**

1. **Generate New Secrets**: After migrating from `.env.production`, generate new secrets for:
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `MONGO_ROOT_PASSWORD`
   - `TICKET_QR_SECRET`
   - `TICKET_QR_ENC_KEY`

2. **Use Strong Passwords**: All passwords should be at least 32 characters long and randomly generated.

3. **Rotate Exposed Credentials**: If `.env.production` was previously committed to git, rotate ALL credentials immediately.

4. **Access Control**: Only repository administrators should have access to secrets.

## Generating Secure Secrets

Use these commands to generate secure secrets:

```bash
# Generate JWT secrets
openssl rand -base64 32

# Generate MongoDB password
openssl rand -base64 32

# Generate QR secrets
openssl rand -base64 32
```

## Verification

After adding all secrets, the GitHub Actions workflow will automatically:
1. Generate `.env.production` from these secrets during deployment
2. Transfer the file to your VM with proper permissions
3. Use it for Docker Compose deployment

## Troubleshooting

If deployment fails:
1. Verify all secrets are correctly named and have values
2. Check that secret names match exactly (case-sensitive)
3. Ensure no trailing spaces in secret values
4. Check GitHub Actions logs for specific error messages

