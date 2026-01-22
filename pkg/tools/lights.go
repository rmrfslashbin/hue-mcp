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

	// control_light tool - comprehensive light control
	s.AddTool(
		mcp.Tool{
			Name:        "control_light",
			Description: "Control all aspects of a light: on/off, brightness, color (XY coordinates), color temperature, effects, gradients, and more",
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
					"color_xy": map[string]interface{}{
						"type":        "object",
						"description": "CIE XY color coordinates for full RGB color control",
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
						"description": "Color temperature in mirek (153-500). Lower=cooler/bluer, higher=warmer",
						"minimum":     153,
						"maximum":     500,
					},
					"effect": map[string]interface{}{
						"type":        "string",
						"description": "Light effect to activate",
						"enum":        []string{"no_effect", "candle", "fire", "prism", "sparkle", "opal", "glisten", "underwater", "cosmos", "sunbeam", "enchant"},
					},
					"timed_effect": map[string]interface{}{
						"type":        "string",
						"description": "Timed effect to activate (sunrise, sunset)",
						"enum":        []string{"no_effect", "sunrise", "sunset"},
					},
					"timed_effect_duration": map[string]interface{}{
						"type":        "number",
						"description": "Duration for timed effect in seconds (max 21600 / 6 hours)",
						"minimum":     0,
						"maximum":     21600,
					},
					"alert": map[string]interface{}{
						"type":        "string",
						"description": "Trigger alert effect (makes light breathe)",
						"enum":        []string{"breathe"},
					},
					"gradient": map[string]interface{}{
						"type":        "array",
						"description": "Gradient color points (for lightstrips). Array of XY color coordinates",
						"items": map[string]interface{}{
							"type": "object",
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

			// Effects
			if effectVal, ok := args["effect"]; ok {
				if effect, ok := effectVal.(string); ok {
					update.Effects = &resources.EffectsUpdate{
						Effect: effect,
					}
				}
			}

			// Timed Effects
			if timedEffectVal, ok := args["timed_effect"]; ok {
				if timedEffect, ok := timedEffectVal.(string); ok {
					timedEffects := &resources.TimedEffects{
						Effect: timedEffect,
					}

					// Duration (optional, in seconds - convert to milliseconds)
					if durationVal, ok := args["timed_effect_duration"]; ok {
						if duration, ok := durationVal.(float64); ok {
							durationMs := int(duration * 1000)
							timedEffects.Duration = &durationMs
						}
					}

					update.TimedEffects = timedEffects
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

			// Gradient (for lightstrips)
			if gradientVal, ok := args["gradient"]; ok {
				if gradientArray, ok := gradientVal.([]interface{}); ok {
					var points []resources.GradientPoint
					for _, point := range gradientArray {
						if pointMap, ok := point.(map[string]interface{}); ok {
							x, xOk := pointMap["x"].(float64)
							y, yOk := pointMap["y"].(float64)
							if xOk && yOk {
								points = append(points, resources.GradientPoint{
									Color: resources.Color{
										XY: resources.ColorXY{
											X: x,
											Y: y,
										},
									},
								})
							}
						}
					}
					if len(points) > 0 {
						update.Gradient = &resources.Gradient{
							Points: points,
						}
					}
				}
			}

			if err := br.CachedClient.Lights().Update(ctx, lightID, update); err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to control light: %v", err)), nil
			}

			return mcp.NewToolResultText(fmt.Sprintf("✅ Light %s updated successfully", lightID)), nil
		},
	)
}
