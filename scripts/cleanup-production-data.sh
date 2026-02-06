#!/bin/bash

# Production Data Cleanup Script
# This script removes all test data from production database

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

# Function to check if production is running
check_production_running() {
    print_status "Checking if production is running..."
    
    if ! docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        print_error "Production containers are not running!"
        print_error "Please start production first: docker compose -f docker-compose.prod.yml up -d"
        exit 1
    fi
    
    print_success "Production containers are running"
}

# Function to create backup before cleanup
create_backup() {
    print_status "Creating backup before cleanup..."
    
    BACKUP_DIR="backups/cleanup-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup MongoDB data
    print_status "Backing up MongoDB data..."
    docker compose -f docker-compose.prod.yml exec -T mongodb mongodump --out /tmp/backup
    docker cp "$(docker compose -f docker-compose.prod.yml ps -q mongodb):/tmp/backup" "$BACKUP_DIR/mongodb"
    
    print_success "Backup created in $BACKUP_DIR"
}

# Function to run cleanup
run_cleanup() {
    print_status "Running production data cleanup..."
    
    # Check if cleanup script exists
    if [ ! -f "server/scripts/cleanup-production-data.js" ]; then
        print_error "Cleanup script not found: server/scripts/cleanup-production-data.js"
        exit 1
    fi
    
    # Run cleanup script
    docker compose -f docker-compose.prod.yml exec server node scripts/cleanup-production-data.js
    
    if [ $? -eq 0 ]; then
        print_success "Test data cleanup completed successfully"
    else
        print_error "Test data cleanup failed"
        exit 1
    fi
}

# Function to verify cleanup
verify_cleanup() {
    print_status "Verifying cleanup results..."
    
    # Check final counts
    docker compose -f docker-compose.prod.yml exec server node -e "
    const mongoose = require('mongoose');
    const User = require('./models/User');
    const Event = require('./models/Event');
    const Ticket = require('./models/Ticket');
    const Order = require('./models/Order');
    
    mongoose.connect(process.env.MONGODB_URI).then(async () => {
      const counts = {
        users: await User.countDocuments(),
        events: await Event.countDocuments(),
        tickets: await Ticket.countDocuments(),
        orders: await Order.countDocuments()
      };
      
      console.log('📊 Final Production Data Counts:');
      Object.entries(counts).forEach(([key, count]) => {
        console.log(\`  \${key}: \${count}\`);
      });
      
      await mongoose.disconnect();
    });
    "
}

# Main function
main() {
    echo "🧹 Production Data Cleanup"
    echo "========================="
    echo ""
    
    print_warning "This will permanently delete all test data from production!"
    print_warning "Make sure you have a backup before proceeding."
    echo ""
    
    # Confirmation
    read -p "Are you absolutely sure you want to continue? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleanup cancelled"
        exit 0
    fi
    
    # Check production is running
    check_production_running
    
    # Ask about backup
    echo ""
    read -p "Do you want to create a backup before cleanup? (Y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        create_backup
    fi
    
    # Run cleanup
    run_cleanup
    
    # Verify cleanup
    verify_cleanup
    
    print_success "Production data cleanup completed successfully!"
    print_warning "Your production database is now clean and ready for real users."
}

# Run main function
main "$@"
