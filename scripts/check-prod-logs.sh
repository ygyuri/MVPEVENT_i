#!/bin/bash

# Production Server Log Checker
# Usage: ./check-prod-logs.sh [container_name]
# 
# Examples:
#   ./check-prod-logs.sh                    # Check all containers
#   ./check-prod-logs.sh server             # Check server logs only
#   ./check-prod-logs.sh client             # Check client logs only
#   ./check-prod-logs.sh nginx              # Check nginx logs only
#   ./check-prod-logs.sh mongodb            # Check mongodb logs only

# SSH Configuration - using SSH alias from ~/.ssh/config
# Make sure you have an alias 'event-i-prod' configured in ~/.ssh/config
# Example:
# Host event-i-prod
#   HostName your-server-ip-or-domain
#   User root
#   IdentityFile ~/.ssh/your-key.pem
#   Port 22

SSH_ALIAS="event-i-prod"
PROD_PATH="/root/MVPEVENT_i"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test SSH connection
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes $SSH_ALIAS "echo 'Connected'" > /dev/null 2>&1; then
    print_error "Cannot connect to $SSH_ALIAS!"
    echo ""
    echo "Please ensure you have an SSH alias 'event-i-prod' configured in ~/.ssh/config"
    echo ""
    echo "Example ~/.ssh/config:"
    echo "  Host event-i-prod"
    echo "    HostName your-server-ip-or-domain"
    echo "    User root"
    echo "    IdentityFile ~/.ssh/your-key.pem"
    echo "    Port 22"
    exit 1
fi

# Service name mapping (docker compose uses service names, not container names)
SERVICE_NAME=""
CONTAINER_NAME=""
if [ -n "$1" ]; then
    case "$1" in
        server)
            SERVICE_NAME="server"
            CONTAINER_NAME="event_i_server_prod"
            ;;
        client)
            SERVICE_NAME="client"
            CONTAINER_NAME="event_i_client_prod"
            ;;
        nginx)
            SERVICE_NAME="nginx"
            CONTAINER_NAME="event_i_nginx_prod"
            ;;
        mongodb|mongo)
            SERVICE_NAME="mongodb"
            CONTAINER_NAME="event_i_mongodb_prod"
            ;;
        redis)
            SERVICE_NAME="redis"
            CONTAINER_NAME="event_i_redis_prod"
            ;;
        *)
            print_error "Unknown container: $1"
            echo ""
            echo "Available containers:"
            echo "  server  - Backend API server"
            echo "  client  - Frontend client"
            echo "  nginx   - Nginx reverse proxy"
            echo "  mongodb - MongoDB database"
            echo "  redis   - Redis cache"
            exit 1
            ;;
    esac
fi

print_status "Connecting to production server via: $SSH_ALIAS"
echo ""

# Build SSH command using the alias
SSH_CMD="ssh $SSH_ALIAS"

# Check container status first
print_status "Checking container status..."
$SSH_CMD "cd $PROD_PATH && sudo docker compose -f docker-compose.prod.yml ps"

echo ""

# Function to show logs (uses service name for docker compose)
show_logs() {
    local service=$1
    local lines=${2:-100}
    
    print_status "Showing last $lines lines of logs for: $service"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    $SSH_CMD "cd $PROD_PATH && sudo docker compose -f docker-compose.prod.yml logs --tail=$lines $service"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Function to show recent errors
show_errors() {
    local service=$1
    print_status "Showing recent errors for: $service"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    $SSH_CMD "cd $PROD_PATH && sudo docker compose -f docker-compose.prod.yml logs --tail=200 $service 2>&1 | grep -i -E '(error|exception|failed|fatal|crash)' | tail -50"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main logic
if [ -n "$SERVICE_NAME" ]; then
    # Show logs for specific service
    show_logs "$SERVICE_NAME" 100
    
    echo ""
    print_status "Recent errors for $SERVICE_NAME:"
    show_errors "$SERVICE_NAME"
else
    # Show logs for all containers
    print_status "Showing logs for all services (last 50 lines each)..."
    echo ""
    
    for service in "server" "client" "nginx"; do
        echo ""
        show_logs "$service" 50
        echo ""
        print_status "Recent errors for $service:"
        show_errors "$service"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    done
fi

echo ""
print_status "Useful commands for debugging:"
echo ""
echo "  # Follow logs in real-time:"
if [ -n "$SERVICE_NAME" ]; then
    echo "  $SSH_CMD 'cd $PROD_PATH && sudo docker compose -f docker-compose.prod.yml logs -f $SERVICE_NAME'"
else
    echo "  $SSH_CMD 'cd $PROD_PATH && sudo docker compose -f docker-compose.prod.yml logs -f server'"
fi
echo ""
echo "  # Check container health:"
echo "  $SSH_CMD 'cd $PROD_PATH && sudo docker compose -f docker-compose.prod.yml ps'"
echo ""
echo "  # Restart a service:"
if [ -n "$SERVICE_NAME" ]; then
    echo "  $SSH_CMD 'cd $PROD_PATH && sudo docker compose -f docker-compose.prod.yml restart $SERVICE_NAME'"
else
    echo "  $SSH_CMD 'cd $PROD_PATH && sudo docker compose -f docker-compose.prod.yml restart server'"
fi
echo ""
echo "  # Check disk space:"
echo "  $SSH_CMD 'df -h'"
echo ""
echo "  # Check Docker disk usage:"
echo "  $SSH_CMD 'sudo docker system df'"
echo ""

