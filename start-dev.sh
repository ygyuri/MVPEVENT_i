#!/bin/bash

# Event-i Development Startup Script
echo "🚀 Starting Event-i Development Environment..."

# Check if Docker is running
if docker info >/dev/null 2>&1; then
    echo "✅ Docker is running"
    
    # Start MongoDB container
    echo "📦 Starting MongoDB container..."
    docker run -d \
        --name event_i_mongodb \
        -p 27017:27017 \
        -e MONGO_INITDB_ROOT_USERNAME=admin \
        -e MONGO_INITDB_ROOT_PASSWORD=password123 \
        -e MONGO_INITDB_DATABASE=event_i \
        mongo:7.0
    
    # Wait for MongoDB to start
    echo "⏳ Waiting for MongoDB to start..."
    sleep 10
    
    # Check if MongoDB is ready
    if docker exec event_i_mongodb mongosh --eval "db.runCommand('ping')" >/dev/null 2>&1; then
        echo "✅ MongoDB is ready"
    else
        echo "❌ MongoDB failed to start"
        exit 1
    fi
else
    echo "⚠️ Docker is not running. Please start Docker Desktop or use local MongoDB"
    echo "💡 Alternative: Install MongoDB locally with 'brew install mongodb-community'"
    exit 1
fi

# Kill any existing processes on ports 3000 and 5000
echo "🧹 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

# Start the server
echo "🔧 Starting server..."
cd server
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Check if server is running
if curl -s http://localhost:5000/api/events/health >/dev/null 2>&1; then
    echo "✅ Server is running on port 5000"
else
    echo "❌ Server failed to start"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Start the client
echo "🎨 Starting client..."
cd ../client
npm run dev &
CLIENT_PID=$!

# Wait for client to start
sleep 5

echo "🎉 Development environment is ready!"
echo "📱 Client: http://localhost:3000 (or http://localhost:3001 if 3000 is busy)"
echo "🔧 Server: http://localhost:5000"
echo "🗄️ MongoDB: mongodb://admin:password123@localhost:27017/event_i?authSource=admin"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $SERVER_PID 2>/dev/null || true
    kill $CLIENT_PID 2>/dev/null || true
    docker stop event_i_mongodb 2>/dev/null || true
    docker rm event_i_mongodb 2>/dev/null || true
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait





















