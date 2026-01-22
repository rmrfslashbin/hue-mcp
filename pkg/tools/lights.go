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

// RegisterLightTools registers all light-related tools
func RegisterLightTools(s *server.MCPServer, bm *bridge.Manager) {
	// list_lights tool
	s.AddTool(
		mcp.Tool{
			Name:        "list_lights",
			Description: "List all lights across all bridges or from a specific bridge",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional bridge ID. If not provided, lists lights from all bridges",
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

			type lightInfo struct {
				BridgeID   string  `json:"bridge_id"`
				BridgeName string  `json:"bridge_name"`
				ID         string  `json:"id"`
				Name       string  `json:"name"`
				On         bool    `json:"on"`
				Brightness float64 `json:"brightness,omitempty"`
				Type       string  `json:"type"`
			}

			var allLights []lightInfo

			for _, br := range bridges {
				if !br.Connected {
					continue
				}

				lights, err := br.CachedClient.Lights().List(ctx)
				if err != nil {
					continue
				}

				for _, light := range lights {
					info := lightInfo{
						BridgeID:   br.ID,
						BridgeName: br.Name,
						ID:         light.ID,
						Name:       light.Metadata.Name,
						On:         light.On.On,
						Type:       light.Type,
					}
					if light.Dimming != nil {
						info.Brightness = light.Dimming.Brightness
					}
					allLights = append(allLights, info)
				}
			}

			data, err := json.MarshalIndent(allLights, "", "  ")
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to marshal lights: %v", err)), nil
			}

			return mcp.NewToolResultText(string(data)), nil
		},
	)

	// get_light tool
	s.AddTool(
		mcp.Tool{
			Name:        "get_light",
			Description: "Get detailed information about a specific light",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"light_id": map[string]interface{}{
						"type":        "string",
						"description": "The light ID",
					},
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional bridge ID. Uses default bridge if not provided",
					},
				},
				Required: []string{"light_id"},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			lightID, err := request.RequireString("light_id")
			if err != nil {
				return mcp.NewToolResultError("light_id is required"), nil
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

			light, err := br.CachedClient.Lights().Get(ctx, lightID)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to get light: %v", err)), nil
			}

			data, err := json.MarshalIndent(light, "", "  ")
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to marshal light: %v", err)), nil
			}

			return mcp.NewToolResultText(string(data)), nil
		},
	)

	// control_light tool
	s.AddTool(
		mcp.Tool{
			Name:        "control_light",
			Description: "Control a light's state (on/off, brightness, color)",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"light_id": map[string]interface{}{
						"type":        "string",
						"description": "The light ID",
					},
					"on": map[string]interface{}{
						"type":        "boolean",
						"description": "Turn light on or off",
					},
					"brightness": map[string]interface{}{
						"type":        "number",
						"description": "Brightness (0-100)",
						"minimum":     0,
						"maximum":     100,
					},
					"color_temp": map[string]interface{}{
						"type":        "number",
						"description": "Color temperature in mirek (153-500)",
						"minimum":     153,
						"maximum":     500,
					},
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional bridge ID. Uses default bridge if not provided",
					},
				},
				Required: []string{"light_id"},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			lightID, err := request.RequireString("light_id")
			if err != nil {
				return mcp.NewToolResultError("light_id is required"), nil
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
			update := resources.LightUpdate{}

			// Check for on/off state
			args := request.GetArguments()
			if onVal, ok := args["on"]; ok {
				if on, ok := onVal.(bool); ok {
					update.On = &resources.OnState{On: on}
				}
			}

			// Check for brightness
			if brightnessVal, ok := args["brightness"]; ok {
				if brightness, ok := brightnessVal.(float64); ok {
					update.Dimming = &resources.Dimming{Brightness: brightness}
				}
			}

			// Check for color temperature
			if colorTempVal, ok := args["color_temp"]; ok {
				if colorTemp, ok := colorTempVal.(float64); ok {
					update.ColorTemperature = &resources.ColorTemperature{
						Mirek: int(colorTemp),
					}
				}
			}

			if err := br.CachedClient.Lights().Update(ctx, lightID, update); err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to control light: %v", err)), nil
			}

			return mcp.NewToolResultText(fmt.Sprintf("Light %s updated successfully", lightID)), nil
		},
	)
}
