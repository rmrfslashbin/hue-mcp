import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { HueClient } from '../hue-client.js';

export function createSummaryTool(_client: HueClient): Tool {
  return {
    name: 'get_summary',
    description: 'Get a comprehensive overview of the entire Hue lighting system',
    inputSchema: {
      type: 'object',
      properties: {
        includeDetails: {
          type: 'boolean',
          description: 'Include detailed information about each component',
          default: false,
        },
        contextLevel: {
          type: 'string',
          enum: ['minimal', 'standard', 'detailed'],
          description: 'Control response size: minimal (counts only), standard (basic info), detailed (full context)',
          default: 'standard',
        },
      },
    },
  };
}

export async function handleGetSummary(client: HueClient, args: any = {}): Promise<any> {
  try {
    const summary = await client.getSystemSummary();
    const includeDetails = args.includeDetails || false;
    const contextLevel = args.contextLevel || 'standard';
    
    // Minimal context for quick status checks
    if (contextLevel === 'minimal') {
      return {
        status: 'connected',
        statistics: {
          lights: `${summary.statistics.lightsOn}/${summary.statistics.totalLights} on`,
          rooms: summary.statistics.rooms,
          connectivity: `${summary.statistics.reachableLights}/${summary.statistics.totalLights} reachable`,
        },
        quickInsight: summary.statistics.lightsOn > summary.statistics.totalLights * 0.8 
          ? 'Most lights are on' 
          : summary.statistics.unreachableLights > 0 
          ? `${summary.statistics.unreachableLights} lights need attention`
          : 'System healthy',
      };
    }
    
    const result: any = {
      bridge: summary.bridge,
      statistics: summary.statistics,
      rooms: contextLevel === 'detailed' ? summary.rooms : summary.rooms.map((room: any) => ({
        id: room.id,
        name: room.name,
        lightsOn: room.anyOn ? (room.allOn ? 'all' : 'some') : 'none',
      })),
      scenes: {
        categories: Object.keys(summary.scenes).map(category => ({
          category,
          count: summary.scenes[category].length,
          scenes: includeDetails ? summary.scenes[category] : undefined,
        })),
        totalScenes: summary.statistics.scenes,
      },
    };
    
    if (includeDetails) {
      // Add detailed light information
      const lights = await client.getLights();
      result.lights = lights.map(light => ({
        id: light.id,
        name: light.name,
        type: light.type,
        state: {
          on: light.state.on,
          brightness: light.state.bri,
          reachable: light.state.reachable,
          colorMode: light.state.colormode,
        },
      }));
      
      // Add zones if requested
      const zones = await client.getZones();
      result.zones = zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        lightCount: zone.lights.length,
        state: {
          allOn: zone.state.all_on,
          anyOn: zone.state.any_on,
        },
      }));
    }
    
    // Add quick insights
    result.insights = {
      energyEfficiency: {
        lightsOnPercentage: Math.round((summary.statistics.lightsOn / summary.statistics.totalLights) * 100),
        suggestion: summary.statistics.lightsOn > summary.statistics.totalLights * 0.8 
          ? 'Consider turning off unused lights to save energy'
          : summary.statistics.lightsOn < summary.statistics.totalLights * 0.2
          ? 'Most lights are off - great for energy efficiency!'
          : 'Moderate lighting usage',
      },
      connectivity: {
        reachabilityPercentage: Math.round((summary.statistics.reachableLights / summary.statistics.totalLights) * 100),
        issue: summary.statistics.unreachableLights > 0 ? `${summary.statistics.unreachableLights} lights are unreachable` : null,
      },
      recommendations: generateRecommendations(summary),
    };
    
    return result;
  } catch (error) {
    throw new Error(`Failed to get summary: ${error}`);
  }
}

function generateRecommendations(summary: any): string[] {
  const recommendations: string[] = [];
  
  // Energy recommendations
  if (summary.statistics.lightsOn > summary.statistics.totalLights * 0.8) {
    recommendations.push('Consider creating scenes to manage multiple lights efficiently');
  }
  
  // Connectivity recommendations
  if (summary.statistics.unreachableLights > 0) {
    recommendations.push('Check power and network connectivity for unreachable lights');
  }
  
  // Scene recommendations
  if (summary.statistics.scenes < 3) {
    recommendations.push('Create more scenes for different moods and activities');
  }
  
  // Room recommendations
  const emptyRooms = summary.rooms.filter((room: any) => room.lightCount === 0);
  if (emptyRooms.length > 0) {
    recommendations.push(`Consider adding lights to ${emptyRooms.length} room(s) with no lights`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Your Hue system is well-configured!');
  }
  
  return recommendations;
}