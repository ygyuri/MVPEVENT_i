# Event-i Local Domain Setup

This guide explains how to use the custom domain `event-i.co.ke` for local development and testing.

## Quick Start

### 1. Add Domain to Hosts File

```bash
# Add event-i.co.ke to hosts file
./scripts/setup-local-domain.sh add

# Check status
./scripts/setup-local-domain.sh status

# Test domain resolution
./scripts/setup-local-domain.sh test
```

### 2. Start Event-i

```bash
# Start Event-i with local domain support
./scripts/start-event-i-local.sh start

# Check status
./scripts/start-event-i-local.sh status

# Test connections
./scripts/start-event-i-local.sh test
```

## Scripts Overview

### `setup-local-domain.sh`

Manages the `event-i.co.ke` domain entry in `/etc/hosts`.

**Commands:**

- `add` - Add event-i.co.ke to hosts file
- `remove` - Remove event-i.co.ke from hosts file
- `status` - Show current status
- `test` - Test domain resolution and connection
- `help` - Show help message

**Examples:**

```bash
./scripts/setup-local-domain.sh add      # Add domain
./scripts/setup-local-domain.sh status   # Check status
./scripts/setup-local-domain.sh test     # Test connection
./scripts/setup-local-domain.sh remove   # Remove domain
```

### `start-event-i-local.sh`

Manages Event-i Docker containers with local domain support.

**Commands:**

- `start` - Start Event-i containers
- `stop` - Stop Event-i containers
- `restart` - Restart Event-i containers
- `status` - Show container status
- `logs` - Show container logs
- `test` - Test connections
- `help` - Show help message

**Examples:**

```bash
./scripts/start-event-i-local.sh start    # Start Event-i
./scripts/start-event-i-local.sh status   # Check status
./scripts/start-event-i-local.sh test    # Test connections
./scripts/start-event-i-local.sh stop    # Stop containers
```

## Access URLs

### Localhost (Always Available)

- **Frontend:** https://localhost/
- **API:** https://localhost/api/health
- **Health:** https://localhost/health

### Custom Domain (After Setup)

- **Frontend:** https://event-i.co.ke/
- **API:** https://event-i.co.ke/api/health
- **Health:** https://event-i.co.ke/health

## Manual Setup (Alternative)

If you prefer to set up the domain manually:

### 1. Add to Hosts File

```bash
# Open hosts file
sudo nano /etc/hosts

# Add this line:
127.0.0.1 event-i.co.ke

# Save and exit (Ctrl+X, Y, Enter)
```

### 2. Test Domain

```bash
# Test DNS resolution
ping event-i.co.ke

# Test HTTPS connection
curl -k https://event-i.co.ke/api/health
```

## Configuration Details

### Nginx Configuration

The nginx configuration supports both domains:

```nginx
server {
    listen 80;
    server_name event-i.co.ke localhost;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name event-i.co.ke localhost;
    # ... rest of config
}
```

### SSL Certificates

Self-signed certificates are generated for `event-i.co.ke`:

- **Location:** `nginx/ssl/cert.pem` and `nginx/ssl/key.pem`
- **Subject:** `CN=event-i.co.ke`
- **Valid for:** 365 days

### Environment Variables

The production environment is configured for the custom domain:

```bash
FRONTEND_URL=https://event-i.co.ke
SUDO_PASSWORD=achieng
```

#### SUDO_PASSWORD Configuration
The `SUDO_PASSWORD` environment variable controls the sudo password used by the domain setup script:

```bash
# Set custom password
export SUDO_PASSWORD="your-password"

# Or use inline
SUDO_PASSWORD="your-password" ./scripts/setup-local-domain.sh add
```

## Troubleshooting

### Domain Not Resolving

```bash
# Check if domain is in hosts file
cat /etc/hosts | grep event-i.co.ke

# Test DNS resolution
ping event-i.co.ke

# Check nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t
```

### SSL Certificate Issues

```bash
# Check certificate details
openssl x509 -in nginx/ssl/cert.pem -text -noout | grep "Subject:"

# Regenerate certificates
cd nginx && ./generate-ssl.sh
```

### Container Issues

```bash
# Check container status
./scripts/start-event-i-local.sh status

# View container logs
./scripts/start-event-i-local.sh logs

# Restart containers
./scripts/start-event-i-local.sh restart
```

## Security Notes

### Self-Signed Certificates

- The SSL certificates are self-signed for development/testing
- Browsers will show security warnings
- Click "Advanced" → "Proceed to event-i.co.ke (unsafe)"

### Production Deployment

For production, use Let's Encrypt certificates:

```bash
# Install certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d event-i.co.ke

# Update nginx configuration to use Let's Encrypt certificates
```

## Benefits

### Development Experience

- **Clean URLs:** `https://event-i.co.ke/` instead of `https://localhost:3001/`
- **Realistic Testing:** Closer to production environment
- **Easy to Remember:** Custom domain is more memorable

### Testing Features

- **Email Links:** Test email links with custom domain
- **Mobile Testing:** Access from mobile devices on same network
- **Subdomain Support:** Ready for future subdomains (api.event-i.co.ke)

### Production Readiness

- **SSL Termination:** HTTPS with proper certificates
- **Security Headers:** Production-ready security headers
- **Rate Limiting:** Protection against abuse
- **Health Monitoring:** Container health checks

## Mobile Testing

### Same Network Access

```bash
# Find your IP address
ifconfig | grep 'inet ' | grep -v 127.0.0.1

# Example: 192.168.100.14
# Access from mobile: https://192.168.100.14/
```

### Mobile Hosts File

For mobile devices, you can add the domain to their hosts file:

```
192.168.100.14 event-i.co.ke
```

## File Structure

```
Event-i/
├── scripts/
│   ├── setup-local-domain.sh  # Domain management script
│   └── start-event-i-local.sh # Container management script
├── docs/guides/
│   └── LOCAL_DOMAIN_SETUP.md  # This documentation
├── nginx/
│   ├── nginx.conf             # Nginx configuration
│   ├── generate-ssl.sh        # SSL certificate generation
│   └── ssl/                   # SSL certificates
│       ├── cert.pem           # Certificate
│       └── key.pem            # Private key
└── docker-compose.prod.yml    # Production Docker configuration
```

## Support

If you encounter issues:

1. **Check Script Help:**

   ```bash
   ./scripts/setup-local-domain.sh help
   ./scripts/start-event-i-local.sh help
   ```

2. **Verify Configuration:**

   ```bash
   ./scripts/setup-local-domain.sh status
   ./scripts/start-event-i-local.sh status
   ```

3. **Test Connections:**

   ```bash
   ./scripts/setup-local-domain.sh test
   ./scripts/start-event-i-local.sh test
   ```

4. **View Logs:**
   ```bash
   ./scripts/start-event-i-local.sh logs
   ```

The scripts are designed to be safe and create backups of your hosts file before making changes.
