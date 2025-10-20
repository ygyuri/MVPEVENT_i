# Event-i Makefile
# Provides convenient commands for Docker operations with automatic domain setup

.PHONY: help dev staging uat prod up down build logs status clean test setup-env setup-env-dev setup-env-staging setup-env-uat setup-env-prod

# Default target
help: ## Show this help message
	@echo "Event-i Docker Commands"
	@echo "======================"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "Examples:"
	@echo "  make dev        # Start development environment"
	@echo "  make staging    # Start staging environment"
	@echo "  make uat        # Start UAT environment"
	@echo "  make prod       # Start production environment"
	@echo "  make status     # Check container status"
	@echo "  make logs       # View container logs"
	@echo ""
	@echo "Environment Management:"
	@echo "  make setup-env-dev     # Create .env.development"
	@echo "  make setup-env-staging # Create .env.staging"
	@echo "  make setup-env-uat     # Create .env.uat"
	@echo "  make setup-env-prod    # Create .env.production"

# Create .env file from example if it doesn't exist
setup-env: ## Create .env file from example
	@if [ ! -f .env ]; then \
		echo "📝 Creating .env file from env.example..."; \
		cp env.example .env; \
		echo "✅ .env file created. Please edit it with your configuration."; \
	else \
		echo "✅ .env file already exists"; \
	fi

# Environment-specific .env setup
setup-env-dev: ## Create .env.development from example
	@if [ ! -f .env.development ]; then \
		echo "📝 Creating .env.development from env.development.example..."; \
		cp env.development.example .env.development; \
		echo "✅ .env.development created. Please edit it with your configuration."; \
	else \
		echo "✅ .env.development already exists"; \
	fi

setup-env-staging: ## Create .env.staging from example
	@if [ ! -f .env.staging ]; then \
		echo "📝 Creating .env.staging from env.staging.example..."; \
		cp env.staging.example .env.staging; \
		echo "✅ .env.staging created. Please edit it with your configuration."; \
	else \
		echo "✅ .env.staging already exists"; \
	fi

setup-env-uat: ## Create .env.uat from example
	@if [ ! -f .env.uat ]; then \
		echo "📝 Creating .env.uat from env.uat.example..."; \
		cp env.uat.example .env.uat; \
		echo "✅ .env.uat created. Please edit it with your configuration."; \
	else \
		echo "✅ .env.uat already exists"; \
	fi

setup-env-prod: ## Create .env.production from example
	@if [ ! -f .env.production ]; then \
		echo "📝 Creating .env.production from env.production.example..."; \
		cp env.production.example .env.production; \
		echo "✅ .env.production created. Please edit it with your configuration."; \
	else \
		echo "✅ .env.production already exists"; \
	fi

# Development environment
dev: setup-env-dev ## Start development environment
	@echo "🐳 Starting Event-i Development Environment..."
	@./start-docker.sh

# Staging environment
staging: setup-env-staging ## Start staging environment
	@echo "🐳 Starting Event-i Staging Environment..."
	@docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build

# UAT environment
uat: setup-env-uat ## Start UAT environment
	@echo "🐳 Starting Event-i UAT Environment..."
	@docker compose -f docker-compose.uat.yml --env-file .env.uat up -d --build

# Production environment
prod: setup-env-prod ## Start production environment
	@echo "🐳 Starting Event-i Production Environment..."
	@./start-event-i-local.sh start

# Start containers
up: setup-env ## Start all containers
	@echo "🚀 Starting Event-i containers..."
	@docker compose up -d --build

# Stop containers
down: ## Stop all containers
	@echo "🛑 Stopping Event-i containers..."
	@docker compose down

down-staging: ## Stop staging containers
	@echo "🛑 Stopping Event-i Staging containers..."
	@docker compose -f docker-compose.staging.yml down

down-uat: ## Stop UAT containers
	@echo "🛑 Stopping Event-i UAT containers..."
	@docker compose -f docker-compose.uat.yml down

down-prod: ## Stop production containers
	@echo "🛑 Stopping Event-i Production containers..."
	@docker compose -f docker-compose.prod.yml down

# Build containers
build: ## Build all containers
	@echo "🏗️ Building Event-i containers..."
	@docker compose build

build-staging: ## Build staging containers
	@echo "🏗️ Building Event-i Staging containers..."
	@docker compose -f docker-compose.staging.yml build

build-uat: ## Build UAT containers
	@echo "🏗️ Building Event-i UAT containers..."
	@docker compose -f docker-compose.uat.yml build

build-prod: ## Build production containers
	@echo "🏗️ Building Event-i Production containers..."
	@docker compose -f docker-compose.prod.yml build

# View logs
logs: ## View container logs
	@echo "📝 Event-i container logs:"
	@docker compose logs -f

logs-staging: ## View staging container logs
	@echo "📝 Event-i Staging container logs:"
	@docker compose -f docker-compose.staging.yml logs -f

logs-uat: ## View UAT container logs
	@echo "📝 Event-i UAT container logs:"
	@docker compose -f docker-compose.uat.yml logs -f

logs-prod: ## View production container logs
	@echo "📝 Event-i Production container logs:"
	@docker compose -f docker-compose.prod.yml logs -f

# Check status
status: ## Check container status
	@echo "📊 Event-i container status:"
	@docker compose ps --format "table {{.Name}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

status-staging: ## Check staging container status
	@echo "📊 Event-i Staging container status:"
	@docker compose -f docker-compose.staging.yml ps --format "table {{.Name}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

status-uat: ## Check UAT container status
	@echo "📊 Event-i UAT container status:"
	@docker compose -f docker-compose.uat.yml ps --format "table {{.Name}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

status-prod: ## Check production container status
	@echo "📊 Event-i Production container status:"
	@docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

# Clean up
clean: ## Clean up containers and volumes
	@echo "🧹 Cleaning up Event-i containers..."
	@docker compose down -v --rmi all

clean-staging: ## Clean up staging containers and volumes
	@echo "🧹 Cleaning up Event-i Staging containers..."
	@docker compose -f docker-compose.staging.yml down -v --rmi all

clean-uat: ## Clean up UAT containers and volumes
	@echo "🧹 Cleaning up Event-i UAT containers..."
	@docker compose -f docker-compose.uat.yml down -v --rmi all

clean-prod: ## Clean up production containers and volumes
	@echo "🧹 Cleaning up Event-i Production containers..."
	@docker compose -f docker-compose.prod.yml down -v --rmi all

# Domain management (removed)

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
	@docker compose -f docker-compose.prod.yml up -d --build

prod-down: ## Stop production containers
	@echo "🛑 Stopping Event-i production containers..."
	@docker compose -f docker-compose.prod.yml down

prod-logs: ## View production container logs
	@echo "📝 Event-i production container logs:"
	@docker compose -f docker-compose.prod.yml logs -f

prod-status: ## Check production container status
	@echo "📊 Event-i production container status:"
	@docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

# Database operations
db-reset: ## Reset database (WARNING: This will delete all data)
	@echo "⚠️  Resetting database (all data will be lost)..."
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@docker compose down -v
	@docker compose up -d mongodb redis
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
		echo "✅ Custom Domain (event-i.co.ke):"; \
		echo "   Frontend: https://event-i.co.ke/"; \
		echo "   API:      https://event-i.co.ke/api/health"; \
		echo "   Health:   https://event-i.co.ke/health"; \
	else \
		echo "⚠️  Custom domain not configured"; \
		echo "   Run: make domain-setup"; \
	fi
	@echo ""
	@echo "📱 Mobile Testing:"
	@echo "   Find your IP: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
