# Documentation Index

Welcome to the Hue MCP Server documentation. This collection of guides covers everything from quick setup to advanced development.

## Quick Start

- **[Installation Guide](installation.md)** - Complete setup instructions
- **[README](../README.md)** - Project overview and quick start

## User Documentation

### Getting Started
- **[Installation Guide](installation.md)** - Detailed setup and configuration
- **[Troubleshooting Guide](troubleshooting.md)** - Solving common issues

### Using the Server
- **[MCP Tools Reference](mcp-tools.md)** - Complete tool documentation  
- **[Natural Language Examples](examples.md)** - Command examples and patterns

## Developer Documentation

### Development
- **[Development Guide](development.md)** - Contributing and extending
- **[API Reference](api-reference.md)** - Technical API documentation

## Quick Navigation

| Topic | Primary Doc | Related Docs |
|-------|-------------|--------------|
| **Setup** | [Installation](installation.md) | [Troubleshooting](troubleshooting.md) |
| **Usage** | [Examples](examples.md) | [MCP Tools](mcp-tools.md) |
| **Issues** | [Troubleshooting](troubleshooting.md) | [Installation](installation.md) |
| **Development** | [Development Guide](development.md) | [API Reference](api-reference.md) |

## Documentation Overview

### 📦 [Installation Guide](installation.md)
Complete step-by-step setup process:
- System requirements and prerequisites
- Installation methods (Git clone, ZIP download)
- Bridge discovery and authentication
- Claude Desktop integration
- Configuration options and environment variables
- Network setup and security considerations

### 🔧 [MCP Tools Reference](mcp-tools.md)
Comprehensive tool documentation:
- All 13 MCP tools with parameters and examples
- Request/response formats
- Error handling patterns
- Performance considerations
- Natural language processing capabilities

### 💬 [Natural Language Examples](examples.md)
Real-world usage patterns:
- Basic light control commands
- Color and brightness control
- Room and zone management
- Scene activation
- Advanced natural language patterns
- Best practices for user interactions

### 🔍 [Troubleshooting Guide](troubleshooting.md)
Problem solving and diagnostics:
- Common setup issues and solutions
- Network connectivity problems
- Claude Desktop integration troubleshooting
- Performance optimization
- Error message reference
- Debug logging and diagnostics

### 👨‍💻 [Development Guide](development.md)
Contributing and extending:
- Development environment setup
- Project architecture overview
- Adding new MCP tools
- Natural language processing extension
- Testing strategies
- Code style and contribution guidelines

### 📚 [API Reference](api-reference.md)
Technical implementation details:
- Configuration API and schema
- HueClient class methods
- Natural language processing functions
- Color conversion utilities
- Setup server endpoints
- Extension points and customization

## Getting Help

### Self-Service Resources

1. **Search the docs** - Use your browser's search (Ctrl/Cmd+F) to find specific topics
2. **Check examples** - The [Examples](examples.md) guide covers most common use cases
3. **Run diagnostics** - Use `npm run test:connection` to verify your setup
4. **Check logs** - Enable debug logging with `LOG_LEVEL=debug`

### Community Support

- **GitHub Issues** - Report bugs or request features
- **GitHub Discussions** - Ask questions and share tips
- **Documentation** - Contribute improvements to these docs

### Quick Diagnostic Commands

```bash
# Test your complete setup
npm run test:connection

# Verify TypeScript compilation  
npm run typecheck

# Run unit tests
npm test

# Check for common issues
npm run lint
```

## Contributing to Documentation

We welcome documentation improvements! To contribute:

1. **Fork the repository** on GitHub
2. **Edit markdown files** in the `docs/` directory
3. **Test your changes** by building and reading locally
4. **Submit a pull request** with clear description of changes

### Documentation Standards

- **Clear headings** - Use proper markdown hierarchy
- **Code examples** - Include working code snippets
- **Cross-references** - Link between related documentation
- **Keep current** - Update docs when functionality changes
- **User focused** - Write from the user's perspective

### File Organization

```
docs/
├── README.md          # This index file
├── installation.md    # Setup and configuration
├── mcp-tools.md      # Tool reference
├── examples.md       # Usage examples
├── troubleshooting.md # Problem solving
├── development.md    # Contributing guide
└── api-reference.md  # Technical reference
```

---

**Need immediate help?** Start with the [Installation Guide](installation.md) for setup issues or [Troubleshooting Guide](troubleshooting.md) for problems with an existing installation.