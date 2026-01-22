package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Config holds the MCP server configuration
type Config struct {
	// Bridges is the list of configured Hue bridges
	Bridges []BridgeConfig `json:"bridges"`

	// Cache configuration
	Cache CacheConfig `json:"cache"`

	// Server configuration
	Server ServerConfig `json:"server"`
}

// BridgeConfig holds configuration for a single Hue bridge
type BridgeConfig struct {
	// ID is a unique identifier for this bridge
	ID string `json:"id"`

	// Name is a friendly name for the bridge
	Name string `json:"name"`

	// IP is the bridge IP address
	IP string `json:"ip"`

	// AppKey is the API key for authentication
	AppKey string `json:"app_key,omitempty"`

	// Enabled indicates if this bridge should be used
	Enabled bool `json:"enabled"`
}

// CacheConfig holds cache configuration
type CacheConfig struct {
	// Type is the cache backend type (memory, file)
	Type string `json:"type"`

	// FilePath is the cache file path (for file backend)
	FilePath string `json:"file_path,omitempty"`

	// AutoSaveInterval is how often to save cache to disk (in seconds)
	AutoSaveInterval int `json:"auto_save_interval,omitempty"`

	// WarmOnStartup pre-populates cache on startup
	WarmOnStartup bool `json:"warm_on_startup"`
}

// ServerConfig holds server configuration
type ServerConfig struct {
	// LogLevel is the logging level (debug, info, warn, error)
	LogLevel string `json:"log_level"`
}

// DefaultConfig returns default configuration
func DefaultConfig() *Config {
	return &Config{
		Bridges: []BridgeConfig{},
		Cache: CacheConfig{
			Type:             "file",
			FilePath:         filepath.Join(configDir(), "hue-cache.gob"),
			AutoSaveInterval: 300, // 5 minutes
			WarmOnStartup:    true,
		},
		Server: ServerConfig{
			LogLevel: "info",
		},
	}
}

// Load loads configuration from file or creates default
func Load() (*Config, error) {
	configPath := filepath.Join(configDir(), "config.json")

	// Check if config exists
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		// Create default config
		cfg := DefaultConfig()
		if err := cfg.Save(); err != nil {
			return nil, fmt.Errorf("creating default config: %w", err)
		}
		return cfg, nil
	}

	// Load existing config
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("reading config file: %w", err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parsing config: %w", err)
	}

	return &cfg, nil
}

// Save saves configuration to file
func (c *Config) Save() error {
	configPath := filepath.Join(configDir(), "config.json")

	// Ensure config directory exists
	if err := os.MkdirAll(configDir(), 0755); err != nil {
		return fmt.Errorf("creating config directory: %w", err)
	}

	// Marshal config
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling config: %w", err)
	}

	// Write config file
	if err := os.WriteFile(configPath, data, 0600); err != nil {
		return fmt.Errorf("writing config file: %w", err)
	}

	return nil
}

// AddBridge adds a new bridge to the configuration
func (c *Config) AddBridge(bridge BridgeConfig) error {
	// Check for duplicate ID
	for _, b := range c.Bridges {
		if b.ID == bridge.ID {
			return fmt.Errorf("bridge with ID %q already exists", bridge.ID)
		}
	}

	c.Bridges = append(c.Bridges, bridge)
	return c.Save()
}

// RemoveBridge removes a bridge from the configuration
func (c *Config) RemoveBridge(id string) error {
	for i, b := range c.Bridges {
		if b.ID == id {
			c.Bridges = append(c.Bridges[:i], c.Bridges[i+1:]...)
			return c.Save()
		}
	}
	return fmt.Errorf("bridge with ID %q not found", id)
}

// GetBridge returns a bridge by ID
func (c *Config) GetBridge(id string) (*BridgeConfig, error) {
	for i, b := range c.Bridges {
		if b.ID == id {
			return &c.Bridges[i], nil
		}
	}
	return nil, fmt.Errorf("bridge with ID %q not found", id)
}

// configDir returns the configuration directory path
func configDir() string {
	// Use XDG_CONFIG_HOME if set, otherwise ~/.config
	if xdgConfig := os.Getenv("XDG_CONFIG_HOME"); xdgConfig != "" {
		return filepath.Join(xdgConfig, "hue-mcp")
	}

	home, err := os.UserHomeDir()
	if err != nil {
		// Fallback to /tmp if home dir not available
		return filepath.Join("/tmp", "hue-mcp")
	}

	return filepath.Join(home, ".config", "hue-mcp")
}

// ConfigPath returns the full path to the config file
func ConfigPath() string {
	return filepath.Join(configDir(), "config.json")
}
