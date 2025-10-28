#!/bin/bash

# Script to manually set up Let's Encrypt SSL certificate on production VM
# This bypasses the rate limit issue by allowing manual intervention

set -e

echo "🔐 SSL Certificate Setup Script"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    apt update
    apt install -y certbot || {
        # Fall back to snap if apt fails
        apt install -y snapd
        snap install core
        snap refresh core
        snap install --classic certbot
        ln -sf /snap/bin/certbot /usr/bin/certbot
    }
fi

# Stop nginx to free port 80
echo "🛑 Stopping nginx and any services using port 80..."
systemctl stop nginx || true
pkill -f nginx || true
lsof -ti:80 | xargs kill -9 2>/dev/null || true
sleep 2

# Check what's running on port 80
if lsof -i:80 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 80 is still in use. Please manually stop the service.${NC}"
    lsof -i:80
    exit 1
fi

# Display current certificate status
echo ""
echo "📋 Current certificate status:"
if [ -d /etc/letsencrypt/live/event-i.co.ke ]; then
    echo "  Let's Encrypt certificates found"
    certbot certificates
else
    echo "  No Let's Encrypt certificates found"
fi

echo ""
echo -e "${YELLOW}Choose an option:${NC}"
echo "1) Generate NEW certificate (will fail if rate limited)"
echo "2) RENEW existing certificate (if it exists)"
echo "3) Use STAGING environment (for testing only, won't be trusted by browsers)"
echo "4) Exit without changes"

read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo ""
        echo "🔐 Generating NEW certificate for event-i.co.ke..."
        if certbot certonly --standalone \
            --non-interactive \
            --agree-tos \
            --email admin@event-i.co.ke \
            -d event-i.co.ke; then
            echo -e "${GREEN}✅ Certificate generated successfully!${NC}"
            CERT_SUCCESS=true
        else
            echo -e "${RED}❌ Certificate generation failed${NC}"
            echo "This might be due to rate limiting or other issues."
            echo "Check the error message above for details."
            CERT_SUCCESS=false
        fi
        ;;
    2)
        echo ""
        echo "🔄 Renewing existing certificate..."
        certbot renew --cert-name event-i.co.ke
        CERT_SUCCESS=true
        ;;
    3)
        echo ""
        echo "🧪 Generating certificate using STAGING environment..."
        if certbot certonly --standalone \
            --non-interactive \
            --agree-tos \
            --email admin@event-i.co.ke \
            --test-cert \
            -d event-i.co.ke; then
            echo -e "${GREEN}✅ Staging certificate generated successfully!${NC}"
            echo -e "${YELLOW}ℹ️  This certificate is for testing only and won't be trusted by browsers${NC}"
            CERT_SUCCESS=true
        else
            echo -e "${RED}❌ Certificate generation failed${NC}"
            CERT_SUCCESS=false
        fi
        ;;
    4)
        echo "Exiting without changes..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

if [ "$CERT_SUCCESS" = true ]; then
    # Copy certificates to nginx ssl directory
    echo ""
    echo "📁 Copying certificates to nginx ssl directory..."
    mkdir -p /root/MVPEVENT_i/nginx/ssl
    
    CERT_PATH="/etc/letsencrypt/live/event-i.co.ke/fullchain.pem"
    KEY_PATH="/etc/letsencrypt/live/event-i.co.ke/privkey.pem"
    
    if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
        cp "$CERT_PATH" /root/MVPEVENT_i/nginx/ssl/cert.pem
        cp "$KEY_PATH" /root/MVPEVENT_i/nginx/ssl/key.pem
        
        # Set correct permissions
        chmod 644 /root/MVPEVENT_i/nginx/ssl/cert.pem
        chmod 600 /root/MVPEVENT_i/nginx/ssl/key.pem
        
        echo -e "${GREEN}✅ Certificates copied successfully!${NC}"
        
        # Display certificate info
        echo ""
        echo "📋 Certificate Information:"
        openssl x509 -in /root/MVPEVENT_i/nginx/ssl/cert.pem -noout -subject -dates
    else
        echo -e "${RED}❌ Certificate files not found at expected location${NC}"
        exit 1
    fi
    
    # Restart Docker containers to use new certificates
    echo ""
    echo "🔄 Restarting Docker containers to apply new certificates..."
    cd /root/MVPEVENT_i
    docker compose -f docker-compose.prod.yml restart nginx
fi

# Restart nginx
echo ""
echo "🚀 Restarting nginx..."
systemctl start nginx || true

echo ""
echo "✅ SSL certificate setup complete!"
echo ""
echo "Next steps:"
echo "1. Test your site: https://event-i.co.ke"
echo "2. Check certificate in browser (should show 'Connection is secure')"
echo "3. If using staging certificate, run this script again with option 1 to get production certificate"

