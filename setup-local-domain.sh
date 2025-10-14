#!/bin/bash

# Event-i Local Domain Setup Script
# This script manages the event-i.co.ke domain entry in /etc/hosts
# without affecting other localhost entries

set -e

DOMAIN="event-i.co.ke"
HOSTS_FILE="/etc/hosts"
BACKUP_FILE="/etc/hosts.backup.$(date +%Y%m%d_%H%M%S)"
TEMP_FILE="/tmp/hosts.tmp"
SUDO_PASSWORD="${SUDO_PASSWORD:-achieng}"

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

# Function to check if domain exists in hosts file
check_domain_exists() {
    grep -q "^127\.0\.0\.1[[:space:]]*${DOMAIN}$" "$HOSTS_FILE" 2>/dev/null
}

# Function to add domain to hosts file
add_domain() {
    print_status "Adding ${DOMAIN} to hosts file..."
    
    # Check if already exists
    if check_domain_exists; then
        print_warning "${DOMAIN} already exists in hosts file"
        return 0
    fi
    
    # Create backup
    print_status "Creating backup of hosts file..."
    echo "$SUDO_PASSWORD" | sudo -S cp "$HOSTS_FILE" "$BACKUP_FILE"
    print_success "Backup created: $BACKUP_FILE"
    
    # Add domain entry
    echo "$SUDO_PASSWORD" | sudo -S sh -c "echo '127.0.0.1	${DOMAIN}' >> '$HOSTS_FILE'"
    print_success "${DOMAIN} added to hosts file"
}

# Function to remove domain from hosts file
remove_domain() {
    print_status "Removing ${DOMAIN} from hosts file..."
    
    # Check if exists
    if ! check_domain_exists; then
        print_warning "${DOMAIN} not found in hosts file"
        return 0
    fi
    
    # Create backup
    print_status "Creating backup of hosts file..."
    echo "$SUDO_PASSWORD" | sudo -S cp "$HOSTS_FILE" "$BACKUP_FILE"
    print_success "Backup created: $BACKUP_FILE"
    
    # Remove domain entry
    echo "$SUDO_PASSWORD" | sudo -S sed -i.tmp "/^127\.0\.0\.1[[:space:]]*${DOMAIN}$/d" "$HOSTS_FILE"
    echo "$SUDO_PASSWORD" | sudo -S rm -f "${HOSTS_FILE}.tmp"
    print_success "${DOMAIN} removed from hosts file"
}

# Function to show current status
show_status() {
    print_status "Checking hosts file status..."
    
    if check_domain_exists; then
        print_success "${DOMAIN} is configured in hosts file"
        echo ""
        echo "Current entry:"
        grep "^127\.0\.0\.1[[:space:]]*${DOMAIN}$" "$HOSTS_FILE"
        echo ""
        echo "You can access Event-i at:"
        echo "  Frontend: https://${DOMAIN}/"
        echo "  API: https://${DOMAIN}/api/health"
    else
        print_warning "${DOMAIN} is not configured in hosts file"
        echo ""
        echo "To add it, run: $0 add"
    fi
}

# Function to test domain resolution
test_domain() {
    print_status "Testing domain resolution..."
    
    if ping -c 1 "$DOMAIN" > /dev/null 2>&1; then
        print_success "${DOMAIN} resolves correctly"
        
        # Test HTTPS connection
        if curl -k -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/api/health" | grep -q "200"; then
            print_success "HTTPS connection to ${DOMAIN} is working"
            echo ""
            echo "✅ Event-i is accessible at: https://${DOMAIN}/"
        else
            print_warning "HTTPS connection failed. Make sure Event-i is running."
            echo "Run: docker-compose -f docker-compose.prod.yml up -d"
        fi
    else
        print_error "${DOMAIN} does not resolve"
        echo "Make sure the domain is added to hosts file: $0 add"
    fi
}

# Function to show help
show_help() {
    echo "Event-i Local Domain Setup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  add     - Add event-i.local to hosts file"
    echo "  remove  - Remove event-i.local from hosts file"
    echo "  status  - Show current status"
    echo "  test    - Test domain resolution and connection"
    echo "  help    - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 add      # Add domain to hosts file"
    echo "  $0 status   # Check if domain is configured"
    echo "  $0 test     # Test if Event-i is accessible"
    echo "  $0 remove   # Remove domain from hosts file"
    echo ""
    echo "Environment Variables:"
    echo "  SUDO_PASSWORD - Sudo password (defaults to 'achieng')"
    echo ""
    echo "Notes:"
    echo "  - This script creates backups of your hosts file"
    echo "  - Only affects event-i.local, leaves other entries intact"
    echo "  - Requires sudo privileges to modify /etc/hosts"
    echo "  - Set SUDO_PASSWORD environment variable to customize password"
}

# Main script logic
case "${1:-help}" in
    "add")
        add_domain
        echo ""
        test_domain
        ;;
    "remove")
        remove_domain
        ;;
    "status")
        show_status
        ;;
    "test")
        test_domain
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
