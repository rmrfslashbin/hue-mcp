import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const hueApi = require('node-hue-api');

import { HueConfig, LightState } from './types/index.js';
import { parseColorDescription, parseColorTemp, hsvToRgb, rgbToXy } from './utils/colors.js';
import { log } from './utils/logger.js';

const { api: hueApiLib, lightStates, discovery } = hueApi.v3;

export class HueClient {
  private api: any | null = null;
  private config: HueConfig;
  private lastSync: Date | null = null;
  
  // Cache for reducing API calls
  private lightsCache: Map<string, any> = new Map();
  private roomsCache: Map<string, any> = new Map();
  private zonesCache: Map<string, any> = new Map();
  private scenesCache: Map<string, any> = new Map();

  constructor(config: HueConfig) {
    this.config = config;
  }
  
  // Force cache refresh for critical operations
  async refreshCacheIfStale(maxAge: number = 60000): Promise<void> {
    if (this.shouldRefreshCache(maxAge)) {
      await this.refreshCache();
    }
  }

  async connect(): Promise<void> {
    try {
      this.api = await hueApiLib.createLocal(this.config.HUE_BRIDGE_IP).connect(this.config.HUE_API_KEY);
      log.hue('connected', { bridgeIp: this.config.HUE_BRIDGE_IP });
      
      // Initial cache population
      await this.refreshCache();
    } catch (error) {
      log.error('Failed to connect to Hue Bridge', error, { bridgeIp: this.config.HUE_BRIDGE_IP });
      throw error;
    }
  }

  async refreshCache(): Promise<void> {
    if (!this.api) throw new Error('Not connected to bridge');
    
    try {
      // Fetch all data in parallel
      const [lights, groups, scenes] = await Promise.all([
        this.api.lights.getAll(),
        this.api.groups.getAll(),
        this.api.scenes.getAll(),
      ]);

      // Update caches
      this.lightsCache.clear();
      lights.forEach((light: any) => this.lightsCache.set(String(light.id), light));

      this.roomsCache.clear();
      this.zonesCache.clear();
      groups.forEach((group: any) => {
        if (group.type === 'Room') {
          this.roomsCache.set(String(group.id), group);
        } else if (group.type === 'Zone') {
          this.zonesCache.set(String(group.id), group);
        }
      });

      this.scenesCache.clear();
      scenes.forEach((scene: any) => this.scenesCache.set(String(scene.id), scene));

      this.lastSync = new Date();
    } catch (error) {
      log.error('Failed to refresh cache', error);
      throw error;
    }
  }

  // Bridge discovery
  static async discoverBridges(): Promise<any[]> {
    try {
      // Try nupnp (cloud discovery) first - this is more reliable
      log.hue('discovery_start', { method: 'nupnp' });
      const results = await Promise.race([
        discovery.nupnpSearch(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('nupnp timeout')), 5000))
      ]) as any[];
      
      if (results && results.length > 0) {
        log.hue('discovery_success', { method: 'nupnp', count: results.length });
        return results.map((bridge: any) => ({
          id: bridge.config?.name || 'unknown',
          ipaddress: bridge.ipaddress,
          internalipaddress: bridge.ipaddress, // For compatibility
          name: bridge.config?.name || 'Hue Bridge',
          modelid: bridge.config?.modelid,
        }));
      }
      
      log.hue('discovery_start', { method: 'upnp' });
      // Fall back to upnp (local discovery) with timeout
      const upnpResults = await Promise.race([
        discovery.upnpSearch(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('upnp timeout')), 5000))
      ]) as any[];
      
      if (upnpResults && upnpResults.length > 0) {
        log.hue('discovery_success', { method: 'upnp', count: upnpResults.length });
        return upnpResults.map((bridge: any) => ({
          id: bridge.config?.name || bridge.id || 'unknown',
          ipaddress: bridge.ipaddress || bridge.internalipaddress,
          internalipaddress: bridge.ipaddress || bridge.internalipaddress,
          name: bridge.config?.name || bridge.name || 'Hue Bridge',
          modelid: bridge.config?.modelid || bridge.modelid,
        }));
      }
      
      log.warn('No bridges found via discovery');
      return [];
    } catch (error) {
      log.error('Bridge discovery failed', error);
      return [];
    }
  }

  // Create user for authentication
  static async createUser(bridgeIp: string, appName: string = 'hue-mcp'): Promise<any> {
    const unauthenticatedApi = await hueApiLib.createLocal(bridgeIp).connect();
    
    try {
      const createdUser = await unauthenticatedApi.users.createUser(appName, 'MCP Server');
      return createdUser;
    } catch (error: any) {
      if (error.getHueErrorType && error.getHueErrorType() === 101) {
        throw new Error('Link button not pressed. Please press the button on your Hue bridge and try again.');
      }
      throw error;
    }
  }

  // Light operations
  async getLights(): Promise<any[]> {
    if (this.shouldRefreshCache()) {
      await this.refreshCache();
    }
    return Array.from(this.lightsCache.values());
  }

  async getLight(id: string): Promise<any | null> {
    if (this.shouldRefreshCache()) {
      await this.refreshCache();
    }
    return this.lightsCache.get(id) || null;
  }

  async setLightState(id: string, state: LightState): Promise<boolean> {
    if (!this.api) throw new Error('Not connected to bridge');

    const lightState = this.convertToHueLightState(state);
    
    try {
      await this.api.lights.setLightState(parseInt(id), lightState);
      
      // Optimistically update cache without extra API call
      const cachedLight = this.lightsCache.get(id);
      if (cachedLight && cachedLight.state) {
        const updatedLight = { ...cachedLight };
        updatedLight.state = { ...cachedLight.state };
        if (state.on !== undefined) updatedLight.state.on = state.on;
        if (state.brightness !== undefined) updatedLight.state.bri = Math.round((state.brightness / 100) * 254);
        if (state.hue !== undefined) updatedLight.state.hue = Math.round((state.hue / 360) * 65535);
        if (state.saturation !== undefined) updatedLight.state.sat = Math.round((state.saturation / 100) * 254);
        if (state.colorTemp !== undefined) updatedLight.state.ct = state.colorTemp;
        this.lightsCache.set(id, updatedLight);
      }
      
      return true;
    } catch (error) {
      log.error('Failed to set light state', error, { lightId: id, state });
      return false;
    }
  }

  // Room operations
  async getRooms(): Promise<any[]> {
    if (this.shouldRefreshCache()) {
      await this.refreshCache();
    }
    return Array.from(this.roomsCache.values());
  }

  async getRoom(id: string): Promise<any | null> {
    if (this.shouldRefreshCache()) {
      await this.refreshCache();
    }
    return this.roomsCache.get(id) || null;
  }

  async setRoomState(id: string, state: LightState): Promise<boolean> {
    if (!this.api) throw new Error('Not connected to bridge');

    const groupState = this.convertToGroupState(state);
    
    try {
      await this.api.groups.setGroupState(parseInt(id), groupState);
      
      // Optimistically update room cache and mark cache as slightly stale
      const cachedRoom = this.roomsCache.get(id);
      if (cachedRoom && state.on !== undefined) {
        const updatedRoom = { ...cachedRoom };
        updatedRoom.state.all_on = state.on;
        updatedRoom.state.any_on = state.on;
        this.roomsCache.set(id, updatedRoom);
      }
      
      return true;
    } catch (error) {
      log.error('Failed to set room state', error, { roomId: id, state });
      return false;
    }
  }

  // Zone operations
  async getZones(): Promise<any[]> {
    if (this.shouldRefreshCache()) {
      await this.refreshCache();
    }
    return Array.from(this.zonesCache.values());
  }

  async getZone(id: string): Promise<any | null> {
    if (this.shouldRefreshCache()) {
      await this.refreshCache();
    }
    return this.zonesCache.get(id) || null;
  }

  async setZoneState(id: string, state: LightState): Promise<boolean> {
    if (!this.api) throw new Error('Not connected to bridge');

    const groupState = this.convertToGroupState(state);
    
    try {
      await this.api.groups.setGroupState(parseInt(id), groupState);
      
      // Optimistically update zone cache
      const cachedZone = this.zonesCache.get(id);
      if (cachedZone && state.on !== undefined) {
        const updatedZone = { ...cachedZone };
        updatedZone.state.all_on = state.on;
        updatedZone.state.any_on = state.on;
        this.zonesCache.set(id, updatedZone);
      }
      
      return true;
    } catch (error) {
      log.error('Failed to set zone state', error, { zoneId: id, state });
      return false;
    }
  }

  // Helper to get lights in a zone
  async getLightsInZone(zoneId: string): Promise<any[]> {
    const zone = await this.getZone(zoneId);
    if (!zone) return [];

    const lights: any[] = [];
    for (const lightId of zone.lights) {
      const light = await this.getLight(lightId);
      if (light) {
        lights.push(light);
      }
    }
    return lights;
  }

  // Scene operations
  async getScenes(): Promise<any[]> {
    if (this.shouldRefreshCache()) {
      await this.refreshCache();
    }
    return Array.from(this.scenesCache.values());
  }

  async activateScene(id: string): Promise<boolean> {
    if (!this.api) throw new Error('Not connected to bridge');

    try {
      await this.api.scenes.activateScene(id);
      return true;
    } catch (error) {
      log.error('Failed to activate scene', error, { sceneId: id });
      return false;
    }
  }

  // Helper to get lights in a room
  async getLightsInRoom(roomId: string): Promise<any[]> {
    const room = await this.getRoom(roomId);
    if (!room) return [];

    const lights: any[] = [];
    for (const lightId of room.lights) {
      const light = await this.getLight(lightId);
      if (light) {
        lights.push(light);
      }
    }
    return lights;
  }

  // Get comprehensive system summary
  async getSystemSummary(): Promise<any> {
    await this.refreshCache();
    
    const lights = Array.from(this.lightsCache.values());
    const rooms = Array.from(this.roomsCache.values());
    const zones = Array.from(this.zonesCache.values());
    const scenes = Array.from(this.scenesCache.values());

    const lightsOn = lights.filter(l => l.state.on).length;
    const reachableLights = lights.filter(l => l.state.reachable).length;

    return {
      bridge: {
        ip: this.config.HUE_BRIDGE_IP,
        connected: !!this.api,
        lastSync: this.lastSync,
      },
      statistics: {
        totalLights: lights.length,
        lightsOn,
        lightsOff: lights.length - lightsOn,
        reachableLights,
        unreachableLights: lights.length - reachableLights,
        rooms: rooms.length,
        zones: zones.length,
        scenes: scenes.length,
      },
      rooms: rooms.map(room => ({
        id: room.id,
        name: room.name,
        lightCount: room.lights.length,
        allOn: room.state.all_on,
        anyOn: room.state.any_on,
      })),
      zones: zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        lightCount: zone.lights.length,
      })),
      scenes: this.categorizeScenes(scenes),
    };
  }

  // Helper methods
  private shouldRefreshCache(forceIfOlderThan: number = 300000): boolean {
    if (!this.lastSync) return true;
    const cacheAge = Date.now() - this.lastSync.getTime();
    return cacheAge > forceIfOlderThan; // Default: 5 minutes instead of 1 minute
  }

  private convertToHueLightState(state: LightState): any {
    const hueState = new lightStates.LightState();

    if (state.on !== undefined) {
      hueState.on(state.on);
    }

    if (state.brightness !== undefined) {
      hueState.brightness(state.brightness);
    }

    if (state.hue !== undefined && state.saturation !== undefined) {
      // Convert HSV to XY for better color accuracy
      const rgb = hsvToRgb({ 
        h: state.hue, 
        s: state.saturation, 
        v: state.brightness || 100 
      });
      const xy = rgbToXy(rgb);
      hueState.xy(xy.x, xy.y);
    }

    if (state.colorTemp !== undefined) {
      hueState.ct(state.colorTemp);
    }

    if (state.transitionTime !== undefined) {
      hueState.transitiontime(Math.round(state.transitionTime / 100)); // Convert ms to deciseconds
    }

    return hueState;
  }

  private convertToGroupState(state: LightState): any {
    const groupState = new lightStates.GroupLightState();

    if (state.on !== undefined) {
      groupState.on(state.on);
    }

    if (state.brightness !== undefined) {
      groupState.brightness(state.brightness);
    }

    if (state.hue !== undefined && state.saturation !== undefined) {
      const rgb = hsvToRgb({ 
        h: state.hue, 
        s: state.saturation, 
        v: state.brightness || 100 
      });
      const xy = rgbToXy(rgb);
      groupState.xy(xy.x, xy.y);
    }

    if (state.colorTemp !== undefined) {
      groupState.ct(state.colorTemp);
    }

    if (state.transitionTime !== undefined) {
      groupState.transitiontime(Math.round(state.transitionTime / 100));
    }

    return groupState;
  }

  private categorizeScenes(scenes: any[]): Record<string, any[]> {
    const categorized: Record<string, any[]> = {
      living: [],
      relaxing: [],
      energizing: [],
      focus: [],
      custom: [],
    };

    scenes.forEach(scene => {
      const sceneLower = scene.name.toLowerCase();
      const sceneInfo = {
        id: scene.id,
        name: scene.name,
        type: scene.type,
        group: scene.group,
        lights: scene.lights,
      };

      if (sceneLower.includes('relax') || sceneLower.includes('calm')) {
        categorized.relaxing.push(sceneInfo);
      } else if (sceneLower.includes('energize') || sceneLower.includes('bright')) {
        categorized.energizing.push(sceneInfo);
      } else if (sceneLower.includes('focus') || sceneLower.includes('concentrate')) {
        categorized.focus.push(sceneInfo);
      } else if (sceneLower.includes('living') || sceneLower.includes('natural')) {
        categorized.living.push(sceneInfo);
      } else {
        categorized.custom.push(sceneInfo);
      }
    });

    return categorized;
  }

  // Parse natural language color/state descriptions
  static parseNaturalLanguageState(description: string): LightState {
    const state: LightState = {};
    const lower = description.toLowerCase();

    // Check for on/off
    if (lower.includes('off') || lower.includes('turn off')) {
      state.on = false;
      return state; // If turning off, ignore other properties
    } else if (lower.includes('on') || lower.includes('turn on')) {
      state.on = true;
    }

    // Check for brightness
    const brightnessMatch = lower.match(/(\d+)%|brightness\s+(\d+)/);
    if (brightnessMatch) {
      state.brightness = parseInt(brightnessMatch[1] || brightnessMatch[2]);
    } else if (lower.includes('dim')) {
      state.brightness = 30;
    } else if (lower.includes('bright')) {
      state.brightness = 100;
    }

    // Check for color
    const colorHsv = parseColorDescription(lower);
    if (colorHsv) {
      state.hue = colorHsv.h;
      state.saturation = colorHsv.s;
      if (!state.brightness && colorHsv.v < 100) {
        state.brightness = colorHsv.v;
      }
    }

    // Check for color temperature
    const colorTemp = parseColorTemp(lower);
    if (colorTemp) {
      state.colorTemp = colorTemp;
    }

    // Check for transition time
    if (lower.includes('slowly')) {
      state.transitionTime = 3000; // 3 seconds
    } else if (lower.includes('quickly')) {
      state.transitionTime = 200; // 0.2 seconds
    }

    return state;
  }

  // Bridge configuration methods
  async getBridgeConfiguration(includeUsers: boolean = false): Promise<any> {
    if (!this.api) throw new Error('Not connected to bridge');
    
    try {
      // Temporarily capture and redirect console output to prevent STDOUT pollution
      const originalStdoutWrite = process.stdout.write;
      const originalConsoleLog = console.log;
      const originalConsoleWarn = console.warn;
      
      // Redirect all output to stderr during this API call
      process.stdout.write = process.stderr.write.bind(process.stderr);
      console.log = (...args: any[]) => console.error(...args);
      console.warn = (...args: any[]) => console.error(...args);
      
      try {
        if (includeUsers) {
          // Get complete configuration including users
          const fullConfig = await this.api.configuration.getAll();
          return fullConfig;
        } else {
          // Get basic configuration without users
          const config = await this.api.configuration.get();
          return config;
        }
      } finally {
        // Restore original console methods
        process.stdout.write = originalStdoutWrite;
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
      }
    } catch (error) {
      log.error('Failed to get bridge configuration', error);
      throw error;
    }
  }

  // User management methods
  async getBridgeUsers(): Promise<any> {
    if (!this.api) throw new Error('Not connected to bridge');
    
    try {
      // Temporarily capture and redirect console output to prevent STDOUT pollution
      const originalStdoutWrite = process.stdout.write;
      const originalConsoleLog = console.log;
      const originalConsoleWarn = console.warn;
      
      // Redirect all output to stderr during this API call
      process.stdout.write = process.stderr.write.bind(process.stderr);
      console.log = (...args: any[]) => console.error(...args);
      console.warn = (...args: any[]) => console.error(...args);
      
      try {
        const users = await this.api.users.getAll();
        return users;
      } finally {
        // Restore original console methods
        process.stdout.write = originalStdoutWrite;
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
      }
    } catch (error) {
      log.error('Failed to get bridge users', error);
      throw error;
    }
  }

  async getBridgeUser(username: string): Promise<any> {
    if (!this.api) throw new Error('Not connected to bridge');
    
    try {
      // Temporarily capture and redirect console output to prevent STDOUT pollution
      const originalStdoutWrite = process.stdout.write;
      const originalConsoleLog = console.log;
      const originalConsoleWarn = console.warn;
      
      // Redirect all output to stderr during this API call
      process.stdout.write = process.stderr.write.bind(process.stderr);
      console.log = (...args: any[]) => console.error(...args);
      console.warn = (...args: any[]) => console.error(...args);
      
      try {
        const user = await this.api.users.get(username);
        return user;
      } finally {
        // Restore original console methods
        process.stdout.write = originalStdoutWrite;
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
      }
    } catch (error) {
      log.error('Failed to get bridge user', error, { username });
      throw error;
    }
  }


  // Helper method to get current API username
  getCurrentUsername(): string {
    return this.config.HUE_API_KEY;
  }
}