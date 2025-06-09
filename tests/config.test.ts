import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { loadConfig, isConfigValid } from '../src/config.js';

describe('Configuration management', () => {
  const testConfigFile = './test-hue-config.json';
  
  beforeEach(() => {
    // Clean up any existing test config
    if (existsSync(testConfigFile)) {
      unlinkSync(testConfigFile);
    }
    
    // Clear environment variables
    delete process.env.HUE_BRIDGE_IP;
    delete process.env.HUE_API_KEY;
  });
  
  afterEach(() => {
    // Clean up test files
    if (existsSync(testConfigFile)) {
      unlinkSync(testConfigFile);
    }
  });

  describe('isConfigValid', () => {
    it('should return true for valid config', () => {
      const config = {
        HUE_BRIDGE_IP: '192.168.1.100',
        HUE_API_KEY: 'valid-32-character-api-key-here-123',
        HUE_SYNC_INTERVAL_MS: 300000,
        HUE_ENABLE_EVENTS: false,
        NODE_TLS_REJECT_UNAUTHORIZED: '0',
        LOG_LEVEL: 'info' as const,
      };
      
      expect(isConfigValid(config)).toBe(true);
    });

    it('should return false for null config', () => {
      expect(isConfigValid(null)).toBe(false);
    });

    it('should return false for config missing IP', () => {
      const config = {
        HUE_BRIDGE_IP: '',
        HUE_API_KEY: 'valid-32-character-api-key-here-123',
        HUE_SYNC_INTERVAL_MS: 300000,
        HUE_ENABLE_EVENTS: false,
        NODE_TLS_REJECT_UNAUTHORIZED: '0',
        LOG_LEVEL: 'info' as const,
      };
      
      expect(isConfigValid(config)).toBe(false);
    });

    it('should return false for config missing API key', () => {
      const config = {
        HUE_BRIDGE_IP: '192.168.1.100',
        HUE_API_KEY: '',
        HUE_SYNC_INTERVAL_MS: 300000,
        HUE_ENABLE_EVENTS: false,
        NODE_TLS_REJECT_UNAUTHORIZED: '0',
        LOG_LEVEL: 'info' as const,
      };
      
      expect(isConfigValid(config)).toBe(false);
    });
  });

  describe('loadConfig with environment variables', () => {
    it('should load config from environment variables', () => {
      process.env.HUE_BRIDGE_IP = '192.168.1.100';
      process.env.HUE_API_KEY = 'env-32-character-api-key-here-123';
      
      const config = loadConfig();
      
      expect(config).not.toBeNull();
      expect(config?.HUE_BRIDGE_IP).toBe('192.168.1.100');
      expect(config?.HUE_API_KEY).toBe('env-32-character-api-key-here-123');
    });

    it('should return null for invalid IP in environment', () => {
      process.env.HUE_BRIDGE_IP = 'invalid-ip';
      process.env.HUE_API_KEY = 'valid-32-character-api-key-here-123';
      
      const config = loadConfig();
      expect(config).toBeNull();
    });

    it('should return null for short API key in environment', () => {
      process.env.HUE_BRIDGE_IP = '192.168.1.100';
      process.env.HUE_API_KEY = 'short';
      
      const config = loadConfig();
      expect(config).toBeNull();
    });
  });
});