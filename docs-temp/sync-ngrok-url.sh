#!/bin/bash

# Sync Ngrok URL Helper Script
# Automatically updates docker-compose.yml with current ngrok URL

set -e

echo "🔄 Ngrok URL Sync Utility"
echo "========================="
echo ""

# Get current ngrok URL
echo "1️⃣ Detecting current ngrok URL..."
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[] | select(.proto == "https") | .public_url' 2>/dev/null)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Ngrok not running!"
    echo ""
    echo "Start ngrok first:"
    echo "  ngrok http 5000"
    exit 1
fi

echo "   Current ngrok: $NGROK_URL"

# Build callback URL
CALLBACK_URL="${NGROK_URL}/api/payhero/callback"
echo "   Callback URL:  $CALLBACK_URL"
echo ""

# Get current server config
echo "2️⃣ Checking server configuration..."
CURRENT_SERVER_URL=$(docker exec event_i_server printenv PAYHERO_CALLBACK_URL 2>/dev/null || echo "")

if [ "$CURRENT_SERVER_URL" == "$CALLBACK_URL" ]; then
    echo "   ✅ Server already using correct URL!"
    echo ""
    echo "No changes needed. Ready to test!"
    exit 0
fi

echo "   Current server: $CURRENT_SERVER_URL"
echo "   ⚠️  URLs don't match!"
echo ""

# Update docker-compose.yml
echo "3️⃣ Updating docker-compose.yml..."
if [ -f docker-compose.yml ]; then
    # Create backup
    cp docker-compose.yml docker-compose.yml.backup
    
    # Update the callback URL
    if grep -q "PAYHERO_CALLBACK_URL:" docker-compose.yml; then
        sed -i.tmp "s|PAYHERO_CALLBACK_URL:.*|PAYHERO_CALLBACK_URL: $CALLBACK_URL|" docker-compose.yml
        rm -f docker-compose.yml.tmp
        echo "   ✅ Updated docker-compose.yml"
    else
        echo "   ❌ PAYHERO_CALLBACK_URL not found in docker-compose.yml"
        exit 1
    fi
else
    echo "   ❌ docker-compose.yml not found!"
    exit 1
fi

echo ""
echo "4️⃣ Restarting server container..."
docker compose restart server > /dev/null 2>&1
sleep 3

echo "   ✅ Server restarted"
echo ""

# Verify
echo "5️⃣ Verifying configuration..."
NEW_SERVER_URL=$(docker exec event_i_server printenv PAYHERO_CALLBACK_URL 2>/dev/null)
echo "   Server callback: $NEW_SERVER_URL"

if [ "$NEW_SERVER_URL" == "$CALLBACK_URL" ]; then
    echo "   ✅ URLs match!"
else
    echo "   ❌ URLs still don't match!"
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║              ✅ CONFIGURATION UPDATED! ✅                     ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Summary:"
echo "   Ngrok URL:  $NGROK_URL"
echo "   Callback:   $CALLBACK_URL"
echo "   Server:     ✅ Updated"
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo ""
echo "   Update PayHero Dashboard with:"
echo "   $CALLBACK_URL"
echo ""
echo "   1. Login to PayHero: https://payhero.co.ke/"
echo "   2. Go to Settings → Webhooks"
echo "   3. Update callback URL"
echo "   4. Save changes"
echo ""
echo "✅ Then run: ./run-payment-test.sh"
echo ""

