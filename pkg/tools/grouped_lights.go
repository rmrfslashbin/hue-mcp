package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/rmrfslashbin/hue-mcp/pkg/bridge"
	"github.com/rmrfslashbin/hue-sdk/resources"
)

// RegisterGroupedLightTools registers all grouped light (room/zone) control tools
func RegisterGroupedLightTools(s *server.MCPServer, bm *bridge.Manager) {
	// list_grouped_lights tool
	s.AddTool(
		mcp.Tool{
			Name:        "list_grouped_lights",
			Description: "List all grouped lights (rooms and zones). Each grouped light controls all lights in a room or zone simultaneously.",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional bridge ID. If not provided, lists grouped lights from all bridges",
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

			type groupedLightInfo struct {
				BridgeID   string  `json:"bridge_id"`
				BridgeName string  `json:"bridge_name"`
				ID         string  `json:"id"`
				OwnerID    string  `json:"owner_id"`
				OwnerType  string  `json:"owner_type"`
				On         bool    `json:"on"`
				Brightness float64 `json:"brightness,omitempty"`
			}

			var allGroupedLights []groupedLightInfo

			for _, br := range bridges {
				if !br.Connected {
					continue
				}

				groupedLights, err := br.CachedClient.GroupedLights().List(ctx)
				if err != nil {
					continue
				}

				for _, gl := range groupedLights {
					info := groupedLightInfo{
						BridgeID:   br.ID,
						BridgeName: br.Name,
						ID:         gl.ID,
						OwnerID:    gl.Owner.RID,
						OwnerType:  gl.Owner.RType,
						On:         gl.On.On,
					}
					if gl.Dimming != nil {
						info.Brightness = gl.Dimming.Brightness
					}
					allGroupedLights = append(allGroupedLights, info)
				}
			}

			data, err := json.MarshalIndent(allGroupedLights, "", "  ")
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to marshal grouped lights: %v", err)), nil
			}

			return mcp.NewToolResultText(string(data)), nil
		},
	)

	// get_grouped_light tool
	s.AddTool(
		mcp.Tool{
			Name:        "get_grouped_light",
			Description: "Get detailed information about a specific grouped light (room or zone group)",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"grouped_light_id": map[string]interface{}{
						"type":        "string",
						"description": "The grouped light ID",
					},
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional bridge ID. Uses default bridge if not provided",
					},
				},
				Required: []string{"grouped_light_id"},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			groupedLightID, err := request.RequireString("grouped_light_id")
			if err != nil {
				return mcp.NewToolResultError("grouped_light_id is required"), nil
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

			groupedLight, err := br.CachedClient.GroupedLights().Get(ctx, groupedLightID)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to get grouped light: %v", err)), nil
			}

			data, err := json.MarshalIndent(groupedLight, "", "  ")
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to marshal grouped light: %v", err)), nil
			}

			return mcp.NewToolResultText(string(data)), nil
		},
	)

	// control_room_lights tool (using grouped light ID)
	s.AddTool(
		mcp.Tool{
			Name:        "control_room_lights",
			Description: "Control all lights in a room or zone simultaneously. All lights will receive the same settings. Uses the grouped_light resource.",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"grouped_light_id": map[string]interface{}{
						"type":        "string",
						"description": "The grouped light ID (get from room details or list_grouped_lights)",
					},
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional bridge ID. Uses default bridge if not provided",
					},
					"on": map[string]interface{}{
						"type":        "boolean",
						"description": "Turn all lights on or off",
					},
					"brightness": map[string]interface{}{
						"type":        "number",
						"description": "Brightness for all lights (0-100)",
						"minimum":     0,
						"maximum":     100,
					},
					"color_xy": map[string]interface{}{
						"type":        "object",
						"description": "CIE XY color coordinates for all lights",
						"properties": map[string]interface{}{
							"x": map[string]interface{}{
								"type":    "number",
								"minimum": 0,
								"maximum": 1,
							},
							"y": map[string]interface{}{
								"type":    "number",
								"minimum": 0,
								"maximum": 1,
							},
						},
						"required": []string{"x", "y"},
					},
					"color_temp": map[string]interface{}{
						"type":        "number",
						"description": "Color temperature in mirek (153-500)",
						"minimum":     153,
						"maximum":     500,
					},
					"alert": map[string]interface{}{
						"type":        "string",
						"description": "Trigger alert effect on all lights",
						"enum":        []string{"breathe"},
					},
				},
				Required: []string{"grouped_light_id"},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			groupedLightID, err := request.RequireString("grouped_light_id")
			if err != nil {
				return mcp.NewToolResultError("grouped_light_id is required"), nil
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

			// Build update request
			update := resources.GroupedLightUpdate{}
			args := request.GetArguments()

			// On/Off
			if onVal, ok := args["on"]; ok {
				if on, ok := onVal.(bool); ok {
					update.On = &resources.OnState{On: on}
				}
			}

			// Brightness
			if brightnessVal, ok := args["brightness"]; ok {
				if brightness, ok := brightnessVal.(float64); ok {
					update.Dimming = &resources.Dimming{Brightness: brightness}
				}
			}

			// Color (XY coordinates)
			if colorXYVal, ok := args["color_xy"]; ok {
				if colorMap, ok := colorXYVal.(map[string]interface{}); ok {
					x, xOk := colorMap["x"].(float64)
					y, yOk := colorMap["y"].(float64)
					if xOk && yOk {
						update.Color = &resources.Color{
							XY: resources.ColorXY{
								X: x,
								Y: y,
							},
						}
					}
				}
			}

			// Color Temperature
			if colorTempVal, ok := args["color_temp"]; ok {
				if colorTemp, ok := colorTempVal.(float64); ok {
					update.ColorTemperature = &resources.ColorTemperature{
						Mirek: int(colorTemp),
					}
				}
			}

			// Alert
			if alertVal, ok := args["alert"]; ok {
				if alert, ok := alertVal.(string); ok {
					update.Alert = &resources.AlertAction{
						Action: alert,
					}
				}
			}

			if err := br.CachedClient.GroupedLights().Update(ctx, groupedLightID, update); err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to control room lights: %v", err)), nil
			}

			return mcp.NewToolResultText(fmt.Sprintf("✅ All lights in group %s updated successfully", groupedLightID)), nil
		},
	)
}
