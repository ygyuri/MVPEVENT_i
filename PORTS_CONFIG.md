# Port Configuration Guide

This application now supports configurable ports through environment variables. You can customize all service ports by modifying the `.env` file.

## Default Ports

| Service          | Default Port | Environment Variable |
| ---------------- | ------------ | -------------------- |
| Frontend (React) | 3001         | `CLIENT_PORT`        |
| Backend API      | 5001         | `SERVER_PORT`        |
| MongoDB          | 27017        | `MONGODB_PORT`       |
| Redis            | 6380         | `REDIS_PORT`         |
| Mongo Express    | 8082         | `MONGO_EXPRESS_PORT` |

## Configuration

### 1. Edit the `.env` file

```bash
# Copy the example if you don't have .env
cp env.example .env

# Edit the ports section
nano .env
```

### 2. Modify Port Variables

```bash
# Docker Port Configuration
SERVER_PORT=5001
CLIENT_PORT=3001
MONGODB_PORT=27017
REDIS_PORT=6380
MONGO_EXPRESS_PORT=8082
```

### 3. Restart Services

```bash
docker-compose down
docker-compose up -d
```

## Port Configuration Examples

### Development with Different Ports

```bash
SERVER_PORT=8000
CLIENT_PORT=8001
MONGODB_PORT=27018
REDIS_PORT=6381
MONGO_EXPRESS_PORT=8083
```

### High Port Numbers (when default ports are occupied)

```bash
SERVER_PORT=15000
CLIENT_PORT=15001
MONGODB_PORT=27017
REDIS_PORT=16379
MONGO_EXPRESS_PORT=18080
```

### Production-like Configuration

```bash
SERVER_PORT=80
CLIENT_PORT=443
MONGODB_PORT=27017
REDIS_PORT=6379
MONGO_EXPRESS_PORT=8080
```

## How It Works

1. **Environment Variables**: All ports are defined in `.env` file
2. **Docker Compose**: Uses `${VARIABLE_NAME:-default_value}` syntax
3. **Fallback Values**: If environment variable is not set, uses default value
4. **Dynamic URLs**: Frontend automatically connects to the correct backend port

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

1. Check what's using the port:

   ```bash
   lsof -i :5001  # Check specific port
   ```

2. Change the port in `.env`:

   ```bash
   SERVER_PORT=5002  # Use different port
   ```

3. Restart services:
   ```bash
   docker-compose down && docker-compose up -d
   ```

### Frontend Can't Connect to Backend

Make sure the `VITE_API_URL` in docker-compose.yml matches your `SERVER_PORT`:

```yaml
environment:
  VITE_API_URL: http://localhost:${SERVER_PORT:-5001}
```

## Benefits

- ✅ **Flexible**: Change ports without modifying code
- ✅ **Environment-specific**: Different ports for dev/staging/prod
- ✅ **Conflict-free**: Avoid port conflicts easily
- ✅ **Documented**: Clear port configuration in one place
- ✅ **Fallback-safe**: Default values if env vars not set
