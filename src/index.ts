#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';

import { loadConfig, isConfigValid } from './config.js';
import { HueClient } from './hue-client.js';
import { launchSetupWizard } from './setup-server.js';
import { log } from './utils/logger.js';
import { HueConfig } from './types/index.js';

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
  private config: HueConfig | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'hue-mcp',
        version: '0.6.0',
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

  private async handleToolCall(params: any) {
    if (!this.client) {
      throw new Error('Hue client not initialized. Please run setup first.');
    }

    const { name, arguments: args } = params;

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
  }

  private setupHandlers() {
    // Initialize handler
    this.server.setRequestHandler(InitializeRequestSchema, async () => ({
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: 'hue-mcp',
        version: '0.6.0',
      },
    }));

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
      return await this.handleToolCall(request.params);
    });
  }

  async initialize() {
    log.mcp('initializing', { version: '0.6.0' });
    this.config = loadConfig();
    
    if (!isConfigValid(this.config)) {
      log.error('Hue MCP Server configuration missing or invalid');
      
      // For HTTP mode, skip setup wizard and return error
      if (process.env.MCP_TRANSPORT === 'http') {
        log.error('Cannot run setup wizard in HTTP mode. Please configure environment variables.');
        process.exit(1);
      }
      
      log.info('Launching setup wizard');
      await launchSetupWizard();
      process.exit(0);
    }

    try {
      this.client = new HueClient(this.config);
      await this.client.connect();
      log.mcp('initialized', { 
        bridgeIp: this.config.HUE_BRIDGE_IP,
        transport: this.config.MCP_TRANSPORT 
      });
    } catch (error) {
      log.error('Failed to connect to Hue bridge', error);
      
      if (this.config.MCP_TRANSPORT === 'http') {
        log.error('Cannot run setup wizard in HTTP mode. Please check configuration.');
        process.exit(1);
      }
      
      log.info('Please run the setup wizard: npm run setup:web');
      process.exit(1);
    }
  }

  async runStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    log.mcp('running', { transport: 'stdio' });
  }

  async runHttp() {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    const app = express();
    
    // Middleware
    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        bridgeConnected: !!this.client,
        bridgeIp: this.config?.HUE_BRIDGE_IP || 'unknown'
      });
    });

    // MCP endpoint - handles JSON-RPC requests
    app.post('/mcp', async (req, res) => {
      try {
        const { method, params, id, jsonrpc } = req.body;

        if (jsonrpc !== '2.0') {
          return res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32600, message: 'Invalid Request' },
            id: id || null,
          });
        }

        let result;

        switch (method) {
          case 'initialize':
            result = {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
              },
              serverInfo: {
                name: 'hue-mcp',
                version: '0.6.0',
              },
            };
            break;
          case 'tools/list':
            if (!this.client) {
              result = { tools: [] };
            } else {
              const tools = [
                ...createLightTools(this.client),
                ...createRoomTools(this.client),
                ...createSceneTools(this.client),
                createSummaryTool(this.client),
                createInfoTool(this.client),
              ];
              result = { tools };
            }
            break;
          case 'tools/call':
            if (!this.client) {
              throw new Error('Hue client not initialized. Please run setup first.');
            }
            result = await this.handleToolCall(params);
            break;
          default:
            return res.status(400).json({
              jsonrpc: '2.0',
              error: { code: -32601, message: 'Method not found' },
              id,
            });
        }

        return res.json({
          jsonrpc: '2.0',
          result,
          id,
        });
      } catch (error: any) {
        log.error('HTTP MCP request failed', error);
        return res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: error.message },
          id: req.body?.id || null,
        });
      }
    });

    // Start server
    app.listen(this.config.MCP_PORT, this.config.MCP_HOST, () => {
      log.mcp('running', { 
        transport: 'http',
        host: this.config!.MCP_HOST,
        port: this.config!.MCP_PORT,
        endpoint: `http://${this.config!.MCP_HOST}:${this.config!.MCP_PORT}/mcp`
      });
    });
  }

  async run() {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    if (this.config.MCP_TRANSPORT === 'http') {
      await this.runHttp();
    } else {
      await this.runStdio();
    }
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