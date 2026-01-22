package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/rmrfslashbin/hue-mcp/pkg/bridge"
)

// RegisterBridgeTools registers all bridge-related tools
func RegisterBridgeTools(s *server.MCPServer, bm *bridge.Manager) {
	// list_bridges tool
	s.AddTool(
		mcp.Tool{
			Name:        "list_bridges",
			Description: "List all configured Hue bridges",
			InputSchema: mcp.ToolInputSchema{
				Type:       "object",
				Properties: map[string]interface{}{},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			bridges := bm.ListBridges()

			type bridgeInfo struct {
				ID        string `json:"id"`
				Name      string `json:"name"`
				IP        string `json:"ip"`
				Connected bool   `json:"connected"`
			}

			infos := make([]bridgeInfo, len(bridges))
			for i, br := range bridges {
				infos[i] = bridgeInfo{
					ID:        br.ID,
					Name:      br.Name,
					IP:        br.IP,
					Connected: br.Connected,
				}
			}

			data, err := json.MarshalIndent(infos, "", "  ")
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to marshal bridges: %v", err)), nil
			}

			return mcp.NewToolResultText(string(data)), nil
		},
	)

	// get_bridge_info tool
	s.AddTool(
		mcp.Tool{
			Name:        "get_bridge_info",
			Description: "Get detailed information about a specific bridge",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "The bridge ID. Uses default bridge if not provided",
					},
				},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			bridgeID := request.GetString("bridge_id", "")

			var br *bridge.Bridge
			var err error

			if bridgeID != "" {
				br, err = bm.GetBridge(bridgeID)
			} else {
				br, err = bm.GetDefaultBridge()
			}
			if err != nil {
				return mcp.NewToolResultError(err.Error()), nil
			}

			type bridgeDetails struct {
				ID        string `json:"id"`
				Name      string `json:"name"`
				IP        string `json:"ip"`
				Connected bool   `json:"connected"`
			}

			details := bridgeDetails{
				ID:        br.ID,
				Name:      br.Name,
				IP:        br.IP,
				Connected: br.Connected,
			}

			data, err := json.MarshalIndent(details, "", "  ")
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to marshal bridge info: %v", err)), nil
			}

			return mcp.NewToolResultText(string(data)), nil
		},
	)
}
