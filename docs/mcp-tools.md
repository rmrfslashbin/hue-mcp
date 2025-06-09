# MCP Tools Reference

This document provides detailed documentation for all MCP tools provided by the Hue MCP Server.

## Overview

The Hue MCP Server provides **14 enhanced tools** that enable AI assistants to control Philips Hue lighting systems with intelligence and context. Each tool is optimized for AI interaction with rich data, smart suggestions, and quick actions.

## 🆕 Enhanced Features (v2.0)

All tools now include:
- **🎯 Quick Actions** - Pre-built suggestions for common operations
- **💡 Smart Recommendations** - Context-aware tips and troubleshooting  
- **📊 Rich Context** - Room relationships and capability information
- **🔍 Advanced Filtering** - Multi-criteria search and filtering
- **📈 Summary Statistics** - Actionable insights and system overview

## 💬 Chatbot UX Optimizations (v2.1)

For sustained conversation efficiency:
- **📏 Response Sizing** - `compact`, `standard`, `verbose` modes
- **🧠 Context Management** - Learns preferences, adapts over time  
- **📊 Smart Pagination** - 5-20 results based on detail level
- **🎛️ Progressive Disclosure** - Start minimal, expand on request
- **⚡ Conversation State** - Tracks usage for optimal tool selection
- **🔄 Query Optimization** - Suggests more efficient alternatives

### Response Size Control

Most tools now support `responseSize` parameter:
- **`compact`**: Essential data only (75% size reduction)
- **`standard`**: Balanced detail level (default)  
- **`verbose`**: Full information for troubleshooting

### Context Level Control

Summary tools support `contextLevel` parameter:
- **`minimal`**: Status counters only (<100 tokens)
- **`standard`**: Basic info with insights (default)
- **`detailed`**: Comprehensive system overview

## 🔍 Discovery & Search Tools

### `find_lights` 🆕

**Description**: Smart search for lights by various criteria (name, room, state, capabilities)

**Parameters**:
- `query` (required): Search query (e.g., "kitchen lights", "all off lights", "color bulbs in bedroom")
- `room` (optional): Filter by specific room name
- `state` (optional): Filter by state ("on", "off", "reachable", "unreachable") 
- `capability` (optional): Filter by capability ("color", "temperature", "dimming")

**Enhanced Features**:
- **Match explanations** - Shows why each light was found
- **Bulk actions** - Suggestions for controlling all found lights
- **Smart suggestions** - Guides users when no matches found

**Example Usage**:
```
User: "Find all the lights that are off in the living room"
Assistant: Uses find_lights with query="living room" + state="off"
```

**Response Format**:
```json
{
  "query": "kitchen lights",
  "found": [
    {
      "id": "20",
      "name": "Kitchen Light 02",
      "room": { "id": "85", "name": "Kitchen" },
      "state": { "on": false, "brightness": 40, "reachable": true },
      "capabilities": { "supportsColor": true, "supportsColorTemp": true },
      "matchReason": "In room \"Kitchen\""
    }
  ],
  "total": 4,
  "suggestions": [],
  "quickActions": [
    {
      "action": "Turn on all 4 found lights",
      "description": "Turn on 4 lights that are currently off",
      "affectedLights": 4
    }
  ]
}
```

## Light Control Tools

### `list_lights` ✨

**Description**: Get all available lights with their current state, with optional filtering

**Parameters**:
- `filter` (optional): Filter lights by name, room, or state (e.g., "kitchen", "on", "unreachable")
- `includeRoom` (optional): Include room information for each light (default: true)
- `includeCapabilities` (optional): Include detailed capabilities and features (default: false)

**Enhanced Features**:
- **Room context** - Shows which room each light belongs to
- **Normalized values** - Brightness/hue/saturation in human-friendly percentages  
- **Summary statistics** - Total found, on/off counts, filter info
- **Smart suggestions** - Energy efficiency tips, troubleshooting hints

**Example Usage**:
```
User: "What lights do I have?"
Assistant: Uses list_lights to show all available lights with room context
```

**Response Format**:
```json
{
  "lights": [
    {
      "id": "1",
      "name": "Living Room Lamp",
      "type": "Extended color light",
      "state": {
        "on": true,
        "brightness": 80,
        "reachable": true,
        "hue": 180,
        "saturation": 75,
        "colorTemp": 250
      }
    }
  ],
  "count": 12
}
```

### `get_light`

**Description**: Get detailed information about a specific light

**Parameters**:
- `lightId` (string, required): The ID of the light

**Returns**: Detailed light object with full state and capabilities

**Example Usage**:
```
User: "Tell me about the kitchen light"
Assistant: Uses get_light with the kitchen light's ID
```

**Response Format**:
```json
{
  "id": "2",
  "name": "Kitchen Light",
  "type": "Extended color light",
  "manufacturerName": "Signify Netherlands B.V.",
  "productName": "Hue color lamp",
  "state": {
    "on": false,
    "brightness": 0,
    "reachable": true,
    "colorMode": "hs",
    "xy": [0.3, 0.3]
  },
  "capabilities": {
    "certified": true,
    "control": {
      "mindimlevel": 1,
      "maxlumen": 800,
      "colorgamuttype": "C"
    }
  }
}
```

### `set_light_state`

**Description**: Control an individual light's state

**Parameters**:
- `lightId` (string, required): The ID of the light to control
- Either:
  - `state` (object): Structured state object with specific properties
  - `naturalLanguage` (string): Natural language description

**State Object Properties**:
- `on` (boolean): Turn light on/off
- `brightness` (number, 0-100): Brightness level
- `hue` (number, 0-360): Hue value in degrees
- `saturation` (number, 0-100): Saturation level
- `colorTemp` (number, 153-500): Color temperature in mireds
- `transitionTime` (number): Transition time in milliseconds

**Example Usage**:
```
User: "Turn the desk lamp to warm white at 50%"
Assistant: Uses set_light_state with naturalLanguage parameter
```

**Natural Language Examples**:
- "warm white at 50%" → `{on: true, brightness: 50, colorTemp: 370}`
- "bright red" → `{on: true, brightness: 100, hue: 0, saturation: 100}`
- "stormy dusk" → `{on: true, brightness: 25, hue: 250, saturation: 35}`
- "turn off" → `{on: false}`

## Room Control Tools

### `list_rooms`

**Description**: List all rooms in the Hue system

**Parameters**: None

**Returns**: Array of room objects with basic information

**Example Usage**:
```
User: "What rooms are available?"
Assistant: Uses list_rooms to show all configured rooms
```

**Response Format**:
```json
{
  "rooms": [
    {
      "id": "1",
      "name": "Living Room",
      "type": "Room",
      "class": "Living room",
      "lights": ["1", "2", "3"],
      "lightCount": 3,
      "state": {
        "allOn": false,
        "anyOn": true
      }
    }
  ],
  "count": 5
}
```

### `get_room`

**Description**: Get detailed information about a specific room

**Parameters**:
- `roomId` (string, required): The ID of the room

**Returns**: Detailed room object with all lights and their states

**Example Usage**:
```
User: "Show me the bedroom status"
Assistant: Uses get_room with the bedroom's ID
```

**Response Format**:
```json
{
  "id": "2",
  "name": "Bedroom",
  "type": "Room",
  "class": "Bedroom",
  "state": {
    "allOn": false,
    "anyOn": true
  },
  "lights": [
    {
      "id": "4",
      "name": "Bedside Lamp",
      "state": {
        "on": true,
        "brightness": 30,
        "reachable": true
      }
    }
  ],
  "lightCount": 2
}
```

### `control_room_lights` ✨

**Description**: Control all lights in a room simultaneously with optional atmospheric variation

**Parameters**:
- `roomId` (string, required): The ID of the room
- Either:
  - `state` (object): State object to apply to all lights
  - `naturalLanguage` (string): Natural language description
- `useVariation` (boolean, optional): Apply subtle variations between lights (default: auto-detected)

**Enhanced Features**:
- **🌟 Atmospheric Variation**: Automatically applies individual light variations for realistic scenes
- **🎯 Smart Detection**: Keywords like "stormy", "sunset", "fireplace" trigger variation
- **🎨 Natural Realism**: Each light gets slightly different settings for depth

**Example Usage**:
```
User: "Set living room to thunderstormy afternoon"
Assistant: Uses control_room_lights with auto-variation for atmospheric realism
```

**Natural Language Examples**:
- "energizing mode" → Bright, cool white lighting (uniform)
- "movie time" → Dim, warm lighting (uniform)
- "thunderstorm" → Varied blues with different intensities 🌟
- "sunset mood" → Gradient of warm colors across lights 🌟
- "cozy fireplace" → Flickering warm variations 🌟
- "50% warm white" → Moderate warm lighting (uniform)

**Variation Ranges** (when activated):
- **Hue**: ±15° for subtle color differences
- **Saturation**: ±10% for depth variation
- **Brightness**: ±20% for natural intensity differences
- **Color Temperature**: ±50 mireds for warmth variation
- **Transition Time**: ±0.5s for organic feel

**Response Format** (with variation):
```json
{
  "success": true,
  "roomId": "84",
  "roomName": "Living room",
  "appliedState": "Individual variations applied",
  "lightingMode": "varied_atmospheric",
  "variationUsed": true,
  "appliedStates": [
    {
      "lightId": "16",
      "variation": {
        "hue": 239.7,
        "saturation": 16.2,
        "brightness": 38.5
      }
    },
    {
      "lightId": "17",
      "variation": {
        "hue": 249.9,
        "saturation": 10.9,
        "brightness": 10.5
      }
    }
  ],
  "efficiency": "Applied 4 individual variations for atmospheric realism"
}
```

### `list_zones`

**Description**: List all zones in the Hue system

**Parameters**: None

**Returns**: Array of zone objects

**Example Usage**:
```
User: "What zones do I have?"
Assistant: Uses list_zones to show configured zones
```

### `get_zone`

**Description**: Get detailed information about a specific zone including all lights

**Parameters**:
- `zoneId` (string, required): The ID of the zone

**Returns**: Detailed zone object with all lights and their states

**Example Usage**:
```
User: "Show me the Main Area zone status"
Assistant: Uses get_zone with the Main Area zone's ID
```

**Response Format**:
```json
{
  "id": "90",
  "name": "Main Area",
  "type": "Zone",
  "class": "Living room",
  "state": {
    "allOn": false,
    "anyOn": true
  },
  "lights": [
    {
      "id": "6",
      "name": "Kitchen Light 01",
      "state": {
        "on": true,
        "brightness": 85,
        "reachable": true
      }
    }
  ],
  "lightCount": 14
}
```

### `control_zone_lights` ✨

**Description**: Control all lights in a zone simultaneously with optional atmospheric variation

**Parameters**:
- `zoneId` (string, required): The ID of the zone
- Either:
  - `state` (object): State object to apply to all lights
  - `naturalLanguage` (string): Natural language description
- `useVariation` (boolean, optional): Apply subtle variations between lights (default: auto-detected)

**Enhanced Features**:
- **🌟 Atmospheric Variation**: Automatically applies individual light variations for realistic scenes
- **🎯 Smart Detection**: Keywords like "stormy", "sunset", "fireplace" trigger variation
- **🎨 Natural Realism**: Each light gets slightly different settings for depth

**Example Usage**:
```
User: "Set the Main Area zone to something relaxing for a sunday evening"
Assistant: Uses control_zone_lights with natural language and auto-variation
```

**Natural Language Examples**:
- "relaxing sunday evening" → Warm, dim lighting with variations 🌟
- "bright and energizing" → Cool, bright lighting (uniform)
- "cozy fireplace mood" → Warm variations across all zone lights 🌟
- "50% warm white" → Moderate warm lighting (uniform)

## Scene Control Tools

### `list_scenes`

**Description**: List all available scenes

**Parameters**:
- `filter` (string, optional): Filter scenes by name or room

**Returns**: Array of scene objects, optionally filtered

**Example Usage**:
```
User: "What scenes are available for the living room?"
Assistant: Uses list_scenes with filter="living room"
```

**Response Format**:
```json
{
  "scenes": [
    {
      "id": "scene-1",
      "name": "Energize",
      "type": "LightScene",
      "group": "1",
      "lights": ["1", "2", "3"],
      "owner": "api-key",
      "recycle": false
    }
  ],
  "count": 15,
  "totalScenes": 20
}
```

### `activate_scene`

**Description**: Activate a specific scene

**Parameters**:
- `sceneId` (string, required): The ID of the scene to activate

**Returns**: Confirmation of scene activation

**Example Usage**:
```
User: "Activate the relax scene"
Assistant: Uses activate_scene with the relax scene's ID
```

**Response Format**:
```json
{
  "success": true,
  "sceneId": "scene-relax",
  "sceneName": "Relax",
  "type": "LightScene",
  "affectedLights": 8,
  "group": "1"
}
```

## System Information Tools

### `get_info` 🆕

**Description**: Get system information, version details, and debugging metadata

**Parameters**:
- `detail` (string, optional): Level of detail to include (`minimal`, `standard`, `verbose`) - default: `standard`

**Enhanced Features**:
- **🔧 System Diagnostics** - Version, build, git information
- **📊 Runtime Status** - Bridge connection, cache size, uptime
- **🔗 Resource Links** - Documentation, troubleshooting, GitHub links
- **⚙️ Debug Information** - Memory usage, tool count, environment info

**Example Usage**:
```
User: "What version of the Hue server is running?"
Assistant: Uses get_info to show version and system information
```

**Detail Levels**:

**Minimal** - Essential info only:
```json
{
  "name": "hue-mcp",
  "version": "0.5.0",
  "git": {
    "commit": "5d0010e",
    "tag": "v0.5.0"
  },
  "status": {
    "bridgeConnected": true,
    "bridgeIp": "192.168.1.100"
  }
}
```

**Standard** - Balanced information (default):
```json
{
  "name": "hue-mcp",
  "version": {
    "package": "0.5.0",
    "server": "0.5.0",
    "setupWizard": "0.5.0"
  },
  "build": {
    "timestamp": "2025-06-09T17:53:23.644Z",
    "node": "v24.1.0",
    "environment": "production"
  },
  "git": {
    "commit": "5d0010e",
    "branch": "feature/system-info-tool"
  },
  "repository": {
    "url": "https://github.com/rmrfslashbin/hue-mcp",
    "documentation": "https://github.com/rmrfslashbin/hue-mcp/tree/main/docs",
    "issues": "https://github.com/rmrfslashbin/hue-mcp/issues",
    "releases": "https://github.com/rmrfslashbin/hue-mcp/releases"
  },
  "status": {
    "bridgeConnected": true,
    "bridgeIp": "192.168.1.100",
    "toolCount": 14
  }
}
```

**Verbose** - Full diagnostic information:
```json
{
  "runtime": {
    "platform": "darwin",
    "arch": "arm64",
    "nodeVersion": "v24.1.0",
    "uptime": 145.2,
    "memoryUsage": {
      "rss": 104300544,
      "heapTotal": 17629184,
      "heapUsed": 9520352
    }
  },
  "resources": {
    "documentation": [
      "https://github.com/rmrfslashbin/hue-mcp/blob/main/README.md",
      "https://github.com/rmrfslashbin/hue-mcp/blob/main/docs/installation.md"
    ],
    "troubleshooting": "https://github.com/rmrfslashbin/hue-mcp/blob/main/docs/troubleshooting.md"
  },
  "tools": {
    "available": [
      "find_lights", "list_lights", "get_light", "set_light_state",
      "list_rooms", "get_room", "control_room_lights",
      "list_zones", "get_zone", "control_zone_lights",
      "list_scenes", "activate_scene",
      "get_summary", "get_info"
    ],
    "count": 14
  }
}
```

### `get_summary`

**Description**: Get a comprehensive overview of the entire Hue system

**Parameters**:
- `includeDetails` (boolean, optional): Include detailed information about all components

**Returns**: Complete system summary with statistics, insights, and recommendations

**Example Usage**:
```
User: "Give me a complete overview of my lighting system"
Assistant: Uses get_summary with includeDetails=true
```

**Response Format**:
```json
{
  "bridge": {
    "ip": "192.168.1.100",
    "connected": true,
    "lastSync": "2023-12-08T15:30:00Z"
  },
  "statistics": {
    "totalLights": 12,
    "lightsOn": 8,
    "lightsOff": 4,
    "reachableLights": 12,
    "unreachableLights": 0,
    "rooms": 5,
    "zones": 2,
    "scenes": 15
  },
  "rooms": [
    {
      "id": "1",
      "name": "Living Room",
      "lightCount": 3,
      "allOn": false,
      "anyOn": true
    }
  ],
  "scenes": {
    "categories": [
      {
        "category": "energizing",
        "count": 3
      },
      {
        "category": "relaxing", 
        "count": 4
      }
    ]
  },
  "insights": {
    "energyEfficiency": {
      "lightsOnPercentage": 67,
      "suggestion": "Consider turning off unused lights to save energy"
    },
    "connectivity": {
      "reachabilityPercentage": 100,
      "issue": null
    },
    "recommendations": [
      "Your Hue system is well-configured!"
    ]
  }
}
```

## Error Handling

All tools include comprehensive error handling:

### Common Error Types

**Bridge Connection Errors**:
```json
{
  "error": "Failed to connect to Hue bridge at 192.168.1.100",
  "suggestion": "Check bridge power and network connection"
}
```

**Invalid Light/Room/Scene ID**:
```json
{
  "error": "Light 99 not found",
  "suggestion": "Use list_lights to see available lights"
}
```

**Rate Limiting**:
```json
{
  "error": "Too many requests - please wait before trying again",
  "retryAfter": 1000
}
```

### Error Recovery

The server includes automatic error recovery:

1. **Cache Fallback**: If direct API fails, uses cached data
2. **Retry Logic**: Automatically retries failed operations
3. **Graceful Degradation**: Provides partial results when possible

## Performance Considerations

### Caching Behavior

- **Cache Duration**: 1 minute for real-time data
- **Cache Refresh**: Automatic background refresh every 5 minutes
- **Cache Hit Rate**: Typically 95%+ for consecutive requests

### Rate Limiting

- **Bridge Limits**: Respects Hue bridge rate limits (10 requests/second)
- **Sequential Operations**: Multiple light changes are queued
- **Batch Operations**: Room controls use group API for efficiency

## Natural Language Processing

### Supported Color Names

**Basic Colors**: red, orange, yellow, green, cyan, blue, purple, magenta, pink, white

**Atmospheric Colors**: sunrise, sunset, dusk, dawn, stormy, stormy dusk

**Temperature Colors**: warm, cool, cold

**Nature Colors**: forest, ocean, sky, fire, ice

### Brightness Patterns

- **Percentages**: "50%", "75%", "25%"
- **Descriptive**: "dim", "bright", "moderate"
- **Relative**: "brighter", "dimmer"

### Transition Patterns

- **Speed**: "slowly", "quickly", "gradually"
- **Time**: "over 3 seconds", "in 500ms"

## Best Practices

### Efficient Usage

1. **Use Rooms**: Control rooms instead of individual lights when possible
2. **Leverage Scenes**: Use predefined scenes for complex lighting setups
3. **Cache Summary**: Use get_summary for initial context, then specific tools
4. **Natural Language**: Prefer natural language for user-friendly interactions

### Error Prevention

1. **Validate IDs**: Use list tools to get valid IDs before control operations
2. **Check Reachability**: Monitor light reachability status
3. **Handle Gracefully**: Always provide fallback responses for errors

### Performance Optimization

1. **Batch Operations**: Group multiple changes into single requests
2. **Cache Awareness**: Understand when data might be cached vs. fresh
3. **Rate Limit Respect**: Don't overwhelm the bridge with rapid requests