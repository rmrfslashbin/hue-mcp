# Hue MCP Server

A Model Context Protocol (MCP) server for controlling Philips Hue lighting systems through AI assistants like Claude.

## Features

- **Multi-Bridge Support**: Control multiple Hue bridges simultaneously
- **Real-Time Sync**: SSE-based synchronization keeps state updated in real-time
- **Cached Responses**: Instant responses through intelligent caching layer
- **Comprehensive Tools**: Control lights, rooms, scenes, and bridges
- **Smart Prompts**: AI-assisted lighting suggestions and scene creation
- **Resources**: Access bridge status and device inventory

## Architecture

```
Claude Desktop / AI Client
    ↓ (MCP Protocol)
MCP Server (hue-mcp)
    ↓
Cache Layer (hue-cache)
    ↓
Base SDK (hue-sdk)
    ↓
Hue Bridge Pro(s)
```

## Installation

### Prerequisites

- Go 1.25.6 or later
- Philips Hue Bridge Pro with API access
- Bridge IP address and application key

### Building

```bash
cd /tmp/hue-mcp
go build -o hue-mcp main.go
```

## Configuration

The server looks for configuration in `~/.config/hue-mcp/config.json` (or `$XDG_CONFIG_HOME/hue-mcp/config.json`).

### Configuration File Structure

```json
{
  "bridges": [
    {
      "id": "bridge-1",
      "name": "Main Bridge",
      "ip": "192.168.1.100",
      "app_key": "your-app-key-here",
      "enabled": true
    }
  ],
  "cache": {
    "type": "file",
    "file_path": "~/.cache/hue-mcp/bridges",
    "auto_save_interval": 30,
    "warm_on_startup": true
  },
  "server": {
    "log_level": "info"
  }
}
```

### Getting Your Application Key

If you don't have an application key, you can generate one using the Hue SDK:

```go
// TODO: Add setup wizard tool or link to hue-sdk documentation
```

## Claude Desktop Integration

Add the following to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "hue": {
      "command": "/tmp/hue-mcp/hue-mcp",
      "args": []
    }
  }
}
```

Restart Claude Desktop to load the MCP server.

## Available Tools

### Setup & Discovery
- `discover_bridges` - Find Hue bridges on your network (N-UPnP via discovery.meethue.com)
- `authenticate_bridge` - Authenticate with bridge (link button press required)
- `add_bridge` - Add authenticated bridge to configuration
- `remove_bridge` - Remove bridge from configuration
- `get_config_path` - Get configuration file location

### Bridge Management
- `list_bridges` - List all configured Hue bridges
- `get_bridge_info` - Get detailed bridge information

### Light Control
- `list_lights` - List all lights across bridges
- `get_light` - Get detailed light information
- `control_light` - Comprehensive single light control:
  - On/off, brightness (0-100%)
  - RGB colors via XY coordinates
  - Color temperature (white spectrum, 153-500 mirek)
  - Effects (candle, fire, prism, sparkle, opal, glisten, underwater, cosmos, sunbeam, enchant)
  - Timed effects (sunrise, sunset with duration)
  - Alert effects (breathe)
  - Gradient support for lightstrips
- `control_lights` - Control multiple lights in one call:
  - Each light can have unique color, brightness, and effects
  - Perfect for: "set room to rainbow" or "varying shades of blue"

### Room Management
- `list_rooms` - List all rooms
- `get_room` - Get detailed room information

### Grouped Light Control
- `list_grouped_lights` - List all grouped lights (rooms and zones)
- `get_grouped_light` - Get detailed information about a grouped light
- `control_room_lights` - Control all lights in a room/zone simultaneously:
  - Single API call controls all lights with same settings
  - On/off, brightness, RGB colors, color temperature, alerts
  - Perfect for: "turn off all bedroom lights" or "set living room to warm white"

### Scene Management
- `list_scenes` - List all scenes
- `get_scene` - Get detailed scene information
- `activate_scene` - Activate (recall) a scene:
  - Optional brightness override (0-100%)
  - Optional transition duration (0-6000000ms)
  - Applies scene's lighting configuration to all lights

### Cache Management
- `warm_cache` - Manually populate/refresh cache for instant access
- `cache_stats` - View cache statistics (hit rate, entries, SSE sync status)

## Available Resources

Resources provide read-only access to bridge data:

- `bridges://status` - Status of all configured bridges
- `bridges://devices` - Complete device inventory
- `bridges://rooms` - All rooms across bridges
- `bridges://scenes` - All scenes across bridges

## Available Prompts

Prompts provide AI-assisted interactions:

- `smart-lighting` - Get lighting suggestions based on activity
- `create-scene` - Interactive scene creation assistant
- `energy-insights` - Energy usage analysis and optimization

## Example Usage

Once connected to Claude Desktop, you can interact with your lights naturally:

```
You: Turn on the living room lights
Claude: [Uses control_light tool to turn on lights]

You: What lights are currently on?
Claude: [Uses list_lights tool to check status]

You: Set the bedroom lights to a warm sunset color at 30% brightness
Claude: [Uses control_light with XY color coordinates]

You: Make the office lights a rainbow of colors
Claude: [Uses control_lights to set each light to different colors in one call]

You: Create a relaxing scene for the bedroom
Claude: [Uses create-scene prompt and tools to create scene]
```

## Cache Configuration

The cache layer provides:

- **File Backend**: Persistent cache across restarts
- **Auto-Save**: Automatic cache persistence every 30 seconds
- **Warm on Startup**: Pre-loads cache for instant first access
- **SSE Sync**: Real-time updates from bridge via Server-Sent Events

Cache files are stored in `~/.cache/hue-mcp/` by default.

## Development

### Project Structure

```
/tmp/hue-mcp/
├── main.go                 # MCP server entry point
├── go.mod                  # Go module dependencies
├── pkg/
│   ├── bridge/
│   │   └── manager.go      # Bridge manager with cache integration
│   ├── config/
│   │   └── config.go       # Configuration management
│   └── tools/
│       ├── tools.go        # Tool registration
│       ├── setup.go        # Bridge discovery and setup tools
│       ├── bridges.go      # Bridge management tools
│       ├── lights.go       # Single light control tools
│       ├── lights_bulk.go  # Multi-light control tools
│       ├── rooms.go        # Room management tools
│       ├── scenes.go       # Scene management tools
│       └── cache.go        # Cache management tools
```

### Dependencies

- `github.com/mark3labs/mcp-go` - MCP SDK for Go
- `github.com/rmrfslashbin/hue-sdk` - Base Hue API SDK
- `github.com/rmrfslashbin/hue-cache` - Caching layer with SSE sync

## Troubleshooting

### Bridge Connection Issues

1. Verify bridge IP address is correct
2. Ensure application key is valid
3. Check network connectivity to bridge
4. Review logs in `~/.config/hue-mcp/logs/`

### Cache Issues

1. Delete cache files: `rm -rf ~/.cache/hue-mcp/`
2. Restart the MCP server
3. Verify SSE endpoint is accessible

### Claude Desktop Not Detecting Server

1. Verify server builds successfully: `go build -o hue-mcp main.go`
2. Check configuration path in `claude_desktop_config.json`
3. Restart Claude Desktop after configuration changes
4. Check Claude Desktop developer console for errors

## License

[Add license information]

## Contributing

[Add contribution guidelines]

## Related Projects

- [hue-sdk](https://github.com/rmrfslashbin/hue-sdk) - Base Philips Hue API SDK
- [hue-cache](https://github.com/rmrfslashbin/hue-cache) - Caching layer with SSE synchronization
