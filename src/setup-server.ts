import express from 'express';
import cors from 'cors';
import { writeFileSync } from 'fs';
import { HueClient } from './hue-client.js';
import { log } from './utils/logger.js';
import open from 'open';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Store setup state
let setupState = {
  bridges: [] as any[],
  selectedBridge: null as any,
  authInProgress: false,
  config: null as any,
  lastDiscovery: null as Date | null,
  discoveryCache: [] as any[],
};

export function launchSetupWizard() {
  return new Promise<void>((resolve) => {
    const server = app.listen(PORT, () => {
      log.info('Setup server started', { port: PORT });
      open('http://localhost:3003'); // This will proxy to the Vite dev server
      
      // Auto-close after 10 minutes of inactivity
      setTimeout(() => {
        server.close();
        resolve();
      }, 10 * 60 * 1000);
    });
  });
}

// If this file is run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = app.listen(PORT, () => {
    log.info('Setup server started', { port: PORT });
    log.info('Open browser to start setup', { url: 'http://localhost:3003' });
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log.info('Setup server shutting down');
    server.close();
    process.exit(0);
  });
}

// Discover bridges on the network
app.post('/api/discover', async (_req, res) => {
  try {
    // Check cache first (cache for 2 minutes to avoid rate limiting)
    const now = new Date();
    if (setupState.lastDiscovery && 
        setupState.discoveryCache.length > 0 && 
        (now.getTime() - setupState.lastDiscovery.getTime()) < 120000) {
      log.debug('Using cached bridge discovery results');
      res.json({
        success: true,
        bridges: setupState.discoveryCache,
        cached: true,
      });
      return;
    }
    
    log.info('Discovering Hue bridges');
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Discovery timeout')), 10000); // 10 second timeout
    });
    
    const discoveryPromise = HueClient.discoverBridges();
    
    const bridges = await Promise.race([discoveryPromise, timeoutPromise]) as any[];
    
    log.debug('Bridge discovery result', { bridges });
    
    setupState.bridges = bridges.map(bridge => ({
      id: bridge.id || bridge.uuid || 'unknown',
      ip: bridge.internalipaddress || bridge.ipaddress || bridge.ip,
      name: bridge.name || bridge.modelid || `Bridge ${bridge.id || bridge.uuid || 'unknown'}`,
      modelId: bridge.modelid,
    }));
    
    // Update cache
    setupState.discoveryCache = setupState.bridges;
    setupState.lastDiscovery = now;
    
    log.info('Bridge discovery complete', { count: bridges.length });
    
    res.json({
      success: true,
      bridges: setupState.bridges,
    });
  } catch (error: any) {
    log.error('Bridge discovery failed', error);
    
    // If we have cached results, use them as fallback
    if (setupState.discoveryCache.length > 0) {
      log.info('Using cached bridge results as fallback');
      res.json({
        success: true,
        bridges: setupState.discoveryCache,
        message: 'Using cached bridge discovery (network discovery failed)',
        cached: true,
      });
      return;
    }
    
    // Provide fallback option for manual entry
    res.json({
      success: true,
      bridges: [],
      message: 'Auto-discovery failed. You can enter your bridge IP manually.',
      error: error.message,
    });
  }
});

// Authenticate with a bridge (requires button press)
app.post('/api/authenticate', async (req, res) => {
  const { bridgeIp } = req.body;
  
  if (!bridgeIp) {
    res.status(400).json({
      success: false,
      error: 'Bridge IP is required',
    });
    return;
  }
  
  setupState.authInProgress = true;
  setupState.selectedBridge = setupState.bridges.find(b => b.ip === bridgeIp);
  
  // Set up SSE for real-time updates
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  
  const sendUpdate = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  try {
    log.info('Attempting bridge authentication', { bridgeIp });
    sendUpdate({ step: 'waiting', message: 'Press the button on your Hue bridge...' });
    
    // Poll for authentication with exponential backoff
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    const pollAuth = async (): Promise<void> => {
      try {
        const user = await HueClient.createUser(bridgeIp, 'hue-mcp');
        
        setupState.config = {
          HUE_BRIDGE_IP: bridgeIp,
          HUE_API_KEY: user.username,
          HUE_SYNC_INTERVAL_MS: 300000,
          HUE_ENABLE_EVENTS: false,
          NODE_TLS_REJECT_UNAUTHORIZED: '0',
          LOG_LEVEL: 'info',
        };
        
        log.info('Bridge authentication successful', { bridgeIp });
        sendUpdate({ 
          step: 'success', 
          message: 'Authentication successful!',
          config: setupState.config,
        });
        
        res.end();
        setupState.authInProgress = false;
      } catch (error: any) {
        attempts++;
        
        if (attempts >= maxAttempts) {
          log.warn('Bridge authentication timeout');
          sendUpdate({ 
            step: 'timeout', 
            error: 'Authentication timed out. Please try again.',
          });
          res.end();
          setupState.authInProgress = false;
          return;
        }
        
        if (error.message.includes('Link button not pressed')) {
          sendUpdate({ 
            step: 'waiting', 
            message: `Press the button on your Hue bridge... (${maxAttempts - attempts}s remaining)`,
            attempts,
            maxAttempts,
          });
          
          setTimeout(pollAuth, 1000);
        } else {
          log.error('Bridge authentication failed', error);
          sendUpdate({ 
            step: 'error', 
            error: error.message,
          });
          res.end();
          setupState.authInProgress = false;
        }
      }
    };
    
    await pollAuth();
  } catch (error: any) {
    log.error('Authentication setup failed', error);
    sendUpdate({ 
      step: 'error', 
      error: error.message,
    });
    res.end();
    setupState.authInProgress = false;
  }
});

// Test the connection
app.post('/api/test', async (_req, res) => {
  try {
    if (!setupState.config) {
      res.status(400).json({
        success: false,
        error: 'No configuration available. Please authenticate first.',
      });
      return;
    }
    
    log.info('Testing Hue connection');
    const client = new HueClient(setupState.config);
    await client.connect();
    
    const summary = await client.getSystemSummary();
    
    log.info('Connection test successful');
    res.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    log.error('Connection test failed', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Save configuration
app.post('/api/save-config', async (_req, res) => {
  try {
    if (!setupState.config) {
      res.status(400).json({
        success: false,
        error: 'No configuration to save',
      });
      return;
    }
    
    const configPath = './hue-config.json';
    writeFileSync(configPath, JSON.stringify(setupState.config, null, 2));
    
    log.info('Configuration saved', { path: configPath });
    res.json({
      success: true,
      configPath,
    });
  } catch (error: any) {
    log.error('Failed to save configuration', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get Claude Desktop configuration snippet
app.get('/api/claude-config', (_req, res) => {
  if (!setupState.config) {
    res.status(400).json({
      success: false,
      error: 'No configuration available',
    });
    return;
  }
  
  const claudeConfig = {
    mcpServers: {
      'hue-lights': {
        command: 'node',
        args: [process.cwd() + '/dist/index.js'],
        env: {
          HUE_BRIDGE_IP: setupState.config.HUE_BRIDGE_IP,
          HUE_API_KEY: setupState.config.HUE_API_KEY,
        },
      },
    },
  };
  
  res.json({
    success: true,
    config: claudeConfig,
    configString: JSON.stringify(claudeConfig, null, 2),
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    setupState: {
      bridgesFound: setupState.bridges.length,
      authInProgress: setupState.authInProgress,
      hasConfig: !!setupState.config,
    },
  });
});

export default app;