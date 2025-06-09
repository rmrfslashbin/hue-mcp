# API Reference

This document provides detailed technical reference for the Hue MCP Server's internal APIs, configuration options, and extension points.

## Configuration API

### Configuration Schema

The configuration is validated using Zod schemas:

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  HUE_BRIDGE_IP: z.string().ip({ version: 'v4' }),
  HUE_API_KEY: z.string().min(32),
  HUE_SYNC_INTERVAL_MS: z.coerce.number().min(60000).default(300000),
  HUE_ENABLE_EVENTS: z.coerce.boolean().default(false),
  NODE_TLS_REJECT_UNAUTHORIZED: z.string().default('0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});
```

### Configuration Interface

```typescript
interface HueConfig {
  HUE_BRIDGE_IP: string;           // IPv4 address of Hue bridge
  HUE_API_KEY: string;             // API authentication key (32+ chars)
  HUE_SYNC_INTERVAL_MS: number;    // Cache refresh interval (min 60000ms)
  HUE_ENABLE_EVENTS: boolean;      // Enable real-time event updates
  NODE_TLS_REJECT_UNAUTHORIZED: string; // TLS certificate validation
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error'; // Logging level
}
```

### Configuration Functions

#### `loadConfig(): HueConfig | null`

Loads configuration from multiple sources with priority:

1. Environment variables (highest)
2. `hue-config.json` file
3. `.env` file (lowest)

**Returns**: Valid configuration object or `null` if invalid

**Example**:
```typescript
import { loadConfig } from './config.js';

const config = loadConfig();
if (!config) {
  console.error('Invalid configuration');
  process.exit(1);
}
```

#### `isConfigValid(config: HueConfig | null): boolean`

Type guard to validate configuration completeness.

**Parameters**:
- `config`: Configuration object or null

**Returns**: `true` if configuration is valid and complete

## HueClient API

### Class: HueClient

Main client for interacting with Philips Hue bridge.

```typescript
class HueClient {
  constructor(config: HueConfig);
  
  // Connection management
  async connect(): Promise<void>;
  async refreshCache(): Promise<void>;
  
  // Static methods
  static async discoverBridges(): Promise<any[]>;
  static async createUser(bridgeIp: string, appName?: string): Promise<any>;
  static parseNaturalLanguageState(description: string): LightState;
}
```

### Connection Methods

#### `async connect(): Promise<void>`

Establishes connection to Hue bridge and performs initial cache population.

**Throws**: Error if bridge is unreachable or API key is invalid

**Example**:
```typescript
const client = new HueClient(config);
try {
  await client.connect();
  console.log('Connected successfully');
} catch (error) {
  console.error('Connection failed:', error.message);
}
```

#### `async refreshCache(): Promise<void>`

Manually refreshes cached data from the bridge.

**Use Case**: Force refresh when you know data has changed

### Discovery Methods

#### `static async discoverBridges(): Promise<any[]>`

Discovers Hue bridges on the local network.

**Returns**: Array of bridge objects with IP addresses and metadata

**Discovery Methods**:
1. nupnp (cloud discovery service)
2. upnp (local SSDP discovery)

**Example**:
```typescript
const bridges = await HueClient.discoverBridges();
bridges.forEach(bridge => {
  console.log(`Found bridge: ${bridge.internalipaddress}`);
});
```

#### `static async createUser(bridgeIp: string, appName?: string): Promise<any>`

Creates API user on the bridge (requires button press).

**Parameters**:
- `bridgeIp`: IP address of the bridge
- `appName`: Application name (default: 'hue-mcp')

**Returns**: User object with API key

**Throws**: Error if button not pressed or bridge unreachable

### Light Control Methods

#### `async getLights(): Promise<any[]>`

Gets all lights with caching.

**Returns**: Array of light objects with current state

**Caching**: Uses cache if data is less than 1 minute old

#### `async getLight(id: string): Promise<any | null>`

Gets specific light by ID.

**Parameters**:
- `id`: Light ID (string)

**Returns**: Light object or `null` if not found

#### `async setLightState(id: string, state: LightState): Promise<boolean>`

Sets state of a specific light.

**Parameters**:
- `id`: Light ID
- `state`: State object with desired properties

**Returns**: `true` if successful, `false` if failed

**State Properties**:
```typescript
interface LightState {
  on?: boolean;              // On/off state
  brightness?: number;       // 0-100
  hue?: number;             // 0-360 degrees
  saturation?: number;      // 0-100
  colorTemp?: number;       // 153-500 mireds
  transitionTime?: number;  // Milliseconds
}
```

### Room Control Methods

#### `async getRooms(): Promise<any[]>`

Gets all rooms/groups of type 'Room'.

**Returns**: Array of room objects

#### `async getRoom(id: string): Promise<any | null>`

Gets specific room by ID.

**Returns**: Room object or `null` if not found

#### `async setRoomState(id: string, state: LightState): Promise<boolean>`

Sets state for all lights in a room.

**Parameters**: Same as `setLightState` but affects entire room

#### `async getLightsInRoom(roomId: string): Promise<any[]>`

Gets all lights contained in a specific room.

**Returns**: Array of light objects in the room

### Scene Control Methods

#### `async getScenes(): Promise<any[]>`

Gets all available scenes.

**Returns**: Array of scene objects

#### `async activateScene(id: string): Promise<boolean>`

Activates a specific scene.

**Parameters**:
- `id`: Scene ID

**Returns**: `true` if successful

### System Information Methods

#### `async getSystemSummary(): Promise<any>`

Gets comprehensive system overview with statistics and insights.

**Returns**: Detailed summary object with:
- Bridge information
- Statistics (lights, rooms, scenes)
- Room details with light counts
- Scene categorization
- Performance metrics

## Natural Language Processing API

### Color Parsing

#### `parseColorDescription(description: string): HSV | null`

Parses natural language color descriptions.

**Supported Colors**:
- Basic: red, blue, green, yellow, etc.
- Atmospheric: sunrise, sunset, stormy dusk, etc.
- Temperature: warm, cool, cold

**Returns**: HSV color object or `null` if not recognized

**Example**:
```typescript
import { parseColorDescription } from './utils/colors.js';

const color = parseColorDescription('stormy dusk');
// Returns: { h: 250, s: 35, v: 25 }
```

#### `parseColorTemp(description: string): number | null`

Parses color temperature descriptions.

**Supported Temperatures**:
- candlelight (500 mireds / 2000K)
- warm white (370 mireds / 2700K)
- neutral (250 mireds / 4000K)
- cool white (182 mireds / 5500K)
- daylight (153 mireds / 6500K)

### Color Conversion

#### `hsvToRgb(hsv: HSV): RGB`

Converts HSV color space to RGB.

**Parameters**:
```typescript
interface HSV {
  h: number; // 0-360 degrees
  s: number; // 0-100 percent
  v: number; // 0-100 percent
}
```

**Returns**:
```typescript
interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}
```

#### `rgbToXy(rgb: RGB): XY`

Converts RGB to XY color space (Philips Hue format).

**Returns**:
```typescript
interface XY {
  x: number; // CIE x coordinate
  y: number; // CIE y coordinate
}
```

### Natural Language State Parsing

#### `HueClient.parseNaturalLanguageState(description: string): LightState`

Parses complete natural language descriptions into light states.

**Input Examples**:
- "warm white at 50%" → `{on: true, brightness: 50, colorTemp: 370}`
- "bright red slowly" → `{on: true, brightness: 100, hue: 0, saturation: 100, transitionTime: 3000}`
- "turn off" → `{on: false}`

**Pattern Recognition**:
- On/off: "on", "off", "turn on", "turn off"
- Brightness: "50%", "dim", "bright", "brightness 75"
- Colors: Color names, atmospheric descriptions
- Transitions: "slowly", "quickly", "gradually"

## MCP Tool Schema API

### Tool Definition Interface

```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
    oneOf?: any[];
  };
}
```

### Tool Response Format

All tools return responses in this format:

```typescript
interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string; // JSON stringified result
  }>;
  isError?: boolean;
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  content: Array<{
    type: 'text';
    text: string; // Error message
  }>;
  isError: true;
}
```

## Setup Server API

The setup wizard runs a temporary Express server with these endpoints:

### Discovery Endpoints

#### `POST /api/discover`

Discovers Hue bridges on the network.

**Response**:
```typescript
{
  success: boolean;
  bridges?: Array<{
    id: string;
    ip: string;
    name: string;
    modelId?: string;
  }>;
  error?: string;
}
```

### Authentication Endpoints

#### `POST /api/authenticate`

Authenticates with a bridge using Server-Sent Events for real-time updates.

**Request Body**:
```typescript
{
  bridgeIp: string;
}
```

**Response**: SSE stream with authentication progress

**SSE Event Types**:
```typescript
// Waiting for button press
{
  step: 'waiting';
  message: string;
  attempts?: number;
  maxAttempts?: number;
}

// Authentication successful
{
  step: 'success';
  message: string;
  config: HueConfig;
}

// Authentication failed
{
  step: 'error' | 'timeout';
  error: string;
}
```

### Configuration Endpoints

#### `POST /api/test`

Tests the current configuration.

**Response**:
```typescript
{
  success: boolean;
  summary?: any; // System summary
  error?: string;
}
```

#### `POST /api/save-config`

Saves configuration to `hue-config.json`.

**Response**:
```typescript
{
  success: boolean;
  configPath?: string;
  error?: string;
}
```

#### `GET /api/claude-config`

Gets Claude Desktop configuration snippet.

**Response**:
```typescript
{
  success: boolean;
  config?: object;
  configString?: string; // JSON string for copying
  error?: string;
}
```

## Extension Points

### Adding Custom Tools

1. **Tool Definition**:
```typescript
export function createCustomTool(client: HueClient): Tool {
  return {
    name: 'custom_tool',
    description: 'Custom functionality',
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
```

2. **Tool Handler**:
```typescript
export async function handleCustomTool(
  client: HueClient,
  args: any
): Promise<any> {
  // Implementation
  return { result: 'success' };
}
```

3. **Registration**: Add to main server tool list and switch statement

### Custom Natural Language Patterns

Extend the parser by modifying `parseNaturalLanguageState`:

```typescript
// Add custom pattern recognition
if (lower.includes('party mode')) {
  state.hue = Math.random() * 360;
  state.saturation = 100;
  state.brightness = 100;
}
```

### Custom Color Definitions

Add to color maps in `colors.ts`:

```typescript
const colors: Record<string, HSV> = {
  // Existing colors...
  'custom_color': { h: 180, s: 75, v: 85 },
};
```

## Performance Considerations

### Caching Behavior

- **Cache TTL**: 1 minute for real-time data
- **Background Refresh**: Every 5 minutes (configurable)
- **Cache Hit Rate**: Typically 95%+ for consecutive requests

### Rate Limiting

- **Bridge Limits**: 10 requests/second maximum
- **Sequential Operations**: Automatic queuing with 200ms delays
- **Batch Operations**: Group operations use single API calls

### Memory Usage

- **Light Cache**: ~1KB per light
- **Room Cache**: ~500B per room
- **Scene Cache**: ~300B per scene
- **Total**: Typically <100KB for average home setup

## Error Codes and Handling

### Bridge Error Codes

- `101`: Link button not pressed
- `429`: Rate limit exceeded
- `403`: Unauthorized (invalid API key)
- `404`: Resource not found
- `500`: Bridge internal error

### Client Error Patterns

```typescript
// Standard error handling
try {
  const result = await operation();
} catch (error: any) {
  if (error.message.includes('rate limit')) {
    // Handle rate limiting
    await delay(1000);
    return await operation(); // Retry
  }
  throw error; // Re-throw other errors
}
```

This API reference provides the technical foundation for understanding and extending the Hue MCP Server. For implementation examples, see the source code and other documentation files.