#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║      🔍 COMPLETE CALLBACK VERIFICATION 🔍                    ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Get current ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)

if [ -z "$NGROK_URL" ]; then
  echo -e "${RED}❌ Ngrok is not running!${NC}"
  exit 1
fi

EXPECTED_CALLBACK="${NGROK_URL}/api/payhero/callback"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}STEP 1: Checking Current Ngrok URL${NC}"
echo ""
echo -e "${GREEN}Current ngrok URL:${NC}"
echo "  $NGROK_URL"
echo ""
echo -e "${GREEN}Expected callback URL:${NC}"
echo "  $EXPECTED_CALLBACK"
echo ""

# Check docker-compose.yml
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}STEP 2: Checking docker-compose.yml${NC}"
echo ""

COMPOSE_CALLBACK=$(grep "PAYHERO_CALLBACK_URL:" docker-compose.yml | awk '{print $2}')

if [ "$COMPOSE_CALLBACK" = "$EXPECTED_CALLBACK" ]; then
  echo -e "${GREEN}✅ docker-compose.yml is CORRECT${NC}"
  echo "  $COMPOSE_CALLBACK"
else
  echo -e "${RED}❌ docker-compose.yml has WRONG URL!${NC}"
  echo -e "  Expected: ${GREEN}$EXPECTED_CALLBACK${NC}"
  echo -e "  Found:    ${RED}$COMPOSE_CALLBACK${NC}"
  echo ""
  echo -e "${YELLOW}Need to update docker-compose.yml and recreate container!${NC}"
  NEEDS_FIX=1
fi
echo ""

# Check container environment
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}STEP 3: Checking Server Container Environment${NC}"
echo ""

CONTAINER_CALLBACK=$(docker exec event_i_server printenv PAYHERO_CALLBACK_URL 2>/dev/null)

if [ -z "$CONTAINER_CALLBACK" ]; then
  echo -e "${RED}❌ Cannot read container environment!${NC}"
  echo "  Is the container running?"
  NEEDS_FIX=1
elif [ "$CONTAINER_CALLBACK" = "$EXPECTED_CALLBACK" ]; then
  echo -e "${GREEN}✅ Container environment is CORRECT${NC}"
  echo "  $CONTAINER_CALLBACK"
else
  echo -e "${RED}❌ Container has WRONG URL!${NC}"
  echo -e "  Expected: ${GREEN}$EXPECTED_CALLBACK${NC}"
  echo -e "  Found:    ${RED}$CONTAINER_CALLBACK${NC}"
  echo ""
  echo -e "${YELLOW}Need to recreate container!${NC}"
  NEEDS_FIX=1
fi
echo ""

# Check PayHero dashboard
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}STEP 4: PayHero Dashboard Check${NC}"
echo ""
echo "Your PayHero dashboard should have:"
echo -e "  ${CYAN}$EXPECTED_CALLBACK${NC}"
echo ""
echo "Verify at: https://payhero.co.ke/dashboard → Settings → Webhooks"
echo ""

# Test endpoint reachability
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}STEP 5: Testing Webhook Endpoint${NC}"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "ExternalReference": "TEST-'$(date +%s)'",
    "ResultCode": 0,
    "ResultDesc": "Test",
    "Amount": 300,
    "MpesaReceiptNumber": "TEST'$(date +%s)'",
    "PhoneNumber": "254703328938"
  }' \
  "$EXPECTED_CALLBACK")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)

if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ Webhook endpoint is REACHABLE and responding${NC}"
else
  echo -e "${RED}❌ Webhook endpoint test failed!${NC}"
  echo -e "  HTTP Status: $HTTP_STATUS"
  NEEDS_FIX=1
fi
echo ""

# Final verdict
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -z "$NEEDS_FIX" ]; then
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                                                              ║${NC}"
  echo -e "${GREEN}║              ✅ EVERYTHING IS CORRECT! ✅                    ║${NC}"
  echo -e "${GREEN}║                                                              ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "All checks passed:"
  echo "  ✅ Ngrok is running"
  echo "  ✅ docker-compose.yml has correct URL"
  echo "  ✅ Container environment is correct"
  echo "  ✅ Webhook endpoint is reachable"
  echo ""
  echo -e "${GREEN}Your system is ready for payments! 🚀${NC}"
  echo ""
  echo "Next payment will:"
  echo "  1. Send correct callback URL to PayHero ✅"
  echo "  2. Receive webhook at correct endpoint ✅"
  echo "  3. Process payment successfully ✅"
  echo ""
else
  echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║                                                              ║${NC}"
  echo -e "${RED}║              ⚠️  ISSUES FOUND! ⚠️                            ║${NC}"
  echo -e "${RED}║                                                              ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${YELLOW}To fix:${NC}"
  echo ""
  echo "1. Update docker-compose.yml:"
  echo "   Find PAYHERO_CALLBACK_URL line"
  echo "   Change to: $EXPECTED_CALLBACK"
  echo ""
  echo "2. Recreate container:"
  echo "   docker compose up -d --force-recreate server"
  echo ""
  echo "3. Verify again:"
  echo "   cd /path/to/project && ./dev-tools/verify-callback-config.sh"
  echo ""
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

