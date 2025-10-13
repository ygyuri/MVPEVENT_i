#!/bin/bash

echo "🐳 Starting Docker Services for Event_i..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# Build and start all services
echo "🏗️ Building and starting all services..."
docker compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Check service status
echo "📊 Service Status:"
docker compose ps

echo ""
echo "🌐 Services should be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5000"
echo "  MongoDB:  localhost:27017"
echo "  Redis:    localhost:6380"
echo "  Mongo Express: http://localhost:8082"

echo ""
echo "📝 To view logs:"
echo "  docker compose logs -f"

echo ""
echo "🛑 To stop services:"
echo "  docker compose down"
