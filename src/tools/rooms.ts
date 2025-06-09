import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { HueClient } from '../hue-client.js';

export function createRoomTools(_client: HueClient): Tool[] {
  return [
    {
      name: 'list_rooms',
      description: 'List all rooms in the Hue system',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_room',
      description: 'Get detailed information about a specific room including all lights',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: {
            type: 'string',
            description: 'The ID of the room',
          },
        },
        required: ['roomId'],
      },
    },
    {
      name: 'control_room_lights',
      description: 'Control all lights in a room at once',
      inputSchema: {
        type: 'object',
        properties: {
          roomId: {
            type: 'string',
            description: 'The ID of the room',
          },
          state: {
            type: 'object',
            description: 'The desired state for all lights in the room',
            properties: {
              on: {
                type: 'boolean',
                description: 'Whether the lights should be on or off',
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
            description: 'Natural language description of desired state',
          },
          useVariation: {
            type: 'boolean',
            description: 'Apply subtle variations between lights for more realistic atmospheric scenes',
            default: false,
          },
        },
        required: ['roomId'],
        oneOf: [
          { required: ['state'] },
          { required: ['naturalLanguage'] },
        ],
      },
    },
    {
      name: 'list_zones',
      description: 'List all zones in the Hue system',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_zone',
      description: 'Get detailed information about a specific zone including all lights',
      inputSchema: {
        type: 'object',
        properties: {
          zoneId: {
            type: 'string',
            description: 'The ID of the zone',
          },
        },
        required: ['zoneId'],
      },
    },
    {
      name: 'control_zone_lights',
      description: 'Control all lights in a zone at once',
      inputSchema: {
        type: 'object',
        properties: {
          zoneId: {
            type: 'string',
            description: 'The ID of the zone',
          },
          state: {
            type: 'object',
            description: 'The desired state for all lights in the zone',
            properties: {
              on: {
                type: 'boolean',
                description: 'Whether the lights should be on or off',
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
            description: 'Natural language description of desired state',
          },
          useVariation: {
            type: 'boolean',
            description: 'Apply subtle variations between lights for more realistic atmospheric scenes',
            default: false,
          },
        },
        required: ['zoneId'],
        oneOf: [
          { required: ['state'] },
          { required: ['naturalLanguage'] },
        ],
      },
    },
  ];
}

// Helper function to detect if a scene should use variation
function shouldUseVariation(naturalLanguage?: string): boolean {
  if (!naturalLanguage) return false;
  
  const atmosphericKeywords = [
    'stormy', 'storm', 'thunderstorm', 'lightning',
    'sunset', 'sunrise', 'dawn', 'dusk', 'twilight',
    'fire', 'fireplace', 'campfire', 'candle', 'candlelight',
    'ocean', 'forest', 'nature', 'atmospheric', 'moody',
    'aurora', 'galaxy', 'cosmic', 'dreamy',
    'evening', 'night', 'romantic', 'cozy'
  ];
  
  const text = naturalLanguage.toLowerCase();
  return atmosphericKeywords.some(keyword => text.includes(keyword));
}

// Generate subtle variations for atmospheric lighting
function generateLightVariations(baseState: any, numLights: number): any[] {
  const variations = [];
  
  for (let i = 0; i < numLights; i++) {
    const variation = { ...baseState };
    
    // Apply subtle random variations
    if (baseState.hue !== undefined) {
      // Vary hue by ±5-15 degrees for color temperature variation
      const hueVariation = (Math.random() - 0.5) * 30; // ±15 degrees
      variation.hue = Math.max(0, Math.min(360, baseState.hue + hueVariation));
    }
    
    if (baseState.saturation !== undefined) {
      // Vary saturation by ±5-10% for depth variation
      const satVariation = (Math.random() - 0.5) * 20; // ±10%
      variation.saturation = Math.max(0, Math.min(100, baseState.saturation + satVariation));
    }
    
    if (baseState.brightness !== undefined) {
      // Vary brightness by ±10-20% for natural variation
      const brightnessVariation = (Math.random() - 0.5) * 40; // ±20%
      variation.brightness = Math.max(5, Math.min(100, baseState.brightness + brightnessVariation));
    }
    
    if (baseState.colorTemp !== undefined) {
      // Vary color temperature by ±20-50 mireds for warmth variation
      const ctVariation = (Math.random() - 0.5) * 100; // ±50 mireds
      variation.colorTemp = Math.max(153, Math.min(500, baseState.colorTemp + ctVariation));
    }
    
    // Add slight timing variations for more natural feel
    if (baseState.transitionTime !== undefined) {
      const timeVariation = Math.random() * 1000; // ±0.5s variation
      variation.transitionTime = baseState.transitionTime + timeVariation;
    }
    
    variations.push(variation);
  }
  
  return variations;
}

export async function handleListRooms(client: HueClient): Promise<any> {
  try {
    const rooms = await client.getRooms();
    
    return {
      rooms: rooms.map(room => ({
        id: room.id,
        name: room.name,
        type: room.type,
        class: room.class,
        lights: room.lights,
        lightCount: room.lights.length,
        state: {
          allOn: room.state.all_on,
          anyOn: room.state.any_on,
        },
      })),
      count: rooms.length,
    };
  } catch (error) {
    throw new Error(`Failed to list rooms: ${error}`);
  }
}

export async function handleGetRoom(client: HueClient, args: any): Promise<any> {
  try {
    const room = await client.getRoom(args.roomId);
    
    if (!room) {
      throw new Error(`Room ${args.roomId} not found`);
    }
    
    // Get lights in the room
    const lights = await client.getLightsInRoom(args.roomId);
    
    return {
      id: room.id,
      name: room.name,
      type: room.type,
      class: room.class,
      state: {
        allOn: room.state.all_on,
        anyOn: room.state.any_on,
      },
      lights: lights.map(light => ({
        id: light.id,
        name: light.name,
        type: light.type,
        state: {
          on: light.state.on,
          brightness: light.state.bri,
          reachable: light.state.reachable,
          colorMode: light.state.colormode,
        },
      })),
      lightCount: lights.length,
      sensors: room.sensors,
    };
  } catch (error) {
    throw new Error(`Failed to get room: ${error}`);
  }
}

export async function handleControlRoomLights(client: HueClient, args: any): Promise<any> {
  try {
    let baseState;
    
    if (args.naturalLanguage) {
      baseState = HueClient.parseNaturalLanguageState(args.naturalLanguage);
    } else {
      baseState = args.state;
    }
    
    // Check if variation is requested and if it's an atmospheric scene
    const useVariation = args.useVariation || shouldUseVariation(args.naturalLanguage);
    
    let success: boolean;
    let appliedStates: any[] = [];
    
    if (useVariation && (baseState.hue !== undefined || baseState.colorTemp !== undefined)) {
      // Apply individual variations for atmospheric scenes
      const room = await client.getRoom(args.roomId);
      if (!room) {
        throw new Error(`Room ${args.roomId} not found`);
      }
      
      const variations = generateLightVariations(baseState, room.lights.length);
      
      // Apply each variation to individual lights
      const results = await Promise.all(
        room.lights.map(async (lightId: string, index: number) => {
          const variation = variations[index];
          const result = await client.setLightState(lightId, variation);
          appliedStates.push({ lightId, state: variation, success: result });
          return result;
        })
      );
      
      success = results.every(result => result);
    } else {
      // Use standard room control for uniform lighting
      success = await client.setRoomState(args.roomId, baseState);
      appliedStates = [{ roomId: args.roomId, state: baseState, success }];
    }
    
    if (!success) {
      throw new Error(`Failed to update room ${args.roomId}`);
    }
    
    // Get updated room state
    const room = await client.getRoom(args.roomId);
    const lights = await client.getLightsInRoom(args.roomId);
    
    return {
      success: true,
      roomId: args.roomId,
      roomName: room?.name,
      appliedState: useVariation ? 'Individual variations applied' : baseState,
      lightingMode: useVariation ? 'varied_atmospheric' : 'uniform',
      variationUsed: useVariation,
      appliedStates: useVariation ? appliedStates.map(state => ({
        lightId: state.lightId,
        variation: state.state,
      })) : undefined,
      currentState: room ? {
        allOn: room.state.all_on,
        anyOn: room.state.any_on,
      } : null,
      affectedLights: lights.length,
      efficiency: useVariation 
        ? `Applied ${lights.length} individual variations for atmospheric realism`
        : `Applied uniform state to ${lights.length} lights efficiently`,
    };
  } catch (error) {
    throw new Error(`Failed to control room lights: ${error}`);
  }
}

export async function handleListZones(client: HueClient): Promise<any> {
  try {
    const zones = await client.getZones();
    
    return {
      zones: zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        type: zone.type,
        lights: zone.lights,
        lightCount: zone.lights.length,
        state: {
          allOn: zone.state.all_on,
          anyOn: zone.state.any_on,
        },
      })),
      count: zones.length,
    };
  } catch (error) {
    throw new Error(`Failed to list zones: ${error}`);
  }
}

export async function handleGetZone(client: HueClient, args: any): Promise<any> {
  try {
    const zone = await client.getZone(args.zoneId);
    
    if (!zone) {
      throw new Error(`Zone ${args.zoneId} not found`);
    }
    
    // Get lights in the zone
    const lights = await client.getLightsInZone(args.zoneId);
    
    return {
      id: zone.id,
      name: zone.name,
      type: zone.type,
      class: zone.class,
      state: {
        allOn: zone.state.all_on,
        anyOn: zone.state.any_on,
      },
      lights: lights.map(light => ({
        id: light.id,
        name: light.name,
        type: light.type,
        state: {
          on: light.state.on,
          brightness: light.state.bri,
          reachable: light.state.reachable,
          colorMode: light.state.colormode,
        },
      })),
      lightCount: lights.length,
    };
  } catch (error) {
    throw new Error(`Failed to get zone: ${error}`);
  }
}

export async function handleControlZoneLights(client: HueClient, args: any): Promise<any> {
  try {
    let baseState;
    
    if (args.naturalLanguage) {
      baseState = HueClient.parseNaturalLanguageState(args.naturalLanguage);
    } else {
      baseState = args.state;
    }
    
    // Check if variation is requested and if it's an atmospheric scene
    const useVariation = args.useVariation || shouldUseVariation(args.naturalLanguage);
    
    let success: boolean;
    let appliedStates: any[] = [];
    
    if (useVariation && (baseState.hue !== undefined || baseState.colorTemp !== undefined)) {
      // Apply individual variations for atmospheric scenes
      const zone = await client.getZone(args.zoneId);
      if (!zone) {
        throw new Error(`Zone ${args.zoneId} not found`);
      }
      
      const variations = generateLightVariations(baseState, zone.lights.length);
      
      // Apply each variation to individual lights
      const results = await Promise.all(
        zone.lights.map(async (lightId: string, index: number) => {
          const variation = variations[index];
          const result = await client.setLightState(lightId, variation);
          appliedStates.push({ lightId, state: variation, success: result });
          return result;
        })
      );
      
      success = results.every(result => result);
    } else {
      // Use standard zone control for uniform lighting
      success = await client.setZoneState(args.zoneId, baseState);
      appliedStates = [{ zoneId: args.zoneId, state: baseState, success }];
    }
    
    if (!success) {
      throw new Error(`Failed to update zone ${args.zoneId}`);
    }
    
    // Get updated zone state
    const zone = await client.getZone(args.zoneId);
    const lights = await client.getLightsInZone(args.zoneId);
    
    return {
      success: true,
      zoneId: args.zoneId,
      zoneName: zone?.name,
      appliedState: useVariation ? 'Individual variations applied' : baseState,
      lightingMode: useVariation ? 'varied_atmospheric' : 'uniform',
      variationUsed: useVariation,
      appliedStates: useVariation ? appliedStates.map(state => ({
        lightId: state.lightId,
        variation: state.state,
      })) : undefined,
      currentState: zone ? {
        allOn: zone.state.all_on,
        anyOn: zone.state.any_on,
      } : null,
      affectedLights: lights.length,
      efficiency: useVariation 
        ? `Applied ${lights.length} individual variations for atmospheric realism`
        : `Applied uniform state to ${lights.length} lights efficiently`,
    };
  } catch (error) {
    throw new Error(`Failed to control zone lights: ${error}`);
  }
}