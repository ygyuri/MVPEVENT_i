# Kubernetes Manifests for Event-i

This directory contains all Kubernetes manifests for deploying Event-i to Google Kubernetes Engine (GKE).

## Directory Structure

```
k8s/
├── base/                          # Base Kubernetes manifests
│   └── kustomization.yaml        # Kustomize base configuration
├── overlays/                      # Environment-specific overlays
│   ├── staging/                  # Staging environment
│   │   └── kustomization.yaml   # Staging-specific config
│   └── production/               # Production environment
│       └── kustomization.yaml   # Production-specific config
├── cert-manager/                 # SSL certificate management
│   ├── cluster-issuer.yaml      # Let's Encrypt issuers
│   └── certificate.yaml        # SSL certificates
├── monitoring/                   # Monitoring and observability
│   └── prometheus.yaml         # Prometheus configuration
├── namespace.yaml               # Namespace definitions
├── mongodb-statefulset.yaml    # MongoDB deployment
├── redis-deployment.yaml       # Redis deployment
├── server-deployment.yaml      # Backend API deployment
├── client-deployment.yaml      # Frontend deployment
├── configmap.yaml              # Non-sensitive configuration
├── secrets.yaml.example        # Secrets template
├── nginx-ingress.yaml          # Ingress configuration
├── persistent-volumes.yaml     # Storage configuration
└── hpa.yaml                    # Horizontal Pod Autoscaler
```

## Quick Start

### 1. Prerequisites

- GKE cluster running
- kubectl configured
- Nginx Ingress Controller installed
- cert-manager installed

### 2. Setup Secrets

```bash
# Copy and edit secrets template
cp secrets.yaml.example secrets.yaml
# Edit secrets.yaml with your actual values (base64 encoded)

# Apply secrets
kubectl apply -f secrets.yaml
```

### 3. Deploy Application

```bash
# Deploy to production
kubectl apply -k overlays/production/

# Or deploy base configuration
kubectl apply -f .
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -n event-i

# Check services
kubectl get services -n event-i

# Check ingress
kubectl get ingress -n event-i
```

## Configuration

### Environment Variables

Most configuration is managed through:
- **ConfigMap**: Non-sensitive configuration
- **Secrets**: Sensitive data (JWT secrets, API keys, passwords)

### Resource Limits

Default resource limits:
- **Server**: 1Gi memory, 500m CPU
- **Client**: 256Mi memory, 200m CPU
- **MongoDB**: 1Gi memory, 500m CPU
- **Redis**: 512Mi memory, 250m CPU

### Scaling

- **HPA**: Automatic scaling based on CPU/memory usage
- **MongoDB**: 3 replicas for high availability
- **Server/Client**: 2-5 replicas based on load

## Security

### Network Policies

All services communicate through internal cluster networking:
- MongoDB: Only accessible from server pods
- Redis: Only accessible from server pods
- Server: Accessible via Ingress only
- Client: Accessible via Ingress only

### Secrets Management

- All secrets stored in Kubernetes Secrets
- Base64 encoded values
- Rotated regularly
- Access controlled via RBAC

## Monitoring

### Health Checks

- **Liveness Probes**: Restart unhealthy pods
- **Readiness Probes**: Route traffic only to ready pods
- **Startup Probes**: Wait for slow-starting containers

### Logging

```bash
# View logs
kubectl logs -f deployment/server -n event-i
kubectl logs -f deployment/client -n event-i
```

## Troubleshooting

### Common Issues

1. **Pods not starting**
   ```bash
   kubectl describe pod POD_NAME -n event-i
   ```

2. **Service not accessible**
   ```bash
   kubectl get endpoints -n event-i
   ```

3. **Ingress not working**
   ```bash
   kubectl describe ingress event-i-ingress -n event-i
   ```

### Debug Commands

```bash
# Port forward for local testing
kubectl port-forward service/server 5001:5001 -n event-i

# Execute commands in pods
kubectl exec -it deployment/server -n event-i -- /bin/sh

# Check resource usage
kubectl top pods -n event-i
```

## Customization

### Environment-Specific Configs

Use Kustomize overlays for environment-specific configurations:

```bash
# Staging
kubectl apply -k overlays/staging/

# Production
kubectl apply -k overlays/production/
```

### Resource Adjustments

Edit deployment files to adjust:
- Resource requests/limits
- Replica counts
- Environment variables
- Volume sizes

## Backup and Recovery

### Database Backup

```bash
# Create MongoDB backup
kubectl exec mongodb-0 -n event-i -- mongodump --out /tmp/backup
```

### Persistent Volume Snapshots

```bash
# Create snapshot
gcloud compute disks snapshot DISK_NAME --zone=us-central1-a
```

## Support

For issues:
1. Check troubleshooting section
2. Review Kubernetes documentation
3. Check application logs
4. Contact development team
