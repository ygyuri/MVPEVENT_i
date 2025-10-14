#!/bin/bash

# End-to-End Payment Flow Test Monitor
# This script monitors all aspects of the payment flow

echo "🧪 Payment Flow Test Monitor"
echo "============================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# 1. Check Docker containers
if ! docker ps | grep -q event_i_server; then
    echo "❌ Server not running. Start with: docker compose up -d"
    exit 1
fi
echo "✅ Docker containers running"

# 2. Check ngrok
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[] | select(.proto == "https") | .public_url' 2>/dev/null)
if [ -z "$NGROK_URL" ]; then
    echo "❌ Ngrok not running. Start with: ngrok http 5000"
    exit 1
fi
echo "✅ Ngrok running: $NGROK_URL"

# 3. Check callback URL
CALLBACK_URL="${NGROK_URL}/api/payhero/callback"
echo "✅ Callback URL: $CALLBACK_URL"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🎯 Test Instructions:"
echo ""
echo "1. Open checkout in browser:"
echo "   http://localhost:3000/events/test-this-end-to-end/checkout"
echo ""
echo "2. Fill form with:"
echo "   Email: test.$(date +%s)@example.com"
echo "   Phone: 703328938 (9 digits)"
echo "   Ticket: Early Bird (KES 300)"
echo "   Quantity: 1"
echo ""
echo "3. Submit and enter M-PESA PIN when prompted"
echo ""
echo "4. Watch this terminal for real-time updates"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Monitoring started... (Press Ctrl+C to stop)"
echo ""

# Monitor logs with color coding and filtering
docker logs -f event_i_server 2>&1 | grep --line-buffered -E "(Order created|New user created|Existing user|Payment initiated|PAYHERO Callback|Order.*status updated|QR code generated|email sent|Payment processing completed)" | while read line; do
    # Color coding
    if echo "$line" | grep -q "Order created"; then
        echo -e "\n🎫 \033[1;34m$line\033[0m"
    elif echo "$line" | grep -q "New user created"; then
        echo -e "👤 \033[1;32m$line\033[0m"
    elif echo "$line" | grep -q "Payment initiated"; then
        echo -e "💳 \033[1;35m$line\033[0m"
    elif echo "$line" | grep -q "PAYHERO Callback"; then
        echo -e "\n🔔 \033[1;33m$line\033[0m"
    elif echo "$line" | grep -q "status updated.*paid"; then
        echo -e "✅ \033[1;32m$line\033[0m"
    elif echo "$line" | grep -q "QR code generated"; then
        echo -e "📱 \033[0;36m$line\033[0m"
    elif echo "$line" | grep -q "email sent"; then
        echo -e "📧 \033[0;32m$line\033[0m"
    elif echo "$line" | grep -q "completed"; then
        echo -e "🎉 \033[1;32m$line\033[0m\n"
    else
        echo "$line"
    fi
done





