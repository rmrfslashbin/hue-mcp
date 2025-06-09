# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Hue MCP Server.

## Quick Diagnostics

Before diving into specific issues, run these diagnostic commands:

```bash
# Test your connection
npm run test:connection

# Check TypeScript compilation
npm run typecheck

# Verify dependencies
npm install

# Run unit tests
npm test
```

## Installation and Setup Issues

### "npm install" Fails

**Problem**: Dependency installation errors

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try with different registry
npm install --registry https://registry.npmjs.org/

# Update Node.js (requires 18+)
node --version
```

### "No Hue bridges found"

**Problem**: Bridge discovery fails during setup

**Diagnostic Steps**:
1. **Check Bridge Power**: Ensure bridge is plugged in and powered on
2. **Network Connection**: Verify bridge is connected to your network
3. **Same Network**: Ensure your computer and bridge are on the same network

**Solutions**:
```bash
# Try manual discovery
curl https://discovery.meethue.com/

# Check local network (replace with your network)
nmap -sP 192.168.1.0/24 | grep -B 2 "Philips"

# Use manual IP entry in setup wizard
npm run setup:web
# Select "Manual Entry" option
```

**Advanced Network Diagnosis**:
```bash
# Test direct connection to bridge
ping 192.168.1.100  # Replace with your bridge IP

# Test HTTPS connection
curl -k https://192.168.1.100/api/

# Check firewall rules
# macOS: System Preferences → Security & Privacy → Firewall
# Windows: Windows Defender Firewall
# Linux: sudo ufw status
```

### Authentication Fails

**Problem**: "Link button not pressed" or authentication timeout

**Step-by-Step Resolution**:

1. **Timing**: Press bridge button BEFORE starting authentication
2. **Button Press**: Press and release the physical button on top of bridge
3. **Wait**: Button enables pairing for 30 seconds
4. **Retry**: Start authentication within the 30-second window

**Common Mistakes**:
- Pressing button after starting authentication
- Not pressing hard enough (button should click)
- Waiting too long between button press and authentication
- Using Hue app button instead of physical button

**Manual Authentication**:
```bash
# Test manual authentication
curl -k -X POST https://192.168.1.100/api \
  -H "Content-Type: application/json" \
  -d '{"devicetype":"hue-mcp#test"}'

# Should return API key if button was pressed
```

## Runtime Issues

### "Failed to connect to Hue bridge"

**Problem**: MCP server can't connect to bridge during operation

**Diagnostic**:
```bash
# Test direct connection
npm run test:connection

# Check configuration
cat hue-config.json

# Verify bridge is responding
curl -k https://YOUR_BRIDGE_IP/api/YOUR_API_KEY/lights
```

**Solutions**:
1. **Check Bridge Status**:
   - Bridge LED should be solid blue
   - If flashing, bridge is starting up (wait 1-2 minutes)
   - If red, check network connection

2. **Verify Configuration**:
   ```bash
   # Check IP is correct
   ping YOUR_BRIDGE_IP
   
   # Test API key
   curl -k https://YOUR_BRIDGE_IP/api/YOUR_API_KEY/config
   ```

3. **Network Issues**:
   - Router restart may have changed bridge IP
   - DHCP lease might have expired
   - VPN might be interfering

### "Rate limiting detected"

**Problem**: Too many API requests

**Solutions**:
```bash
# Increase sync interval (5 minutes minimum)
export HUE_SYNC_INTERVAL_MS=600000

# Temporarily disable state manager
export HUE_ENABLE_CACHE=false

# Check for multiple instances
ps aux | grep "hue-mcp"
```

**Configuration Adjustment**:
```json
{
  "HUE_SYNC_INTERVAL_MS": 600000,
  "HUE_ENABLE_EVENTS": false
}
```

### Lights Show as "Unreachable"

**Problem**: Some lights appear offline

**Diagnostic Steps**:
1. **Physical Check**: Ensure lights are powered on
2. **Zigbee Network**: Check if lights respond in Hue app
3. **Range Issues**: Lights may be too far from bridge

**Solutions**:
```bash
# Get unreachable lights
npm run test:connection | grep -i unreachable

# Reset specific light (turn off/on at wall switch)
# Wait 10 seconds between off/on

# Check Zigbee network health in Hue app
# Settings → Bridge → Zigbee Connectivity
```

## Claude Desktop Integration Issues

### MCP Server Not Loading

**Problem**: Claude Desktop doesn't recognize the MCP server

**Configuration Check**:
```bash
# Verify Claude config location
# macOS:
ls "~/Library/Application Support/Claude/"

# Windows:
dir "%APPDATA%\Claude"

# Check config syntax
cat "~/Library/Application Support/Claude/claude_desktop_config.json" | jq .
```

**Common Config Issues**:
```json
{
  "mcpServers": {
    "hue-lights": {
      // ❌ Wrong: relative path
      "args": ["./dist/index.js"],
      
      // ✅ Correct: absolute path
      "args": ["/absolute/path/to/hue-mcp/dist/index.js"],
      
      // ❌ Wrong: missing env variables
      "env": {},
      
      // ✅ Correct: required env variables
      "env": {
        "HUE_BRIDGE_IP": "192.168.1.100",
        "HUE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Tools Not Available in Claude

**Problem**: Claude can't see or use Hue tools

**Diagnostic**:
```bash
# Test MCP server directly
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  node dist/index.js

# Should return list of available tools
```

**Solutions**:
1. **Restart Claude Desktop**: Complete quit and restart
2. **Check Logs**: Look for error messages in Claude Desktop logs
3. **Verify Build**: Ensure `npm run build` completed successfully
4. **Test Standalone**: Run `npm run test:connection` to verify server works

## Performance Issues

### Slow Response Times

**Problem**: Commands take too long to execute

**Optimization**:
```bash
# Enable caching (default)
export HUE_ENABLE_CACHE=true

# Reduce sync interval for faster updates
export HUE_SYNC_INTERVAL_MS=60000

# Check cache hit rate
npm run test:connection | grep -i cache
```

**Network Optimization**:
- Use wired connection for bridge instead of Wi-Fi
- Ensure bridge is close to router
- Minimize network congestion

### High Memory Usage

**Problem**: Server uses excessive memory

**Monitoring**:
```bash
# Monitor memory usage
top -p $(pgrep -f "hue-mcp")

# Check for memory leaks
node --inspect dist/index.js
```

**Solutions**:
- Restart server periodically
- Reduce cache size by increasing sync interval
- Check for multiple running instances

## Development and Testing Issues

### TypeScript Compilation Errors

**Problem**: Build fails with TS errors

**Solutions**:
```bash
# Clean build
npm run clean
npm run build

# Check TypeScript version
npx tsc --version

# Update dependencies
npm update

# Force clean install
rm -rf node_modules package-lock.json
npm install
```

### Tests Failing

**Problem**: Unit tests don't pass

**Diagnostic**:
```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test tests/colors.test.ts

# Check test dependencies
npm ls vitest
```

### Setup Wizard Won't Load

**Problem**: Web setup wizard fails to start

**Solutions**:
```bash
# Check if ports are available
lsof -i :3000
lsof -i :3001

# Kill competing processes
sudo kill -9 $(lsof -t -i:3000)

# Try alternative setup
npm run setup  # CLI version

# Check setup wizard dependencies
cd setup-wizard && npm install
```

## Error Message Reference

### Common Error Messages and Solutions

**"Module not found: node-hue-api"**
```bash
npm install node-hue-api
```

**"Cannot find module './hue-config.json'"**
```bash
# Run setup first
npm run setup:web
```

**"ECONNREFUSED connection refused"**
```bash
# Bridge is not accessible
ping YOUR_BRIDGE_IP
# Check firewall settings
```

**"Invalid IP address in configuration"**
```bash
# Verify IP format
echo "192.168.1.100" | grep -E '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'
```

**"API key too short"**
```bash
# API key should be 32+ characters
echo "YOUR_API_KEY" | wc -c
```

## Getting Additional Help

### Collecting Debug Information

When reporting issues, include:

```bash
# System information
node --version
npm --version
uname -a

# Configuration (remove sensitive data)
cat hue-config.json | sed 's/"HUE_API_KEY".*/"HUE_API_KEY": "REDACTED"/'

# Test results
npm run test:connection

# Recent logs
tail -50 ~/.npm/_logs/*debug.log
```

### Log Files and Debugging

**Enable Debug Logging**:
```bash
export LOG_LEVEL=debug
npm run dev
```

**Common Log Locations**:
- npm logs: `~/.npm/_logs/`
- Console output: Check terminal where server is running
- Claude Desktop logs: Check Claude Desktop preferences

### Community Support

1. **GitHub Issues**: Report bugs with full debug information
2. **Discussions**: Ask questions in GitHub Discussions
3. **Documentation**: Check all docs in the `docs/` folder

### Professional Support

For enterprise deployments or critical issues:
- Include full system specifications
- Provide network topology details
- Document security requirements
- Consider dedicated support options

Remember: Most issues are configuration-related and can be resolved by carefully following the setup process and checking network connectivity.