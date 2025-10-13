# Event-i Makefile
# Provides convenient commands for Docker operations with automatic domain setup

.PHONY: help dev prod up down build logs status clean domain-setup domain-remove domain-status test

# Default target
help: ## Show this help message
	@echo "Event-i Docker Commands"
	@echo "======================"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "Examples:"
	@echo "  make dev        # Start development environment"
	@echo "  make prod       # Start production environment"
	@echo "  make status     # Check container status"
	@echo "  make logs       # View container logs"

# Create .env file from example if it doesn't exist
setup-env: ## Create .env file from example
	@if [ ! -f .env ]; then \
		echo "📝 Creating .env file from env.example..."; \
		cp env.example .env; \
		echo "✅ .env file created. Please edit it with your configuration."; \
	else \
		echo "✅ .env file already exists"; \
	fi

# Development environment
dev: setup-env domain-setup ## Start development environment with domain setup
	@echo "🐳 Starting Event-i Development Environment..."
	@./start-docker.sh

# Production environment
prod: setup-env domain-setup ## Start production environment with domain setup
	@echo "🐳 Starting Event-i Production Environment..."
	@./start-event-i-local.sh start

# Start containers
up: setup-env domain-setup ## Start all containers
	@echo "🚀 Starting Event-i containers..."
	@docker-compose up -d --build

# Stop containers
down: ## Stop all containers
	@echo "🛑 Stopping Event-i containers..."
	@docker-compose down

# Build containers
build: ## Build all containers
	@echo "🏗️ Building Event-i containers..."
	@docker-compose build

# View logs
logs: ## View container logs
	@echo "📝 Event-i container logs:"
	@docker-compose logs -f

# Check status
status: ## Check container status
	@echo "📊 Event-i container status:"
	@docker-compose ps --format "table {{.Name}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

# Clean up
clean: ## Clean up containers and volumes
	@echo "🧹 Cleaning up Event-i containers..."
	@docker-compose down -v --rmi all

# Domain management
domain-setup: ## Add event-i.local to hosts file
	@echo "🌐 Setting up local domain..."
	@./setup-local-domain.sh add

domain-remove: ## Remove event-i.local from hosts file
	@echo "🌐 Removing local domain..."
	@./setup-local-domain.sh remove

domain-status: ## Check domain configuration status
	@echo "🌐 Domain configuration status:"
	@./setup-local-domain.sh status

# Testing
test: ## Test Event-i connections
	@echo "🔍 Testing Event-i connections..."
	@./start-event-i-local.sh test

# Quick commands
start: dev ## Alias for dev
stop: down ## Alias for down
restart: down up ## Restart all containers

# Production specific
prod-up: domain-setup ## Start production containers
	@echo "🚀 Starting Event-i production containers..."
	@docker-compose -f docker-compose.prod.yml up -d --build

prod-down: ## Stop production containers
	@echo "🛑 Stopping Event-i production containers..."
	@docker-compose -f docker-compose.prod.yml down

prod-logs: ## View production container logs
	@echo "📝 Event-i production container logs:"
	@docker-compose -f docker-compose.prod.yml logs -f

prod-status: ## Check production container status
	@echo "📊 Event-i production container status:"
	@docker-compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

# Database operations
db-reset: ## Reset database (WARNING: This will delete all data)
	@echo "⚠️  Resetting database (all data will be lost)..."
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@docker-compose down -v
	@docker-compose up -d mongodb redis
	@sleep 5
	@echo "✅ Database reset complete"

# SSL operations
ssl-generate: ## Generate SSL certificates
	@echo "🔐 Generating SSL certificates..."
	@cd nginx && ./generate-ssl.sh

# Health checks
health: ## Check application health
	@echo "🏥 Checking Event-i health..."
	@curl -k -s https://localhost/api/health | jq . || echo "❌ Health check failed"

# Development tools
install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	@cd client && npm install
	@cd server && npm install

# Show URLs
urls: ## Show all access URLs
	@echo "🌐 Event-i Access URLs:"
	@echo "======================"
	@echo ""
	@echo "✅ Localhost (always available):"
	@echo "   Frontend: https://localhost/"
	@echo "   API:      https://localhost/api/health"
	@echo "   Health:   https://localhost/health"
	@echo ""
	@if grep -q "^127\.0\.0\.1[[:space:]]*event-i\.local$$" /etc/hosts 2>/dev/null; then \
		echo "✅ Custom Domain (event-i.local):"; \
		echo "   Frontend: https://event-i.local/"; \
		echo "   API:      https://event-i.local/api/health"; \
		echo "   Health:   https://event-i.local/health"; \
	else \
		echo "⚠️  Custom domain not configured"; \
		echo "   Run: make domain-setup"; \
	fi
	@echo ""
	@echo "📱 Mobile Testing:"
	@echo "   Find your IP: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
