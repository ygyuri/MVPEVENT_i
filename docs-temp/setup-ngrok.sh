#!/bin/bash

# Ngrok Setup for PayHero Callback Testing
# This script sets up ngrok and updates your callback URL

set -e

echo "🚀 PayHero Ngrok Setup"
echo "======================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ Ngrok not found!${NC}"
    echo ""
    echo "Install ngrok:"
    echo "  macOS: brew install ngrok"
    echo "  Or download from: https://ngrok.com/download"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Ngrok is installed${NC}"
echo ""

# Check if ngrok is already running
if pgrep -x "ngrok" > /dev/null; then
    echo -e "${YELLOW}⚠️  Ngrok is already running${NC}"
    echo ""
    echo "Getting current tunnel URL..."
    
    # Get current tunnel
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null || echo "")
    
    if [ -z "$NGROK_URL" ]; then
        echo -e "${RED}Could not get ngrok URL. Please restart ngrok.${NC}"
        echo "Run: pkill ngrok && ngrok http 5000"
        exit 1
    fi
    
    echo -e "${GREEN}Current tunnel: ${NGROK_URL}${NC}"
else
    echo -e "${BLUE}Starting ngrok tunnel...${NC}"
    echo ""
    
    # Start ngrok in background
    ngrok http 5000 > /dev/null 2>&1 &
    
    echo "⏳ Waiting for ngrok to start..."
    sleep 3
    
    # Get tunnel URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null || echo "")
    
    if [ -z "$NGROK_URL" ]; then
        echo -e "${RED}❌ Failed to start ngrok${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Ngrok tunnel started: ${NGROK_URL}${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Construct callback URL
CALLBACK_URL="${NGROK_URL}/api/payhero/callback"

echo -e "${BLUE}📝 Callback URL:${NC}"
echo -e "   ${CALLBACK_URL}"
echo ""

# Update docker-compose.yml
echo -e "${BLUE}Updating docker-compose.yml...${NC}"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|PAYHERO_CALLBACK_URL:.*|PAYHERO_CALLBACK_URL: ${CALLBACK_URL}|" docker-compose.yml
else
    # Linux
    sed -i "s|PAYHERO_CALLBACK_URL:.*|PAYHERO_CALLBACK_URL: ${CALLBACK_URL}|" docker-compose.yml
fi

echo -e "${GREEN}✅ docker-compose.yml updated${NC}"
echo ""

# Restart server
echo -e "${BLUE}Restarting server to apply changes...${NC}"
docker restart event_i_server > /dev/null 2>&1

echo "⏳ Waiting for server to start..."
sleep 8

# Check if server is running
if docker ps | grep -q event_i_server; then
    echo -e "${GREEN}✅ Server restarted successfully${NC}"
else
    echo -e "${RED}❌ Server failed to start${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Update PayHero Dashboard:"
echo "   - Login to: https://dashboard.payhero.co.ke"
echo "   - Go to: Payment Channels → Channel 3767"
echo "   - Set Callback URL to:"
echo -e "     ${YELLOW}${CALLBACK_URL}${NC}"
echo ""
echo "2. Test Payment Flow:"
echo "   - Go to: http://localhost:3000/events/test-this-end-to-end/checkout"
echo "   - Complete checkout"
echo "   - Enter M-PESA PIN when prompted"
echo ""
echo "3. Monitor Webhooks:"
echo "   - Ngrok Dashboard: http://localhost:4040"
echo "   - Server Logs: docker logs -f event_i_server"
echo ""
echo "4. View Emails:"
echo "   - https://ethereal.email/messages"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "   - Keep this terminal open (ngrok must stay running)"
echo "   - To stop: Press Ctrl+C or run: pkill ngrok"
echo "   - To view requests: http://localhost:4040"
echo ""





