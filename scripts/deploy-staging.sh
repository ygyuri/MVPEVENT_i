#!/bin/bash

# Event-i Staging Deployment Script
# This script deploys the Event-i application to the staging environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required files exist
check_requirements() {
    print_status "Checking deployment requirements..."
    
    if [ ! -f "docker-compose.staging.yml" ]; then
        print_error "docker-compose.staging.yml not found"
        exit 1
    fi
    
    if [ ! -f "env.staging.example" ]; then
        print_error "env.staging.example not found"
        exit 1
    fi
    
    if [ ! -f ".env.staging" ]; then
        print_warning ".env.staging not found, creating from example..."
        cp env.staging.example .env.staging
        print_success ".env.staging created. Please edit it with your staging configuration."
        print_warning "You must configure .env.staging before deploying to staging!"
        exit 1
    fi
    
    print_success "All requirements met"
}

# Function to validate staging configuration
validate_config() {
    print_status "Validating staging configuration..."
    
    # Check if critical environment variables are set
    if grep -q "staging-secure-mongodb-password" .env.staging; then
        print_warning "Default MongoDB password detected. Please change it in .env.staging"
    fi
    
    if grep -q "staging-super-secure-jwt-secret-change-in-production" .env.staging; then
        print_warning "Default JWT secret detected. Please change it in .env.staging"
    fi
    
    if grep -q "staging.event-i.com" .env.staging; then
        print_success "Staging domain configured"
    else
        print_warning "Please configure FRONTEND_URL in .env.staging"
    fi
    
    print_success "Configuration validation completed"
}

# Function to deploy staging environment
deploy_staging() {
    print_status "Deploying Event-i to staging environment..."
    
    # Stop existing staging containers
    print_status "Stopping existing staging containers..."
    docker compose -f docker-compose.staging.yml down 2>/dev/null || true
    
    # Build and start staging containers
    print_status "Building and starting staging containers..."
    docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build
    
    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    sleep 15
    
    # Check container status
    print_status "Checking container status..."
    docker compose -f docker-compose.staging.yml ps
    
    print_success "Staging deployment completed!"
}

# Function to show deployment information
show_deployment_info() {
    print_status "Staging Deployment Information"
    echo "=================================="
    echo ""
    echo "🌐 Staging URLs:"
    echo "   Frontend: https://staging.event-i.com/"
    echo "   API:      https://staging.event-i.com/api/health"
    echo "   Health:   https://staging.event-i.com/health"
    echo ""
    echo "📊 Management Commands:"
    echo "   Status:   make status-staging"
    echo "   Logs:    make logs-staging"
    echo "   Stop:     make down-staging"
    echo "   Clean:    make clean-staging"
    echo ""
    echo "🔍 Testing Commands:"
    echo "   curl -k https://staging.event-i.com/health"
    echo "   curl -k https://staging.event-i.com/api/health"
    echo ""
}

# Main deployment function
main() {
    echo "🚀 Event-i Staging Deployment"
    echo "=============================="
    echo ""
    
    check_requirements
    validate_config
    
    # Ask for confirmation
    echo ""
    print_warning "This will deploy Event-i to the staging environment."
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled"
        exit 0
    fi
    
    deploy_staging
    show_deployment_info
    
    print_success "Staging deployment completed successfully!"
}

# Run main function
main "$@"
