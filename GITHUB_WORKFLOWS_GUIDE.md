# GitHub Workflows for Container Rebuild and Restart

This document describes the enhanced GitHub workflows that ensure containers are properly rebuilt and restarted across all environments.

## Overview

The project now includes three comprehensive GitHub workflows that handle container rebuilding and restarting:

1. **Enhanced Production Workflow** (`deploy-vm.yml`) - Updated existing workflow
2. **Staging/UAT Workflow** (`deploy-staging.yml`) - Handles staging and UAT environments
3. **Multi-Environment Workflow** (`multi-environment-deploy.yml`) - Comprehensive workflow with Docker registry integration

## Key Features

### 🔄 Container Rebuild Guarantees

All workflows ensure containers are completely rebuilt and restarted by:

- **Graceful Container Shutdown**: `docker compose down --remove-orphans`
- **Complete Resource Cleanup**:
  - `docker container prune -f`
  - `docker image prune -f`
  - `docker volume prune -f`
- **Fresh Base Image Pulls**: `docker compose pull`
- **No-Cache Builds**: `docker compose build --no-cache --pull`
- **Force Container Recreation**: `docker compose up -d --force-recreate --remove-orphans`

### 🏥 Enhanced Health Checks

- **Container Status Monitoring**: Real-time container health verification
- **Retry Logic**: 5 attempts for API and frontend health checks
- **Timeout Handling**: 30 attempts with 10-second intervals
- **Comprehensive Logging**: Detailed logs on failure for debugging

### 🌍 Multi-Environment Support

- **Production**: `main` branch → Production environment
- **Staging**: `staging`/`develop` branches → Staging environment
- **UAT**: Manual trigger → UAT environment
- **Environment-Specific Configurations**: Separate Docker Compose files and environment variables

## Workflow Details

### 1. Enhanced Production Workflow (`deploy-vm.yml`)

**Triggers:**

- Push to `main` branch
- Manual workflow dispatch

**Features:**

- Complete container rebuild and restart
- Production environment configuration
- Comprehensive health checks
- Deployment status reporting

**Deployment Process:**

```bash
# 1. Stop existing containers
docker compose -f docker-compose.prod.yml down --remove-orphans

# 2. Clean up resources
docker container prune -f
docker image prune -f
docker volume prune -f

# 3. Pull latest base images
docker compose -f docker-compose.prod.yml pull

# 4. Build with fresh cache
docker compose -f docker-compose.prod.yml build --no-cache --pull

# 5. Deploy with force recreate
docker compose -f docker-compose.prod.yml up -d --force-recreate --remove-orphans
```

### 2. Staging/UAT Workflow (`deploy-staging.yml`)

**Triggers:**

- Push to `staging` or `develop` branches
- Manual workflow dispatch with environment selection

**Features:**

- Supports both staging and UAT environments
- Environment-specific configurations
- Same rebuild and restart guarantees as production
- Separate VM deployments

**Environment Selection:**

- **Staging**: Automatic on `staging`/`develop` branches
- **UAT**: Manual selection via workflow dispatch

### 3. Multi-Environment Workflow (`multi-environment-deploy.yml`)

**Triggers:**

- Push to `main`, `staging`, or `develop` branches
- Pull requests to `main` or `staging`
- Manual workflow dispatch

**Advanced Features:**

- **Docker Registry Integration**: Builds and pushes to GitHub Container Registry
- **Multi-Architecture Support**: Linux AMD64 and ARM64
- **Build Caching**: GitHub Actions cache for faster builds
- **Environment Protection**: GitHub environment rules
- **Comprehensive Testing**: Pre-deployment validation

## Required GitHub Secrets

### Production Secrets

```
VM_HOST, VM_USER, VM_SSH_KEY
NODE_ENV, SERVER_PORT, FRONTEND_URL, BASE_URL
MONGO_ROOT_USERNAME, MONGO_ROOT_PASSWORD, MONGODB_URI
REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET
PAYHERO_*, MPESA_*, SMTP_*, TICKET_QR_*
NGINX_HTTP_PORT, NGINX_HTTPS_PORT
```

### Staging Secrets (Prefix: `STAGING_`)

```
STAGING_VM_HOST, STAGING_VM_USER, STAGING_VM_SSH_KEY
STAGING_SERVER_PORT, STAGING_FRONTEND_URL, STAGING_BASE_URL
STAGING_MONGO_ROOT_USERNAME, STAGING_MONGO_ROOT_PASSWORD
STAGING_JWT_SECRET, STAGING_JWT_REFRESH_SECRET
STAGING_PAYHERO_*, STAGING_MPESA_*, STAGING_SMTP_*
STAGING_TICKET_QR_*, STAGING_NGINX_*
```

### UAT Secrets (Prefix: `UAT_`)

```
UAT_VM_HOST, UAT_VM_USER, UAT_VM_SSH_KEY
UAT_SERVER_PORT, UAT_FRONTEND_URL, UAT_BASE_URL
UAT_MONGO_ROOT_USERNAME, UAT_MONGO_ROOT_PASSWORD
UAT_JWT_SECRET, UAT_JWT_REFRESH_SECRET
UAT_PAYHERO_*, UAT_MPESA_*, UAT_SMTP_*
UAT_TICKET_QR_*, UAT_NGINX_*
```

## Deployment Process Flow

### 1. Code Push/Trigger

- Developer pushes to `main`, `staging`, or `develop`
- Workflow automatically triggers based on branch

### 2. Build Phase

- Checkout repository
- Set up Docker Buildx
- Build Docker images with fresh cache
- Run tests (if configured)

### 3. Deploy Phase

- Create environment-specific configuration
- Transfer configuration to target VM
- SSH into VM and execute deployment script

### 4. Container Management

- Stop existing containers gracefully
- Clean up old Docker resources
- Pull latest base images
- Build with no cache and force pull
- Deploy with force recreate

### 5. Health Verification

- Wait for containers to start
- Verify container status
- Test API health endpoints
- Test frontend accessibility
- Generate deployment summary

### 6. Notification

- Success/failure notifications
- Deployment summary with URLs
- Container status report

## Monitoring and Troubleshooting

### Health Check Endpoints

- **API Health**: `https://[domain]/api/health`
- **Frontend Health**: `https://[domain]/`
- **Container Status**: `docker compose ps`

### Log Access

```bash
# View all container logs
docker compose -f docker-compose.[env].yml logs

# View specific service logs
docker compose -f docker-compose.[env].yml logs server
docker compose -f docker-compose.[env].yml logs client
docker compose -f docker-compose.[env].yml logs nginx

# Follow logs in real-time
docker compose -f docker-compose.[env].yml logs -f
```

### Common Issues and Solutions

#### Containers Not Starting

1. Check container logs: `docker compose logs`
2. Verify environment variables
3. Check VM resources (CPU, memory, disk)
4. Ensure all required secrets are configured

#### Health Checks Failing

1. Verify network connectivity
2. Check SSL certificate validity
3. Review nginx configuration
4. Test endpoints manually with curl

#### Build Failures

1. Check Dockerfile syntax
2. Verify base image availability
3. Review build context and dependencies
4. Check GitHub Actions logs

## Best Practices

### 1. Environment Management

- Use separate VMs for each environment
- Maintain separate Docker Compose files
- Use environment-specific secrets
- Regular backup of production data

### 2. Security

- Rotate secrets regularly
- Use strong passwords (32+ characters)
- Limit VM access to necessary users
- Monitor deployment logs

### 3. Monitoring

- Set up alerts for failed deployments
- Monitor container resource usage
- Track deployment frequency and success rates
- Regular health check verification

### 4. Rollback Strategy

- Keep previous container images
- Maintain database backups
- Document rollback procedures
- Test rollback scenarios

## Manual Deployment Commands

### Local Development

```bash
# Start development environment
npm run docker:dev

# Stop all containers
npm run docker:stop

# View logs
npm run docker:logs

# Check status
npm run docker:status
```

### Production Management

```bash
# Deploy to production
./deploy-production.sh

# Check production status
docker compose -f docker-compose.prod.yml ps

# View production logs
docker compose -f docker-compose.prod.yml logs -f
```

## Workflow Customization

### Adding New Environments

1. Create new Docker Compose file (`docker-compose.[env].yml`)
2. Add environment-specific secrets to GitHub
3. Create new workflow job or modify existing workflow
4. Update environment configuration

### Modifying Health Checks

1. Update health check URLs in workflow files
2. Adjust retry logic and timeout values
3. Add custom health check endpoints
4. Update notification messages

### Adding Notifications

1. Integrate with Slack, Discord, or email services
2. Add webhook notifications
3. Configure deployment status updates
4. Set up monitoring alerts

## Conclusion

These enhanced GitHub workflows provide a robust, reliable, and comprehensive solution for container rebuild and restart across all environments. The workflows ensure that:

- ✅ Containers are completely rebuilt with fresh cache
- ✅ All containers are properly restarted
- ✅ Health checks verify successful deployment
- ✅ Multiple environments are supported
- ✅ Comprehensive logging and monitoring
- ✅ Easy troubleshooting and rollback capabilities

The system is designed to be maintainable, scalable, and secure, providing confidence in deployments across development, staging, and production environments.
