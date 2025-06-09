import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { HueClient } from '../hue-client.js';
import { LightState } from '../types/index.js';

export function createLightTools(_client: HueClient): Tool[] {
  return [
    {
      name: 'find_lights',
      description: 'Smart search for lights by various criteria (name, room, state, capabilities)',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (e.g., "kitchen lights", "all off lights", "color bulbs in bedroom")',
          },
          room: {
            type: 'string',
            description: 'Filter by specific room name',
          },
          state: {
            type: 'string',
            enum: ['on', 'off', 'reachable', 'unreachable'],
            description: 'Filter by light state',
          },
          capability: {
            type: 'string',
            enum: ['color', 'temperature', 'dimming'],
            description: 'Filter by light capabilities',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'list_lights',
      description: 'List all available lights with their current state, with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Filter lights by name, room, or state (e.g., "kitchen", "on", "unreachable")',
          },
          includeRoom: {
            type: 'boolean',
            description: 'Include room information for each light',
            default: true,
          },
          includeCapabilities: {
            type: 'boolean',
            description: 'Include detailed capabilities and features',
            default: false,
          },
          responseSize: {
            type: 'string',
            enum: ['compact', 'standard', 'verbose'],
            description: 'Control response detail level for context efficiency',
            default: 'standard',
          },
        },
      },
    },
    {
      name: 'get_light',
      description: 'Get detailed information about a specific light',
      inputSchema: {
        type: 'object',
        properties: {
          lightId: {
            type: 'string',
            description: 'The ID of the light',
          },
        },
        required: ['lightId'],
      },
    },
    {
      name: 'set_light_state',
      description: 'Control a light - turn on/off, set brightness, color, etc.',
      inputSchema: {
        type: 'object',
        properties: {
          lightId: {
            type: 'string',
            description: 'The ID of the light to control',
          },
          state: {
            type: 'object',
            description: 'The desired state for the light',
            properties: {
              on: {
                type: 'boolean',
                description: 'Whether the light should be on or off',
              },
              brightness: {
                type: 'number',
                description: 'Brightness level (0-100)',
                minimum: 0,
                maximum: 100,
              },
              hue: {
                type: 'number',
                description: 'Hue in degrees (0-360)',
                minimum: 0,
                maximum: 360,
              },
              saturation: {
                type: 'number',
                description: 'Saturation level (0-100)',
                minimum: 0,
                maximum: 100,
              },
              colorTemp: {
                type: 'number',
                description: 'Color temperature in mireds (153-500)',
                minimum: 153,
                maximum: 500,
              },
              transitionTime: {
                type: 'number',
                description: 'Transition time in milliseconds',
                minimum: 0,
              },
            },
          },
          naturalLanguage: {
            type: 'string',
            description: 'Natural language description of desired state (e.g., "warm white at 50%", "stormy dusk")',
          },
        },
        required: ['lightId'],
        oneOf: [
          { required: ['state'] },
          { required: ['naturalLanguage'] },
        ],
      },
    },
  ];
}

export async function handleFindLights(client: HueClient, args: any): Promise<any> {
  try {
    const allLights = await client.getLights();
    const rooms = await client.getRooms();
    
    const query = args.query.toLowerCase();
    let matchedLights = allLights;
    
    // Apply room filter first
    if (args.room) {
      const targetRoom = rooms.find(r => r.name.toLowerCase().includes(args.room.toLowerCase()));
      if (targetRoom) {
        matchedLights = matchedLights.filter(light => targetRoom.lights.includes(light.id));
      }
    }
    
    // Apply state filter
    if (args.state) {
      matchedLights = matchedLights.filter(light => {
        switch (args.state) {
          case 'on': return light.state.on;
          case 'off': return !light.state.on;
          case 'reachable': return light.state.reachable;
          case 'unreachable': return !light.state.reachable;
          default: return true;
        }
      });
    }
    
    // Apply capability filter
    if (args.capability) {
      matchedLights = matchedLights.filter(light => {
        switch (args.capability) {
          case 'color': return light.capabilities?.control?.colorgamut !== undefined;
          case 'temperature': return light.capabilities?.control?.ct !== undefined;
          case 'dimming': return light.capabilities?.control?.mindimlevel !== undefined;
          default: return true;
        }
      });
    }
    
    // Smart query matching
    const queryResults = matchedLights.filter(light => {
      const lightName = light.name.toLowerCase();
      const lightType = light.type.toLowerCase();
      const room = rooms.find(r => r.lights.includes(light.id));
      const roomName = room?.name.toLowerCase() || '';
      
      // Check for exact matches first
      if (lightName.includes(query) || lightType.includes(query) || roomName.includes(query)) {
        return true;
      }
      
      // Check for contextual queries
      const words = query.split(' ');
      return words.some((word: string) => {
        return lightName.includes(word) || lightType.includes(word) || roomName.includes(word);
      });
    });
    
    // Add context and suggestions
    const resultsWithContext = queryResults.map(light => {
      const room = rooms.find(r => r.lights.includes(light.id));
      return {
        id: light.id,
        name: light.name,
        type: light.type,
        room: room ? { id: room.id, name: room.name } : null,
        state: {
          on: light.state.on,
          brightness: Math.round((light.state.bri / 254) * 100),
          reachable: light.state.reachable,
          colorMode: light.state.colormode,
        },
        capabilities: {
          supportsColor: light.capabilities?.control?.colorgamut !== undefined,
          supportsColorTemp: light.capabilities?.control?.ct !== undefined,
          supportsBrightness: light.capabilities?.control?.mindimlevel !== undefined,
        },
        matchReason: getMatchReason(light, query, room),
      };
    });
    
    return {
      query: args.query,
      found: resultsWithContext,
      total: queryResults.length,
      suggestions: generateSearchSuggestions(queryResults, query, rooms),
      quickActions: generateBulkActions(queryResults),
    };
  } catch (error) {
    throw new Error(`Failed to find lights: ${error}`);
  }
}

function getMatchReason(light: any, query: string, room: any): string {
  const lightName = light.name.toLowerCase();
  const roomName = room?.name.toLowerCase() || '';
  
  if (lightName.includes(query)) return `Name contains "${query}"`;
  if (roomName.includes(query)) return `In room "${room.name}"`;
  if (light.type.toLowerCase().includes(query)) return `Type matches "${query}"`;
  
  return 'Partial match';
}

function generateSearchSuggestions(lights: any[], query: string, rooms: any[]): string[] {
  const suggestions: string[] = [];
  
  if (lights.length === 0) {
    suggestions.push(`No lights found for "${query}"`);
    suggestions.push('Try searching by room name, light name, or "on"/"off"');
    
    // Suggest available rooms
    const roomNames = rooms.slice(0, 3).map(r => r.name).join(', ');
    suggestions.push(`Available rooms: ${roomNames}...`);
  } else if (lights.length > 10) {
    suggestions.push(`Found ${lights.length} lights - try a more specific search`);
  }
  
  return suggestions;
}

function generateBulkActions(lights: any[]): any[] {
  if (lights.length === 0) return [];
  
  const actions: any[] = [];
  const onLights = lights.filter(l => l.state.on);
  const offLights = lights.filter(l => !l.state.on);
  
  if (offLights.length > 0) {
    actions.push({
      action: `Turn on all ${lights.length} found lights`,
      description: `Turn on ${offLights.length} lights that are currently off`,
      affectedLights: lights.length,
    });
  }
  
  if (onLights.length > 0) {
    actions.push({
      action: `Turn off all ${lights.length} found lights`,
      description: `Turn off ${onLights.length} lights that are currently on`,
      affectedLights: lights.length,
    });
  }
  
  return actions;
}

export async function handleListLights(client: HueClient, args: any = {}): Promise<any> {
  try {
    const allLights = await client.getLights();
    const rooms = args.includeRoom ? await client.getRooms() : [];
    
    // Apply filtering
    let filteredLights = allLights;
    if (args.filter) {
      const filterLower = args.filter.toLowerCase();
      filteredLights = allLights.filter(light => {
        return (
          light.name.toLowerCase().includes(filterLower) ||
          light.type.toLowerCase().includes(filterLower) ||
          (filterLower === 'on' && light.state.on) ||
          (filterLower === 'off' && !light.state.on) ||
          (filterLower === 'unreachable' && !light.state.reachable) ||
          (filterLower === 'reachable' && light.state.reachable)
        );
      });
    }
    
    // Helper function to find room for a light
    const findLightRoom = (lightId: string) => {
      return rooms.find(room => room.lights.includes(lightId));
    };
    
    const lightsWithContext = filteredLights.map(light => {
      const responseSize = args.responseSize || 'standard';
      
      // Compact response for context efficiency
      if (responseSize === 'compact') {
        const compactInfo = {
          id: light.id,
          name: light.name,
          on: light.state.on,
          brightness: Math.round((light.state.bri / 254) * 100),
          reachable: light.state.reachable,
        };
        
        if (args.includeRoom) {
          const room = findLightRoom(light.id);
          (compactInfo as any).room = room?.name || null;
        }
        
        return compactInfo;
      }
      
      const baseInfo = {
        id: light.id,
        name: light.name,
        type: responseSize === 'verbose' ? light.type : undefined,
        modelId: responseSize === 'verbose' ? light.modelid : undefined,
        manufacturerName: responseSize === 'verbose' ? light.manufacturername : undefined,
        productName: responseSize === 'verbose' ? light.productname : undefined,
        state: {
          on: light.state.on,
          brightness: Math.round((light.state.bri / 254) * 100), // Convert to 0-100%
          reachable: light.state.reachable,
          colorMode: responseSize === 'verbose' ? light.state.colormode : undefined,
          ...(light.state.hue !== undefined && responseSize !== 'compact' && {
            hue: Math.round((light.state.hue / 65535) * 360), // Convert to degrees
            saturation: Math.round((light.state.sat / 254) * 100), // Convert to percentage
          }),
          ...(light.state.ct !== undefined && responseSize !== 'compact' && { colorTemp: light.state.ct }),
        },
      };
      
      // Add room context if requested
      if (args.includeRoom) {
        const room = findLightRoom(light.id);
        (baseInfo as any).room = room ? { id: room.id, name: room.name } : null;
      }
      
      // Add capabilities if requested
      if (args.includeCapabilities) {
        (baseInfo as any).capabilities = {
          certified: light.capabilities?.certified,
          control: light.capabilities?.control,
          streaming: light.capabilities?.streaming,
          supportsColor: light.capabilities?.control?.colorgamut !== undefined,
          supportsColorTemp: light.capabilities?.control?.ct !== undefined,
          supportsBrightness: light.capabilities?.control?.mindimlevel !== undefined,
        };
      }
      
      return baseInfo;
    });
    
    // Add summary statistics
    const summary = {
      totalFound: filteredLights.length,
      totalLights: allLights.length,
      onLights: filteredLights.filter(l => l.state.on).length,
      reachableLights: filteredLights.filter(l => l.state.reachable).length,
      ...(args.filter && { appliedFilter: args.filter }),
    };
    
    // Add pagination for large results
    const maxResults = args.responseSize === 'compact' ? 20 : args.responseSize === 'verbose' ? 5 : 10;
    const paginatedLights = lightsWithContext.slice(0, maxResults);
    const hasMore = lightsWithContext.length > maxResults;
    
    const result = {
      lights: paginatedLights,
      summary: {
        ...summary,
        ...(hasMore && { 
          truncated: true, 
          showing: `${maxResults} of ${lightsWithContext.length}`,
          hint: 'Use more specific filters to see fewer results'
        }),
      },
      suggestions: generateLightSuggestions(filteredLights, args.filter),
    };
    
    // Add efficiency tips
    if (lightsWithContext.length > 15) {
      result.suggestions.push('💡 Tip: Use find_lights with specific criteria for faster results');
    }
    
    return result;
  } catch (error) {
    throw new Error(`Failed to list lights: ${error}`);
  }
}

function generateLightSuggestions(lights: any[], filter?: string): string[] {
  const suggestions: string[] = [];
  
  const unreachable = lights.filter(l => !l.state.reachable);
  if (unreachable.length > 0) {
    suggestions.push(`${unreachable.length} lights are unreachable and may need attention`);
  }
  
  const onLights = lights.filter(l => l.state.on);
  if (!filter && onLights.length > lights.length * 0.8) {
    suggestions.push('Most lights are on - consider using scenes for energy efficiency');
  }
  
  if (filter && lights.length === 0) {
    suggestions.push(`No lights match filter "${filter}". Try "on", "off", "kitchen", or a room name`);
  }
  
  return suggestions;
}

export async function handleGetLight(client: HueClient, args: any): Promise<any> {
  try {
    const light = await client.getLight(args.lightId);
    
    if (!light) {
      throw new Error(`Light ${args.lightId} not found`);
    }
    
    // Find which room this light belongs to
    const rooms = await client.getRooms();
    const parentRoom = rooms.find(room => room.lights.includes(args.lightId));
    
    const result = {
      id: light.id,
      name: light.name,
      type: light.type,
      modelId: light.modelid,
      manufacturerName: light.manufacturername,
      productName: light.productname,
      uniqueId: light.uniqueid,
      softwareVersion: light.swversion,
      room: parentRoom ? { id: parentRoom.id, name: parentRoom.name } : null,
      state: {
        on: light.state.on,
        brightness: Math.round((light.state.bri / 254) * 100),
        reachable: light.state.reachable,
        colorMode: light.state.colormode,
        ...(light.state.hue !== undefined && {
          hue: Math.round((light.state.hue / 65535) * 360),
          saturation: Math.round((light.state.sat / 254) * 100),
        }),
        ...(light.state.ct !== undefined && { colorTemp: light.state.ct }),
        ...(light.state.xy && { xy: light.state.xy }),
        alert: light.state.alert,
        effect: light.state.effect,
      },
      capabilities: {
        ...light.capabilities,
        supportsColor: light.capabilities?.control?.colorgamut !== undefined,
        supportsColorTemp: light.capabilities?.control?.ct !== undefined,
        supportsBrightness: light.capabilities?.control?.mindimlevel !== undefined,
        maxBrightness: light.capabilities?.control?.maxlumen,
      },
      config: light.config,
      quickActions: generateQuickActions(light),
      recommendations: generateLightRecommendations(light),
    };
    
    return result;
  } catch (error) {
    throw new Error(`Failed to get light: ${error}`);
  }
}

function generateQuickActions(light: any): any[] {
  const actions: any[] = [];
  
  if (light.state.on) {
    actions.push({
      action: 'Turn Off',
      naturalLanguage: 'turn off',
      state: { on: false }
    });
    
    if (light.state.bri > 50) {
      actions.push({
        action: 'Dim to 25%',
        naturalLanguage: 'dim to 25%',
        state: { brightness: 25 }
      });
    }
  } else {
    actions.push({
      action: 'Turn On',
      naturalLanguage: 'turn on',
      state: { on: true }
    });
  }
  
  // Color suggestions if supported
  if (light.capabilities?.control?.colorgamut) {
    actions.push({
      action: 'Warm White',
      naturalLanguage: 'warm white',
      state: { on: true, colorTemp: 366 }
    });
    actions.push({
      action: 'Cool White',
      naturalLanguage: 'cool white',
      state: { on: true, colorTemp: 153 }
    });
    actions.push({
      action: 'Soft Blue',
      naturalLanguage: 'soft blue mood lighting',
      state: { on: true, hue: 240, saturation: 30, brightness: 50 }
    });
  }
  
  return actions;
}

function generateLightRecommendations(light: any): string[] {
  const recommendations: string[] = [];
  
  if (!light.state.reachable) {
    recommendations.push('Light is unreachable - check power and network connection');
  }
  
  if (light.state.on && light.state.bri < 50) {
    recommendations.push('Light is quite dim - consider increasing brightness for better visibility');
  }
  
  if (light.capabilities?.control?.colorgamut && light.state.colormode === 'ct') {
    recommendations.push('This light supports color - try setting a mood with colored lighting');
  }
  
  if (light.swversion && parseInt(light.swversion.split('.')[0]) < 2) {
    recommendations.push('Light firmware may be outdated - check for updates in the Hue app');
  }
  
  return recommendations;
}

export async function handleSetLightState(client: HueClient, args: any): Promise<any> {
  try {
    let state: LightState;
    
    if (args.naturalLanguage) {
      state = HueClient.parseNaturalLanguageState(args.naturalLanguage);
    } else {
      state = args.state;
    }
    
    const success = await client.setLightState(args.lightId, state);
    
    if (!success) {
      throw new Error(`Failed to update light ${args.lightId}`);
    }
    
    // Get updated light state
    const light = await client.getLight(args.lightId);
    
    return {
      success: true,
      lightId: args.lightId,
      appliedState: state,
      currentState: light ? {
        on: light.state.on,
        brightness: light.state.bri,
        hue: light.state.hue,
        saturation: light.state.sat,
        colorTemp: light.state.ct,
        reachable: light.state.reachable,
      } : null,
    };
  } catch (error) {
    throw new Error(`Failed to set light state: ${error}`);
  }
}