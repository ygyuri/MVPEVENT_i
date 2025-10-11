#!/bin/bash

# Interactive Ngrok Static Domain Setup Script
# This script guides you through setting up a permanent ngrok URL

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                                                              ║${NC}"
echo -e "${PURPLE}║         🚀 NGROK STATIC DOMAIN SETUP WIZARD 🚀               ║${NC}"
echo -e "${PURPLE}║                                                              ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}This wizard will help you set up a PERMANENT ngrok URL (FREE!)${NC}"
echo -e "${BLUE}After setup, your ngrok URL will NEVER change! 🎉${NC}"
echo ""

# Function to prompt for input
prompt() {
    local prompt_text=$1
    local var_name=$2
    echo -e "${YELLOW}${prompt_text}${NC}"
    read -r $var_name
}

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ Ngrok not found!${NC}"
    echo ""
    echo "Install ngrok first:"
    echo "  Mac: brew install ngrok"
    echo "  Linux: snap install ngrok"
    echo "  Or download from: https://ngrok.com/download"
    exit 1
fi

echo -e "${GREEN}✅ Ngrok is installed${NC}"
echo ""

# Stop existing ngrok
echo -e "${BLUE}📋 Stopping any existing ngrok sessions...${NC}"
pkill ngrok 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ Ready for fresh start${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Authtoken
echo -e "${BLUE}STEP 1: Configure Ngrok Authtoken${NC}"
echo ""
echo "Please get your authtoken from:"
echo -e "${GREEN}https://dashboard.ngrok.com/get-started/your-authtoken${NC}"
echo ""
prompt "Paste your ngrok authtoken here: " NGROK_AUTHTOKEN

if [ -z "$NGROK_AUTHTOKEN" ]; then
    echo -e "${RED}❌ Authtoken cannot be empty!${NC}"
    exit 1
fi

# Configure authtoken
echo ""
echo -e "${BLUE}Configuring ngrok...${NC}"
ngrok config add-authtoken "$NGROK_AUTHTOKEN" > /dev/null 2>&1

echo -e "${GREEN}✅ Authtoken configured!${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 2: Static Domain
echo -e "${BLUE}STEP 2: Enter Your Static Domain${NC}"
echo ""
echo "Go to: ${GREEN}https://dashboard.ngrok.com/domains${NC}"
echo "Click 'New Domain' and reserve a name (FREE!)"
echo ""
echo "Suggestions:"
echo "  • eventi-payments"
echo "  • event-i-webhooks"  
echo "  • mvpevent-api"
echo ""
prompt "Enter your static domain (e.g., eventi-payments.ngrok-free.app): " STATIC_DOMAIN

if [ -z "$STATIC_DOMAIN" ]; then
    echo -e "${RED}❌ Domain cannot be empty!${NC}"
    exit 1
fi

# Validate domain format
if [[ ! "$STATIC_DOMAIN" =~ ^[a-z0-9-]+\.ngrok-free\.app$ ]]; then
    echo -e "${YELLOW}⚠️  Domain should be in format: yourname.ngrok-free.app${NC}"
    echo -e "${YELLOW}   You entered: $STATIC_DOMAIN${NC}"
    echo ""
    prompt "Continue anyway? (y/n): " continue_choice
    if [[ "$continue_choice" != "y" ]]; then
        exit 1
    fi
fi

NGROK_URL="https://$STATIC_DOMAIN"
CALLBACK_URL="${NGROK_URL}/api/payhero/callback"

echo ""
echo -e "${GREEN}✅ Static domain configured!${NC}"
echo -e "${GREEN}   URL: $NGROK_URL${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 3: Start Ngrok
echo -e "${BLUE}STEP 3: Starting Ngrok with Static Domain${NC}"
echo ""
echo -e "${BLUE}Starting ngrok in background...${NC}"

# Start ngrok with static domain
nohup ngrok http 5000 --domain="$STATIC_DOMAIN" > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

echo "   PID: $NGROK_PID"
echo "   Waiting for ngrok to start..."
sleep 5

# Verify ngrok is running
if ! kill -0 $NGROK_PID 2>/dev/null; then
    echo -e "${RED}❌ Ngrok failed to start!${NC}"
    echo ""
    echo "Check logs:"
    tail -20 /tmp/ngrok.log
    exit 1
fi

# Verify URL is accessible
ACTUAL_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[] | select(.proto == "https") | .public_url' 2>/dev/null)

if [ "$ACTUAL_URL" != "$NGROK_URL" ]; then
    echo -e "${RED}❌ Ngrok URL mismatch!${NC}"
    echo "   Expected: $NGROK_URL"
    echo "   Got: $ACTUAL_URL"
    echo ""
    echo "Possible issues:"
    echo "  1. Domain not properly reserved"
    echo "  2. Authtoken incorrect"
    echo "  3. Domain already in use"
    echo ""
    tail -20 /tmp/ngrok.log
    exit 1
fi

echo -e "${GREEN}✅ Ngrok running with static domain!${NC}"
echo -e "${GREEN}   URL: $ACTUAL_URL${NC}"
echo -e "${GREEN}   Dashboard: http://localhost:4040${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 4: Update docker-compose.yml
echo -e "${BLUE}STEP 4: Updating Server Configuration${NC}"
echo ""

# Backup docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup
echo -e "${GREEN}✅ Backed up docker-compose.yml${NC}"

# Update PAYHERO_CALLBACK_URL
if grep -q "PAYHERO_CALLBACK_URL:" docker-compose.yml; then
    sed -i.tmp "s|PAYHERO_CALLBACK_URL:.*|PAYHERO_CALLBACK_URL: $CALLBACK_URL|" docker-compose.yml
    rm -f docker-compose.yml.tmp
    echo -e "${GREEN}✅ Updated docker-compose.yml with static URL${NC}"
else
    echo -e "${RED}❌ PAYHERO_CALLBACK_URL not found in docker-compose.yml${NC}"
    exit 1
fi

echo ""

# Step 5: Restart Server
echo -e "${BLUE}STEP 5: Restarting Server Container${NC}"
echo ""

docker compose stop server > /dev/null 2>&1
echo "   Stopped server container"

docker compose up -d server > /dev/null 2>&1
echo "   Started server container"

sleep 5
echo -e "${GREEN}✅ Server restarted with static URL!${NC}"
echo ""

# Step 6: Verify Configuration
echo -e "${BLUE}STEP 6: Verifying Configuration${NC}"
echo ""

DOCKER_CALLBACK=$(docker exec event_i_server printenv PAYHERO_CALLBACK_URL 2>/dev/null)

if [ "$DOCKER_CALLBACK" == "$CALLBACK_URL" ]; then
    echo -e "${GREEN}✅ Server configuration verified!${NC}"
    echo "   Callback URL: $DOCKER_CALLBACK"
else
    echo -e "${RED}❌ Configuration mismatch!${NC}"
    echo "   Expected: $CALLBACK_URL"
    echo "   Got: $DOCKER_CALLBACK"
    exit 1
fi

echo ""

# Test callback URL is reachable
echo -e "${BLUE}Testing callback URL accessibility...${NC}"
TEST_RESPONSE=$(curl -s -X POST "$CALLBACK_URL" \
    -H "Content-Type: application/json" \
    -d '{"test": "ping"}' \
    -w "\n%{http_code}" 2>/dev/null | tail -1)

if [ "$TEST_RESPONSE" == "200" ] || [ "$TEST_RESPONSE" == "400" ]; then
    echo -e "${GREEN}✅ Callback URL is reachable!${NC}"
else
    echo -e "${YELLOW}⚠️  Callback returned: $TEST_RESPONSE (might be normal)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Final Step: PayHero Dashboard
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                                                              ║${NC}"
echo -e "${PURPLE}║              ✅ SETUP COMPLETE! FINAL STEP ✅                 ║${NC}"
echo -e "${PURPLE}║                                                              ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🎉 Your ngrok is now configured with a PERMANENT URL! 🎉${NC}"
echo ""
echo -e "${BLUE}Configuration Summary:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "   Ngrok URL:       ${GREEN}$NGROK_URL${NC}"
echo -e "   Callback URL:    ${GREEN}$CALLBACK_URL${NC}"
echo -e "   Server Status:   ${GREEN}✅ Configured${NC}"
echo -e "   Redis Pub/Sub:   ${GREEN}✅ Active${NC}"
echo -e "   Long Polling:    ${GREEN}✅ Active${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}⚠️  ONE FINAL STEP (Do this ONCE):${NC}"
echo ""
echo "   Update PayHero Dashboard:"
echo ""
echo -e "   1. Go to: ${GREEN}https://payhero.co.ke/dashboard${NC}"
echo -e "   2. Navigate to: ${GREEN}Settings → Webhooks${NC}"
echo -e "   3. Update callback URL to:"
echo ""
echo -e "      ${PURPLE}$CALLBACK_URL${NC}"
echo ""
echo -e "   4. ${GREEN}Save changes${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}After updating PayHero, you're ready to test!${NC}"
echo ""
echo "Test with:"
echo -e "  ${GREEN}./run-payment-test.sh${NC}"
echo ""
echo "Then:"
echo -e "  ${GREEN}http://localhost:3000/events/test-this-end-to-end/checkout${NC}"
echo ""
echo -e "${YELLOW}💡 This URL will NEVER change again! Set and forget! 🎉${NC}"
echo ""

# Save configuration
cat > .ngrok-config << EOC
NGROK_DOMAIN=$STATIC_DOMAIN
NGROK_URL=$NGROK_URL
CALLBACK_URL=$CALLBACK_URL
SETUP_DATE=$(date)
EOC

echo -e "${GREEN}✅ Configuration saved to .ngrok-config${NC}"
echo ""

