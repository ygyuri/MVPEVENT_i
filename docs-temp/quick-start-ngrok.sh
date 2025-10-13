#!/bin/bash

# Quick Start Ngrok - Fastest Way to Get Testing

echo "🚀 Quick Starting Ngrok..."
echo "=========================="
echo ""

# Kill any existing ngrok
pkill ngrok 2>/dev/null
sleep 1

# Start ngrok in background
echo "1️⃣ Starting ngrok..."
nohup ngrok http 5000 > /tmp/ngrok.log 2>&1 &

# Wait for it to start
sleep 4

# Get URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[] | select(.proto == "https") | .public_url')

if [ -z "$NGROK_URL" ]; then
    echo "❌ Ngrok failed to start!"
    echo "Check logs: tail /tmp/ngrok.log"
    exit 1
fi

echo "   ✅ Ngrok running: $NGROK_URL"
echo ""

# Sync with server
echo "2️⃣ Syncing with server..."
./sync-ngrok-url.sh

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║                   ✅ READY TO TEST! ✅                        ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Now run: ./run-payment-test.sh"
echo ""
