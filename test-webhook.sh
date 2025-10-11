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
echo "║           🧪 WEBHOOK ENDPOINT TEST 🧪                        ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)

if [ -z "$NGROK_URL" ]; then
  echo -e "${RED}❌ Ngrok is not running!${NC}"
  echo ""
  echo "Start ngrok first:"
  echo "  ngrok http 5000"
  exit 1
fi

CALLBACK_URL="${NGROK_URL}/api/payhero/callback"

echo -e "${GREEN}✅ Ngrok URL:${NC} $NGROK_URL"
echo -e "${GREEN}✅ Callback URL:${NC} $CALLBACK_URL"
echo ""

# Check if order ID is provided
if [ -z "$1" ]; then
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${YELLOW}TEST MODE 1: Quick Endpoint Test${NC}"
  echo ""
  echo "Testing if webhook endpoint is reachable and working..."
  echo "This will send a test webhook (no real order needed)"
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  # Generate test reference
  TEST_REF="TEST-$(date +%s)"
  RECEIPT_NUM="TEST$(date +%s)"
  
  echo -e "${BLUE}📤 Sending test webhook...${NC}"
  echo ""
  
  # Send test webhook
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{
      "ExternalReference": "'"$TEST_REF"'",
      "ResultCode": 0,
      "ResultDesc": "Test payment - endpoint verification",
      "Amount": 300,
      "MpesaReceiptNumber": "'"$RECEIPT_NUM"'",
      "PhoneNumber": "254703328938",
      "TransactionDate": "'$(date +%Y%m%d%H%M%S)'"
    }' \
    "$CALLBACK_URL")
  
  # Extract status code
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')
  
  echo "Response:"
  echo "$BODY"
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ SUCCESS! Webhook endpoint is WORKING!${NC}"
    echo ""
    echo "What this proves:"
    echo "  ✅ Ngrok tunnel is working"
    echo "  ✅ Callback endpoint is reachable"
    echo "  ✅ Server is processing webhooks"
    echo "  ✅ PayHero can send webhooks to this URL"
    echo "  ✅ Your system is ready for real payments!"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}💡 Want to test the FULL flow (with frontend notification)?${NC}"
    echo ""
    echo "1. Create order in browser:"
    echo "   http://localhost:3000/events/test-this-end-to-end/checkout"
    echo ""
    echo "2. Submit form (DON'T pay), leave browser on payment page"
    echo ""
    echo "3. Copy order ID from URL: /payment/[ORDER_ID]"
    echo ""
    echo "4. Run:"
    echo -e "   ${GREEN}./test-webhook.sh [ORDER_ID]${NC}"
    echo ""
    echo "5. Watch browser show success page instantly! 🎉"
    echo ""
  else
    echo -e "${RED}❌ Webhook endpoint test failed!${NC}"
    echo -e "${RED}HTTP Status: $HTTP_STATUS${NC}"
    echo ""
    echo "Possible issues:"
    echo "  • Server not running"
    echo "  • Callback route not configured"
    echo "  • Network/firewall issue"
    echo ""
    echo "Check server logs:"
    echo "  docker logs event_i_server --tail 50"
    echo ""
  fi
  
else
  # Full flow test with order ID
  ORDER_ID=$1
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${YELLOW}TEST MODE 2: Full Flow Test${NC}"
  echo ""
  echo "Testing complete flow with order: $ORDER_ID"
  echo "This will simulate payment completion and trigger frontend notification"
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  RECEIPT_NUM="TEST$(date +%s)"
  
  echo -e "${BLUE}📤 Sending webhook for order: $ORDER_ID${NC}"
  echo ""
  
  # Send webhook with order ID
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{
      "ExternalReference": "'"$ORDER_ID"'",
      "ResultCode": 0,
      "ResultDesc": "Payment completed successfully",
      "Amount": 300,
      "MpesaReceiptNumber": "'"$RECEIPT_NUM"'",
      "PhoneNumber": "254703328938",
      "TransactionDate": "'$(date +%Y%m%d%H%M%S)'"
    }' \
    "$CALLBACK_URL")
  
  # Extract status code
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')
  
  echo "Response:"
  echo "$BODY"
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ SUCCESS! Webhook processed!${NC}"
    echo ""
    echo "What should have happened:"
    echo "  ✅ Server received webhook"
    echo "  ✅ Order status updated to 'completed'"
    echo "  ✅ Redis notification published"
    echo "  ✅ QR codes generated"
    echo "  ✅ 3 emails sent"
    echo "  ✅ Frontend received notification (instant!)"
    echo "  ✅ Success page displayed in browser"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}📊 Check browser:${NC}"
    echo "  • Should show success page immediately"
    echo "  • Order details displayed"
    echo "  • \"3 emails sent\" message"
    echo ""
    echo -e "${YELLOW}📧 Check emails:${NC}"
    echo "  • Welcome email (if new user)"
    echo "  • Ticket email (with QR code)"
    echo "  • Receipt email (with M-PESA details)"
    echo ""
    echo -e "${YELLOW}🔍 Verify in server logs:${NC}"
    echo "  docker logs event_i_server --tail 50 | grep -E '(Callback|Redis|Email)'"
    echo ""
  else
    echo -e "${RED}❌ Webhook processing failed!${NC}"
    echo -e "${RED}HTTP Status: $HTTP_STATUS${NC}"
    echo ""
    echo "Check server logs for details:"
    echo "  docker logs event_i_server --tail 50"
    echo ""
  fi
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🎯 PayHero Dashboard Setting:${NC}"
echo ""
echo "Your PayHero dashboard should have:"
echo -e "  ${YELLOW}$CALLBACK_URL${NC}"
echo ""
echo "If not already set, update at:"
echo "  https://payhero.co.ke/dashboard → Settings → Webhooks"
echo ""

