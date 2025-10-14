#!/bin/bash

# Setup Secrets Script for Event-i on GKE
# This script helps create Kubernetes secrets from environment files

set -e

# Configuration
NAMESPACE=${NAMESPACE:-"event-i"}
SECRETS_FILE=${SECRETS_FILE:-"k8s/secrets.yaml"}

echo "🔐 Setting up Kubernetes secrets for Event-i..."
echo "Namespace: $NAMESPACE"
echo "Secrets file: $SECRETS_FILE"

# Check if secrets file exists
if [ ! -f "$SECRETS_FILE" ]; then
    echo "❌ Secrets file $SECRETS_FILE not found."
    echo "Please copy k8s/secrets.yaml.example to k8s/secrets.yaml and update with your values."
    exit 1
fi

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ kubectl is not configured or cluster is not accessible."
    echo "Please run: gcloud container clusters get-credentials <cluster-name> --zone=<zone>"
    exit 1
fi

# Create namespace if it doesn't exist
echo "📁 Ensuring namespace exists..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply secrets
echo "🔑 Applying secrets..."
kubectl apply -f $SECRETS_FILE

# Verify secrets were created
echo "✅ Verifying secrets..."
kubectl get secrets -n $NAMESPACE

echo ""
echo "✅ Secrets setup completed!"
echo ""
echo "To update secrets:"
echo "1. Edit $SECRETS_FILE"
echo "2. Run: kubectl apply -f $SECRETS_FILE"
echo ""
echo "To view secrets (base64 encoded):"
echo "kubectl get secret app-secrets -n $NAMESPACE -o yaml"
echo ""
echo "To decode a secret value:"
echo "echo 'base64-encoded-value' | base64 -d"
