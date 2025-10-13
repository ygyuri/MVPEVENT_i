#!/bin/bash

# Event-i Local Domain Startup Script
# This script starts Event-i with local domain support

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

# Function to check if domain is configured
check_domain_configured() {
    grep -q "^127\.0\.0\.1[[:space:]]*event-i\.local$" /etc/hosts 2>/dev/null
}

# Function to start Event-i
start_event_i() {
    print_status "Starting Event-i production stack..."
    
    # Create .env file from example if it doesn't exist
    if [ ! -f .env ]; then
        print_status "Creating .env file from env.example..."
        cp env.example .env
        print_success ".env file created. Please edit it with your configuration."
    else
        print_status ".env file already exists"
    fi
    
    # Start Docker containers
    docker compose -f docker compose.prod.yml up -d --build
    
    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    sleep 10
    
    # Check service status
    docker compose -f docker compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}"
    
    print_success "Event-i production stack started!"
}

# Function to show access URLs
show_access_urls() {
    echo ""
    echo "🌐 Event-i Access URLs:"
    echo "========================"
    
    if check_domain_configured; then
        echo "✅ Custom Domain (event-i.local):"
        echo "   Frontend: https://event-i.local/"
        echo "   API:      https://event-i.local/api/health"
        echo "   Health:   https://event-i.local/health"
    else
        echo "⚠️  Custom domain not configured"
        echo "   Run: ./setup-local-domain.sh add"
        echo ""
    fi
    
    echo "✅ Localhost (always available):"
    echo "   Frontend: https://localhost/"
    echo "   API:      https://localhost/api/health"
    echo "   Health:   https://localhost/health"
    
    echo ""
    echo "📱 Mobile Testing:"
    echo "   Find your IP: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
    echo "   Use IP instead of localhost on mobile devices"
}

# Function to test connections
test_connections() {
    echo ""
    echo "🔍 Testing Connections:"
    echo "======================"
    
    # Test localhost
    if curl -k -s -o /dev/null -w "%{http_code}" "https://localhost/api/health" | grep -q "200"; then
        print_success "localhost:443 - Working"
    else
        print_error "localhost:443 - Failed"
    fi
    
    # Test event-i.local if configured
    if check_domain_configured; then
        if curl -k -s -o /dev/null -w "%{http_code}" "https://event-i.local/api/health" | grep -q "200"; then
            print_success "event-i.local:443 - Working"
        else
            print_error "event-i.local:443 - Failed"
        fi
    else
        print_warning "event-i.local not configured - skipping test"
    fi
}

# Function to show help
show_help() {
    echo "Event-i Local Domain Startup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start   - Start Event-i with local domain support"
    echo "  stop    - Stop Event-i containers"
    echo "  restart - Restart Event-i containers"
    echo "  status  - Show container status"
    echo "  logs    - Show container logs"
    echo "  test    - Test connections"
    echo "  help    - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start    # Start Event-i"
    echo "  $0 status   # Check container status"
    echo "  $0 test     # Test connections"
    echo "  $0 stop     # Stop containers"
    echo ""
    echo "Domain Setup:"
    echo "  ./setup-local-domain.sh add    # Add event-i.local to hosts"
    echo "  ./setup-local-domain.sh status # Check domain status"
    echo "  ./setup-local-domain.sh test   # Test domain resolution"
}

# Main script logic
case "${1:-start}" in
    "start")
        start_event_i
        show_access_urls
        test_connections
        ;;
    "stop")
        print_status "Stopping Event-i containers..."
        docker compose -f docker compose.prod.yml down
        print_success "Event-i stopped!"
        ;;
    "restart")
        print_status "Restarting Event-i containers..."
        docker compose -f docker compose.prod.yml restart
        print_success "Event-i restarted!"
        show_access_urls
        ;;
    "status")
        print_status "Event-i container status:"
        docker compose -f docker compose.prod.yml ps --format "table {{.Name}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
        ;;
    "logs")
        print_status "Event-i container logs:"
        docker compose -f docker compose.prod.yml logs --tail=20
        ;;
    "test")
        test_connections
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
