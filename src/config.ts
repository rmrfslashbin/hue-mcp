import { z } from 'zod';
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { log } from './utils/logger.js';
import { HueConfig } from './types/index.js';

// Load environment variables
dotenv.config();

const ConfigSchema = z.object({
  HUE_BRIDGE_IP: z.string().ip({ version: 'v4' }),
  HUE_API_KEY: z.string().min(32),
  HUE_SYNC_INTERVAL_MS: z.coerce.number().min(60000).default(300000),
  HUE_ENABLE_EVENTS: z.coerce.boolean().default(false),
  NODE_TLS_REJECT_UNAUTHORIZED: z.string().default('0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  MCP_TRANSPORT: z.enum(['stdio', 'http']).default('stdio'),
  MCP_HOST: z.string().default('0.0.0.0'),
  MCP_PORT: z.coerce.number().default(8080),
});

export function loadConfig(): HueConfig | null {
  try {
    // Priority 1: Environment variables
    const envConfig = {
      HUE_BRIDGE_IP: process.env.HUE_BRIDGE_IP,
      HUE_API_KEY: process.env.HUE_API_KEY,
      HUE_SYNC_INTERVAL_MS: process.env.HUE_SYNC_INTERVAL_MS,
      HUE_ENABLE_EVENTS: process.env.HUE_ENABLE_EVENTS,
      NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
      LOG_LEVEL: process.env.LOG_LEVEL,
      MCP_TRANSPORT: process.env.MCP_TRANSPORT,
      MCP_HOST: process.env.MCP_HOST,
      MCP_PORT: process.env.MCP_PORT,
    };

    // Remove undefined values
    const cleanEnvConfig = Object.fromEntries(
      Object.entries(envConfig).filter(([_, v]) => v !== undefined)
    );

    // Priority 2: Config file
    let fileConfig = {};
    const configPath = './hue-config.json';
    if (existsSync(configPath)) {
      try {
        fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      } catch (e) {
        log.warn('Failed to parse hue-config.json', e);
      }
    }

    // Merge configs (env takes precedence)
    const mergedConfig = { ...fileConfig, ...cleanEnvConfig };

    // Validate
    const result = ConfigSchema.safeParse(mergedConfig);
    if (!result.success) {
      log.error('Invalid configuration', result.error.format());
      return null;
    }

    // Apply TLS setting
    if (result.data.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    return result.data;
  } catch (error) {
    log.error('Failed to load configuration', error);
    return null;
  }
}

export function isConfigValid(config: HueConfig | null): config is HueConfig {
  return config !== null && !!config.HUE_BRIDGE_IP && !!config.HUE_API_KEY;
}