#!/bin/bash

echo "🔍 Production SMTP Quick Fix Script"
echo "===================================="
echo ""

# Step 1: Check firewall
echo "Step 1: Checking firewall status..."
if command -v ufw &> /dev/null; then
    echo "✅ UFW found"
    sudo ufw status | grep -E "587|465" || echo "⚠️ No SMTP rules found"
else
    echo "⚠️ UFW not found, checking iptables..."
    sudo iptables -L OUTPUT -n | grep -E "587|465" || echo "⚠️ No SMTP rules in iptables"
fi

echo ""
echo "Step 2: Adding SMTP firewall rules..."
sudo ufw allow out 587/tcp 2>/dev/null
sudo ufw allow out 465/tcp 2>/dev/null
sudo ufw reload 2>/dev/null || true

echo ""
echo "Step 3: Testing network connectivity from container..."
docker exec event_i_server_prod nc -zv -w 3 smtp.gmail.com 587 2>&1 || echo "❌ Connection failed"

echo ""
echo "Step 4: Checking SMTP configuration..."
docker exec event_i_server_prod printenv | grep -E "^SMTP_" | sed 's/=.*/=***/'

echo ""
echo "Step 5: Running SMTP test..."
docker exec event_i_server_prod node scripts/test-email.js 2>&1

echo ""
echo "===================================="
echo "If still failing, check PRODUCTION_SMTP_FIX.md for more details"

