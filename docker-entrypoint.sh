#!/bin/bash

# Event-i Docker Entrypoint Script
# Automatically sets up local domain and starts the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[ENTRYPOINT]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[ENTRYPOINT]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ENTRYPOINT]${NC} $1"
}

print_error() {
    echo -e "${RED}[ENTRYPOINT]${NC} $1"
}

# Function to check if we're running in Docker
is_docker() {
    [ -f /.dockerenv ] || [ -f /proc/1/cgroup ] && grep -q docker /proc/1/cgroup
}

# Function to setup local domain
setup_local_domain() {
    if [ "$AUTO_DOMAIN_SETUP" = "true" ] && [ -f "/usr/local/bin/setup-domain.sh" ]; then
        print_status "Setting up local domain..."
        
        # Make script executable
        chmod +x /usr/local/bin/setup-domain.sh
        
        # Run domain setup
        if /usr/local/bin/setup-domain.sh add; then
            print_success "Local domain setup completed"
        else
            print_warning "Local domain setup failed, continuing..."
        fi
    else
        print_status "Skipping domain setup (AUTO_DOMAIN_SETUP=false or script not found)"
    fi
}

# Function to wait for dependencies
wait_for_dependencies() {
    if [ -n "$WAIT_FOR" ]; then
        print_status "Waiting for dependencies: $WAIT_FOR"
        
        for service in $(echo "$WAIT_FOR" | tr ',' ' '); do
            print_status "Waiting for $service..."
            while ! nc -z "$service" 80 2>/dev/null; do
                sleep 1
            done
            print_success "$service is ready"
        done
    fi
}

# Function to start the main application
start_application() {
    print_status "Starting application: $*"
    exec "$@"
}

# Main entrypoint logic
main() {
    print_status "Event-i Docker Entrypoint Starting..."
    
    # Setup local domain if requested
    setup_local_domain
    
    # Wait for dependencies if specified
    wait_for_dependencies
    
    # Start the main application
    start_application "$@"
}

# Run main function with all arguments
main "$@"
