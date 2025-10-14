#!/bin/bash

echo "🐳 Starting Docker Services for Event_i..."

# Create .env file from example if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from env.example..."
    cp env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
else
    echo "✅ .env file already exists"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"

# Auto-setup local domain
echo "🌐 Setting up local domain..."
if [ -f "./setup-local-domain.sh" ]; then
    # Check if domain is already configured
    if ! ./setup-local-domain.sh status | grep -q "is configured"; then
        echo "📝 Adding event-i.co.ke to hosts file..."
        ./setup-local-domain.sh add
    else
        echo "✅ event-i.co.ke already configured"
    fi
else
    echo "⚠️  setup-local-domain.sh not found, skipping domain setup"
fi

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
echo "  Frontend: http://localhost:${CLIENT_PORT:-3001}"
echo "  Backend:  http://localhost:${SERVER_PORT:-5001}"
echo "  MongoDB:  localhost:${MONGODB_PORT:-27017}"
echo "  Redis:    localhost:${REDIS_PORT:-6380}"
echo "  Mongo Express: http://localhost:${MONGO_EXPRESS_PORT:-8082}"

# Show custom domain URLs if configured
if grep -q "^127\.0\.0\.1[[:space:]]*event-i\.local$" /etc/hosts 2>/dev/null; then
    echo ""
    echo "🎯 Custom Domain (event-i.co.ke):"
    echo "  Frontend: https://event-i.co.ke/"
    echo "  Backend:  https://event-i.co.ke/api/health"
    echo "  Health:   https://event-i.co.ke/health"
fi

echo ""
echo "📝 To view logs:"
echo "  docker compose logs -f"

echo ""
echo "🛑 To stop services:"
echo "  docker compose down"
