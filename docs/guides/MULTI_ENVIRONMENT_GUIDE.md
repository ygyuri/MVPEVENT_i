# Event-i Multi-Environment Deployment Guide

This guide covers the deployment and management of Event-i across four environments: Development, Staging, UAT, and Production.

## 🌍 Environment Overview

| Environment | Purpose | Domain | Database | Security Level |
|------------|---------|--------|----------|----------------|
| **Development** | Local development | `localhost:3001` | `event_i` | Basic |
| **Staging** | Pre-production testing | `staging.event-i.com` | `event_i_staging` | Medium |
| **UAT** | User acceptance testing | `uat.event-i.com` | `event_i_uat` | High |
| **Production** | Live application | `event-i.com` | `event_i_production` | Maximum |

## 📁 File Structure

```
MVPEVENT_i/
├── env.development.example    # Development environment template
├── env.staging.example        # Staging environment template
├── env.uat.example           # UAT environment template
├── env.production.example    # Production environment template
├── docker-compose.yml        # Development Docker Compose
├── docker-compose.staging.yml # Staging Docker Compose
├── docker-compose.uat.yml     # UAT Docker Compose
├── docker-compose.prod.yml    # Production Docker Compose
├── nginx/
│   ├── nginx.conf            # Development Nginx config
│   ├── nginx.staging.conf     # Staging Nginx config
│   ├── nginx.uat.conf         # UAT Nginx config
│   └── generate-ssl.sh        # SSL certificate generator
├── scripts/
│   ├── deploy-staging.sh      # Staging deployment script
│   ├── deploy-uat.sh          # UAT deployment script
│   ├── deploy-production.sh   # Production deployment script
│   └── start-docker.sh        # Development Docker startup
└── Makefile                  # Environment management commands
```

## 🚀 Quick Start

### 1. Development Environment
```bash
# Start development environment
make dev

# Or manually
make setup-env-dev
./scripts/start-docker.sh
```

### 2. Staging Environment
```bash
# Start staging environment
make staging

# Or manually
make setup-env-staging
./scripts/deploy-staging.sh
```

### 3. UAT Environment
```bash
# Start UAT environment
make uat

# Or manually
make setup-env-uat
./scripts/deploy-uat.sh
```

### 4. Production Environment
```bash
# Start production environment
make prod

# Or manually
make setup-env-prod
./scripts/deploy-production.sh
```

## ⚙️ Environment Configuration

### Development Environment
- **Purpose**: Local development and testing
- **Security**: Basic security settings
- **Database**: Local MongoDB with default credentials
- **Payment**: Sandbox/test credentials
- **Email**: Ethereal test email service
- **Debug**: Enabled with verbose logging

**Key Settings:**
```bash
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
RATE_LIMIT_MAX_REQUESTS=1000
JWT_EXPIRES_IN=7d
```

### Staging Environment
- **Purpose**: Pre-production testing
- **Security**: Medium security settings
- **Database**: Staging database with secure credentials
- **Payment**: Test environment credentials
- **Email**: Real email service (staging domain)
- **Debug**: Disabled with info logging

**Key Settings:**
```bash
NODE_ENV=staging
DEBUG=false
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=500
JWT_EXPIRES_IN=1h
```

### UAT Environment
- **Purpose**: User acceptance testing
- **Security**: High security settings (production-like)
- **Database**: UAT database with secure credentials
- **Payment**: Production-like testing credentials
- **Email**: Real email service (UAT domain)
- **Debug**: Disabled with warn logging

**Key Settings:**
```bash
NODE_ENV=uat
DEBUG=false
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=100
JWT_EXPIRES_IN=1h
```

### Production Environment
- **Purpose**: Live application
- **Security**: Maximum security settings
- **Database**: Production database with secure credentials
- **Payment**: Live payment credentials
- **Email**: Real email service (production domain)
- **Debug**: Disabled with error logging

**Key Settings:**
```bash
NODE_ENV=production
DEBUG=false
LOG_LEVEL=error
RATE_LIMIT_MAX_REQUESTS=100
JWT_EXPIRES_IN=1h
```

## 🛠️ Makefile Commands

### Environment Setup
```bash
make setup-env-dev      # Create .env.development
make setup-env-staging  # Create .env.staging
make setup-env-uat      # Create .env.uat
make setup-env-prod     # Create .env.production
```

### Environment Management
```bash
make dev                # Start development environment
make staging            # Start staging environment
make uat                # Start UAT environment
make prod               # Start production environment
```

### Container Management
```bash
# Status
make status             # Development status
make status-staging     # Staging status
make status-uat         # UAT status
make status-prod        # Production status

# Logs
make logs               # Development logs
make logs-staging       # Staging logs
make logs-uat           # UAT logs
make logs-prod          # Production logs

# Stop
make down               # Stop development
make down-staging       # Stop staging
make down-uat           # Stop UAT
make down-prod          # Stop production

# Clean
make clean              # Clean development
make clean-staging      # Clean staging
make clean-uat          # Clean UAT
make clean-prod         # Clean production
```

## 🔧 Configuration Management

### Environment Variables
Each environment has its own `.env` file:
- `.env.development` - Development configuration
- `.env.staging` - Staging configuration
- `.env.uat` - UAT configuration
- `.env.production` - Production configuration

### Required Configuration Changes

#### Development
- No changes required (uses defaults)

#### Staging
- Change MongoDB password
- Change JWT secrets
- Configure staging domain
- Set up test payment credentials

#### UAT
- Change MongoDB password
- Change JWT secrets
- Configure UAT domain
- Set up production-like payment credentials

#### Production
- **MUST** change all default passwords and secrets
- **MUST** configure production domain
- **MUST** set up live payment credentials
- **MUST** configure real email service
- **MUST** set up SSL certificates
- **MUST** configure monitoring and alerts

## 🚀 Deployment Process

### 1. Development Deployment
```bash
# Automatic
make dev

# Manual
make setup-env-dev
./scripts/start-docker.sh
```

### 2. Staging Deployment
```bash
# Automatic
make staging

# Manual
make setup-env-staging
# Edit .env.staging with staging configuration
./scripts/deploy-staging.sh
```

### 3. UAT Deployment
```bash
# Automatic
make uat

# Manual
make setup-env-uat
# Edit .env.uat with UAT configuration
./scripts/deploy-uat.sh
```

### 4. Production Deployment
```bash
# Automatic
make prod

# Manual
make setup-env-prod
# Edit .env.production with production configuration
./scripts/deploy-production.sh
```

## 🔒 Security Considerations

### Development
- Basic security settings
- Default credentials (change for production)
- Debug mode enabled
- Permissive rate limiting

### Staging
- Medium security settings
- Secure credentials
- Debug mode disabled
- Moderate rate limiting

### UAT
- High security settings
- Secure credentials
- Debug mode disabled
- Strict rate limiting

### Production
- Maximum security settings
- Secure credentials
- Debug mode disabled
- Strict rate limiting
- SSL/TLS encryption
- Security headers
- Monitoring and alerts

## 📊 Monitoring and Logging

### Development
- Verbose logging
- Debug information
- Local file logging

### Staging
- Info level logging
- File and console logging
- Basic monitoring

### UAT
- Warn level logging
- File and console logging
- Enhanced monitoring

### Production
- Error level logging
- File, console, and external logging
- Comprehensive monitoring
- Alert systems
- Performance monitoring

## 🔄 Database Management

### Development
- Local MongoDB instance
- Default credentials
- Development data

### Staging
- Staging MongoDB instance
- Secure credentials
- Test data

### UAT
- UAT MongoDB instance
- Secure credentials
- UAT test data

### Production
- Production MongoDB instance
- Secure credentials
- Live data
- Automated backups

## 🌐 Domain and SSL Configuration

### Development
- `localhost:3001` (HTTP)
- No SSL required

### Staging
- `staging.event-i.com` (HTTPS)
- SSL certificate required

### UAT
- `uat.event-i.com` (HTTPS)
- SSL certificate required

### Production
- `event-i.com` (HTTPS)
- SSL certificate required
- Domain validation required

## 🚨 Troubleshooting

### Common Issues

#### Environment Variables Not Loaded
```bash
# Check if .env file exists
ls -la .env.*

# Create missing .env file
make setup-env-<environment>
```

#### Container Startup Issues
```bash
# Check container status
make status-<environment>

# View logs
make logs-<environment>

# Restart containers
make down-<environment>
make <environment>
```

#### Database Connection Issues
```bash
# Check database container
docker-compose -f docker-compose.<environment>.yml ps mongodb

# View database logs
docker-compose -f docker-compose.<environment>.yml logs mongodb
```

#### SSL Certificate Issues
```bash
# Generate new SSL certificates
./nginx/generate-ssl.sh

# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout
```

### Environment-Specific Issues

#### Development
- Port conflicts: Check if ports 3001, 5001 are available
- Database connection: Ensure MongoDB is running
- Hot reload: Check if volumes are mounted correctly

#### Staging
- Domain resolution: Ensure staging.event-i.com points to server
- SSL certificate: Check certificate validity and renewal
- Payment testing: Verify test credentials are working

#### UAT
- Domain resolution: Ensure uat.event-i.com points to server
- SSL certificate: Check certificate validity and renewal
- Payment testing: Verify production-like credentials are working

#### Production
- Domain resolution: Ensure event-i.com points to server
- SSL certificate: Check certificate validity and renewal
- Payment processing: Verify live credentials are working
- Monitoring: Check alert systems are functioning

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [MongoDB Security Best Practices](https://docs.mongodb.com/manual/security/)
- [SSL/TLS Configuration Guide](https://ssl-config.mozilla.org/)
- [Environment Variables Best Practices](https://12factor.net/config)

## 🤝 Support

For issues or questions regarding multi-environment deployment:

1. Check the troubleshooting section above
2. Review environment-specific logs
3. Verify configuration files
4. Check container status and health
5. Consult the development team

---

**Note**: Always test deployments in staging and UAT environments before deploying to production. Production deployments should be performed during maintenance windows with proper backup and rollback procedures.
