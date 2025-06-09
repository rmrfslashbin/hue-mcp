#!/usr/bin/env node

import { loadConfig, isConfigValid } from '../src/config.js';
import { HueClient } from '../src/hue-client.js';

async function testConnection() {
  console.log('🧪 Testing Hue MCP Connection\\n');
  
  // Load configuration
  console.log('📋 Loading configuration...');
  const config = loadConfig();
  
  if (!isConfigValid(config)) {
    console.error('❌ Invalid configuration. Please run setup first.');
    console.log('💡 Run: npm run setup:web');
    process.exit(1);
  }
  
  console.log(`✅ Configuration loaded for bridge: ${config.HUE_BRIDGE_IP}\\n`);
  
  try {
    // Test connection
    console.log('🔗 Connecting to Hue bridge...');
    const client = new HueClient(config);
    await client.connect();
    console.log('✅ Connected successfully\\n');
    
    // Test basic operations
    console.log('🔍 Testing basic operations...');
    
    // List lights
    console.log('  📡 Fetching lights...');
    const lights = await client.getLights();
    console.log(`  ✅ Found ${lights.length} light(s)`);
    
    // List rooms
    console.log('  🏠 Fetching rooms...');
    const rooms = await client.getRooms();
    console.log(`  ✅ Found ${rooms.length} room(s)`);
    
    // List scenes
    console.log('  🎭 Fetching scenes...');
    const scenes = await client.getScenes();
    console.log(`  ✅ Found ${scenes.length} scene(s)`);
    
    // Get system summary
    console.log('  📊 Getting system summary...');
    const summary = await client.getSystemSummary();
    console.log('  ✅ Summary generated\\n');
    
    // Display summary
    console.log('📊 System Summary:');
    console.log('==================');
    console.log(`Bridge IP: ${summary.bridge.ip}`);
    console.log(`Total Lights: ${summary.statistics.totalLights}`);
    console.log(`Lights On: ${summary.statistics.lightsOn}`);
    console.log(`Lights Off: ${summary.statistics.lightsOff}`);
    console.log(`Reachable: ${summary.statistics.reachableLights}`);
    console.log(`Rooms: ${summary.statistics.rooms}`);
    console.log(`Zones: ${summary.statistics.zones}`);
    console.log(`Scenes: ${summary.statistics.scenes}\\n`);
    
    // Test natural language parsing
    console.log('🧠 Testing natural language parsing...');
    const examples = [
      'turn on warm white at 50%',
      'stormy dusk',
      'bright red',
      'turn off',
      'dim blue slowly',
    ];
    
    examples.forEach(example => {
      const parsed = HueClient.parseNaturalLanguageState(example);
      console.log(`  "${example}" → ${JSON.stringify(parsed)}`);
    });
    
    console.log('\\n🎉 All tests passed! Your Hue MCP server is ready to use.');
    
  } catch (error: any) {
    console.error('❌ Connection test failed:', error.message);
    console.log('\\n🔧 Troubleshooting:');
    console.log('  1. Check that your Hue bridge is powered on');
    console.log('  2. Verify the bridge IP address is correct');
    console.log('  3. Ensure the API key is valid');
    console.log('  4. Try running setup again: npm run setup:web');
    process.exit(1);
  }
}

testConnection();