#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig, isConfigValid } from './config.js';
import { HueClient } from './hue-client.js';
import { launchSetupWizard } from './setup-server.js';
import { log } from './utils/logger.js';

// Tool handlers
import { 
  createLightTools, 
  handleFindLights,
  handleListLights, 
  handleGetLight, 
  handleSetLightState 
} from './tools/lights.js';
import { 
  createRoomTools, 
  handleListRooms, 
  handleGetRoom, 
  handleControlRoomLights, 
  handleListZones,
  handleGetZone,
  handleControlZoneLights
} from './tools/rooms.js';
import { 
  createSceneTools, 
  handleListScenes, 
  handleActivateScene 
} from './tools/scenes.js';
import { 
  createSummaryTool, 
  handleGetSummary 
} from './tools/summary.js';
import {
  createInfoTool,
  handleGetInfo
} from './tools/info.js';

class HueMCPServer {
  private server: Server;
  private client: HueClient | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'hue-mcp',
        version: '0.5.0',
        description: 'Model Context Protocol server for Philips Hue smart lighting control',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      if (!this.client) {
        return { tools: [] };
      }

      const tools = [
        ...createLightTools(this.client),
        ...createRoomTools(this.client),
        ...createSceneTools(this.client),
        createSummaryTool(this.client),
        createInfoTool(this.client),
      ];

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.client) {
        throw new Error('Hue client not initialized. Please run setup first.');
      }

      const { name, arguments: args } = request.params;

      try {
        let result;

        switch (name) {
          // Light tools
          case 'find_lights':
            result = await handleFindLights(this.client, args);
            break;
          case 'list_lights':
            result = await handleListLights(this.client, args);
            break;
          case 'get_light':
            result = await handleGetLight(this.client, args);
            break;
          case 'set_light_state':
            result = await handleSetLightState(this.client, args);
            break;

          // Room tools
          case 'list_rooms':
            result = await handleListRooms(this.client);
            break;
          case 'get_room':
            result = await handleGetRoom(this.client, args);
            break;
          case 'control_room_lights':
            result = await handleControlRoomLights(this.client, args);
            break;
          case 'list_zones':
            result = await handleListZones(this.client);
            break;
          case 'get_zone':
            result = await handleGetZone(this.client, args);
            break;
          case 'control_zone_lights':
            result = await handleControlZoneLights(this.client, args);
            break;

          // Scene tools
          case 'list_scenes':
            result = await handleListScenes(this.client, args);
            break;
          case 'activate_scene':
            result = await handleActivateScene(this.client, args);
            break;

          // Summary tool
          case 'get_summary':
            result = await handleGetSummary(this.client, args);
            break;
          case 'get_info':
            result = await handleGetInfo(this.client, args);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        log.error('Tool execution failed', error, { tool: name, args });
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async initialize() {
    log.mcp('initializing', { version: '0.5.0' });
    const config = loadConfig();
    
    if (!isConfigValid(config)) {
      log.error('Hue MCP Server configuration missing or invalid');
      log.info('Launching setup wizard');
      
      await launchSetupWizard();
      process.exit(0);
    }

    try {
      this.client = new HueClient(config);
      await this.client.connect();
      log.mcp('initialized', { bridgeIp: config.HUE_BRIDGE_IP });
    } catch (error) {
      log.error('Failed to connect to Hue bridge', error);
      log.info('Please run the setup wizard: npm run setup:web');
      process.exit(1);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    log.mcp('running', { transport: 'stdio' });
  }
}

async function main() {
  const server = new HueMCPServer();
  await server.initialize();
  await server.run();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log.mcp('shutdown', { signal: 'SIGINT' });
  process.exit(0);
});

process.on('SIGTERM', () => {
  log.mcp('shutdown', { signal: 'SIGTERM' });
  process.exit(0);
});

// Start the server
main().catch((error) => {
  log.error('Fatal startup error', error);
  process.exit(1);
});