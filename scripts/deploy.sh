#!/bin/bash

# Deploy Script for Event-i on GKE
# This script deploys the application to the GKE cluster

set -e

# Configuration
NAMESPACE=${NAMESPACE:-"event-i"}
PROJECT_ID=${PROJECT_ID:-"your-project-id"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}

echo "🚀 Deploying Event-i to GKE..."
echo "Namespace: $NAMESPACE"
echo "Project: $PROJECT_ID"
echo "Image Tag: $IMAGE_TAG"

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ kubectl is not configured or cluster is not accessible."
    echo "Please run: gcloud container clusters get-credentials <cluster-name> --zone=<zone>"
    exit 1
fi

# Update image tags in deployment files
echo "📝 Updating image tags..."
sed -i.bak "s|gcr.io/PROJECT_ID/event-i-server:latest|gcr.io/$PROJECT_ID/event-i-server:$IMAGE_TAG|g" k8s/server-deployment.yaml
sed -i.bak "s|gcr.io/PROJECT_ID/event-i-client:latest|gcr.io/$PROJECT_ID/event-i-client:$IMAGE_TAG|g" k8s/client-deployment.yaml

# Apply configurations
echo "📦 Applying configurations..."
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/persistent-volumes.yaml

# Apply MongoDB
echo "🍃 Deploying MongoDB..."
kubectl apply -f k8s/mongodb-statefulset.yaml

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
kubectl wait --for=condition=ready pod -l app=mongodb -n $NAMESPACE --timeout=300s

# Initialize MongoDB replica set
echo "🔧 Initializing MongoDB replica set..."
kubectl exec -n $NAMESPACE mongodb-0 -- mongo --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'mongodb-0.mongodb:27017'}, {_id: 1, host: 'mongodb-1.mongodb:27017'}, {_id: 2, host: 'mongodb-2.mongodb:27017'}]})"

# Apply Redis
echo "🔴 Deploying Redis..."
kubectl apply -f k8s/redis-deployment.yaml

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s

# Apply server deployment
echo "🖥️ Deploying server..."
kubectl apply -f k8s/server-deployment.yaml

# Apply client deployment
echo "🌐 Deploying client..."
kubectl apply -f k8s/client-deployment.yaml

# Apply ingress
echo "🌍 Applying ingress..."
kubectl apply -f k8s/nginx-ingress.yaml

# Apply HPA
echo "📈 Applying horizontal pod autoscaler..."
kubectl apply -f k8s/hpa.yaml

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available deployment/server -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=available deployment/client -n $NAMESPACE --timeout=300s

# Get ingress IP
echo "🔍 Getting ingress IP..."
INGRESS_IP=$(kubectl get ingress event-i-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Ingress IP: $INGRESS_IP"

# Show deployment status
echo "📊 Deployment Status:"
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE
kubectl get ingress -n $NAMESPACE

echo ""
echo "✅ Deployment completed!"
echo ""
echo "Next steps:"
echo "1. Update your DNS to point event-i.co.ke to: $INGRESS_IP"
echo "2. Wait for SSL certificate to be issued (may take a few minutes)"
echo "3. Test the application at: https://event-i.co.ke"
echo ""
echo "To check certificate status:"
echo "kubectl get certificate -n $NAMESPACE"
echo ""
echo "To view logs:"
echo "kubectl logs -f deployment/server -n $NAMESPACE"
echo "kubectl logs -f deployment/client -n $NAMESPACE"
