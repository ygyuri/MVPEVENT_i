#!/bin/bash

echo "🐳 Testing MERN Stack Docker Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down -v 2>/dev/null
docker system prune -f 2>/dev/null

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build
BUILD_STATUS=$?
print_status $BUILD_STATUS "Docker images built"

if [ $BUILD_STATUS -ne 0 ]; then
    echo "❌ Docker build failed. Exiting."
    exit 1
fi

# Start services
echo "🚀 Starting MERN stack services..."
docker-compose up -d
START_STATUS=$?
print_status $START_STATUS "Services started"

if [ $START_STATUS -ne 0 ]; then
    echo "❌ Failed to start services. Exiting."
    exit 1
fi

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Test MongoDB connection
echo "🧪 Testing MongoDB connection..."
docker exec event_i_mongodb mongosh --eval "db.runCommand('ping')" --quiet >/dev/null 2>&1
MONGO_STATUS=$?
print_status $MONGO_STATUS "MongoDB connection"

# Test Redis connection
echo "🧪 Testing Redis connection..."
docker exec event_i_redis redis-cli ping >/dev/null 2>&1
REDIS_STATUS=$?
print_status $REDIS_STATUS "Redis connection"

# Test Backend API
echo "🧪 Testing Backend API..."
sleep 10
curl -f http://localhost:5000/api/health >/dev/null 2>&1
API_STATUS=$?
print_status $API_STATUS "Backend API health check"

# Test Frontend
echo "🧪 Testing Frontend..."
curl -f http://localhost:3000 >/dev/null 2>&1
FRONTEND_STATUS=$?
print_status $FRONTEND_STATUS "Frontend accessibility"

# Test MongoDB seeding
echo "🧪 Testing MongoDB data seeding..."
docker exec event_i_mongodb mongosh event_i --eval "db.events.countDocuments()" --quiet | grep -q "[0-9]"
SEED_STATUS=$?
print_status $SEED_STATUS "MongoDB data seeding"

# Overall status
echo ""
echo "📊 Test Results Summary:"
echo "========================"
print_status $MONGO_STATUS "MongoDB"
print_status $REDIS_STATUS "Redis"
print_status $API_STATUS "Backend API"
print_status $FRONTEND_STATUS "Frontend"
print_status $SEED_STATUS "Data Seeding"

# Calculate overall success
TOTAL_TESTS=5
PASSED_TESTS=$((MONGO_STATUS == 0 ? 1 : 0 + REDIS_STATUS == 0 ? 1 : 0 + API_STATUS == 0 ? 1 : 0 + FRONTEND_STATUS == 0 ? 1 : 0 + SEED_STATUS == 0 ? 1 : 0))

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! MERN stack is fully working in Docker!${NC}"
    echo ""
    echo "🌐 Access URLs:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:5000"
    echo "   MongoDB:  localhost:27017"
    echo "   Redis:    localhost:6379"
    echo "   Mongo Express: http://localhost:8081"
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Check the logs above.${NC}"
    echo ""
    echo "📋 Debug commands:"
    echo "   docker-compose logs mongodb"
    echo "   docker-compose logs server"
    echo "   docker-compose logs client"
fi

echo ""
echo "🔍 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down"



