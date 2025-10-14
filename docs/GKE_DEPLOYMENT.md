# GKE Deployment Guide for Event-i

## Overview

This guide covers deploying the Event-i application to Google Kubernetes Engine (GKE) with automated CI/CD, self-hosted databases, and Let's Encrypt SSL certificates.

## Prerequisites

### Required Tools
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (gcloud)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Docker](https://docs.docker.com/get-docker/)
- [Git](https://git-scm.com/downloads)

### Google Cloud Setup
1. Create a Google Cloud Project
2. Enable billing
3. Enable required APIs:
   - Kubernetes Engine API
   - Container Registry API
   - Cloud Build API
   - Compute Engine API

### GitHub Repository Setup
1. Fork/clone this repository
2. Set up GitHub Secrets:
   - `GCP_PROJECT_ID`: Your Google Cloud Project ID
   - `GCP_SA_KEY`: Service Account key (JSON)

## Initial Setup

### 1. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create event-i-deployer \
    --display-name="Event-i Deployer" \
    --description="Service account for Event-i deployment"

# Grant necessary permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:event-i-deployer@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/container.developer"

gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:event-i-deployer@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Create and download key
gcloud iam service-accounts keys create key.json \
    --iam-account=event-i-deployer@PROJECT_ID.iam.gserviceaccount.com
```

### 2. Set Up GKE Cluster

```bash
# Update PROJECT_ID in scripts
export PROJECT_ID="your-project-id"

# Run setup script
./scripts/gke-setup.sh
```

### 3. Configure Secrets

```bash
# Copy secrets template
cp k8s/secrets.yaml.example k8s/secrets.yaml

# Edit secrets.yaml with your actual values
# All values must be base64 encoded
echo -n "your-secret" | base64

# Apply secrets
./scripts/setup-secrets.sh
```

### 4. Update Configuration

Update the following files with your project ID:

```bash
# Replace PROJECT_ID in deployment files
sed -i 's/PROJECT_ID/your-project-id/g' k8s/server-deployment.yaml
sed -i 's/PROJECT_ID/your-project-id/g' k8s/client-deployment.yaml
sed -i 's/PROJECT_ID/your-project-id/g' cloudbuild.yaml
sed -i 's/PROJECT_ID/your-project-id/g' cloudbuild.staging.yaml
```

## Deployment

### Manual Deployment

```bash
# Deploy to production
./scripts/deploy.sh

# Deploy to staging
kubectl apply -k k8s/overlays/staging/
```

### Automated Deployment

1. Push code to `main` branch
2. GitHub Actions will automatically:
   - Run tests
   - Build Docker images
   - Push to Google Container Registry
   - Deploy to GKE

## DNS Configuration

After deployment, get the ingress IP:

```bash
kubectl get ingress event-i-ingress -n event-i
```

Update your DNS records:
- `event-i.co.ke` → Ingress IP
- `www.event-i.co.ke` → Ingress IP (optional)
- `staging.event-i.co.ke` → Ingress IP (for staging)

## SSL Certificates

SSL certificates are automatically managed by cert-manager:

```bash
# Check certificate status
kubectl get certificate -n event-i

# Check certificate details
kubectl describe certificate event-i-tls -n event-i
```

## Monitoring and Logs

### View Logs

```bash
# Server logs
kubectl logs -f deployment/server -n event-i

# Client logs
kubectl logs -f deployment/client -n event-i

# MongoDB logs
kubectl logs -f statefulset/mongodb -n event-i

# Redis logs
kubectl logs -f deployment/redis -n event-i
```

### Check Status

```bash
# Pod status
kubectl get pods -n event-i

# Service status
kubectl get services -n event-i

# Ingress status
kubectl get ingress -n event-i

# Certificate status
kubectl get certificate -n event-i
```

## Scaling

### Horizontal Pod Autoscaling

The application automatically scales based on CPU and memory usage:

```bash
# Check HPA status
kubectl get hpa -n event-i

# Manually scale
kubectl scale deployment server --replicas=5 -n event-i
```

### Cluster Scaling

```bash
# Scale cluster nodes
gcloud container clusters resize event-i-cluster \
    --num-nodes=3 \
    --zone=us-central1-a
```

## Troubleshooting

### Common Issues

1. **Pods not starting**
   ```bash
   kubectl describe pod POD_NAME -n event-i
   kubectl logs POD_NAME -n event-i
   ```

2. **SSL certificate not issued**
   ```bash
   kubectl describe certificate event-i-tls -n event-i
   kubectl logs -f deployment/cert-manager -n cert-manager
   ```

3. **MongoDB connection issues**
   ```bash
   kubectl exec -it mongodb-0 -n event-i -- mongo
   ```

4. **Ingress not working**
   ```bash
   kubectl describe ingress event-i-ingress -n event-i
   kubectl logs -f deployment/ingress-nginx-controller -n ingress-nginx
   ```

### Useful Commands

```bash
# Port forward for local testing
kubectl port-forward service/server 5001:5001 -n event-i
kubectl port-forward service/client 3000:80 -n event-i

# Execute commands in pods
kubectl exec -it deployment/server -n event-i -- /bin/sh
kubectl exec -it mongodb-0 -n event-i -- mongo

# Restart deployments
kubectl rollout restart deployment/server -n event-i
kubectl rollout restart deployment/client -n event-i
```

## Cost Optimization

### Resource Limits

Adjust resource requests/limits in deployment files based on actual usage:

```bash
# Check resource usage
kubectl top pods -n event-i
kubectl top nodes
```

### Cluster Management

- Use preemptible nodes for non-production workloads
- Enable cluster autoscaling
- Use regional persistent disks for better availability

## Security

### Best Practices

1. **Secrets Management**
   - Rotate secrets regularly
   - Use Google Secret Manager for production
   - Never commit secrets to Git

2. **Network Security**
   - Enable network policies
   - Use private clusters
   - Restrict API access

3. **Container Security**
   - Use non-root containers
   - Scan images for vulnerabilities
   - Keep base images updated

## Backup and Recovery

### Database Backup

```bash
# Create MongoDB backup
kubectl exec mongodb-0 -n event-i -- mongodump --out /tmp/backup

# Copy backup to local
kubectl cp mongodb-0:/tmp/backup ./mongodb-backup -n event-i
```

### Persistent Volume Snapshots

```bash
# Create snapshot
gcloud compute disks snapshot DISK_NAME --zone=us-central1-a

# Restore from snapshot
# Update PVC to use snapshot as source
```

## Maintenance

### Updates

1. **Application Updates**
   - Push code to main branch
   - GitHub Actions handles deployment

2. **Cluster Updates**
   ```bash
   gcloud container clusters upgrade event-i-cluster --zone=us-central1-a
   ```

3. **Node Updates**
   ```bash
   gcloud container node-pools upgrade NODE_POOL_NAME \
       --cluster=event-i-cluster \
       --zone=us-central1-a
   ```

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Kubernetes and GKE documentation
3. Check application logs
4. Contact the development team

## Cost Estimation

**Monthly costs (approximate):**
- GKE cluster (2 x n1-standard-2): ~$100
- Persistent disks (35Gi SSD): ~$7
- Load balancer: ~$18
- Container Registry storage: ~$5
- **Total: ~$130/month**

Costs may vary based on:
- Traffic volume
- Resource usage
- Region selection
- Additional services used
