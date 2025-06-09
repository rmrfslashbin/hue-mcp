# Development Guide

This guide covers everything you need to know to contribute to or extend the Hue MCP Server.

## Getting Started

### Development Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-username/hue-mcp.git
cd hue-mcp

# Install dependencies
npm install

# Install development dependencies
npm install --include=dev

# Setup git hooks (optional)
npx husky install
```

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Latest version
- **Git**: For version control
- **IDE**: VS Code recommended with TypeScript extension
- **Hue Bridge**: For testing (or mock data for unit tests)

### Project Structure

```
hue-mcp/
├── src/                    # Source code
│   ├── index.ts           # Main MCP server entry point
│   ├── config.ts          # Configuration management
│   ├── hue-client.ts      # Hue API client wrapper
│   ├── setup-cli.ts       # CLI setup tool
│   ├── setup-server.ts    # Web setup server
│   ├── tools/             # MCP tool implementations
│   │   ├── lights.ts      # Light control tools
│   │   ├── rooms.ts       # Room control tools
│   │   ├── scenes.ts      # Scene control tools
│   │   └── summary.ts     # System summary tool
│   ├── utils/             # Utility functions
│   │   └── colors.ts      # Color conversion utilities
│   └── types/             # TypeScript type definitions
│       └── index.ts       # Common types
├── setup-wizard/          # React web setup interface
│   ├── src/              # React source code
│   ├── public/           # Static assets
│   └── package.json      # Setup wizard dependencies
├── tests/                # Unit tests
│   ├── colors.test.ts    # Color utility tests
│   └── config.test.ts    # Configuration tests
├── scripts/              # Utility scripts
│   └── test-connection.ts # Connection testing
├── docs/                 # Documentation
└── dist/                 # Compiled output (generated)
```

## Development Workflow

### Daily Development

```bash
# Start development server with hot reload
npm run dev

# In separate terminal, start setup wizard for testing
npm run setup:web

# Run tests while developing
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Code formatting
npm run format
```

### Making Changes

1. **Create a Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**: Edit files in `src/`

3. **Test Changes**:
   ```bash
   npm test
   npm run typecheck
   npm run test:connection  # If you have a bridge
   ```

4. **Format Code**:
   ```bash
   npm run format
   npm run lint
   ```

5. **Commit Changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

### Commit Message Format

We follow conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or modifying tests
- `chore:` - Maintenance tasks

## Code Architecture

### MCP Server Architecture

```typescript
// Main server entry point
class HueMCPServer {
  private server: Server;
  private client: HueClient;
  
  // Handles MCP protocol requests
  setupHandlers() {
    // List tools handler
    // Call tool handler
  }
}
```

### Tool Implementation Pattern

Each tool follows this pattern:

```typescript
// 1. Tool definition function
export function createToolName(client: HueClient): Tool {
  return {
    name: 'tool_name',
    description: 'What this tool does',
    inputSchema: {
      // JSON Schema for parameters
    },
  };
}

// 2. Tool handler function
export async function handleToolName(
  client: HueClient, 
  args: any
): Promise<any> {
  try {
    // Tool implementation
    return result;
  } catch (error) {
    throw new Error(`Tool failed: ${error}`);
  }
}
```

### Adding New Tools

1. **Create Tool File**: Add to `src/tools/new-tool.ts`

2. **Implement Tool**:
   ```typescript
   import { Tool } from '@modelcontextprotocol/sdk/types.js';
   import { HueClient } from '../hue-client.js';

   export function createNewTool(client: HueClient): Tool {
     return {
       name: 'new_tool',
       description: 'Description of what this tool does',
       inputSchema: {
         type: 'object',
         properties: {
           parameter: {
             type: 'string',
             description: 'Parameter description',
           },
         },
         required: ['parameter'],
       },
     };
   }

   export async function handleNewTool(
     client: HueClient,
     args: any
   ): Promise<any> {
     // Implementation here
     return { success: true, result: args.parameter };
   }
   ```

3. **Register Tool**: Add to `src/index.ts`
   ```typescript
   import { createNewTool, handleNewTool } from './tools/new-tool.js';

   // In setupHandlers method
   const tools = [
     ...createLightTools(this.client),
     createNewTool(this.client), // Add here
   ];

   // In call tool handler
   case 'new_tool':
     result = await handleNewTool(this.client, args);
     break;
   ```

4. **Add Tests**: Create `tests/new-tool.test.ts`

### Extending HueClient

To add new Hue API functionality:

```typescript
// In src/hue-client.ts
class HueClient {
  // Add new method
  async newHueFeature(params: any): Promise<any> {
    if (!this.api) throw new Error('Not connected to bridge');
    
    try {
      const result = await this.api.someNewEndpoint(params);
      return result;
    } catch (error) {
      console.error('New feature failed:', error);
      throw error;
    }
  }
}
```

## Testing

### Unit Testing

We use Vitest for fast, modern testing:

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/colors.test.ts

# Run tests with UI
npm run test:ui

# Run tests in watch mode
npm test -- --watch
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../src/module.js';

describe('Feature name', () => {
  it('should do something specific', () => {
    const result = functionToTest('input');
    expect(result).toBe('expected');
  });

  it('should handle errors gracefully', () => {
    expect(() => functionToTest('')).toThrow('Expected error message');
  });
});
```

### Integration Testing

```bash
# Test with real bridge (requires setup)
npm run test:connection

# Mock bridge testing
# We use mocked responses for CI/CD
```

### Test Coverage

```bash
# Generate coverage report
npm test -- --coverage

# View coverage in browser
open coverage/index.html
```

## Setup Wizard Development

The setup wizard is a separate React application:

```bash
# Navigate to setup wizard
cd setup-wizard

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Adding Setup Wizard Features

1. **Component Structure**:
   ```typescript
   // setup-wizard/src/components/NewStep.tsx
   interface NewStepProps {
     onNext: () => void;
     onBack: () => void;
   }

   export function NewStep({ onNext, onBack }: NewStepProps) {
     return (
       <div>
         {/* Step content */}
         <button onClick={onNext}>Next</button>
       </div>
     );
   }
   ```

2. **Add to Main App**:
   ```typescript
   // setup-wizard/src/App.tsx
   {state.step === 'new_step' && (
     <NewStep onNext={() => handleStepComplete()} />
   )}
   ```

## Configuration Management

### Adding New Configuration Options

1. **Update Schema**: Modify `src/config.ts`
   ```typescript
   const ConfigSchema = z.object({
     // Existing options...
     NEW_OPTION: z.string().default('default-value'),
   });
   ```

2. **Update Types**: Modify `src/types/index.ts`
   ```typescript
   export interface HueConfig {
     // Existing fields...
     NEW_OPTION: string;
   }
   ```

3. **Update Documentation**: Add to configuration tables in docs

### Environment Variables

All configuration should support environment variables:

```typescript
// In config loading
NEW_OPTION: process.env.NEW_OPTION || config.NEW_OPTION,
```

## Natural Language Processing

### Adding Color Names

Add to `src/utils/colors.ts`:

```typescript
const colors: Record<string, HSV> = {
  // Existing colors...
  'new_color': { h: 120, s: 50, v: 80 },
};
```

### Adding Color Temperature Names

```typescript
const temps: Record<string, number> = {
  // Existing temps...
  'new_temp': 300, // Mireds value
};
```

### Extending Natural Language Patterns

The parser in `HueClient.parseNaturalLanguageState()` can be extended:

```typescript
// Add new pattern recognition
if (lower.includes('new_pattern')) {
  state.brightness = 50;
  state.hue = 180;
}
```

## Performance Optimization

### Caching Strategy

The client uses intelligent caching:

```typescript
// Cache implementation pattern
private shouldRefreshCache(): boolean {
  if (!this.lastSync) return true;
  const cacheAge = Date.now() - this.lastSync.getTime();
  return cacheAge > this.config.HUE_SYNC_INTERVAL_MS;
}
```

### Rate Limiting

Respect Hue bridge limits:

```typescript
// Sequential requests with delays
for (const item of items) {
  await processItem(item);
  await delay(200); // Prevent rate limiting
}
```

## Error Handling

### Error Patterns

```typescript
// Standard error handling pattern
try {
  const result = await risky operation();
  return { success: true, result };
} catch (error: any) {
  console.error('Operation failed:', error);
  
  // Provide helpful error message
  if (error.message.includes('rate limit')) {
    throw new Error('Too many requests. Please wait before trying again.');
  }
  
  throw new Error(`Operation failed: ${error.message}`);
}
```

### Graceful Degradation

```typescript
// Fallback pattern
try {
  return await primaryMethod();
} catch (error) {
  console.warn('Primary method failed, trying fallback:', error);
  return await fallbackMethod();
}
```

## Building and Deployment

### Build Process

```bash
# Clean previous build
npm run clean

# Type check
npm run typecheck

# Build TypeScript
npm run build

# Verify build
ls dist/
```

### Distribution

```bash
# Create distribution package
npm pack

# Test installation from package
npm install hue-mcp-1.0.0.tgz
```

## Contributing Guidelines

### Code Style

- **TypeScript**: Use strict typing
- **ESLint**: Follow project ESLint rules
- **Prettier**: Auto-format with Prettier
- **Comments**: Document complex logic only

### Pull Request Process

1. **Fork Repository**: Create your own fork
2. **Create Branch**: Use descriptive branch names
3. **Make Changes**: Follow coding standards
4. **Add Tests**: Include tests for new features
5. **Update Docs**: Update relevant documentation
6. **Submit PR**: Include clear description

### Code Review Checklist

- [ ] Code follows TypeScript best practices
- [ ] Tests pass and cover new functionality
- [ ] Documentation is updated
- [ ] No breaking changes (or properly documented)
- [ ] Performance impact considered
- [ ] Error handling implemented
- [ ] Natural language features tested

### Release Process

1. **Version Bump**: Update package.json version
2. **Update Changelog**: Document changes
3. **Tag Release**: Create git tag
4. **Build Distribution**: Generate final build
5. **Publish**: Release to npm (if applicable)

## Debugging

### Development Debugging

```typescript
// Add debug logging
console.debug('Debug info:', { variable, state });

// Use debugger
debugger; // In development only
```

### Production Debugging

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Run with debugging
node --inspect dist/index.js
```

### Common Development Issues

**TypeScript Errors**:
```bash
# Clear TypeScript cache
npx tsc --build --clean
npm run build
```

**Import Errors**:
- Ensure `.js` extensions in imports
- Use proper ES module syntax
- Check tsconfig.json settings

**Hot Reload Issues**:
```bash
# Restart development server
npm run dev
```

This development guide should help you get started contributing to the Hue MCP Server. For specific questions, check the other documentation files or open an issue on GitHub.