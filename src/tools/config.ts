import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { HueClient } from '../hue-client.js';
import { log } from '../utils/logger.js';

export function createConfigTool(_client: HueClient): Tool {
  return {
    name: 'get_bridge_config',
    description: 'Get bridge configuration and system information including network settings, capabilities, and system status',
    inputSchema: {
      type: 'object',
      properties: {
        detail: {
          type: 'string',
          enum: ['minimal', 'standard', 'verbose'],
          description: 'Level of detail to include (default: standard)',
          default: 'standard',
        },
        includeUsers: {
          type: 'boolean',
          description: 'Include user whitelist data in configuration (default: false)',
          default: false,
        },
      },
    },
  };
}

export async function handleGetBridgeConfig(client: HueClient, args: any = {}): Promise<any> {
  try {
    const detail = args.detail || 'standard';
    const includeUsers = args.includeUsers || false;
    
    log.debug('Getting bridge configuration', { detail, includeUsers });
    
    // Get bridge configuration from API
    const config = await client.getBridgeConfiguration(includeUsers);
    
    // Minimal response for quick checks
    if (detail === 'minimal') {
      return {
        name: config.name,
        bridgeId: config.bridgeid,
        modelId: config.modelid,
        version: {
          api: config.apiversion,
          software: config.swversion,
        },
        network: {
          ip: config.ipaddress,
          mac: config.mac,
          dhcp: config.dhcp,
        },
        status: {
          online: true,
          localTime: config.localtime,
        },
      };
    }
    
    // Standard response with key configuration details
    const standardConfig: any = {
      bridge: {
        name: config.name,
        id: config.bridgeid,
        modelId: config.modelid,
        manufacturer: config.manufacturer,
        factoryNew: config.factorynew,
        replacesBridgeId: config.replacesbridgeid,
        starterkitId: config.starterkitid,
      },
      version: {
        api: config.apiversion,
        software: config.swversion,
        datastore: config.datastoreversion,
      },
      network: {
        ip: config.ipaddress,
        mac: config.mac,
        netmask: config.netmask,
        gateway: config.gateway,
        dhcp: config.dhcp,
        proxyAddress: config.proxyaddress,
        proxyPort: config.proxyport,
      },
      time: {
        utc: config.UTC,
        local: config.localtime,
        timezone: config.timezone,
      },
      zigbee: {
        channel: config.zigbeechannel,
      },
      portal: {
        connection: config.portalconnection,
        state: config.portalstate,
        services: config.portalservices,
      },
      system: {
        linkButton: config.linkbutton,
        touchLink: config.touchlink,
        internetServices: config.internetservices,
      },
    };
    
    if (includeUsers && config.whitelist) {
      standardConfig.users = {
        count: Object.keys(config.whitelist).length,
        summary: Object.entries(config.whitelist).map(([username, userData]: [string, any]) => ({
          username,
          name: userData.name,
          created: userData['create date'],
          lastUsed: userData['last use date'],
        })),
      };
    }
    
    if (detail === 'standard') {
      return standardConfig;
    }
    
    // Verbose includes all raw configuration data
    const verboseConfig: any = {
      ...standardConfig,
      raw: {
        configuration: config,
      },
      capabilities: {
        lights: config.lights ? Object.keys(config.lights).length : 0,
        groups: config.groups ? Object.keys(config.groups).length : 0,
        scenes: config.scenes ? Object.keys(config.scenes).length : 0,
        sensors: config.sensors ? Object.keys(config.sensors).length : 0,
        rules: config.rules ? Object.keys(config.rules).length : 0,
        schedules: config.schedules ? Object.keys(config.schedules).length : 0,
        resourcelinks: config.resourcelinks ? Object.keys(config.resourcelinks).length : 0,
      },
      backup: {
        status: config.backup?.status,
        errorCode: config.backup?.errorcode,
      },
      software: {
        update: config.swupdate,
        update2: config.swupdate2,
      },
    };
    
    if (includeUsers && config.whitelist) {
      verboseConfig.users = {
        count: Object.keys(config.whitelist).length,
        details: config.whitelist,
      };
    }
    
    return verboseConfig;
    
  } catch (error) {
    log.error('Failed to get bridge configuration', error);
    throw new Error(`Failed to get bridge configuration: ${error}`);
  }
}