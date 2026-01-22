package bridge

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	cache "github.com/rmrfslashbin/hue-cache"
	"github.com/rmrfslashbin/hue-cache/backends"
	"github.com/rmrfslashbin/hue-mcp/pkg/config"
	"github.com/rmrfslashbin/hue-sdk"
)

// Manager manages multiple Hue bridges with caching
type Manager struct {
	config  *config.Config
	bridges map[string]*Bridge
	mu      sync.RWMutex
}

// Bridge represents a single Hue bridge with its cached client
type Bridge struct {
	ID            string
	Name          string
	IP            string
	SDKClient     *hue.Client
	CachedClient  *cache.CachedClient
	Backend       cache.Backend
	SyncEngine    *cache.SyncEngine
	Manager       *cache.CacheManager
	Connected     bool
	LastSeen      time.Time
	Error         error
}

// NewManager creates a new bridge manager
func NewManager(cfg *config.Config) *Manager {
	return &Manager{
		config:  cfg,
		bridges: make(map[string]*Bridge),
	}
}

// InitializeBridges initializes all configured bridges
func (m *Manager) InitializeBridges(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, bridgeCfg := range m.config.Bridges {
		if !bridgeCfg.Enabled {
			continue
		}

		bridge, err := m.initializeBridge(ctx, bridgeCfg)
		if err != nil {
			// Log error but continue with other bridges
			fmt.Printf("Warning: Failed to initialize bridge %s: %v\n", bridgeCfg.Name, err)
			continue
		}

		m.bridges[bridgeCfg.ID] = bridge
	}

	if len(m.bridges) == 0 {
		return fmt.Errorf("no bridges successfully initialized")
	}

	return nil
}

// initializeBridge initializes a single bridge
func (m *Manager) initializeBridge(ctx context.Context, cfg config.BridgeConfig) (*Bridge, error) {
	// Create SDK client
	sdkClient, err := hue.NewClient(
		hue.WithBridgeIP(cfg.IP),
		hue.WithAppKey(cfg.AppKey),
	)
	if err != nil {
		return nil, fmt.Errorf("creating SDK client: %w", err)
	}

	// Create cache backend based on configuration
	var backend cache.Backend
	switch m.config.Cache.Type {
	case "file":
		filePath := m.config.Cache.FilePath
		if filePath == "" {
			filePath = fmt.Sprintf("/tmp/hue-cache-%s.gob", cfg.ID)
		}

		fileBackend, err := backends.NewFile(&backends.FileConfig{
			FilePath:         filePath,
			AutoSaveInterval: time.Duration(m.config.Cache.AutoSaveInterval) * time.Second,
			LoadOnStart:      true,
			MemoryConfig:     backends.DefaultMemoryConfig(),
		})
		if err != nil {
			return nil, fmt.Errorf("creating file backend: %w", err)
		}
		backend = fileBackend

	case "memory":
		fallthrough
	default:
		backend = backends.NewMemory(backends.DefaultMemoryConfig())
	}

	// Create cache manager
	cacheManager := cache.NewCacheManager(backend, sdkClient)

	// Warm cache if configured
	if m.config.Cache.WarmOnStartup {
		warmConfig := cache.DefaultWarmConfig()
		warmConfig.OnError = func(resourceType string, err error) {
			fmt.Printf("Warning: Failed to warm %s for bridge %s: %v\n", resourceType, cfg.Name, err)
		}

		stats, err := cacheManager.WarmCache(ctx, warmConfig)
		if err != nil {
			fmt.Printf("Warning: Cache warming had errors for bridge %s: %v\n", cfg.Name, err)
		} else {
			fmt.Printf("Bridge %s cache warmed: %d entries in %v\n", cfg.Name, stats.TotalWarmed, stats.Duration)
		}
	}

	// Create sync engine
	syncEngine := cache.NewSyncEngine(backend, sdkClient, cache.DefaultSyncConfig())
	if err := syncEngine.Start(); err != nil {
		return nil, fmt.Errorf("starting sync engine: %w", err)
	}

	// Create cached client
	cachedClient := cache.NewCachedClient(backend, sdkClient, &cache.CachedClientConfig{
		TTL:        0, // No expiration, rely on SSE
		EnableSync: true,
	})

	return &Bridge{
		ID:           cfg.ID,
		Name:         cfg.Name,
		IP:           cfg.IP,
		SDKClient:    sdkClient,
		CachedClient: cachedClient,
		Backend:      backend,
		SyncEngine:   syncEngine,
		Manager:      cacheManager,
		Connected:    true,
		LastSeen:     time.Now(),
	}, nil
}

// GetBridge returns a bridge by ID
func (m *Manager) GetBridge(id string) (*Bridge, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	bridge, ok := m.bridges[id]
	if !ok {
		return nil, fmt.Errorf("bridge %q not found", id)
	}

	return bridge, nil
}

// GetDefaultBridge returns the first enabled bridge
func (m *Manager) GetDefaultBridge() (*Bridge, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, bridge := range m.bridges {
		if bridge.Connected {
			return bridge, nil
		}
	}

	return nil, fmt.Errorf("no connected bridges available")
}

// ListBridges returns all bridges
func (m *Manager) ListBridges() []*Bridge {
	m.mu.RLock()
	defer m.mu.RUnlock()

	bridges := make([]*Bridge, 0, len(m.bridges))
	for _, bridge := range m.bridges {
		bridges = append(bridges, bridge)
	}

	return bridges
}

// GetBridgesStatus returns status of all bridges as JSON
func (m *Manager) GetBridgesStatus() (string, error) {
	bridges := m.ListBridges()

	type bridgeStatus struct {
		ID        string    `json:"id"`
		Name      string    `json:"name"`
		IP        string    `json:"ip"`
		Connected bool      `json:"connected"`
		LastSeen  time.Time `json:"last_seen"`
		Error     string    `json:"error,omitempty"`
	}

	statuses := make([]bridgeStatus, len(bridges))
	for i, bridge := range bridges {
		status := bridgeStatus{
			ID:        bridge.ID,
			Name:      bridge.Name,
			IP:        bridge.IP,
			Connected: bridge.Connected,
			LastSeen:  bridge.LastSeen,
		}
		if bridge.Error != nil {
			status.Error = bridge.Error.Error()
		}
		statuses[i] = status
	}

	data, err := json.MarshalIndent(statuses, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshaling status: %w", err)
	}

	return string(data), nil
}

// GetDeviceInventory returns device inventory across all bridges as JSON
func (m *Manager) GetDeviceInventory() (string, error) {
	bridges := m.ListBridges()

	type inventory struct {
		BridgeID   string   `json:"bridge_id"`
		BridgeName string   `json:"bridge_name"`
		Lights     int      `json:"lights"`
		Rooms      int      `json:"rooms"`
		Zones      int      `json:"zones"`
		Scenes     int      `json:"scenes"`
	}

	inventories := make([]inventory, 0, len(bridges))
	for _, bridge := range bridges {
		if !bridge.Connected {
			continue
		}

		counts, err := bridge.Manager.CountByType(context.Background())
		if err != nil {
			continue
		}

		inventories = append(inventories, inventory{
			BridgeID:   bridge.ID,
			BridgeName: bridge.Name,
			Lights:     counts.Lights,
			Rooms:      counts.Rooms,
			Zones:      counts.Zones,
			Scenes:     counts.Scenes,
		})
	}

	data, err := json.MarshalIndent(inventories, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshaling inventory: %w", err)
	}

	return string(data), nil
}

// GetRooms returns all rooms across all bridges as JSON
func (m *Manager) GetRooms() (string, error) {
	bridges := m.ListBridges()
	ctx := context.Background()

	type roomInfo struct {
		BridgeID   string `json:"bridge_id"`
		BridgeName string `json:"bridge_name"`
		ID         string `json:"id"`
		Name       string `json:"name"`
		Type       string `json:"type"`
	}

	var allRooms []roomInfo

	for _, bridge := range bridges {
		if !bridge.Connected {
			continue
		}

		rooms, err := bridge.CachedClient.Rooms().List(ctx)
		if err != nil {
			continue
		}

		for _, room := range rooms {
			allRooms = append(allRooms, roomInfo{
				BridgeID:   bridge.ID,
				BridgeName: bridge.Name,
				ID:         room.ID,
				Name:       room.Metadata.Name,
				Type:       room.Type,
			})
		}
	}

	data, err := json.MarshalIndent(allRooms, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshaling rooms: %w", err)
	}

	return string(data), nil
}

// GetScenes returns all scenes across all bridges as JSON
func (m *Manager) GetScenes() (string, error) {
	bridges := m.ListBridges()
	ctx := context.Background()

	type sceneInfo struct {
		BridgeID   string `json:"bridge_id"`
		BridgeName string `json:"bridge_name"`
		ID         string `json:"id"`
		Name       string `json:"name"`
		Type       string `json:"type"`
	}

	var allScenes []sceneInfo

	for _, bridge := range bridges {
		if !bridge.Connected {
			continue
		}

		scenes, err := bridge.CachedClient.Scenes().List(ctx)
		if err != nil {
			continue
		}

		for _, scene := range scenes {
			allScenes = append(allScenes, sceneInfo{
				BridgeID:   bridge.ID,
				BridgeName: bridge.Name,
				ID:         scene.ID,
				Name:       scene.Metadata.Name,
				Type:       scene.Type,
			})
		}
	}

	data, err := json.MarshalIndent(allScenes, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshaling scenes: %w", err)
	}

	return string(data), nil
}

// Close closes all bridge connections and saves cache
func (m *Manager) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	var errs []error
	for _, bridge := range m.bridges {
		if bridge.SyncEngine != nil {
			bridge.SyncEngine.Stop()
		}
		if bridge.Backend != nil {
			if err := bridge.Backend.Close(); err != nil {
				errs = append(errs, fmt.Errorf("closing backend for %s: %w", bridge.Name, err))
			}
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("errors closing bridges: %v", errs)
	}

	return nil
}
