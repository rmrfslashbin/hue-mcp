.PHONY: help install dev build test test-coverage lint format type-check clean setup dist package

# $(PNPM)path
PNPM := $(HOME)/Library/pnpm/pnpm

# Default target
help: ## Show this help
	@echo "🌈 Hue MCP Server - Build Helper"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies with pnpm
	@echo "📦 Installing dependencies..."
	$(PNPM) install

dev: ## Start development server
	@echo "🚀 Starting development server..."
	$(PNPM) run dev

build: clean ## Build for production
	@echo "🔨 Building for production..."
	$(PNPM) run build
	@echo ""
	@echo "✅ Build complete!"
	@echo ""
	@echo "📂 Distribution files are in: ./dist/"
	@echo "   Main entry point: ./dist/index.js"
	@echo ""
	@echo "🚀 To install globally (recommended):"
	@echo "   sudo ln -sf $(PWD)/dist/index.js /usr/local/bin/hue-mcp"
	@echo ""
	@echo "📋 Or copy entire project:"
	@echo "   sudo cp -r $(PWD) /usr/local/lib/hue-mcp"
	@echo "   sudo ln -sf /usr/local/lib/hue-mcp/dist/index.js /usr/local/bin/hue-mcp"
	@echo ""

dist: build ## Create distribution and installation instructions
	@echo "📦 Creating distribution..."
	@echo ""
	@echo "✅ Distribution ready!"
	@echo ""
	@echo "🚀 Recommended installation (symlink to built project):"
	@echo "   sudo ln -sf $(PWD)/dist/index.js /usr/local/bin/hue-mcp"
	@echo ""
	@echo "📦 Alternative - standalone package:"
	@echo "   make package"
	@echo ""
	@echo "📋 Manual installation:"
	@echo "   1. Copy project: sudo cp -r $(PWD) /usr/local/lib/hue-mcp"
	@echo "   2. Install deps: cd /usr/local/lib/hue-mcp && sudo $(PNPM) install --prod"
	@echo "   3. Link binary: sudo ln -sf /usr/local/lib/hue-mcp/dist/index.js /usr/local/bin/hue-mcp"

package: build ## Create standalone distributable package
	@echo "📦 Creating standalone package with dependencies..."
	@rm -rf dist-package
	@mkdir -p dist-package
	@cp -r dist/* dist-package/
	@cp package.json dist-package/
	@cp README.md dist-package/
	@cp LICENSE dist-package/
	@cp pnpm-lock.yaml dist-package/ 2>/dev/null || true
	@echo "#!/usr/bin/env node" > dist-package/hue-mcp
	@echo "import './index.js';" >> dist-package/hue-mcp
	@chmod +x dist-package/hue-mcp
	@echo "📦 Installing production dependencies..."
	@cd dist-package && $(PNPM) install --prod --frozen-lockfile
	@echo "📦 Creating tarball..."
	@tar -czf hue-mcp-dist.tar.gz -C dist-package .
	@echo ""
	@echo "✅ Standalone package created!"
	@echo ""
	@echo "📦 Package: hue-mcp-dist.tar.gz"
	@echo "🚀 To install:"
	@echo "   sudo mkdir -p /usr/local/lib/hue-mcp"
	@echo "   sudo tar -xzf hue-mcp-dist.tar.gz -C /usr/local/lib/hue-mcp"
	@echo "   sudo ln -sf /usr/local/lib/hue-mcp/hue-mcp /usr/local/bin/hue-mcp"

test: ## Run tests
	@echo "🧪 Running tests..."
	$(PNPM) run test

test-coverage: ## Run tests with coverage
	@echo "🧪 Running tests with coverage..."
	$(PNPM) run test:coverage
	@echo ""
	@echo "📊 Coverage report available at: ./coverage/index.html"

lint: ## Run linting
	@echo "🔍 Running ESLint..."
	$(PNPM) run lint

lint-fix: ## Run linting with auto-fix
	@echo "🔧 Running ESLint with auto-fix..."
	$(PNPM) run lint:fix

format: ## Format code with Prettier
	@echo "💅 Formatting code..."
	$(PNPM) run format

type-check: ## Run TypeScript type checking
	@echo "🔍 Running TypeScript type check..."
	$(PNPM) run typecheck

setup: install ## Setup development environment
	@echo "⚙️ Setting up development environment..."
	@echo "✅ Dependencies installed"
	@echo ""
	@echo "🌈 Hue MCP Server is ready for development!"
	@echo ""
	@echo "Next steps:"
	@echo "  make dev      - Start development server"
	@echo "  make test     - Run tests"
	@echo "  make build    - Build for production"

setup-web: ## Launch setup wizard
	@echo "🌐 Launching web setup wizard..."
	$(PNPM) run setup:web

setup-cli: ## Launch CLI setup
	@echo "⚡ Launching CLI setup..."
	$(PNPM) run setup

clean: ## Clean build artifacts and caches
	@echo "🧹 Cleaning build artifacts..."
	$(PNPM) run clean
	@rm -rf coverage
	@rm -rf node_modules/.cache
	@rm -rf dist-package
	@rm -f hue-mcp-dist.tar.gz
	@echo "✅ Clean complete"

clean-all: clean ## Clean everything including node_modules
	@echo "🧹 Deep cleaning (including node_modules)..."
	@rm -rf node_modules
	@rm -rf setup-wizard/node_modules
	@echo "✅ Deep clean complete"

audit: ## Run security audit
	@echo "🔒 Running security audit..."
	$(PNPM)audit

update: ## Update dependencies
	@echo "📦 Updating dependencies..."
	$(PNPM)update

check: type-check lint test ## Run all checks (type-check, lint, test)
	@echo ""
	@echo "✅ All checks passed!"

ci: install check build ## Run CI pipeline (install, check, build)
	@echo ""
	@echo "✅ CI pipeline complete!"

# Development helpers
watch-test: ## Run tests in watch mode
	@echo "👀 Running tests in watch mode..."
	$(PNPM) run test --watch

debug: ## Build and show debug info
	@echo "🐛 Building with debug info..."
	@make build
	@echo ""
	@echo "Debug Information:"
	@echo "Node version: $(shell node --version)"
	@echo "$(PNPM)version: $(shell $(PNPM)--version)"
	@echo "Dist size: $(shell du -sh dist 2>/dev/null || echo 'not found')"
	@echo "Main files:"
	@find dist -name "*.js" -o -name "*.d.ts" | head -10

# Quick actions
quick-build: ## Quick build without clean
	@echo "⚡ Quick build..."
	$(PNPM) run build

serve: build ## Build and serve locally for testing
	@echo "🌐 Building and serving locally..."
	@cd dist && python3 -m http.server 8080 || python -m SimpleHTTPServer 8080