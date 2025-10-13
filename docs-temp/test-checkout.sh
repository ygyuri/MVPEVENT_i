#!/bin/bash

# End-to-End Checkout Test Helper Script
# This script helps simulate PayHero webhook responses for testing

set -e

echo "🧪 Event-i Checkout Test Helper"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to simulate successful payment
simulate_success() {
    local payment_ref=$1
    
    echo -e "${BLUE}Simulating successful payment for: ${payment_ref}${NC}"
    
    response=$(curl -s -X POST http://localhost:5000/api/payhero/callback \
      -H "Content-Type: application/json" \
      -d '{
        "ResultCode": 0,
        "ResultDesc": "The service request is processed successfully.",
        "MpesaReceiptNumber": "TEST'$(date +%s)'",
        "TransactionDate": "'$(date -u +"%Y%m%d%H%M%S")'",
        "PhoneNumber": "254712345678",
        "Amount": 80,
        "external_reference": "'$payment_ref'",
        "checkout_request_id": "ws_CO_TEST'$(date +%s)'"
      }')
    
    echo -e "${GREEN}✅ Webhook sent${NC}"
    echo "Response: $response"
}

# Function to simulate failed payment
simulate_failure() {
    local payment_ref=$1
    
    echo -e "${BLUE}Simulating failed payment for: ${payment_ref}${NC}"
    
    response=$(curl -s -X POST http://localhost:5000/api/payhero/callback \
      -H "Content-Type: application/json" \
      -d '{
        "ResultCode": 1,
        "ResultDesc": "The service request was cancelled by user.",
        "external_reference": "'$payment_ref'",
        "checkout_request_id": "ws_CO_CANCEL'$(date +%s)'"
      }')
    
    echo -e "${YELLOW}⚠️  Webhook sent (cancellation)${NC}"
    echo "Response: $response"
}

# Function to get latest order
get_latest_order() {
    echo -e "${BLUE}Fetching latest order...${NC}"
    
    order=$(docker exec -i event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i --quiet --eval "
        db.orders.findOne({}, { 
            _id: 1,
            orderNumber: 1, 
            'payment.paymentReference': 1,
            'customer.email': 1,
            status: 1,
            paymentStatus: 1
        }, { sort: { createdAt: -1 } })
    " | grep -v "Warning")
    
    echo "$order"
}

# Function to check order status
check_order_status() {
    local order_id=$1
    
    echo -e "${BLUE}Checking order status...${NC}"
    
    status=$(curl -s "http://localhost:5000/api/orders/${order_id}/status")
    echo "$status" | jq '.'
}

# Function to view emails
view_emails() {
    echo -e "${BLUE}Recent email logs:${NC}"
    docker logs event_i_server 2>&1 | grep "email sent" | tail -10
}

# Function to watch logs
watch_logs() {
    echo -e "${BLUE}Watching logs (Ctrl+C to stop)...${NC}"
    docker logs -f event_i_server | grep -E "(Order created|Payment|QR code|email|callback)" --line-buffered
}

# Menu
show_menu() {
    echo ""
    echo "What would you like to do?"
    echo ""
    echo "1) Get latest order details"
    echo "2) Simulate successful payment"
    echo "3) Simulate failed payment"
    echo "4) Check order status by ID"
    echo "5) View recent email logs"
    echo "6) Watch live logs"
    echo "7) Open Ethereal Email inbox"
    echo "8) Test SMTP connection"
    echo "9) Exit"
    echo ""
}

# Test SMTP
test_smtp() {
    echo -e "${BLUE}Testing SMTP connection...${NC}"
    
    docker exec event_i_server node -e "
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    transporter.verify().then(() => {
      console.log('✅ SMTP connection successful');
      console.log('Host:', process.env.SMTP_HOST);
      console.log('User:', process.env.SMTP_USER);
    }).catch(err => {
      console.error('❌ SMTP error:', err.message);
    });
    "
}

# Main loop
while true; do
    show_menu
    read -p "Enter choice [1-9]: " choice
    
    case $choice in
        1)
            get_latest_order
            ;;
        2)
            read -p "Enter payment reference (or press Enter to use latest): " payment_ref
            if [ -z "$payment_ref" ]; then
                echo "Getting latest order..."
                order_data=$(get_latest_order)
                payment_ref=$(echo "$order_data" | grep "paymentReference" | awk -F'"' '{print $4}')
                echo "Using payment reference: $payment_ref"
            fi
            simulate_success "$payment_ref"
            ;;
        3)
            read -p "Enter payment reference (or press Enter to use latest): " payment_ref
            if [ -z "$payment_ref" ]; then
                echo "Getting latest order..."
                order_data=$(get_latest_order)
                payment_ref=$(echo "$order_data" | grep "paymentReference" | awk -F'"' '{print $4}')
                echo "Using payment reference: $payment_ref"
            fi
            simulate_failure "$payment_ref"
            ;;
        4)
            read -p "Enter order ID: " order_id
            check_order_status "$order_id"
            ;;
        5)
            view_emails
            ;;
        6)
            watch_logs
            ;;
        7)
            echo -e "${BLUE}Opening Ethereal Email...${NC}"
            echo "URL: https://ethereal.email/messages"
            echo "Login: nova7@ethereal.email / wHQmBVbbjdWPUX7vG4"
            if command -v open &> /dev/null; then
                open "https://ethereal.email/messages"
            elif command -v xdg-open &> /dev/null; then
                xdg-open "https://ethereal.email/messages"
            fi
            ;;
        8)
            test_smtp
            ;;
        9)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done





