.PHONY: build clean install test

# Binary name
BINARY_NAME=hue-mcp
BUILD_DIR=bin

# Build the binary
build:
	@mkdir -p $(BUILD_DIR)
	@echo "Building $(BINARY_NAME)..."
	@go build -o $(BUILD_DIR)/$(BINARY_NAME) main.go
	@echo "Binary built at: $(PWD)/$(BUILD_DIR)/$(BINARY_NAME)"

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	@echo "Clean complete"

# Install dependencies
install:
	@echo "Installing dependencies..."
	@go mod download
	@go mod tidy

# Run tests
test:
	@echo "Running tests..."
	@go test -v ./...

# Build and show path
path: build
	@echo "$(PWD)/$(BUILD_DIR)/$(BINARY_NAME)"
