#!/bin/bash

# SSL Certificate Generation Script for Event-i Production
# This script generates self-signed certificates for development/testing
# For production, use Let's Encrypt or your CA certificates

echo "🔐 Generating SSL certificates for Event-i..."

# Create ssl directory if it doesn't exist
mkdir -p ssl

# Generate private key
echo "📝 Generating private key..."
openssl genrsa -out ssl/key.pem 2048

# Generate certificate signing request
echo "📝 Generating certificate signing request..."
openssl req -new -key ssl/key.pem -out ssl/cert.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=event-i.local"

# Generate self-signed certificate
echo "📝 Generating self-signed certificate..."
openssl x509 -req -days 365 -in ssl/cert.csr -signkey ssl/key.pem -out ssl/cert.pem

# Set proper permissions
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem

# Clean up CSR file
rm ssl/cert.csr

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificates location: ./nginx/ssl/"
echo "🔑 Private key: ssl/key.pem"
echo "📜 Certificate: ssl/cert.pem"
echo ""
echo "⚠️  Note: These are self-signed certificates for development/testing."
echo "   For production, use Let's Encrypt or certificates from a trusted CA."
echo ""
echo "🚀 To use Let's Encrypt in production:"
echo "   1. Install certbot: sudo apt install certbot"
echo "   2. Generate certificates: sudo certbot certonly --standalone -d yourdomain.com"
echo "   3. Update nginx.conf to point to /etc/letsencrypt/live/yourdomain.com/"
