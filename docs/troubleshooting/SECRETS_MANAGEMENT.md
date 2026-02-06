# Secrets Management Guide for Event-i

## Overview

This guide covers how to securely manage sensitive configuration data for the Event-i application deployed on Google Kubernetes Engine (GKE).

## Kubernetes Secrets

### Creating Secrets

#### Method 1: Using YAML Files

1. Copy the template:
   ```bash
   cp k8s/secrets.yaml.example k8s/secrets.yaml
   ```

2. Update values with base64 encoded strings:
   ```bash
   echo -n "your-secret-value" | base64
   ```

3. Apply secrets:
   ```bash
   kubectl apply -f k8s/secrets.yaml
   ```

#### Method 2: Using kubectl

```bash
# Create secret from literal values
kubectl create secret generic app-secrets \
    --from-literal=jwt-secret="your-jwt-secret" \
    --from-literal=jwt-refresh-secret="your-refresh-secret" \
    --namespace=event-i
```

#### Method 3: Using Script

```bash
# Use the provided script
./scripts/setup-secrets.sh
```

### Required Secrets

| Secret Key | Description | Example |
|------------|-------------|---------|
| `jwt-secret` | JWT signing secret | Generate with `openssl rand -base64 32` |
| `jwt-refresh-secret` | JWT refresh secret | Generate with `openssl rand -base64 32` |
| `payhero-username` | Payhero API username | From Payhero dashboard |
| `payhero-password` | Payhero API password | From Payhero dashboard |
| `payhero-account-id` | Payhero account ID | From Payhero dashboard |
| `payhero-basic-auth-token` | Payhero basic auth token | Base64 encoded |
| `payhero-channel-id` | Payhero channel ID | From Payhero dashboard |
| `mpesa-consumer-key` | M-Pesa consumer key | From Safaricom developer portal |
| `mpesa-consumer-secret` | M-Pesa consumer secret | From Safaricom developer portal |
| `mpesa-passkey` | M-Pesa passkey | From Safaricom developer portal |
| `mpesa-shortcode` | M-Pesa shortcode | From Safaricom developer portal |
| `smtp-host` | SMTP server hostname | `smtp.gmail.com` |
| `smtp-port` | SMTP server port | `587` |
| `smtp-user` | SMTP username | `noreply@event-i.co.ke` |
| `smtp-pass` | SMTP password/app password | Gmail app password |
| `ticket-qr-secret` | QR code generation secret | Generate with `openssl rand -base64 32` |
| `ticket-qr-enc-key` | QR code encryption key | Generate with `openssl rand -base64 32` |
| `sentry-dsn` | Sentry DSN for error tracking | From Sentry dashboard |

### Generating Secure Secrets

#### JWT Secrets
```bash
# Generate secure JWT secret
openssl rand -base64 32

# Example output: h138xvXG9wlW6y0gEBrih129REjACUTFN1hpFG0GkzI=
```

#### Encryption Keys
```bash
# Generate AES-256 encryption key
openssl rand -base64 32

# Example output: h138xvXG9wlW6y0gEBrih129REjACUTFN1hpFG0GkzI=
```

#### MongoDB Password
```bash
# Generate secure MongoDB password
openssl rand -base64 16

# Example output: cGFzc3dvcmQxMjM=
```

## Secret Rotation

### Manual Rotation

1. **Update the secret:**
   ```bash
   # Edit the secret
   kubectl edit secret app-secrets -n event-i
   ```

2. **Restart affected pods:**
   ```bash
   kubectl rollout restart deployment/server -n event-i
   ```

### Automated Rotation

For production environments, consider using:
- Google Secret Manager
- External Secrets Operator
- Vault integration

## Security Best Practices

### 1. Access Control

```bash
# Create RBAC for secret access
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: event-i
  name: secret-reader
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]
```

### 2. Encryption at Rest

Ensure your GKE cluster has encryption at rest enabled:

```bash
# Check cluster encryption
gcloud container clusters describe event-i-cluster \
    --zone=us-central1-a \
    --format="value(databaseEncryption)"
```

### 3. Network Policies

Restrict secret access with network policies:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-secret-access
  namespace: event-i
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: server
```

## Google Secret Manager Integration

### Setup

1. **Enable Secret Manager API:**
   ```bash
   gcloud services enable secretmanager.googleapis.com
   ```

2. **Create secrets in Secret Manager:**
   ```bash
   echo -n "your-secret" | gcloud secrets create jwt-secret --data-file=-
   ```

3. **Install External Secrets Operator:**
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/external-secrets/external-secrets/main/deploy/charts/external-secrets/templates/install.yaml
   ```

4. **Create SecretStore:**
   ```yaml
   apiVersion: external-secrets.io/v1beta1
   kind: SecretStore
   metadata:
     name: gcp-secret-store
     namespace: event-i
   spec:
     provider:
       gcpsm:
         projectId: PROJECT_ID
         auth:
           workloadIdentity:
             clusterLocation: us-central1-a
             clusterName: event-i-cluster
             serviceAccountRef:
               name: event-i-deployer
   ```

5. **Create ExternalSecret:**
   ```yaml
   apiVersion: external-secrets.io/v1beta1
   kind: ExternalSecret
   metadata:
     name: app-secrets
     namespace: event-i
   spec:
     refreshInterval: 1h
     secretStoreRef:
       name: gcp-secret-store
       kind: SecretStore
     target:
       name: app-secrets
       creationPolicy: Owner
     data:
     - secretKey: jwt-secret
       remoteRef:
         key: jwt-secret
   ```

## Monitoring and Auditing

### Secret Access Monitoring

```bash
# Check secret access logs
kubectl logs -f deployment/server -n event-i | grep -i secret

# Monitor secret changes
kubectl get events -n event-i --field-selector involvedObject.kind=Secret
```

### Audit Logging

Enable audit logging in GKE:

```bash
# Enable audit logging
gcloud container clusters update event-i-cluster \
    --zone=us-central1-a \
    --enable-audit-logging \
    --audit-log-config-file=audit-config.yaml
```

## Troubleshooting

### Common Issues

1. **Secret not found**
   ```bash
   kubectl get secrets -n event-i
   kubectl describe secret app-secrets -n event-i
   ```

2. **Base64 encoding issues**
   ```bash
   # Check if value is properly encoded
   echo "base64-value" | base64 -d
   ```

3. **Permission denied**
   ```bash
   # Check RBAC permissions
   kubectl auth can-i get secrets --as=system:serviceaccount:event-i:default -n event-i
   ```

### Debugging Commands

```bash
# View secret (base64 encoded)
kubectl get secret app-secrets -n event-i -o yaml

# Decode secret value
kubectl get secret app-secrets -n event-i -o jsonpath='{.data.jwt-secret}' | base64 -d

# Check pod environment variables
kubectl exec deployment/server -n event-i -- env | grep -i secret
```

## Backup and Recovery

### Secret Backup

```bash
# Backup all secrets
kubectl get secrets -n event-i -o yaml > secrets-backup.yaml

# Backup specific secret
kubectl get secret app-secrets -n event-i -o yaml > app-secrets-backup.yaml
```

### Secret Recovery

```bash
# Restore from backup
kubectl apply -f secrets-backup.yaml

# Verify restoration
kubectl get secrets -n event-i
```

## Production Considerations

### 1. Secret Lifecycle Management

- Implement secret rotation policies
- Use automated secret generation
- Monitor secret expiration

### 2. Compliance

- Ensure secrets meet compliance requirements
- Implement proper access controls
- Maintain audit trails

### 3. Disaster Recovery

- Backup secrets regularly
- Test secret recovery procedures
- Document secret dependencies

## Support

For secret management issues:
1. Check the troubleshooting section
2. Review Kubernetes secrets documentation
3. Consult security team for compliance questions
4. Contact development team for application-specific issues
