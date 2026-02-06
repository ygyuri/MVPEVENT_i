# 🚀 Nginx Production Deployment Guide

This guide covers deploying Event-i with Nginx reverse proxy in production.

## 📋 Prerequisites

- Docker and Docker Compose installed
- Domain name pointing to your server
- SSL certificates (Let's Encrypt recommended)
- Server with at least 2GB RAM and 20GB storage

## 🏗️ Architecture Overview

```
Internet → Nginx (Port 80/443) → React App (Port 80) + Node.js API (Port 5000)
                ↓
            MongoDB + Redis (Internal only)
```

## 🔧 Configuration Files

### 1. Environment Configuration

Copy and configure production environment:

```bash
cp env.production.example .env
nano .env
```

**Key variables to update:**

- `FRONTEND_URL=https://yourdomain.com`
- `JWT_SECRET=your-secure-jwt-secret`
- `MONGO_ROOT_PASSWORD=your-secure-password`
- `PAYHERO_*` variables for payment processing

### 2. SSL Certificates

#### Option A: Self-signed (Development/Testing)

```bash
cd nginx
./generate-ssl.sh
```

#### Option B: Let's Encrypt (Production)

```bash
# Install certbot
sudo apt update
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d yourdomain.com

# Update nginx.conf to use Let's Encrypt certificates
# Change paths to: /etc/letsencrypt/live/yourdomain.com/
```

### 3. Nginx Configuration

The nginx configuration includes:

- **Security headers**: HSTS, CSP, XSS protection
- **Rate limiting**: API and login endpoints
- **Gzip compression**: Optimized content delivery
- **Static file caching**: 1-year cache for assets
- **WebSocket support**: Socket.IO proxying
- **Health checks**: Monitoring endpoints

## 🚀 Deployment Steps

### 1. Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Deploy Application

```bash
# Clone repository
git clone https://github.com/your-repo/MVPEVENT_i.git
cd MVPEVENT_i

# Configure environment
cp env.production.example .env
nano .env  # Update with your values

# Generate SSL certificates (if using self-signed)
cd nginx && ./generate-ssl.sh && cd ..

# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 3. Verify Deployment

```bash
# Check nginx health
curl -k https://yourdomain.com/health

# Check API health
curl -k https://yourdomain.com/api/health

# View logs
docker-compose -f docker-compose.prod.yml logs -f nginx
```

## 🔒 Security Features

### Nginx Security Headers

- **Strict-Transport-Security**: Forces HTTPS
- **Content-Security-Policy**: Prevents XSS attacks
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing

### Rate Limiting

- **API endpoints**: 10 requests/second
- **Authentication**: 5 requests/minute
- **Burst handling**: Graceful overflow management

### Network Security

- **Internal services**: MongoDB and Redis not exposed
- **HTTPS only**: HTTP redirects to HTTPS
- **Modern TLS**: TLS 1.2+ with secure ciphers

## 📊 Monitoring & Logs

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f nginx
docker-compose -f docker-compose.prod.yml logs -f server
```

### Health Checks

```bash
# Application health
curl -k https://yourdomain.com/health

# API health
curl -k https://yourdomain.com/api/health

# Container health
docker-compose -f docker-compose.prod.yml ps
```

## 🔄 Updates & Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Clean up old images
docker system prune -f
```

### SSL Certificate Renewal (Let's Encrypt)

```bash
# Set up automatic renewal
sudo crontab -e

# Add this line (runs twice daily)
0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f /path/to/MVPEVENT_i/docker-compose.prod.yml restart nginx
```

## 🐛 Troubleshooting

### Common Issues

#### 1. SSL Certificate Errors

```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Regenerate certificates
cd nginx && ./generate-ssl.sh
```

#### 2. Port Conflicts

```bash
# Check what's using ports 80/443
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Stop conflicting services
sudo systemctl stop apache2  # if Apache is running
sudo systemctl stop nginx    # if system nginx is running
```

#### 3. Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs nginx

# Check configuration
docker-compose -f docker-compose.prod.yml config

# Restart specific service
docker-compose -f docker-compose.prod.yml restart nginx
```

#### 4. Database Connection Issues

```bash
# Check MongoDB logs
docker-compose -f docker-compose.prod.yml logs mongodb

# Check network connectivity
docker-compose -f docker-compose.prod.yml exec server ping mongodb
```

## 📈 Performance Optimization

### Nginx Optimizations

- **Gzip compression**: Reduces bandwidth usage
- **Static file caching**: 1-year cache for assets
- **Connection pooling**: Efficient upstream connections
- **Rate limiting**: Prevents abuse

### Application Optimizations

- **Multi-stage builds**: Smaller production images
- **Health checks**: Automatic container restart
- **Resource limits**: Prevent resource exhaustion

## 🔧 Customization

### Custom Domain

1. Update `FRONTEND_URL` in `.env`
2. Update SSL certificates for your domain
3. Update nginx server_name in `nginx/nginx.conf`

### Additional Services

Add to `docker-compose.prod.yml`:

```yaml
services:
  # Add your service here
  custom-service:
    image: your-image
    networks:
      - event_i_network_prod
```

### Custom Nginx Configuration

Modify `nginx/nginx.conf` for:

- Additional upstream servers
- Custom rate limiting rules
- Additional security headers
- Custom routing rules

## 📚 Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Event-i API Documentation](./API_DOCUMENTATION.md)

## 🆘 Support

For deployment issues:

1. Check logs: `docker-compose -f docker-compose.prod.yml logs -f`
2. Verify configuration: `docker-compose -f docker-compose.prod.yml config`
3. Check health endpoints: `curl -k https://yourdomain.com/health`
4. Review this guide for troubleshooting steps

---

**Ready for Production! 🚀**

Your Event-i application is now configured with enterprise-grade Nginx reverse proxy, SSL termination, security headers, and production optimizations.
