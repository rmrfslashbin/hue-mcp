# Installation Guide

This guide covers detailed installation and setup instructions for the Hue MCP Server.

## Prerequisites

### System Requirements

- **Node.js**: Version 18 or higher
- **npm**: Usually comes with Node.js
- **Operating System**: macOS, Windows, or Linux
- **Network**: Local network access to your Hue bridge

### Hue Bridge Requirements

- **Hue Bridge v2**: The square-shaped bridge (model BSB002)
- **Network Connection**: Bridge connected to your local network
- **Physical Access**: Ability to press the button on the bridge

> **Note**: Hue Bridge v1 (round) is not supported due to API limitations.

## Installation Methods

### Method 1: Git Clone (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/hue-mcp.git
cd hue-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Method 2: Download ZIP

1. Download the latest release from GitHub
2. Extract the ZIP file
3. Open terminal in the extracted folder
4. Run installation commands:

```bash
npm install
npm run build
```

## Setup Process

### Step 1: Bridge Discovery

The setup wizard can automatically discover your Hue bridge:

```bash
npm run setup:web
```

**Manual Discovery**: If auto-discovery fails, you can find your bridge IP:

1. **Router Admin Panel**: Check connected devices
2. **Hue App**: Settings → Bridge Settings → Network Settings
3. **Discovery Service**: Visit `https://discovery.meethue.com/` in browser

### Step 2: Authentication

The authentication process requires physical access to your bridge:

1. **Start Setup**: Run the setup wizard
2. **Press Bridge Button**: Physical button on top of the bridge
3. **Wait for Confirmation**: Setup will confirm successful connection
4. **Save Configuration**: Config is automatically saved to `hue-config.json`

### Step 3: Claude Desktop Integration

#### Locate Claude Desktop Config

**macOS**:
```bash
open "~/Library/Application Support/Claude/"
```

**Windows**:
```cmd
explorer "%APPDATA%\Claude"
```

**Linux**:
```bash
xdg-open ~/.config/Claude/
```

#### Add MCP Server Configuration

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hue-lights": {
      "command": "node",
      "args": ["/absolute/path/to/hue-mcp/dist/index.js"],
      "env": {
        "HUE_BRIDGE_IP": "192.168.1.100",
        "HUE_API_KEY": "your-generated-api-key"
      }
    }
  }
}
```

> **Important**: Use absolute paths, not relative paths like `./dist/index.js`

### Step 4: Verification

Test your installation:

```bash
# Test bridge connection
npm run test:connection

# Verify build
npm run typecheck

# Run unit tests
npm test
```

## Configuration Options

### Environment Variables

You can override configuration using environment variables:

```bash
export HUE_BRIDGE_IP="192.168.1.100"
export HUE_API_KEY="your-api-key"
export HUE_SYNC_INTERVAL_MS=300000
export LOG_LEVEL="info"
```

### Configuration File

Create `hue-config.json` in the project root:

```json
{
  "HUE_BRIDGE_IP": "192.168.1.100",
  "HUE_API_KEY": "your-api-key",
  "HUE_SYNC_INTERVAL_MS": 300000,
  "HUE_ENABLE_EVENTS": false,
  "NODE_TLS_REJECT_UNAUTHORIZED": "0",
  "LOG_LEVEL": "info"
}
```

### .env File

Create `.env` file for development:

```env
HUE_BRIDGE_IP=192.168.1.100
HUE_API_KEY=your-api-key
HUE_SYNC_INTERVAL_MS=300000
LOG_LEVEL=debug
```

## Network Configuration

### Firewall Settings

Ensure these ports are open:

- **Port 443**: HTTPS communication with Hue bridge
- **Port 1900**: SSDP discovery (UDP)
- **Port 3000**: Setup wizard (temporary)
- **Port 3001**: Setup server backend (temporary)

### Bridge Network

Your Hue bridge must be:

- Connected to the same network as your computer
- Accessible via HTTPS (port 443)
- Not behind additional firewalls or VLANs

## Updating

To update to a newer version:

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild
npm run build

# Test the update
npm run test:connection
```

## Uninstallation

To remove the Hue MCP Server:

1. **Remove from Claude Desktop**: Delete the `hue-lights` entry from `claude_desktop_config.json`
2. **Delete Project Files**: Remove the project directory
3. **Clean Up Config**: Delete `hue-config.json` if you want to remove stored credentials

## Security Considerations

### API Key Storage

- API keys are stored locally in configuration files
- Never commit `hue-config.json` to version control
- Consider using environment variables in production

### Network Security

- Communication with the bridge uses HTTPS
- No external services are contacted except for bridge discovery
- All lighting data stays on your local network

### File Permissions

Ensure proper permissions on configuration files:

```bash
# Make config file readable only by owner
chmod 600 hue-config.json
```

## Next Steps

After successful installation:

1. **Read the [MCP Tools Reference](mcp-tools.md)** to understand available commands
2. **Check [Natural Language Examples](examples.md)** for usage patterns
3. **Review [Troubleshooting](troubleshooting.md)** for common issues

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting Guide](troubleshooting.md)
2. Run diagnostic commands:
   ```bash
   npm run test:connection
   npm run typecheck
   ```
3. Check log files for error messages
4. Open an issue on GitHub with relevant details