package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/rmrfslashbin/hue-mcp/pkg/bridge"
)

// RegisterSceneTools registers all scene-related tools
func RegisterSceneTools(s *server.MCPServer, bm *bridge.Manager) {
	// list_scenes tool
	s.AddTool(
		mcp.Tool{
			Name:        "list_scenes",
			Description: "List all scenes across all bridges or from a specific bridge",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional bridge ID. If not provided, lists scenes from all bridges",
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
					return mcp.NewToolResultError(err.Error()), nil
				}
				bridges = []*bridge.Bridge{br}
			} else {
				bridges = bm.ListBridges()
			}

			type sceneInfo struct {
				BridgeID   string `json:"bridge_id"`
				BridgeName string `json:"bridge_name"`
				ID         string `json:"id"`
				Name       string `json:"name"`
				Type       string `json:"type"`
			}

			var allScenes []sceneInfo

			for _, br := range bridges {
				if !br.Connected {
					continue
				}

				scenes, err := br.CachedClient.Scenes().List(ctx)
				if err != nil {
					continue
				}

				for _, scene := range scenes {
					allScenes = append(allScenes, sceneInfo{
						BridgeID:   br.ID,
						BridgeName: br.Name,
						ID:         scene.ID,
						Name:       scene.Metadata.Name,
						Type:       scene.Type,
					})
				}
			}

			data, err := json.MarshalIndent(allScenes, "", "  ")
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to marshal scenes: %v", err)), nil
			}

			return mcp.NewToolResultText(string(data)), nil
		},
	)

	// get_scene tool
	s.AddTool(
		mcp.Tool{
			Name:        "get_scene",
			Description: "Get detailed information about a specific scene",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"scene_id": map[string]interface{}{
						"type":        "string",
						"description": "The scene ID",
					},
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional bridge ID. Uses default bridge if not provided",
					},
				},
				Required: []string{"scene_id"},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			sceneID, err := request.RequireString("scene_id")
			if err != nil {
				return mcp.NewToolResultError("scene_id is required"), nil
			}

			bridgeID := request.GetString("bridge_id", "")
			var br *bridge.Bridge

			if bridgeID != "" {
				br, err = bm.GetBridge(bridgeID)
			} else {
				br, err = bm.GetDefaultBridge()
			}
			if err != nil {
				return mcp.NewToolResultError(err.Error()), nil
			}

			scene, err := br.CachedClient.Scenes().Get(ctx, sceneID)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to get scene: %v", err)), nil
			}

			data, err := json.MarshalIndent(scene, "", "  ")
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to marshal scene: %v", err)), nil
			}

			return mcp.NewToolResultText(string(data)), nil
		},
	)
}
