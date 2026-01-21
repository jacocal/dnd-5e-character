# D&D 5e Character Builder - Makefile
# =====================================
# This Makefile provides convenient commands for building and running the application.

# Configuration
REQUIRED_NODE_MAJOR := 24
REQUIRED_NODE_MINOR := 0
REQUIRED_NODE_PATCH := 0

# Colors for output (ANSI escape codes)
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m

.PHONY: all check check-docker check-node check-env setup install db-start db-stop db-reset db-push db-seed dev build start clean help

# Default target
all: check setup db-start db-push db-seed
	@echo "$(GREEN)✓ Setup complete! Run 'make dev' to start the development server.$(NC)"

# ============================================================================
# CHECKS
# ============================================================================

## check: Run all prerequisite checks
check: check-docker check-node check-env
	@echo "$(GREEN)✓ All prerequisite checks passed!$(NC)"

## check-docker: Verify Docker and Docker Compose are installed
check-docker:
	@echo "Checking Docker installation..."
	@docker --version > /dev/null 2>&1 || (echo "$(RED)✗ Docker is not installed. Please install Docker Desktop: https://www.docker.com/products/docker-desktop$(NC)" && exit 1)
	@echo "$(GREEN)✓ Docker is installed$(NC)"
	@echo "Checking Docker Compose installation..."
	@(docker compose version > /dev/null 2>&1 || docker-compose --version > /dev/null 2>&1) || (echo "$(RED)✗ Docker Compose is not installed. Please install Docker Desktop or Docker Compose: https://docs.docker.com/compose/install/$(NC)" && exit 1)
	@echo "$(GREEN)✓ Docker Compose is installed$(NC)"

## check-node: Verify Node.js version meets requirements (v24.0.0+)
check-node:
	@echo "Checking Node.js installation..."
	@node --version > /dev/null 2>&1 || (echo "$(RED)✗ Node.js is not installed. Please install Node.js v$(REQUIRED_NODE_MAJOR).$(REQUIRED_NODE_MINOR).$(REQUIRED_NODE_PATCH) or higher: https://nodejs.org/$(NC)" && exit 1)
	@NODE_VERSION=$$(node --version | sed 's/v//'); \
	MAJOR=$$(echo $$NODE_VERSION | cut -d. -f1); \
	MINOR=$$(echo $$NODE_VERSION | cut -d. -f2); \
	PATCH=$$(echo $$NODE_VERSION | cut -d. -f3); \
	if [ "$$MAJOR" -lt $(REQUIRED_NODE_MAJOR) ]; then \
		echo "$(RED)✗ Node.js version $$NODE_VERSION is too old. Required: v$(REQUIRED_NODE_MAJOR).$(REQUIRED_NODE_MINOR).$(REQUIRED_NODE_PATCH)+$(NC)"; \
		exit 1; \
	elif [ "$$MAJOR" -eq $(REQUIRED_NODE_MAJOR) ] && [ "$$MINOR" -lt $(REQUIRED_NODE_MINOR) ]; then \
		echo "$(RED)✗ Node.js version $$NODE_VERSION is too old. Required: v$(REQUIRED_NODE_MAJOR).$(REQUIRED_NODE_MINOR).$(REQUIRED_NODE_PATCH)+$(NC)"; \
		exit 1; \
	elif [ "$$MAJOR" -eq $(REQUIRED_NODE_MAJOR) ] && [ "$$MINOR" -eq $(REQUIRED_NODE_MINOR) ] && [ "$$PATCH" -lt $(REQUIRED_NODE_PATCH) ]; then \
		echo "$(RED)✗ Node.js version $$NODE_VERSION is too old. Required: v$(REQUIRED_NODE_MAJOR).$(REQUIRED_NODE_MINOR).$(REQUIRED_NODE_PATCH)+$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ Node.js $$(node --version) is installed$(NC)"

## check-env: Verify .env file exists (creates from .env.example if missing)
check-env:
	@echo "Checking environment configuration..."
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)! .env file not found. Creating from .env.example...$(NC)"; \
		cp .env.example .env; \
		echo "$(GREEN)✓ Created .env from .env.example$(NC)"; \
	else \
		echo "$(GREEN)✓ .env file exists$(NC)"; \
	fi

# ============================================================================
# SETUP & INSTALLATION
# ============================================================================

## setup: Complete initial project setup (install dependencies, check prerequisites)
setup: check install
	@echo "$(GREEN)✓ Project setup complete!$(NC)"

## install: Install npm dependencies
install:
	@echo "Installing npm dependencies..."
	@npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

## install-clean: Clean install of npm dependencies (removes node_modules first)
install-clean:
	@echo "Removing existing node_modules..."
	@rm -rf node_modules
	@echo "Installing fresh npm dependencies..."
	@npm install
	@echo "$(GREEN)✓ Clean installation complete$(NC)"

# ============================================================================
# DATABASE COMMANDS
# ============================================================================

## db-start: Start the PostgreSQL database container
db-start:
	@echo "Starting database containers..."
	@(docker compose up -d 2>/dev/null || docker-compose up -d)
	@echo "$(GREEN)✓ Database started$(NC)"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  Adminer:    http://localhost:8080"

## db-stop: Stop the PostgreSQL database container
db-stop:
	@echo "Stopping database containers..."
	@(docker compose down 2>/dev/null || docker-compose down)
	@echo "$(GREEN)✓ Database stopped$(NC)"

## db-reset: Reset the database (stop, remove volume, start fresh)
db-reset:
	@echo "$(YELLOW)⚠ This will delete all database data. Proceed? [y/N]$(NC)"
	@read -r response; \
	if [ "$$response" = "y" ] || [ "$$response" = "Y" ]; then \
		echo "Resetting database..."; \
		(docker compose down -v 2>/dev/null || docker-compose down -v); \
		(docker compose up -d 2>/dev/null || docker-compose up -d); \
		echo "$(GREEN)✓ Database reset complete$(NC)"; \
	else \
		echo "Database reset cancelled."; \
	fi

## db-push: Push the Drizzle schema to the database
db-push:
	@echo "Pushing schema to database..."
	@npx drizzle-kit push
	@echo "$(GREEN)✓ Schema pushed to database$(NC)"

## db-seed: Seed the database with SRD data
db-seed:
	@echo "Seeding database with SRD data..."
	@npx tsx scripts/seed.ts
	@echo "$(GREEN)✓ Database seeded$(NC)"

## db-studio: Open Drizzle Studio for database inspection
db-studio:
	@echo "Opening Drizzle Studio..."
	@npx drizzle-kit studio

# ============================================================================
# DEVELOPMENT & BUILD
# ============================================================================

## dev: Start the development server
dev:
	@echo "Starting development server..."
	@npm run dev

## build: Build the production application
build: check
	@echo "Building production application..."
	@npm run build
	@echo "$(GREEN)✓ Build complete$(NC)"

## start: Start the production server (requires build first)
start:
	@echo "Starting production server..."
	@npm run start

## lint: Run ESLint
lint:
	@echo "Running ESLint..."
	@npm run lint

# ============================================================================
# UTILITY
# ============================================================================

## clean: Clean build artifacts and caches
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf .next
	@rm -rf node_modules/.cache
	@echo "$(GREEN)✓ Clean complete$(NC)"

## clean-all: Full clean including node_modules
clean-all: clean
	@echo "Removing node_modules..."
	@rm -rf node_modules
	@echo "$(GREEN)✓ Full clean complete$(NC)"

## quick-start: Quick start for returning developers (db + dev server)
quick-start: db-start dev

# ============================================================================
# HELP
# ============================================================================

## help: Show this help message
help:
	@echo ""
	@echo "D&D 5e Character Builder - Available Commands"
	@echo "=============================================="
	@echo ""
	@echo "$(GREEN)First-time Setup:$(NC)"
	@echo "  make all           - Complete setup (checks, install, db, seed)"
	@echo "  make setup         - Install dependencies and run checks"
	@echo ""
	@echo "$(GREEN)Checks:$(NC)"
	@echo "  make check         - Run all prerequisite checks"
	@echo "  make check-docker  - Verify Docker/Docker Compose installation"
	@echo "  make check-node    - Verify Node.js version (v$(REQUIRED_NODE_MAJOR).$(REQUIRED_NODE_MINOR).$(REQUIRED_NODE_PATCH)+)"
	@echo "  make check-env     - Verify .env file exists"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  make db-start      - Start PostgreSQL container"
	@echo "  make db-stop       - Stop PostgreSQL container"
	@echo "  make db-reset      - Reset database (deletes all data)"
	@echo "  make db-push       - Push Drizzle schema to database"
	@echo "  make db-seed       - Seed database with SRD data"
	@echo "  make db-studio     - Open Drizzle Studio"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev           - Start development server"
	@echo "  make build         - Build production application"
	@echo "  make start         - Start production server"
	@echo "  make lint          - Run ESLint"
	@echo "  make quick-start   - Quick start (db + dev server)"
	@echo ""
	@echo "$(GREEN)Utility:$(NC)"
	@echo "  make install       - Install npm dependencies"
	@echo "  make install-clean - Clean install dependencies"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make clean-all     - Full clean including node_modules"
	@echo "  make help          - Show this help message"
	@echo ""
