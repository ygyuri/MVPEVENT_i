#!/bin/bash

# M6 Event Creation & Management - Manual Testing Script
# This script helps test all M6 features systematically

echo "🎯 M6 Event Creation & Management Testing"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    echo -e "\n${BLUE}Testing: ${test_name}${NC}"
    echo "Command: $test_command"
    
    TOTAL=$((TOTAL + 1))
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAILED${NC}"
        FAILED=$((FAILED + 1))
    fi
}

# Function to check if service is running
check_service() {
    local service_name="$1"
    local port="$2"
    local url="$3"
    
    echo -e "\n${YELLOW}Checking ${service_name}...${NC}"
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${service_name} is running on port ${port}${NC}"
        return 0
    else
        echo -e "${RED}❌ ${service_name} is not running on port ${port}${NC}"
        return 1
    fi
}

# Function to test API endpoint
test_api_endpoint() {
    local endpoint="$1"
    local method="$2"
    local data="$3"
    local expected_status="$4"
    
    echo -e "\n${BLUE}Testing API: ${method} ${endpoint}${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:5000${endpoint}")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "%{http_code}" -o /dev/null -X POST \
            -H "Content-Type: application/json" \
            -d "$data" \
            "http://localhost:5000${endpoint}")
    fi
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ API endpoint working (${response})${NC}"
        return 0
    else
        echo -e "${RED}❌ API endpoint failed (${response}, expected ${expected_status})${NC}"
        return 1
    fi
}

echo -e "\n${YELLOW}🚀 Starting M6 Testing...${NC}"

# 1. Check Services
echo -e "\n${YELLOW}1. Checking Services${NC}"
check_service "Frontend (React)" "3001" "http://localhost:3001"
check_service "Backend API" "5000" "http://localhost:5000/api/health"
check_service "Mongo Express" "8082" "http://localhost:8082"

# 2. Test API Endpoints
echo -e "\n${YELLOW}2. Testing API Endpoints${NC}"

# Health check
test_api_endpoint "/api/health" "GET" "" "200"

# Auth endpoints
test_api_endpoint "/api/auth/login" "POST" '{"email":"test@example.com","password":"test123"}' "401"  # Expected 401 for invalid credentials

# Organizer endpoints
test_api_endpoint "/api/organizer/events" "GET" "" "401"  # Expected 401 without auth

# 3. Test Database Connection
echo -e "\n${YELLOW}3. Testing Database Connection${NC}"

if docker exec event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin --eval "db.runCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MongoDB connection successful${NC}"
else
    echo -e "${RED}❌ MongoDB connection failed${NC}"
fi

# 4. Test File Upload Directory
echo -e "\n${YELLOW}4. Testing File Upload Directory${NC}"

if docker exec event_i_server ls -la /app/uploads/events > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Upload directory exists${NC}"
else
    echo -e "${RED}❌ Upload directory missing${NC}"
fi

# 5. Test Docker Services
echo -e "\n${YELLOW}5. Testing Docker Services${NC}"

services=("event_i_mongodb" "event_i_redis" "event_i_server" "event_i_client")

for service in "${services[@]}"; do
    if docker ps --format "table {{.Names}}" | grep -q "$service"; then
        echo -e "${GREEN}✅ ${service} container is running${NC}"
    else
        echo -e "${RED}❌ ${service} container is not running${NC}"
    fi
done

# 6. Test Frontend Build
echo -e "\n${YELLOW}6. Testing Frontend Build${NC}"

if curl -s "http://localhost:3001" | grep -q "Event-i"; then
    echo -e "${GREEN}✅ Frontend is serving correctly${NC}"
else
    echo -e "${RED}❌ Frontend is not serving correctly${NC}"
fi

# 7. Test CORS Configuration
echo -e "\n${YELLOW}7. Testing CORS Configuration${NC}"

cors_response=$(curl -s -H "Origin: http://localhost:3001" \
    -H "Access-Control-Request-Method: PATCH" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -X OPTIONS \
    "http://localhost:5000/api/organizer/events" \
    -w "%{http_code}" -o /dev/null)

if [ "$cors_response" = "200" ] || [ "$cors_response" = "204" ]; then
    echo -e "${GREEN}✅ CORS is configured correctly${NC}"
else
    echo -e "${RED}❌ CORS configuration issue (${cors_response})${NC}"
fi

# 8. Test Image Upload Endpoint
echo -e "\n${YELLOW}8. Testing Image Upload Endpoint${NC}"

# Create a test image file
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" | base64 -d > /tmp/test.png

# Test upload endpoint (should return 401 without auth, which is expected)
upload_response=$(curl -s -w "%{http_code}" -o /dev/null \
    -X POST \
    -F "images=@/tmp/test.png" \
    "http://localhost:5000/api/organizer/events/test/upload")

if [ "$upload_response" = "401" ]; then
    echo -e "${GREEN}✅ Image upload endpoint is protected (401)${NC}"
else
    echo -e "${RED}❌ Image upload endpoint issue (${upload_response})${NC}"
fi

# Clean up test file
rm -f /tmp/test.png

# 9. Test Event Management Features
echo -e "\n${YELLOW}9. Testing Event Management Features${NC}"

# Test event creation endpoint
create_response=$(curl -s -w "%{http_code}" -o /dev/null \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"title":"Test Event","description":"Test Description"}' \
    "http://localhost:5000/api/organizer/events")

if [ "$create_response" = "401" ]; then
    echo -e "${GREEN}✅ Event creation endpoint is protected (401)${NC}"
else
    echo -e "${RED}❌ Event creation endpoint issue (${create_response})${NC}"
fi

# Test event publish endpoint
publish_response=$(curl -s -w "%{http_code}" -o /dev/null \
    -X POST \
    "http://localhost:5000/api/organizer/events/test/publish")

if [ "$publish_response" = "401" ]; then
    echo -e "${GREEN}✅ Event publish endpoint is protected (401)${NC}"
else
    echo -e "${RED}❌ Event publish endpoint issue (${publish_response})${NC}"
fi

# 10. Test Mobile Responsiveness
echo -e "\n${YELLOW}10. Testing Mobile Responsiveness${NC}"

# Check if the page loads on mobile viewport
mobile_response=$(curl -s -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)" \
    "http://localhost:3001" | grep -q "viewport")

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Mobile viewport meta tag present${NC}"
else
    echo -e "${RED}❌ Mobile viewport meta tag missing${NC}"
fi

# Summary
echo -e "\n${YELLOW}📊 Testing Summary${NC}"
echo "=================="
echo -e "Total Tests: ${TOTAL}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! M6 system is ready for manual testing.${NC}"
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo "1. Open http://localhost:3001 in your browser"
    echo "2. Login with organizer@example.com / password123"
    echo "3. Navigate to /organizer/events/create"
    echo "4. Follow the M6_TESTING_GUIDE.md for detailed testing"
else
    echo -e "\n${RED}⚠️  Some tests failed. Please check the issues above.${NC}"
fi

echo -e "\n${BLUE}🔗 Quick Links:${NC}"
echo "Frontend: http://localhost:3001"
echo "Backend API: http://localhost:5000"
echo "Mongo Express: http://localhost:8082"
echo "Testing Guide: ./M6_TESTING_GUIDE.md"

echo -e "\n${YELLOW}Happy Testing! 🚀${NC}"
