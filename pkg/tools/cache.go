package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/rmrfslashbin/hue-mcp/pkg/bridge"
	"github.com/rmrfslashbin/hue-cache"
)

// RegisterCacheTools registers all cache management tools
func RegisterCacheTools(s *server.MCPServer, bm *bridge.Manager) {
	// warm_cache tool - manually trigger cache warming
	s.AddTool(
		mcp.Tool{
			Name:        "warm_cache",
			Description: "Populate/refresh the cache for one or all bridges. This fetches all data from the bridge(s) and stores it in the cache for instant access. SSE sync keeps the cache updated automatically, so you typically only need to run this once after adding a bridge.",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional bridge ID. If not provided, warms cache for all bridges",
					},
				},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			bridgeID := request.GetString("bridge_id", "")

			var bridges []*bridge.Bridge
			if bridgeID != "" {
				br, err := bm.GetBridge(bridgeID)
				if err != nil {
					return mcp.NewToolResultError(fmt.Sprintf("Bridge not found: %v", err)), nil
				}
				bridges = []*bridge.Bridge{br}
			} else {
				bridges = bm.ListBridges()
			}

			if len(bridges) == 0 {
				return mcp.NewToolResultText("No bridges configured. Use the setup tools to add a bridge first."), nil
			}

			type warmResult struct {
				BridgeID     string `json:"bridge_id"`
				BridgeName   string `json:"bridge_name"`
				TotalWarmed  int    `json:"total_warmed"`
				Duration     string `json:"duration"`
				Success      bool   `json:"success"`
				Error        string `json:"error,omitempty"`
			}

			var results []warmResult

			for _, br := range bridges {
				if !br.Connected {
					results = append(results, warmResult{
						BridgeID:   br.ID,
						BridgeName: br.Name,
						Success:    false,
						Error:      "bridge not connected",
					})
					continue
				}

				warmConfig := cache.DefaultWarmConfig()
				stats, err := br.Manager.WarmCache(ctx, warmConfig)

				result := warmResult{
					BridgeID:   br.ID,
					BridgeName: br.Name,
					Success:    err == nil,
				}

				if err != nil {
					result.Error = err.Error()
				} else {
					result.TotalWarmed = stats.TotalWarmed
					result.Duration = stats.Duration.String()
				}

				results = append(results, result)
			}

			data, err := json.MarshalIndent(results, "", "  ")
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to format results: %v", err)), nil
			}

			summary := fmt.Sprintf("✅ Cache warming complete for %d bridge(s):\n\n%s\n\n"+
				"Note: SSE sync is running automatically to keep the cache updated in real-time.",
				len(results), string(data))

			return mcp.NewToolResultText(summary), nil
		},
	)

	// cache_stats tool - show cache statistics
	s.AddTool(
		mcp.Tool{
			Name:        "cache_stats",
			Description: "Show cache statistics for all bridges (entry counts, hit rates, sync status, etc). Use this to verify the cache is working and SSE sync is active.",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional bridge ID. If not provided, shows stats for all bridges",
					},
				},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			bridgeID := request.GetString("bridge_id", "")

			var bridges []*bridge.Bridge
			if bridgeID != "" {
				br, err := bm.GetBridge(bridgeID)
				if err != nil {
					return mcp.NewToolResultError(fmt.Sprintf("Bridge not found: %v", err)), nil
				}
				bridges = []*bridge.Bridge{br}
			} else {
				bridges = bm.ListBridges()
			}

			if len(bridges) == 0 {
				return mcp.NewToolResultText("No bridges configured. Use the setup tools to add a bridge first."), nil
			}

			type bridgeStats struct {
				BridgeID      string `json:"bridge_id"`
				BridgeName    string `json:"bridge_name"`
				Connected     bool   `json:"connected"`
				SSESyncActive bool   `json:"sse_sync_active"`
				TotalEntries  int    `json:"total_entries"`
				HitRate       string `json:"hit_rate,omitempty"`
				Error         string `json:"error,omitempty"`
			}

			var allStats []bridgeStats

			for _, br := range bridges {
				stat := bridgeStats{
					BridgeID:      br.ID,
					BridgeName:    br.Name,
					Connected:     br.Connected,
					SSESyncActive: br.SyncEngine != nil,
				}

				if br.Connected && br.Manager != nil {
					cacheStats, err := br.Manager.GetStats(ctx)
					if err != nil {
						stat.Error = err.Error()
					} else {
						stat.TotalEntries = int(cacheStats.Entries)
						totalRequests := cacheStats.Hits + cacheStats.Misses
						if totalRequests > 0 {
							hitRate := float64(cacheStats.Hits) / float64(totalRequests) * 100
							stat.HitRate = fmt.Sprintf("%.1f%% (%d hits, %d misses)", hitRate, cacheStats.Hits, cacheStats.Misses)
						}
					}
				}

				allStats = append(allStats, stat)
			}

			data, err := json.MarshalIndent(allStats, "", "  ")
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to format stats: %v", err)), nil
			}

			return mcp.NewToolResultText(string(data)), nil
		},
	)
}
