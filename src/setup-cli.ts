#!/usr/bin/env node

import { createInterface } from 'readline';
import { writeFileSync } from 'fs';
import { HueClient } from './hue-client.js';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function setupCLI() {
  console.log('🌈 Hue MCP Setup Wizard');
  console.log('=====================\\n');
  
  try {
    // Step 1: Discover bridges
    console.log('🔍 Discovering Hue bridges on your network...');
    const bridges = await HueClient.discoverBridges();
    
    if (bridges.length === 0) {
      console.log('❌ No Hue bridges found on your network.');
      console.log('Please ensure your bridge is connected and try again.\\n');
      
      const manualIp = await question('Enter bridge IP address manually (or press Enter to exit): ');
      if (!manualIp.trim()) {
        process.exit(0);
      }
      
      bridges.push({ internalipaddress: manualIp.trim() });
    } else {
      console.log(`✅ Found ${bridges.length} bridge(s):\\n`);
      bridges.forEach((bridge, index) => {
        console.log(`  ${index + 1}. ${bridge.internalipaddress} (${bridge.name || bridge.id})`);
      });
      console.log();
    }
    
    // Step 2: Select bridge
    let selectedBridge;
    if (bridges.length === 1) {
      selectedBridge = bridges[0];
      console.log(`Using bridge at ${selectedBridge.internalipaddress}\\n`);
    } else {
      const selection = await question(`Select a bridge (1-${bridges.length}): `);
      const index = parseInt(selection) - 1;
      
      if (index < 0 || index >= bridges.length) {
        console.log('❌ Invalid selection');
        process.exit(1);
      }
      
      selectedBridge = bridges[index];
    }
    
    // Step 3: Authenticate
    console.log('🔗 Authenticating with the bridge...');
    console.log('👆 Please press the button on your Hue bridge now!');
    console.log('⏰ You have 30 seconds...\\n');
    
    await question('Press Enter after you have pressed the bridge button...');
    
    let authSuccess = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!authSuccess && attempts < maxAttempts) {
      try {
        console.log(`Attempt ${attempts + 1}/${maxAttempts}...`);
        const user = await HueClient.createUser(selectedBridge.internalipaddress, 'hue-mcp');
        
        console.log('✅ Authentication successful!');
        console.log(`🔑 API Key: ${user.username}\\n`);
        
        // Step 4: Create configuration
        const config = {
          HUE_BRIDGE_IP: selectedBridge.internalipaddress,
          HUE_API_KEY: user.username,
          HUE_SYNC_INTERVAL_MS: 300000,
          HUE_ENABLE_EVENTS: false,
          NODE_TLS_REJECT_UNAUTHORIZED: '0',
          LOG_LEVEL: 'info',
        };
        
        const configPath = './hue-config.json';
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`💾 Configuration saved to ${configPath}`);
        
        // Step 5: Test connection
        console.log('\\n🧪 Testing connection...');
        const fullConfig = {
          ...config,
          MCP_TRANSPORT: 'stdio' as const,
          MCP_HOST: '0.0.0.0',
          MCP_PORT: 8080,
        };
        const client = new HueClient(fullConfig);
        await client.connect();
        const summary = await client.getSystemSummary();
        
        console.log('✅ Connection test successful!');
        console.log(`📊 Found ${summary.statistics.totalLights} lights, ${summary.statistics.rooms} rooms, ${summary.statistics.scenes} scenes\\n`);
        
        // Step 6: Claude Desktop integration
        console.log('🤖 Claude Desktop Integration');
        console.log('Add this to your claude_desktop_config.json:');
        console.log('\\n' + JSON.stringify({
          mcpServers: {
            'hue-lights': {
              command: 'node',
              args: [process.cwd() + '/dist/index.js'],
              env: {
                HUE_BRIDGE_IP: config.HUE_BRIDGE_IP,
                HUE_API_KEY: config.HUE_API_KEY,
              },
            },
          },
        }, null, 2));
        
        console.log('\\n🎉 Setup complete! You can now use the Hue MCP server with Claude.');
        authSuccess = true;
        
      } catch (error: any) {
        attempts++;
        if (error.message.includes('Link button not pressed')) {
          console.log(`❌ Button not pressed. Please try again... (${maxAttempts - attempts} attempts remaining)`);
          if (attempts < maxAttempts) {
            await question('Press Enter to try again...');
          }
        } else {
          console.error('❌ Authentication failed:', error.message);
          break;
        }
      }
    }
    
    if (!authSuccess) {
      console.log('\\n💥 Authentication failed after maximum attempts.');
      console.log('Please ensure you are pressing the button on the bridge and try again.');
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('💥 Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

setupCLI();