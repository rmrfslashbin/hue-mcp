export interface HueConfig {
  HUE_BRIDGE_IP: string;
  HUE_API_KEY: string;
  HUE_SYNC_INTERVAL_MS: number;
  HUE_ENABLE_EVENTS: boolean;
  NODE_TLS_REJECT_UNAUTHORIZED: string;
  LOG_LEVEL: string;
}

export interface LightState {
  on?: boolean;
  brightness?: number; // 0-100
  hue?: number; // 0-360 degrees
  saturation?: number; // 0-100
  colorTemp?: number; // Mireds
  transitionTime?: number; // Milliseconds
}

export interface RoomLightControl {
  roomId: string;
  state: LightState;
}

export interface BridgeDiscoveryResult {
  id: string;
  internalipaddress: string;
  name?: string;
  modelid?: string;
}

export interface SetupProgress {
  step: 'discovery' | 'authentication' | 'test' | 'complete';
  progress?: number;
  message?: string;
  error?: string;
}