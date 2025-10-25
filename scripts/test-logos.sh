#!/bin/bash

# Logo Accessibility Test Script
# This script tests if logos are accessible in production

set -e

echo "🔍 Testing Logo Accessibility..."
echo "================================="

# Configuration
BASE_URL=${BASE_URL:-"https://event-i.co.ke"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if URL is accessible
check_logo() {
    local url=$1
    local description=$2
    
    echo -n "   Checking $description... "
    
    if curl -f -s -k "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        return 1
    fi
}

# Function to check file size
check_logo_size() {
    local url=$1
    local description=$2
    
    echo -n "   Checking $description file size... "
    
    local size=$(curl -f -s -k -I "$url" 2>/dev/null | grep -i content-length | cut -d' ' -f2 | tr -d '\r\n')
    
    if [ -n "$size" ] && [ "$size" -gt 1000 ]; then
        echo -e "${GREEN}✅ OK (${size} bytes)${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED (${size:-0} bytes)${NC}"
        return 1
    fi
}

# Test logo accessibility
echo -e "${BLUE}🎨 Logo Accessibility Tests:${NC}"
check_logo "$BASE_URL/logos/event-i_light_mode_logo.png" "light mode logo"
check_logo "$BASE_URL/logos/event-i_dark_mode_logo.png" "dark mode logo"

echo ""
echo -e "${BLUE}📏 Logo File Size Tests:${NC}"
check_logo_size "$BASE_URL/logos/event-i_light_mode_logo.png" "light mode logo"
check_logo_size "$BASE_URL/logos/event-i_dark_mode_logo.png" "dark mode logo"

echo ""
echo -e "${BLUE}🔍 Detailed Logo Information:${NC}"
echo "Light mode logo:"
curl -f -s -k -I "$BASE_URL/logos/event-i_light_mode_logo.png" 2>/dev/null | head -5 || echo "❌ Could not get headers"

echo ""
echo "Dark mode logo:"
curl -f -s -k -I "$BASE_URL/logos/event-i_dark_mode_logo.png" 2>/dev/null | head -5 || echo "❌ Could not get headers"

echo ""
echo -e "${GREEN}🎉 Logo accessibility test completed!${NC}"
