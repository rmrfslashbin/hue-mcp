package tools

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/rmrfslashbin/hue-mcp/pkg/bridge"
	"github.com/rmrfslashbin/hue-sdk/resources"
)

// RegisterBulkLightTools registers bulk/multi-light control tools
func RegisterBulkLightTools(s *server.MCPServer, bm *bridge.Manager) {
	// control_lights tool (plural) - control multiple lights in one call
	s.AddTool(
		mcp.Tool{
			Name:        "control_lights",
			Description: "Control multiple lights in a single call. Each light can have different settings (color, brightness, etc). Useful for setting a room to varying colors/brightness levels.",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "Optional bridge ID. Uses default bridge if not provided",
					},
					"lights": map[string]interface{}{
						"type":        "array",
						"description": "Array of light configurations to apply",
						"items": map[string]interface{}{
							"type": "object",
							"properties": map[string]interface{}{
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
								"color_xy": map[string]interface{}{
									"type":        "object",
									"description": "CIE XY color coordinates",
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
								"effect": map[string]interface{}{
									"type":        "string",
									"description": "Light effect",
									"enum":        []string{"no_effect", "candle", "fire", "prism", "sparkle", "opal", "glisten", "underwater", "cosmos", "sunbeam", "enchant"},
								},
								"timed_effect": map[string]interface{}{
									"type":        "string",
									"description": "Timed effect (sunrise, sunset)",
									"enum":        []string{"no_effect", "sunrise", "sunset"},
								},
								"timed_effect_duration": map[string]interface{}{
									"type":        "number",
									"description": "Duration for timed effect in seconds (max 21600)",
									"minimum":     0,
									"maximum":     21600,
								},
								"alert": map[string]interface{}{
									"type":        "string",
									"description": "Trigger alert effect",
									"enum":        []string{"breathe"},
								},
								"gradient": map[string]interface{}{
									"type":        "array",
									"description": "Gradient color points (for lightstrips)",
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
							"required": []string{"light_id"},
						},
					},
				},
				Required: []string{"lights"},
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

			args := request.GetArguments()
			lightsArray, ok := args["lights"].([]interface{})
			if !ok {
				return mcp.NewToolResultError("lights parameter must be an array"), nil
			}

			var results []string
			var failures []string

			for _, lightItem := range lightsArray {
				lightConfig, ok := lightItem.(map[string]interface{})
				if !ok {
					failures = append(failures, "invalid light configuration")
					continue
				}

				lightID, ok := lightConfig["light_id"].(string)
				if !ok || lightID == "" {
					failures = append(failures, "missing light_id")
					continue
				}

				// Build update for this light
				update := resources.LightUpdate{}

				// On/Off
				if onVal, ok := lightConfig["on"]; ok {
					if on, ok := onVal.(bool); ok {
						update.On = &resources.OnState{On: on}
					}
				}

				// Brightness
				if brightnessVal, ok := lightConfig["brightness"]; ok {
					if brightness, ok := brightnessVal.(float64); ok {
						update.Dimming = &resources.Dimming{Brightness: brightness}
					}
				}

				// Color (XY coordinates)
				if colorXYVal, ok := lightConfig["color_xy"]; ok {
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
				if colorTempVal, ok := lightConfig["color_temp"]; ok {
					if colorTemp, ok := colorTempVal.(float64); ok {
						update.ColorTemperature = &resources.ColorTemperature{
							Mirek: int(colorTemp),
						}
					}
				}

				// Effects
				if effectVal, ok := lightConfig["effect"]; ok {
					if effect, ok := effectVal.(string); ok {
						update.Effects = &resources.EffectsUpdate{
							Effect: effect,
						}
					}
				}

				// Timed Effects
				if timedEffectVal, ok := lightConfig["timed_effect"]; ok {
					if timedEffect, ok := timedEffectVal.(string); ok {
						timedEffects := &resources.TimedEffects{
							Effect: timedEffect,
						}

						if durationVal, ok := lightConfig["timed_effect_duration"]; ok {
							if duration, ok := durationVal.(float64); ok {
								durationMs := int(duration * 1000)
								timedEffects.Duration = &durationMs
							}
						}

						update.TimedEffects = timedEffects
					}
				}

				// Alert
				if alertVal, ok := lightConfig["alert"]; ok {
					if alert, ok := alertVal.(string); ok {
						update.Alert = &resources.AlertAction{
							Action: alert,
						}
					}
				}

				// Gradient
				if gradientVal, ok := lightConfig["gradient"]; ok {
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

				// Apply update
				if err := br.CachedClient.Lights().Update(ctx, lightID, update); err != nil {
					failures = append(failures, fmt.Sprintf("Light %s: %v", lightID, err))
				} else {
					results = append(results, lightID)
				}
			}

			// Build response
			summary := fmt.Sprintf("✅ Successfully updated %d light(s)", len(results))
			if len(failures) > 0 {
				summary += fmt.Sprintf("\n❌ %d failure(s):", len(failures))
				for _, failure := range failures {
					summary += fmt.Sprintf("\n  - %s", failure)
				}
			}

			return mcp.NewToolResultText(summary), nil
		},
	)
}
