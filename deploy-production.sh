#!/bin/bash

# Event-i Production Deployment Script
# This script deploys the Event-i application to the production environment

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
    
    if [ ! -f "docker-compose.prod.yml" ]; then
        print_error "docker-compose.prod.yml not found"
        exit 1
    fi
    
    if [ ! -f "env.production.example" ]; then
        print_error "env.production.example not found"
        exit 1
    fi
    
    if [ ! -f ".env.production" ]; then
        print_warning ".env.production not found"
        print_status "For GitHub Actions deployment, .env.production is generated automatically from GitHub Secrets"
        print_status "Make sure all required secrets are configured in your GitHub repository settings"
        print_status "See GITHUB_SECRETS_SETUP.md for complete setup instructions"
        
        # Check if we're in a CI environment
        if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; then
            print_status "Running in CI environment - GitHub Secrets will be used"
        else
            print_warning "Running locally - you may need to create .env.production manually"
            print_warning "Copy env.production.example to .env.production and update with your values"
            exit 1
        fi
    fi
    
    print_success "All requirements met"
}

# Function to validate production configuration
validate_config() {
    print_status "Validating production configuration..."
    
    # Check if we're in CI environment (GitHub Actions)
    if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; then
        print_status "Running in CI environment - validation will be handled by GitHub Secrets"
        print_success "CI environment detected - GitHub Secrets validation passed"
        return 0
    fi
    
    # Local validation (if .env.production exists)
    if [ ! -f ".env.production" ]; then
        print_warning "No .env.production file found for local validation"
        return 0
    fi
    
    # Check for default values that must be changed
    if grep -q "CHANGE-THIS-SECURE-PASSWORD" .env.production; then
        print_error "Default MongoDB password detected. You MUST change it in .env.production"
        exit 1
    fi
    
    if grep -q "GENERATE-NEW-SECURE-JWT-SECRET" .env.production; then
        print_error "Default JWT secret detected. You MUST change it in .env.production"
        exit 1
    fi
    
    if grep -q "your-payhero-username" .env.production; then
        print_error "Default PayHero credentials detected. You MUST change them in .env.production"
        exit 1
    fi
    
    if grep -q "your-mpesa-consumer-key" .env.production; then
        print_error "Default MPESA credentials detected. You MUST change them in .env.production"
        exit 1
    fi
    
    if grep -q "your-domain.com" .env.production; then
        print_error "Please configure FRONTEND_URL and BASE_URL in .env.production"
        exit 1
    fi
    
    # Check for production environment
    if grep -q "NODE_ENV=production" .env.production; then
        print_success "Production environment mode configured"
    else
        print_error "NODE_ENV must be set to 'production'"
        exit 1
    fi
    
    # Check for security settings
    if grep -q "DEBUG=false" .env.production; then
        print_success "Debug mode disabled for production"
    else
        print_warning "Debug mode should be disabled in production"
    fi
    
    print_success "Production configuration validation completed"
}

# Function to backup existing production data
backup_production() {
    print_status "Creating production backup..."
    
    # Create backup directory
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup MongoDB data
    print_status "Backing up MongoDB data..."
    docker compose -f docker-compose.prod.yml exec -T mongodb mongodump --out /tmp/backup
    docker cp "$(docker compose -f docker-compose.prod.yml ps -q mongodb):/tmp/backup" "$BACKUP_DIR/mongodb"
    
    # Backup Redis data
    print_status "Backing up Redis data..."
    docker compose -f docker-compose.prod.yml exec -T redis redis-cli BGSAVE
    docker cp "$(docker compose -f docker-compose.prod.yml ps -q redis):/data/dump.rdb" "$BACKUP_DIR/redis/"
    
    print_success "Production backup created in $BACKUP_DIR"
}

# Function to clean up test data from production
cleanup_test_data() {
    print_status "Cleaning up test data from production..."
    
    # Check if cleanup script exists
    if [ ! -f "server/scripts/cleanup-production-data.js" ]; then
        print_error "Cleanup script not found: server/scripts/cleanup-production-data.js"
        return 1
    fi
    
    print_warning "This will permanently delete all test data from production!"
    print_warning "Make sure you have a backup before proceeding."
    echo ""
    read -p "Do you want to clean up test data? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Skipping test data cleanup"
        return 0
    fi
    
    # Run cleanup script
    print_status "Running production data cleanup..."
    docker compose -f docker-compose.prod.yml exec server node scripts/cleanup-production-data.js
    
    if [ $? -eq 0 ]; then
        print_success "Test data cleanup completed successfully"
    else
        print_error "Test data cleanup failed"
        return 1
    fi
}

# Function to deploy production environment
deploy_production() {
    print_status "Deploying Event-i to production environment..."
    
    # Stop existing production containers
    print_status "Stopping existing production containers..."
    docker compose -f docker-compose.prod.yml down 2>/dev/null || true
    
    # Build and start production containers
    print_status "Building and starting production containers..."
    docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
    
    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    sleep 20
    
    # Check container status
    print_status "Checking container status..."
    docker compose -f docker-compose.prod.yml ps
    
    print_success "Production deployment completed!"
}

# Function to run production health checks
run_health_checks() {
    print_status "Running production health checks..."
    
    # Test API health
    if curl -f -s -k https://event-i.com/api/health > /dev/null; then
        print_success "API health check passed"
    else
        print_error "API health check failed"
        return 1
    fi
    
    # Test frontend health
    if curl -f -s -k https://event-i.com/health > /dev/null; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
        return 1
    fi
    
    # Test SSL certificate
    if openssl s_client -connect event-i.com:443 -servername event-i.com < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        print_success "SSL certificate validation passed"
    else
        print_warning "SSL certificate validation failed"
    fi
    
    print_success "Production health checks completed"
}

# Function to show deployment information
show_deployment_info() {
    print_status "Production Deployment Information"
    echo "====================================="
    echo ""
    echo "🌐 Production URLs:"
    echo "   Frontend: https://event-i.com/"
    echo "   API:      https://event-i.com/api/health"
    echo "   Health:   https://event-i.com/health"
    echo ""
    echo "📊 Management Commands:"
    echo "   Status:   make status-prod"
    echo "   Logs:    make logs-prod"
    echo "   Stop:     make down-prod"
    echo "   Clean:    make clean-prod"
    echo ""
    echo "🔍 Monitoring Commands:"
    echo "   curl -k https://event-i.com/health"
    echo "   curl -k https://event-i.com/api/health"
    echo "   docker compose -f docker-compose.prod.yml logs -f"
    echo ""
    echo "🚨 Important Notes:"
    echo "   - Monitor logs regularly: make logs-prod"
    echo "   - Check SSL certificate expiry"
    echo "   - Monitor database performance"
    echo "   - Set up automated backups"
    echo "   - Configure monitoring alerts"
    echo ""
}

# Main deployment function
main() {
    echo "🚀 Event-i Production Deployment"
    echo "==============================="
    echo ""
    
    check_requirements
    validate_config
    
    # Ask for confirmation
    echo ""
    print_warning "This will deploy Event-i to the PRODUCTION environment."
    print_warning "This action will affect live users!"
    echo ""
    read -p "Are you absolutely sure you want to continue? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Production deployment cancelled"
        exit 0
    fi
    
    # Ask about backup
    echo ""
    read -p "Do you want to create a backup before deployment? (Y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        backup_production
    fi
    
    deploy_production
    
    # Ask about test data cleanup
    echo ""
    read -p "Do you want to clean up test data from production? (Y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        cleanup_test_data
    fi
    
    show_deployment_info
    
    # Ask if user wants to run health checks
    echo ""
    read -p "Do you want to run production health checks? (Y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        run_health_checks
    fi
    
    print_success "Production deployment completed successfully!"
    print_warning "Remember to monitor the application and set up alerts!"
}

# Run main function
main "$@"
