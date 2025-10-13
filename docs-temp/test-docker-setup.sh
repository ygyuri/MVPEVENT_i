#!/bin/bash

echo "🧪 Testing Docker Setup..."

# Test if services are responding
echo "1️⃣ Testing Backend API..."
if curl -s http://localhost:5000/api/auth/me > /dev/null; then
    echo "   ✅ Backend API is responding"
else
    echo "   ❌ Backend API is not responding"
fi

echo ""
echo "2️⃣ Testing Frontend..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "   ✅ Frontend is responding"
else
    echo "   ❌ Frontend is not responding"
fi

echo ""
echo "3️⃣ Testing MongoDB connection..."
if docker exec event_i_mongodb mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
    echo "   ✅ MongoDB is responding"
else
    echo "   ❌ MongoDB is not responding"
fi

echo ""
echo "4️⃣ Testing Redis connection..."
if docker exec event_i_redis redis-cli ping > /dev/null 2>&1; then
    echo "   ✅ Redis is responding"
else
    echo "   ❌ Redis is not responding"
fi

echo ""
echo "5️⃣ Container Status:"
docker compose ps

echo ""
echo "🎯 Next Steps:"
echo "   - Open http://localhost:3000 in your browser"
echo "   - Try creating a poll as an organizer"
echo "   - Check server logs with: docker compose logs -f server"
