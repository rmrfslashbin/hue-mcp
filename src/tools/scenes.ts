import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { HueClient } from '../hue-client.js';

export function createSceneTools(_client: HueClient): Tool[] {
  return [
    {
      name: 'list_scenes',
      description: 'List all available scenes in the Hue system',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Optional filter by scene name or room',
          },
        },
      },
    },
    {
      name: 'activate_scene',
      description: 'Activate a specific scene',
      inputSchema: {
        type: 'object',
        properties: {
          sceneId: {
            type: 'string',
            description: 'The ID of the scene to activate',
          },
        },
        required: ['sceneId'],
      },
    },
  ];
}

export async function handleListScenes(client: HueClient, args: any = {}): Promise<any> {
  try {
    const scenes = await client.getScenes();
    let filteredScenes = scenes;
    
    if (args.filter) {
      const filterLower = args.filter.toLowerCase();
      filteredScenes = scenes.filter(scene => 
        scene.name.toLowerCase().includes(filterLower) ||
        (scene.group && scene.group.toString().includes(filterLower))
      );
    }
    
    return {
      scenes: filteredScenes.map(scene => ({
        id: scene.id,
        name: scene.name,
        type: scene.type,
        group: scene.group,
        lights: scene.lights,
        owner: scene.owner,
        recycle: scene.recycle,
        locked: scene.locked,
        appData: scene.appdata,
        picture: scene.picture,
        lastUpdated: scene.lastupdated,
      })),
      count: filteredScenes.length,
      totalScenes: scenes.length,
    };
  } catch (error) {
    throw new Error(`Failed to list scenes: ${error}`);
  }
}

export async function handleActivateScene(client: HueClient, args: any): Promise<any> {
  try {
    const success = await client.activateScene(args.sceneId);
    
    if (!success) {
      throw new Error(`Failed to activate scene ${args.sceneId}`);
    }
    
    // Get scene information
    const scenes = await client.getScenes();
    const scene = scenes.find(s => s.id === args.sceneId);
    
    return {
      success: true,
      sceneId: args.sceneId,
      sceneName: scene?.name || 'Unknown',
      type: scene?.type,
      affectedLights: scene?.lights?.length || 0,
      group: scene?.group,
    };
  } catch (error) {
    throw new Error(`Failed to activate scene: ${error}`);
  }
}