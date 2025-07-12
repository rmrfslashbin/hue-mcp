import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { HueClient } from '../hue-client.js';
import { log } from '../utils/logger.js';

export function createUserTools(_client: HueClient): Tool[] {
  const tools: Tool[] = [
    {
      name: 'list_users',
      description: 'List all whitelisted users with authentication details, creation dates, and usage information',
      inputSchema: {
        type: 'object',
        properties: {
          detail: {
            type: 'string',
            enum: ['minimal', 'standard', 'verbose'],
            description: 'Level of detail to include (default: standard)',
            default: 'standard',
          },
          sortBy: {
            type: 'string',
            enum: ['name', 'created', 'lastUsed', 'username'],
            description: 'Sort users by field (default: name)',
            default: 'name',
          },
          includeInactive: {
            type: 'boolean',
            description: 'Include users that have never been used (default: true)',
            default: true,
          },
        },
      },
    },
    {
      name: 'get_user',
      description: 'Get detailed information about a specific whitelisted user',
      inputSchema: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            description: 'The username/ID of the user to retrieve',
          },
        },
        required: ['username'],
      },
    },
  ];

  return tools;
}

export async function handleListUsers(client: HueClient, args: any = {}): Promise<any> {
  try {
    const detail = args.detail || 'standard';
    const sortBy = args.sortBy || 'name';
    const includeInactive = args.includeInactive !== false;
    
    log.debug('Listing bridge users', { detail, sortBy, includeInactive });
    
    // Get all users from bridge
    const users = await client.getBridgeUsers();
    
    if (!users || Object.keys(users).length === 0) {
      return {
        users: [],
        count: 0,
        message: 'No whitelisted users found',
      };
    }
    
    // Convert to array and add metadata
    let userList = Object.entries(users).map(([username, userData]: [string, any]) => {
      const hasBeenUsed = userData['last use date'] && userData['last use date'] !== 'none';
      
      return {
        username,
        name: userData.name || 'Unknown',
        created: userData['create date'] || 'Unknown',
        lastUsed: userData['last use date'] || 'Never',
        hasBeenUsed,
        applicationName: userData.name ? userData.name.split('#')[0] : 'Unknown',
        deviceName: userData.name ? userData.name.split('#')[1] : undefined,
        raw: userData,
      };
    });
    
    // Filter inactive users if requested
    if (!includeInactive) {
      userList = userList.filter(user => user.hasBeenUsed);
    }
    
    // Sort users
    userList.sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return new Date(a.created).getTime() - new Date(b.created).getTime();
        case 'lastUsed':
          if (a.lastUsed === 'Never' && b.lastUsed === 'Never') return 0;
          if (a.lastUsed === 'Never') return 1;
          if (b.lastUsed === 'Never') return -1;
          return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
        case 'username':
          return a.username.localeCompare(b.username);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    // Minimal response for quick checks
    if (detail === 'minimal') {
      return {
        count: userList.length,
        active: userList.filter(u => u.hasBeenUsed).length,
        inactive: userList.filter(u => !u.hasBeenUsed).length,
        users: userList.map(u => ({
          username: u.username,
          name: u.name,
          status: u.hasBeenUsed ? 'active' : 'inactive',
        })),
      };
    }
    
    // Standard response with key user information
    const standardResponse = {
      summary: {
        total: userList.length,
        active: userList.filter(u => u.hasBeenUsed).length,
        inactive: userList.filter(u => !u.hasBeenUsed).length,
        sortedBy: sortBy,
      },
      users: userList.map(u => ({
        username: u.username,
        name: u.name,
        applicationName: u.applicationName,
        deviceName: u.deviceName,
        created: u.created,
        lastUsed: u.lastUsed,
        status: u.hasBeenUsed ? 'active' : 'inactive',
      })),
    };
    
    if (detail === 'standard') {
      return standardResponse;
    }
    
    // Verbose includes all raw user data
    return {
      ...standardResponse,
      users: userList.map(u => ({
        ...standardResponse.users.find(su => su.username === u.username),
        raw: u.raw,
      })),
      metadata: {
        retrieved: new Date().toISOString(),
        apiEndpoint: 'configuration.whitelist',
        includedInactive: includeInactive,
      },
    };
    
  } catch (error) {
    log.error('Failed to list bridge users', error);
    throw new Error(`Failed to list bridge users: ${error}`);
  }
}

export async function handleGetUser(client: HueClient, args: any): Promise<any> {
  try {
    const { username } = args;
    
    if (!username) {
      throw new Error('Username is required');
    }
    
    log.debug('Getting user details', { username });
    
    // Get specific user from bridge
    const user = await client.getBridgeUser(username);
    
    if (!user) {
      throw new Error(`User '${username}' not found in bridge whitelist`);
    }
    
    const hasBeenUsed = user['last use date'] && user['last use date'] !== 'none';
    const nameParts = user.name ? user.name.split('#') : ['Unknown'];
    
    return {
      username,
      details: {
        name: user.name || 'Unknown',
        applicationName: nameParts[0] || 'Unknown',
        deviceName: nameParts[1] || undefined,
        created: user['create date'] || 'Unknown',
        lastUsed: user['last use date'] || 'Never',
        status: hasBeenUsed ? 'active' : 'inactive',
        hasBeenUsed,
      },
      analysis: {
        isCurrentUser: username === client.getCurrentUsername(),
        daysSinceCreated: user['create date'] ? 
          Math.floor((Date.now() - new Date(user['create date']).getTime()) / (1000 * 60 * 60 * 24)) : 
          null,
        daysSinceLastUsed: user['last use date'] && user['last use date'] !== 'Never' ? 
          Math.floor((Date.now() - new Date(user['last use date']).getTime()) / (1000 * 60 * 60 * 24)) : 
          null,
      },
      raw: user,
      metadata: {
        retrieved: new Date().toISOString(),
        apiEndpoint: `configuration.whitelist.${username}`,
      },
    };
    
  } catch (error) {
    log.error('Failed to get user details', error, { username: args.username });
    throw new Error(`Failed to get user details: ${error}`);
  }
}

