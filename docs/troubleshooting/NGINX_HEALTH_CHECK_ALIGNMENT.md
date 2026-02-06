# Nginx Configuration and Health Check Alignment

This document explains how the nginx configurations are aligned with the GitHub workflow health checks to ensure proper container rebuild and restart verification.

## Health Check Architecture

### Server-Side Health Endpoint

The server exposes a health endpoint at `/api/health` that returns:

```json
{
  "status": "ok",
  "message": "Event-i API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

### Nginx Health Check Configuration

#### Production (`nginx.conf`)

```nginx
# Health check for Kubernetes
location /health {
    access_log off;
    proxy_pass http://backend/api/health;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

#### Staging (`nginx.staging.conf`)

```nginx
# Health check endpoint
location /health {
    access_log off;
    proxy_pass http://backend/api/health;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

#### UAT (`nginx.uat.conf`)

```nginx
# Health check endpoint
location /health {
    access_log off;
    proxy_pass http://backend/api/health;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## GitHub Workflow Health Checks

### Enhanced Health Check Logic

The GitHub workflow now performs comprehensive health checks:

1. **Primary Health Check**: Tests both endpoints

   ```bash
   # Test both direct API endpoint and nginx health endpoint
   if curl -f -s -k https://localhost/api/health > /dev/null 2>&1 || curl -f -s -k https://localhost/health > /dev/null 2>&1; then
   ```

2. **Component-Level Testing**: If primary check fails, tests individual components

   ```bash
   # Test nginx directly
   docker compose -f docker-compose.prod.yml exec nginx curl -f -s http://localhost/health > /dev/null 2>&1

   # Test backend directly
   docker compose -f docker-compose.prod.yml exec server curl -f -s http://localhost:5000/api/health > /dev/null 2>&1
   ```

### Health Check Flow

```
GitHub Workflow
    ↓
1. Test https://localhost/api/health (direct API)
    ↓ (if fails)
2. Test https://localhost/health (nginx proxy)
    ↓ (if both fail)
3. Test nginx container internally
    ↓
4. Test backend container internally
    ↓
5. Show detailed logs for debugging
```

## Available Health Check Endpoints

### External Endpoints (via nginx)

- **Direct API**: `https://localhost/api/health`
- **Nginx Proxy**: `https://localhost/health`

### Internal Endpoints (container-to-container)

- **Backend Direct**: `http://server:5000/api/health`
- **Nginx Internal**: `http://nginx:80/health`

## Health Check Response Format

All health endpoints return the same JSON structure:

```json
{
  "status": "ok",
  "message": "Event-i API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

## Troubleshooting Health Checks

### Common Issues and Solutions

#### 1. Health Check Timeout

**Symptoms**: Health checks fail after 5 attempts
**Solutions**:

- Check container startup time (increase sleep duration)
- Verify database connectivity
- Check Redis connection
- Review server logs for errors

#### 2. Nginx Proxy Issues

**Symptoms**: `/health` endpoint fails but `/api/health` works
**Solutions**:

- Verify nginx configuration syntax
- Check upstream server configuration
- Ensure backend container is accessible from nginx
- Review nginx error logs

#### 3. Backend Service Issues

**Symptoms**: Both endpoints fail
**Solutions**:

- Check server container logs
- Verify database connection
- Check environment variables
- Ensure server is listening on correct port

### Debugging Commands

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Test health endpoints
curl -f -s -k https://localhost/api/health
curl -f -s -k https://localhost/health

# Test internal endpoints
docker compose -f docker-compose.prod.yml exec nginx curl -f -s http://localhost/health
docker compose -f docker-compose.prod.yml exec server curl -f -s http://localhost:5000/api/health

# View logs
docker compose -f docker-compose.prod.yml logs server
docker compose -f docker-compose.prod.yml logs nginx
```

## Environment-Specific Configurations

### Production

- **Domain**: `event-i.co.ke`
- **Health Check**: `/health` → `http://backend/api/health`
- **Rate Limiting**: 10 req/s for API, 5 req/min for auth
- **SSL**: Required (HTTP → HTTPS redirect)

### Staging

- **Domain**: `staging.event-i.co.ke`
- **Health Check**: `/health` → `http://backend/api/health`
- **Rate Limiting**: 10 req/s for API, 5 req/min for auth
- **SSL**: Required (HTTP → HTTPS redirect)

### UAT

- **Domain**: `uat.event-i.co.ke`
- **Health Check**: `/health` → `http://backend/api/health`
- **Rate Limiting**: 5 req/s for API, 3 req/min for auth (stricter)
- **SSL**: Required (HTTP → HTTPS redirect)

## Monitoring and Alerts

### Health Check Monitoring

- **Frequency**: Every 5 seconds during deployment
- **Retries**: 5 attempts with 5-second intervals
- **Timeout**: 30 seconds per attempt
- **Success Criteria**: HTTP 200 response with valid JSON

### Alert Conditions

- Health check failures during deployment
- Container startup failures
- Database connectivity issues
- SSL certificate problems

## Best Practices

### 1. Health Check Design

- Keep health checks lightweight and fast
- Include database connectivity verification
- Return consistent JSON format
- Log health check requests minimally

### 2. Nginx Configuration

- Use `access_log off` for health endpoints
- Set appropriate proxy timeouts
- Include proper headers for debugging
- Test configuration syntax before deployment

### 3. Deployment Strategy

- Test health checks in staging first
- Use gradual rollout for production
- Monitor health check success rates
- Have rollback plan ready

### 4. Monitoring

- Set up automated health check monitoring
- Configure alerts for health check failures
- Track health check response times
- Monitor container resource usage

## Conclusion

The nginx configurations and GitHub workflow health checks are now properly aligned to ensure:

✅ **Consistent Health Endpoints**: All environments use `/health` → `/api/health` proxy
✅ **Robust Testing**: Multiple fallback health check methods
✅ **Comprehensive Debugging**: Detailed component-level testing on failure
✅ **Proper Logging**: Minimal logging for health checks, detailed logs for failures
✅ **Environment Parity**: Same health check logic across all environments

This alignment ensures that container rebuilds and restarts are properly verified, providing confidence in deployment success across all environments.
