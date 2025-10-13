#!/bin/bash

# Event-i UAT Deployment Script
# This script deploys the Event-i application to the UAT environment

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
    
    if [ ! -f "docker-compose.uat.yml" ]; then
        print_error "docker-compose.uat.yml not found"
        exit 1
    fi
    
    if [ ! -f "env.uat.example" ]; then
        print_error "env.uat.example not found"
        exit 1
    fi
    
    if [ ! -f ".env.uat" ]; then
        print_warning ".env.uat not found, creating from example..."
        cp env.uat.example .env.uat
        print_success ".env.uat created. Please edit it with your UAT configuration."
        print_warning "You must configure .env.uat before deploying to UAT!"
        exit 1
    fi
    
    print_success "All requirements met"
}

# Function to validate UAT configuration
validate_config() {
    print_status "Validating UAT configuration..."
    
    # Check if critical environment variables are set
    if grep -q "uat-secure-mongodb-password" .env.uat; then
        print_warning "Default MongoDB password detected. Please change it in .env.uat"
    fi
    
    if grep -q "uat-super-secure-jwt-secret-change-in-production" .env.uat; then
        print_warning "Default JWT secret detected. Please change it in .env.uat"
    fi
    
    if grep -q "uat.event-i.com" .env.uat; then
        print_success "UAT domain configured"
    else
        print_warning "Please configure FRONTEND_URL in .env.uat"
    fi
    
    # Check for production-like settings
    if grep -q "NODE_ENV=uat" .env.uat; then
        print_success "UAT environment mode configured"
    fi
    
    print_success "Configuration validation completed"
}

# Function to deploy UAT environment
deploy_uat() {
    print_status "Deploying Event-i to UAT environment..."
    
    # Stop existing UAT containers
    print_status "Stopping existing UAT containers..."
    docker-compose -f docker-compose.uat.yml down 2>/dev/null || true
    
    # Build and start UAT containers
    print_status "Building and starting UAT containers..."
    docker-compose -f docker-compose.uat.yml --env-file .env.uat up -d --build
    
    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    sleep 15
    
    # Check container status
    print_status "Checking container status..."
    docker-compose -f docker-compose.uat.yml ps
    
    print_success "UAT deployment completed!"
}

# Function to show deployment information
show_deployment_info() {
    print_status "UAT Deployment Information"
    echo "=============================="
    echo ""
    echo "🌐 UAT URLs:"
    echo "   Frontend: https://uat.event-i.com/"
    echo "   API:      https://uat.event-i.com/api/health"
    echo "   Health:   https://uat.event-i.com/health"
    echo ""
    echo "📊 Management Commands:"
    echo "   Status:   make status-uat"
    echo "   Logs:    make logs-uat"
    echo "   Stop:     make down-uat"
    echo "   Clean:    make clean-uat"
    echo ""
    echo "🔍 Testing Commands:"
    echo "   curl -k https://uat.event-i.com/health"
    echo "   curl -k https://uat.event-i.com/api/health"
    echo ""
    echo "📋 UAT Testing Checklist:"
    echo "   ✓ User registration and login"
    echo "   ✓ Event creation and management"
    echo "   ✓ Ticket purchasing flow"
    echo "   ✓ Payment processing"
    echo "   ✓ Email notifications"
    echo "   ✓ Mobile responsiveness"
    echo "   ✓ Performance under load"
    echo ""
}

# Function to run UAT tests
run_uat_tests() {
    print_status "Running UAT tests..."
    
    # Basic health checks
    print_status "Testing health endpoints..."
    
    # Test API health
    if curl -f -s -k https://uat.event-i.com/api/health > /dev/null; then
        print_success "API health check passed"
    else
        print_error "API health check failed"
        return 1
    fi
    
    # Test frontend health
    if curl -f -s -k https://uat.event-i.com/health > /dev/null; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
        return 1
    fi
    
    print_success "Basic UAT tests completed"
}

# Main deployment function
main() {
    echo "🚀 Event-i UAT Deployment"
    echo "========================="
    echo ""
    
    check_requirements
    validate_config
    
    # Ask for confirmation
    echo ""
    print_warning "This will deploy Event-i to the UAT environment."
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled"
        exit 0
    fi
    
    deploy_uat
    show_deployment_info
    
    # Ask if user wants to run tests
    echo ""
    read -p "Do you want to run basic UAT tests? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_uat_tests
    fi
    
    print_success "UAT deployment completed successfully!"
}

# Run main function
main "$@"
