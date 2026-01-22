package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/rmrfslashbin/hue-mcp/pkg/bridge"
)

// RegisterRoomTools registers all room-related tools
func RegisterRoomTools(s *server.MCPServer, bm *bridge.Manager) {
	// list_rooms tool
	s.AddTool(
		mcp.Tool{
			Name:        "list_rooms",
			Description: "List all rooms across all bridges or from a specific bridge",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional bridge ID. If not provided, lists rooms from all bridges",
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

			type roomInfo struct {
				BridgeID   string `json:"bridge_id"`
				BridgeName string `json:"bridge_name"`
				ID         string `json:"id"`
				Name       string `json:"name"`
				Type       string `json:"type"`
			}

			var allRooms []roomInfo

			for _, br := range bridges {
				if !br.Connected {
					continue
				}

				rooms, err := br.CachedClient.Rooms().List(ctx)
				if err != nil {
					continue
				}

				for _, room := range rooms {
					allRooms = append(allRooms, roomInfo{
						BridgeID:   br.ID,
						BridgeName: br.Name,
						ID:         room.ID,
						Name:       room.Metadata.Name,
						Type:       room.Type,
					})
				}
			}

			data, err := json.MarshalIndent(allRooms, "", "  ")
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to marshal rooms: %v", err)), nil
			}

			return mcp.NewToolResultText(string(data)), nil
		},
	)

	// get_room tool
	s.AddTool(
		mcp.Tool{
			Name:        "get_room",
			Description: "Get detailed information about a specific room",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"room_id": map[string]interface{}{
						"type":        "string",
						"description": "The room ID",
					},
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional bridge ID. Uses default bridge if not provided",
					},
				},
				Required: []string{"room_id"},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			roomID, err := request.RequireString("room_id")
			if err != nil {
				return mcp.NewToolResultError("room_id is required"), nil
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

			room, err := br.CachedClient.Rooms().Get(ctx, roomID)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to get room: %v", err)), nil
			}

			data, err := json.MarshalIndent(room, "", "  ")
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to marshal room: %v", err)), nil
			}

			return mcp.NewToolResultText(string(data)), nil
		},
	)
}
