#!/bin/bash

# GKE Setup Script for Event-i
# This script sets up a GKE cluster and installs required components

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-project-id"}
CLUSTER_NAME=${CLUSTER_NAME:-"event-i-cluster"}
ZONE=${ZONE:-"us-central1-a"}
NODE_COUNT=${NODE_COUNT:-2}
MACHINE_TYPE=${MACHINE_TYPE:-"n1-standard-2"}

echo "🚀 Setting up GKE cluster for Event-i..."
echo "Project: $PROJECT_ID"
echo "Cluster: $CLUSTER_NAME"
echo "Zone: $ZONE"
echo "Nodes: $NODE_COUNT ($MACHINE_TYPE)"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install it first."
    exit 1
fi

# Set project
echo "📝 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Create GKE cluster
echo "🏗️ Creating GKE cluster..."
gcloud container clusters create $CLUSTER_NAME \
    --zone=$ZONE \
    --num-nodes=$NODE_COUNT \
    --machine-type=$MACHINE_TYPE \
    --enable-autoscaling \
    --min-nodes=1 \
    --max-nodes=5 \
    --enable-autorepair \
    --enable-autoupgrade \
    --disk-size=50GB \
    --disk-type=pd-ssd \
    --enable-ip-alias \
    --network=default \
    --subnetwork=default \
    --enable-network-policy \
    --addons=HttpLoadBalancing,HorizontalPodAutoscaling

# Get cluster credentials
echo "🔑 Getting cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE

# Install Nginx Ingress Controller
echo "🌐 Installing Nginx Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Wait for ingress controller to be ready
echo "⏳ Waiting for Nginx Ingress Controller to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

# Install cert-manager
echo "🔒 Installing cert-manager..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
echo "⏳ Waiting for cert-manager to be ready..."
kubectl wait --namespace cert-manager \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

# Create namespaces
echo "📁 Creating namespaces..."
kubectl apply -f k8s/namespace.yaml

# Apply cert-manager configuration
echo "🔐 Applying cert-manager configuration..."
kubectl apply -f k8s/cert-manager/

# Apply storage classes
echo "💾 Applying storage classes..."
kubectl apply -f k8s/persistent-volumes.yaml

echo "✅ GKE cluster setup completed!"
echo ""
echo "Next steps:"
echo "1. Update PROJECT_ID in k8s/*.yaml files"
echo "2. Create secrets: ./scripts/setup-secrets.sh"
echo "3. Deploy application: ./scripts/deploy.sh"
echo ""
echo "Cluster info:"
echo "Name: $CLUSTER_NAME"
echo "Zone: $ZONE"
echo "Nodes: $NODE_COUNT"
echo ""
echo "To connect to the cluster:"
echo "gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE"
