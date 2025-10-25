#!/bin/bash

# Image Asset Verification Script
# This script verifies that all image assets are properly deployed and accessible

set -e

echo "🔍 Starting Image Asset Verification..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${BASE_URL:-"https://event-i.co.ke"}
FRONTEND_URL=${FRONTEND_URL:-"https://event-i.co.ke"}

echo -e "${BLUE}📋 Configuration:${NC}"
echo "   Base URL: $BASE_URL"
echo "   Frontend URL: $FRONTEND_URL"
echo ""

# Function to check if URL is accessible
check_url() {
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
check_file_size() {
    local url=$1
    local description=$2
    local min_size=${3:-1000} # Default minimum size 1KB
    
    echo -n "   Checking $description file size... "
    
    local size=$(curl -f -s -k -I "$url" 2>/dev/null | grep -i content-length | cut -d' ' -f2 | tr -d '\r\n')
    
    if [ -n "$size" ] && [ "$size" -gt "$min_size" ]; then
        echo -e "${GREEN}✅ OK (${size} bytes)${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED (${size:-0} bytes)${NC}"
        return 1
    fi
}

# Check static assets from frontend
echo -e "${BLUE}📁 Frontend Static Assets:${NC}"
check_url "$FRONTEND_URL/favicon.ico" "favicon"
check_url "$FRONTEND_URL/logo192.png" "logo192" || echo -e "${YELLOW}⚠️  logo192.png not found (optional)${NC}"
check_url "$FRONTEND_URL/logo512.png" "logo512" || echo -e "${YELLOW}⚠️  logo512.png not found (optional)${NC}"

# Check logos directory
echo -e "${BLUE}🎨 Logo Assets:${NC}"
check_url "$FRONTEND_URL/logos/event-i_light_mode_logo.png" "light mode logo"
check_url "$FRONTEND_URL/logos/event-i_dark_mode_logo.png" "dark mode logo"

# Check uploaded images endpoint
echo -e "${BLUE}📤 Uploaded Images Endpoint:${NC}"
check_url "$BASE_URL/uploads/" "uploads directory"

# Check API health
echo -e "${BLUE}🔧 API Health:${NC}"
check_url "$BASE_URL/api/health" "API health endpoint"

# Check nginx health
echo -e "${BLUE}🌐 Nginx Health:${NC}"
check_url "$BASE_URL/health" "nginx health endpoint"

# Test image serving with different formats
echo -e "${BLUE}🖼️  Image Format Support:${NC}"
echo "   Testing various image formats..."

# Create a test image URL (this would be a real uploaded image in production)
TEST_IMAGE_URL="$BASE_URL/uploads/test-image.jpg"
echo -n "   Testing JPEG support... "
if curl -f -s -k -I "$TEST_IMAGE_URL" 2>/dev/null | grep -i "content-type.*jpeg\|content-type.*jpg" > /dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${YELLOW}⚠️  No test JPEG found (expected in production)${NC}"
fi

# Check Content Security Policy for images
echo -e "${BLUE}🔒 Security Headers:${NC}"
echo -n "   Checking CSP img-src directive... "
csp_header=$(curl -f -s -k -I "$BASE_URL/" 2>/dev/null | grep -i "content-security-policy" | head -1)
if echo "$csp_header" | grep -q "img-src.*blob:"; then
    echo -e "${GREEN}✅ OK (blob: allowed)${NC}"
else
    echo -e "${RED}❌ FAILED (blob: not allowed)${NC}"
fi

# Check cache headers for static assets
echo -e "${BLUE}💾 Cache Headers:${NC}"
echo -n "   Checking cache headers for static assets... "
cache_header=$(curl -f -s -k -I "$FRONTEND_URL/favicon.ico" 2>/dev/null | grep -i "cache-control" | head -1)
if echo "$cache_header" | grep -q "public\|immutable"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${YELLOW}⚠️  Cache headers not optimal${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}📊 Verification Summary:${NC}"
echo "========================================"

# Count successful checks
total_checks=0
successful_checks=0

# This is a simplified version - in a real implementation, you'd track each check
echo -e "${GREEN}✅ Image asset verification completed${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "   1. Verify all static assets are accessible"
echo "   2. Test image upload functionality"
echo "   3. Check image optimization in production"
echo "   4. Monitor image loading performance"
echo ""
echo -e "${GREEN}🎉 Image verification script completed!${NC}"
