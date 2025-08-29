# 🐳 Docker Setup for MERN Stack

This document provides comprehensive instructions for running the Event-i application using Docker with MongoDB, Redis, and the MERN stack.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- Docker Compose v2.0+
- At least 4GB RAM available for Docker

### 1. Development Environment
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 2. Production Environment
```bash
# Set environment variables
export JWT_SECRET="your-super-secret-jwt-key"
export JWT_REFRESH_SECRET="your-super-secret-refresh-key"
export MONGO_ROOT_USERNAME="admin"
export MONGO_ROOT_PASSWORD="secure-password"

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │◄──►│   (Express)     │◄──►│   (MongoDB)     │
│   Port: 3000    │    │   Port: 5000    │    │   Port: 27017   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Cache         │
                       │   (Redis)       │
                       │   Port: 6379    │
                       └─────────────────┘
```

## 📁 Service Details

### MongoDB
- **Image**: `mongo:7.0`
- **Port**: 27017
- **Credentials**: admin/password123 (change in production)
- **Database**: event_i
- **Authentication**: Enabled

### Redis
- **Image**: `redis:7-alpine`
- **Port**: 6379
- **Purpose**: Caching and session storage
- **Persistence**: Volume mounted

### Backend Server
- **Image**: Custom Node.js 18 Alpine
- **Port**: 5000
- **Features**: 
  - MongoDB connection
  - Redis caching
  - JWT authentication
  - Auto-seeding on startup
- **Health Check**: `/api/health` endpoint

### Frontend Client
- **Image**: Custom Node.js 18 Alpine (dev) / Nginx (prod)
- **Port**: 3000 (dev) / 80 (prod)
- **Features**: React + Redux + Vite
- **Hot Reload**: Enabled in development

### Mongo Express (Optional)
- **Image**: `mongo-express:latest`
- **Port**: 8081
- **Purpose**: Web-based MongoDB admin interface
- **Credentials**: admin/password123

## 🔧 Configuration

### Environment Variables

#### Development (.env)
```bash
MONGODB_URI=mongodb://admin:password123@localhost:27017/event_i?authSource=admin
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
```

#### Production
```bash
export JWT_SECRET="your-super-secret-jwt-key"
export JWT_REFRESH_SECRET="your-super-secret-refresh-key"
export MONGO_ROOT_USERNAME="admin"
export MONGO_ROOT_PASSWORD="secure-password"
```

### Port Mapping
- **Frontend**: 3000 → 3000 (dev) / 80 → 80 (prod)
- **Backend**: 5000 → 5000
- **MongoDB**: 27017 → 27017
- **Redis**: 6379 → 6379
- **Mongo Express**: 8081 → 8081

## 🧪 Testing

### Automated Testing
```bash
# Run comprehensive Docker tests
./docker-test.sh
```

### Manual Testing
```bash
# Test MongoDB connection
docker exec event_i_mongodb mongosh --eval "db.runCommand('ping')"

# Test Redis connection
docker exec event_i_redis redis-cli ping

# Test Backend API
curl http://localhost:5000/api/health

# Test Frontend
curl http://localhost:3000

# Test data seeding
docker exec event_i_mongodb mongosh event_i --eval "db.events.countDocuments()"
```

## 📊 Monitoring

### Health Checks
- **Backend**: `/api/health` endpoint
- **Frontend**: Nginx health check
- **Database**: MongoDB ping command
- **Cache**: Redis ping command

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f mongodb
```

### Resource Usage
```bash
# Container stats
docker stats

# Volume usage
docker system df -v
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
lsof -i :5000
lsof -i :3000

# Kill processes or change ports in docker-compose.yml
```

#### 2. MongoDB Connection Failed
```bash
# Check MongoDB container
docker exec event_i_mongodb mongosh --eval "db.runCommand('ping')"

# Check logs
docker-compose logs mongodb
```

#### 3. Redis Connection Failed
```bash
# Check Redis container
docker exec event_i_redis redis-cli ping

# Check logs
docker-compose logs redis
```

#### 4. Build Failures
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### Debug Commands
```bash
# Enter container shell
docker exec -it event_i_server sh
docker exec -it event_i_client sh

# Check container environment
docker exec event_i_server env

# View container filesystem
docker exec event_i_server ls -la
```

## 🔒 Security

### Production Considerations
1. **Change default passwords** for MongoDB and Redis
2. **Use strong JWT secrets**
3. **Enable SSL/TLS** with Nginx
4. **Restrict network access** to containers
5. **Regular security updates** for base images

### Network Security
- Containers communicate via internal Docker network
- External access only through exposed ports
- MongoDB authentication enabled by default

## 📈 Performance

### Optimization Tips
1. **Use production Dockerfiles** for better performance
2. **Enable Redis caching** for API responses
3. **Optimize MongoDB queries** with proper indexing
4. **Use multi-stage builds** to reduce image size
5. **Implement health checks** for better monitoring

### Resource Limits
```yaml
# Add to docker-compose.yml for production
services:
  server:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

## 🚀 Deployment

### Local Development
```bash
# Start development environment
docker-compose up -d

# Access application
open http://localhost:3000
```

### Production Deployment
```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d

# Scale services if needed
docker-compose -f docker-compose.prod.yml up -d --scale server=3
```

### CI/CD Integration
```bash
# Build and push images
docker build -t your-registry/event-i-server:latest ./server
docker build -t your-registry/event-i-client:latest ./client

# Deploy with docker-compose
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [MongoDB Docker Guide](https://docs.mongodb.com/manual/installation/)
- [Redis Docker Guide](https://redis.io/topics/quickstart)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

## 🤝 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review container logs: `docker-compose logs -f`
3. Verify environment variables are set correctly
4. Ensure all required ports are available
5. Check Docker Desktop is running with sufficient resources

---

**Happy Dockerizing! 🐳✨**



