import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { HueClient } from '../hue-client.js';
import { log } from '../utils/logger.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Package information
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
const setupWizardPackageJson = JSON.parse(readFileSync(join(__dirname, '../../setup-wizard/package.json'), 'utf-8'));

// Repository information
const REPO_URL = 'https://github.com/rmrfslashbin/hue-mcp';

interface SystemInfo {
  // Version Information
  version: {
    package: string;
    server: string;
    setupWizard: string;
  };
  
  // Build Information
  build: {
    timestamp: string;
    gitCommit: string;
    gitTag?: string;
    gitBranch: string;
    gitDirty: boolean;
    node: string;
    npm: string;
    environment: string;
  };
  
  // Repository Information
  repository: {
    url: string;
    issues: string;
    documentation: string;
    releases: string;
  };
  
  // Runtime Information
  runtime: {
    platform: string;
    arch: string;
    nodeVersion: string;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
  
  // Configuration Status
  status: {
    bridgeConnected: boolean;
    bridgeIp?: string;
    cacheSize?: number;
    lastSync?: string;
    toolCount: number;
  };
  
  // Support Resources
  resources: {
    documentation: string[];
    troubleshooting: string;
    examples: string;
    github: string;
  };
  
  // Available Tools
  tools?: {
    available: string[];
    count: number;
  };
}

export function createInfoTool(_client: HueClient): Tool {
  return {
    name: 'get_info',
    description: 'Get system information, version details, and debugging metadata',
    inputSchema: {
      type: 'object',
      properties: {
        detail: {
          type: 'string',
          enum: ['minimal', 'standard', 'verbose'],
          description: 'Level of detail to include (default: standard)',
        },
      },
    },
  };
}

export async function handleGetInfo(client: HueClient, args: any = {}): Promise<any> {
  try {
    const detail = args.detail || 'standard';
    log.debug('Getting system info', { detail });
    
    // Load build info if available
    let buildInfo: any = {
      timestamp: 'development',
      gitCommit: 'unknown',
      gitBranch: 'unknown',
      gitDirty: false,
      node: process.version,
      npm: 'unknown',
      environment: process.env.NODE_ENV || 'production',
    };
    
    const buildInfoPath = join(__dirname, '../generated/build-info.json');
    if (existsSync(buildInfoPath)) {
      try {
        buildInfo = JSON.parse(readFileSync(buildInfoPath, 'utf-8'));
      } catch (error) {
        log.warn('Failed to load build info', error);
      }
    }
    
    // Get bridge status
    let bridgeStatus: any = {
      bridgeConnected: false,
      toolCount: 16,
    };
    
    try {
      const summary = await client.getSystemSummary();
      bridgeStatus = {
        bridgeConnected: summary.bridge.connected,
        bridgeIp: summary.bridge.ip,
        lastSync: summary.bridge.lastSync,
        toolCount: 16,
        cacheSize: summary.statistics.totalLights + summary.statistics.rooms + 
                   summary.statistics.zones + summary.statistics.scenes,
      };
    } catch (error) {
      log.debug('Could not get bridge status', error);
    }
    
    // Build system info based on detail level
    if (detail === 'minimal') {
      return {
        name: packageJson.name,
        version: packageJson.version,
        git: {
          commit: buildInfo.gitCommit,
          tag: buildInfo.gitTag,
        },
        status: {
          bridgeConnected: bridgeStatus.bridgeConnected,
          bridgeIp: bridgeStatus.bridgeIp,
        },
      };
    }
    
    const standardInfo = {
      name: packageJson.name,
      version: {
        package: packageJson.version,
        server: packageJson.version,
        setupWizard: setupWizardPackageJson.version,
      },
      build: {
        timestamp: buildInfo.timestamp,
        node: buildInfo.nodeVersion,
        environment: buildInfo.environment,
      },
      git: {
        commit: buildInfo.gitCommit,
        tag: buildInfo.gitTag,
        branch: buildInfo.gitBranch,
      },
      repository: {
        url: REPO_URL,
        documentation: `${REPO_URL}/tree/main/docs`,
        issues: `${REPO_URL}/issues`,
        releases: `${REPO_URL}/releases`,
      },
      status: {
        bridgeConnected: bridgeStatus.bridgeConnected,
        bridgeIp: bridgeStatus.bridgeIp,
        lastSync: bridgeStatus.lastSync,
        toolCount: bridgeStatus.toolCount,
      },
    };
    
    if (detail === 'standard') {
      return standardInfo;
    }
    
    // Verbose includes everything
    const verboseInfo: SystemInfo = {
      ...standardInfo,
      build: {
        ...standardInfo.build,
        gitCommit: buildInfo.gitCommit,
        gitTag: buildInfo.gitTag,
        gitBranch: buildInfo.gitBranch,
        gitDirty: buildInfo.gitDirty,
        npm: buildInfo.npmVersion,
      },
      runtime: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
      status: {
        ...standardInfo.status,
        cacheSize: bridgeStatus.cacheSize,
      },
      resources: {
        documentation: [
          `${REPO_URL}/blob/main/README.md`,
          `${REPO_URL}/blob/main/docs/installation.md`,
          `${REPO_URL}/blob/main/docs/mcp-tools.md`,
          `${REPO_URL}/blob/main/docs/atmospheric-variation.md`,
        ],
        troubleshooting: `${REPO_URL}/blob/main/docs/troubleshooting.md`,
        examples: `${REPO_URL}/blob/main/docs/examples.md`,
        github: REPO_URL,
      },
      tools: {
        available: [
          'find_lights', 'list_lights', 'get_light', 'set_light_state',
          'list_rooms', 'get_room', 'control_room_lights',
          'list_zones', 'get_zone', 'control_zone_lights',
          'list_scenes', 'activate_scene',
          'get_summary', 'get_info',
          'get_bridge_config', 'list_users', 'get_user',
        ],
        count: 17, // Now 17 with get_info, get_bridge_config, list_users, get_user
      } as any,
    };
    
    return verboseInfo;
    
  } catch (error) {
    log.error('Failed to get system info', error);
    throw new Error(`Failed to get system info: ${error}`);
  }
}