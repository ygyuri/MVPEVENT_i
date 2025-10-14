# Automated Docker Setup with Local Domain

This guide explains how Event-i automatically sets up the local domain `event-i.co.ke` whenever you run Docker commands.

## 🚀 Quick Start

### Method 1: Using Makefile (Recommended)

```bash
# Start development environment (auto-sets up domain)
make dev

# Start production environment (auto-sets up domain)
make prod

# Check status
make status

# View logs
make logs
```

### Method 2: Using NPM Scripts

```bash
# Start development environment
npm run docker:dev

# Start production environment
npm run docker:prod

# Check domain status
npm run domain:status

# Setup domain manually
npm run domain:setup
```

### Method 3: Using Direct Scripts

```bash
# Start development environment
./start-docker.sh

# Start production environment
./start-event-i-local.sh start

# Setup domain
./setup-local-domain.sh add
```

## 🔧 How It Works

### Automatic Domain Setup

The system automatically adds `event-i.co.ke` to your hosts file when you start Docker:

1. **Scripts Check**: Before starting containers, scripts check if the domain is configured
2. **Auto-Add**: If not found, the domain is automatically added to `/etc/hosts`
3. **Backup**: A backup of your hosts file is created before changes
4. **Safe**: Only affects `event-i.co.ke`, leaves other entries intact

### Docker Integration

- **Entrypoint Script**: `docker-entrypoint.sh` handles domain setup inside containers
- **Volume Mounts**: Domain setup scripts are mounted into containers
- **Environment Variables**: `AUTO_DOMAIN_SETUP=true` enables automatic setup

## 📋 Available Commands

### Makefile Commands

```bash
make help           # Show all available commands
make dev            # Start development environment
make prod           # Start production environment
make up             # Start all containers
make down           # Stop all containers
make status         # Check container status
make logs           # View container logs
make domain-setup   # Add domain to hosts file
make domain-remove  # Remove domain from hosts file
make domain-status  # Check domain configuration
make test           # Test connections
make urls           # Show all access URLs
```

### NPM Scripts

```bash
npm run docker:dev      # Start development environment
npm run docker:prod     # Start production environment
npm run docker:stop     # Stop containers
npm run docker:logs     # View logs
npm run docker:status   # Check status
npm run domain:setup    # Setup domain
npm run domain:remove   # Remove domain
npm run domain:status   # Check domain status
npm run domain:test     # Test domain
```

### Direct Scripts

```bash
./start-docker.sh              # Start development
./start-event-i-local.sh start # Start production
./setup-local-domain.sh add    # Add domain
./setup-local-domain.sh remove # Remove domain
./setup-local-domain.sh status # Check domain
```

## 🌐 Access URLs

### After Starting Containers

```bash
# Localhost (always available)
https://localhost/
https://localhost/api/health

# Custom Domain (after auto-setup)
https://event-i.co.ke/
https://event-i.co.ke/api/health
```

### Check URLs

```bash
# Show all available URLs
make urls

# Or using npm
npm run urls
```

## 🔍 Troubleshooting

### Domain Not Working

```bash
# Check domain status
make domain-status

# Manually setup domain
make domain-setup

# Test domain resolution
ping event-i.co.ke
```

### Containers Not Starting

```bash
# Check container status
make status

# View container logs
make logs

# Restart containers
make restart
```

### Permission Issues

```bash
# Make scripts executable
chmod +x *.sh

# Check script permissions
ls -la *.sh
```

## 📁 File Structure

```
Event-i/
├── Makefile                    # Main command interface
├── package.json               # NPM scripts
├── start-docker.sh            # Development startup
├── start-event-i-local.sh     # Production startup
├── setup-local-domain.sh      # Domain management
├── docker-entrypoint.sh       # Container entrypoint
├── docker-compose.yml         # Development compose
├── docker-compose.prod.yml    # Production compose
├── docker-compose.override.yml # Override for local domain
└── AUTOMATED_DOCKER_SETUP.md  # This documentation
```

## 🔒 Security Features

### Hosts File Protection

- **Backup**: Automatic backup before changes
- **Isolation**: Only affects `event-i.co.ke`
- **Rollback**: Easy removal with `make domain-remove`

### Container Security

- **Read-only**: Scripts mounted as read-only
- **User Permissions**: Proper file permissions
- **Health Checks**: Container health monitoring

## 🚀 Development Workflow

### Daily Development

```bash
# 1. Start development environment
make dev

# 2. Check status
make status

# 3. View logs if needed
make logs

# 4. Stop when done
make down
```

### Production Testing

```bash
# 1. Start production environment
make prod

# 2. Test connections
make test

# 3. Check URLs
make urls

# 4. Stop when done
make prod-down
```

### Domain Management

```bash
# Check domain status
make domain-status

# Remove domain if needed
make domain-remove

# Re-add domain
make domain-setup
```

## 📱 Mobile Testing

### Same Network Access

```bash
# Find your IP
ifconfig | grep 'inet ' | grep -v 127.0.0.1

# Access from mobile device
# https://YOUR_IP/
```

### Mobile Hosts File

For mobile devices, add to their hosts file:

```
YOUR_IP event-i.co.ke
```

## 🔧 Configuration

### Environment Variables

```bash
# Domain setup
AUTO_DOMAIN_SETUP=true

# Docker ports
CLIENT_PORT=3001
SERVER_PORT=5001
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
```

### Customization

- **Domain**: Change `event-i.co.ke` in scripts
- **Ports**: Modify environment variables
- **SSL**: Update certificate generation

## 📚 Additional Resources

- [LOCAL_DOMAIN_SETUP.md](./LOCAL_DOMAIN_SETUP.md) - Detailed domain setup guide
- [NGINX_DEPLOYMENT_GUIDE.md](./NGINX_DEPLOYMENT_GUIDE.md) - Nginx configuration
- [README.md](./README.md) - Main project documentation

## 🆘 Support

### Common Issues

1. **Domain not resolving**: Run `make domain-setup`
2. **Containers not starting**: Check `make logs`
3. **Permission denied**: Run `chmod +x *.sh`
4. **Port conflicts**: Check `make status`

### Getting Help

```bash
# Show help
make help

# Check status
make status

# View logs
make logs

# Test connections
make test
```

The automated setup ensures that `event-i.co.ke` is always available when you start Docker, making development seamless and production-like.
