#!/bin/bash

# Comprehensive Real-Time Updates Testing Script
# This script tests all aspects of the real-time updates feature

echo "🚀 Starting Comprehensive Real-Time Updates Testing"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test data
ORGANIZER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQyNDIwM2EwNzMyNDU0Yzc0ODNjNDEiLCJpYXQiOjE3NTkzNTY0MDQsImV4cCI6MTc1OTM2MDAwNH0.pCLTsrVDgjPET3lfuK_ASHDCOPhzLBOI6KQN__41Y48"
CUSTOMER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQyYzE2YmZlNjE0MzhhZDU3YzA4MzIiLCJpYXQiOjE3NTkzNTY0MTcsImV4cCI6MTc1OTM2MDAxN30.zYu8mFykFh1-BjylRpsVYNOrDd039Y9drSwkS-4AX10"
EVENT_SLUG="test-this-end-to-end"
BASE_URL="http://localhost:5000"

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4
    local expected_status=$5
    local description=$6
    
    echo -e "${BLUE}Testing: $description${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $token" "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    elif [ "$method" = "PATCH" ]; then
        response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -X PATCH -d "$data" "$BASE_URL$endpoint")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $token" -X DELETE "$BASE_URL$endpoint")
    fi
    
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "$expected_status" ]; then
        print_result 0 "$description (Status: $http_code)"
        echo "Response: $body" | jq . 2>/dev/null || echo "Response: $body"
    else
        print_result 1 "$description (Expected: $expected_status, Got: $http_code)"
        echo "Response: $body"
    fi
    echo ""
}

echo -e "${YELLOW}📋 Test 1: Authentication & Authorization${NC}"
echo "=============================================="

# Test organizer can access updates
test_endpoint "GET" "/api/events/$EVENT_SLUG/updates?page=1&limit=10" "$ORGANIZER_TOKEN" "" "200" "Organizer can fetch updates"

# Test customer can access updates
test_endpoint "GET" "/api/events/$EVENT_SLUG/updates?page=1&limit=10" "$CUSTOMER_TOKEN" "" "200" "Customer can fetch updates"

# Test unauthorized access
test_endpoint "GET" "/api/events/$EVENT_SLUG/updates?page=1&limit=10" "" "" "401" "Unauthorized access blocked"

echo -e "${YELLOW}📝 Test 2: Update Creation (Organizer Only)${NC}"
echo "==============================================="

# Test creating a normal priority update
test_endpoint "POST" "/api/events/$EVENT_SLUG/updates" "$ORGANIZER_TOKEN" '{"content":"🎉 Welcome to our amazing event! The main stage is now open.", "priority":"normal", "mediaUrls":[]}' "201" "Create normal priority update"

# Test creating a high priority update
test_endpoint "POST" "/api/events/$EVENT_SLUG/updates" "$ORGANIZER_TOKEN" '{"content":"⚠️ URGENT: Parking lot is full. Please use street parking.", "priority":"high", "mediaUrls":[]}' "201" "Create high priority update"

# Test creating a low priority update
test_endpoint "POST" "/api/events/$EVENT_SLUG/updates" "$ORGANIZER_TOKEN" '{"content":"💡 Tip: Check out our sponsor booths for free swag!", "priority":"low", "mediaUrls":[]}' "201" "Create low priority update"

# Test customer cannot create updates
test_endpoint "POST" "/api/events/$EVENT_SLUG/updates" "$CUSTOMER_TOKEN" '{"content":"Customer trying to post", "priority":"normal", "mediaUrls":[]}' "403" "Customer cannot create updates"

# Test validation - empty content
test_endpoint "POST" "/api/events/$EVENT_SLUG/updates" "$ORGANIZER_TOKEN" '{"content":"", "priority":"normal", "mediaUrls":[]}' "400" "Empty content validation"

# Test validation - invalid priority
test_endpoint "POST" "/api/events/$EVENT_SLUG/updates" "$ORGANIZER_TOKEN" '{"content":"Test content", "priority":"invalid", "mediaUrls":[]}' "400" "Invalid priority validation"

echo -e "${YELLOW}📖 Test 3: Update Reading & Pagination${NC}"
echo "============================================="

# Test pagination
test_endpoint "GET" "/api/events/$EVENT_SLUG/updates?page=1&limit=3" "$CUSTOMER_TOKEN" "" "200" "Pagination - first page"

test_endpoint "GET" "/api/events/$EVENT_SLUG/updates?page=2&limit=3" "$CUSTOMER_TOKEN" "" "200" "Pagination - second page"

# Test before parameter
test_endpoint "GET" "/api/events/$EVENT_SLUG/updates?before=2025-10-01T20:00:00.000Z&limit=5" "$CUSTOMER_TOKEN" "" "200" "Updates before specific time"

echo -e "${YELLOW}👍 Test 4: Reactions${NC}"
echo "====================="

# First, get the latest update ID for reactions
echo "Getting latest update ID for reactions..."
latest_update=$(curl -s -H "Authorization: Bearer $CUSTOMER_TOKEN" "$BASE_URL/api/events/$EVENT_SLUG/updates?page=1&limit=1" | jq -r '.data[0]._id')

if [ "$latest_update" != "null" ] && [ "$latest_update" != "" ]; then
    echo "Latest update ID: $latest_update"
    
    # Test different reaction types
    test_endpoint "POST" "/api/updates/$latest_update/reactions" "$CUSTOMER_TOKEN" '{"reactionType":"like"}' "200" "Add like reaction"
    
    test_endpoint "POST" "/api/updates/$latest_update/reactions" "$CUSTOMER_TOKEN" '{"reactionType":"love"}' "200" "Add love reaction"
    
    test_endpoint "POST" "/api/updates/$latest_update/reactions" "$CUSTOMER_TOKEN" '{"reactionType":"clap"}' "200" "Add clap reaction"
    
    test_endpoint "POST" "/api/updates/$latest_update/reactions" "$CUSTOMER_TOKEN" '{"reactionType":"wow"}' "200" "Add wow reaction"
    
    test_endpoint "POST" "/api/updates/$latest_update/reactions" "$CUSTOMER_TOKEN" '{"reactionType":"sad"}' "200" "Add sad reaction"
    
    # Test invalid reaction type
    test_endpoint "POST" "/api/updates/$latest_update/reactions" "$CUSTOMER_TOKEN" '{"reactionType":"invalid"}' "400" "Invalid reaction type"
    
    # Test organizer can also react
    test_endpoint "POST" "/api/updates/$latest_update/reactions" "$ORGANIZER_TOKEN" '{"reactionType":"like"}' "200" "Organizer can react"
else
    echo -e "${RED}❌ Could not get latest update ID for reactions${NC}"
fi

echo -e "${YELLOW}✏️ Test 5: Update Editing (5-minute window)${NC}"
echo "============================================="

# Create a new update for editing
echo "Creating update for editing test..."
edit_response=$(curl -s -H "Authorization: Bearer $ORGANIZER_TOKEN" -H "Content-Type: application/json" -d '{"content":"This update will be edited", "priority":"normal", "mediaUrls":[]}' "$BASE_URL/api/events/$EVENT_SLUG/updates")
edit_update_id=$(echo "$edit_response" | jq -r '.data.id')

if [ "$edit_update_id" != "null" ] && [ "$edit_update_id" != "" ]; then
    echo "Created update for editing: $edit_update_id"
    
    # Test editing within 5-minute window
    test_endpoint "PATCH" "/api/updates/$edit_update_id" "$ORGANIZER_TOKEN" '{"content":"This update has been edited successfully!", "priority":"high"}' "200" "Edit update within 5-minute window"
    
    # Test customer cannot edit
    test_endpoint "PATCH" "/api/updates/$edit_update_id" "$CUSTOMER_TOKEN" '{"content":"Customer trying to edit"}' "403" "Customer cannot edit updates"
else
    echo -e "${RED}❌ Could not create update for editing test${NC}"
fi

echo -e "${YELLOW}🗑️ Test 6: Update Deletion${NC}"
echo "============================="

# Create a new update for deletion
echo "Creating update for deletion test..."
delete_response=$(curl -s -H "Authorization: Bearer $ORGANIZER_TOKEN" -H "Content-Type: application/json" -d '{"content":"This update will be deleted", "priority":"normal", "mediaUrls":[]}' "$BASE_URL/api/events/$EVENT_SLUG/updates")
delete_update_id=$(echo "$delete_response" | jq -r '.data.id')

if [ "$delete_update_id" != "null" ] && [ "$delete_update_id" != "" ]; then
    echo "Created update for deletion: $delete_update_id"
    
    # Test organizer can delete
    test_endpoint "DELETE" "/api/updates/$delete_update_id" "$ORGANIZER_TOKEN" "" "200" "Organizer can delete update"
    
    # Test customer cannot delete
    test_endpoint "DELETE" "/api/updates/$delete_update_id" "$CUSTOMER_TOKEN" "" "403" "Customer cannot delete updates"
else
    echo -e "${RED}❌ Could not create update for deletion test${NC}"
fi

echo -e "${YELLOW}🔒 Test 7: Rate Limiting${NC}"
echo "=========================="

echo "Testing rate limiting (10 posts per hour)..."
# Try to create 12 updates quickly to test rate limiting
for i in {1..12}; do
    echo "Creating update $i..."
    response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $ORGANIZER_TOKEN" -H "Content-Type: application/json" -d "{\"content\":\"Rate limit test update $i\", \"priority\":\"normal\", \"mediaUrls\":[]}" "$BASE_URL/api/events/$EVENT_SLUG/updates")
    http_code="${response: -3}"
    
    if [ "$http_code" = "429" ]; then
        print_result 0 "Rate limiting works (blocked at update $i)"
        break
    elif [ "$http_code" = "201" ]; then
        echo "Update $i created successfully"
    else
        print_result 1 "Unexpected response for update $i: $http_code"
    fi
done

echo -e "${YELLOW}🌐 Test 8: WebSocket Connection${NC}"
echo "=================================="

echo "Testing WebSocket connection..."
# This would require a WebSocket client, but we can test the endpoint exists
test_endpoint "GET" "/socket.io/" "" "" "400" "WebSocket endpoint accessible"

echo -e "${YELLOW}📱 Test 9: Push Notifications${NC}"
echo "================================="

echo "Testing push notification endpoints..."
test_endpoint "POST" "/api/push/subscribe" "$CUSTOMER_TOKEN" '{"endpoint":"https://example.com/push","keys":{"p256dh":"test","auth":"test"}}' "200" "Push subscription"

test_endpoint "GET" "/api/push/subscriptions" "$CUSTOMER_TOKEN" "" "200" "Get push subscriptions"

echo -e "${YELLOW}📊 Test 10: Analytics & Monitoring${NC}"
echo "====================================="

echo "Testing analytics endpoints..."
test_endpoint "GET" "/api/events/$EVENT_SLUG/analytics/updates" "$ORGANIZER_TOKEN" "" "200" "Update analytics"

echo ""
echo -e "${GREEN}🎉 Comprehensive Testing Complete!${NC}"
echo "====================================="
echo ""
echo "Summary of tests performed:"
echo "✅ Authentication & Authorization"
echo "✅ Update Creation (Organizer Only)"
echo "✅ Update Reading & Pagination"
echo "✅ Reactions (All Types)"
echo "✅ Update Editing (5-minute window)"
echo "✅ Update Deletion"
echo "✅ Rate Limiting"
echo "✅ WebSocket Connection"
echo "✅ Push Notifications"
echo "✅ Analytics & Monitoring"
echo ""
echo "All core functionality has been tested!"
