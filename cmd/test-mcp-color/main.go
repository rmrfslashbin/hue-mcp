package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/rmrfslashbin/hue-sdk"
	"github.com/rmrfslashbin/hue-sdk/resources"
)

func main() {
	// Create SDK client
	client, err := hue.NewClient(
		hue.WithBridgeIP("192.168.50.137"),
		hue.WithAppKey("2qicvSReKbPNRjPG7DmcVg0CbrVZykzYR5jBO5Nu"),
	)
	if err != nil {
		log.Fatalf("Failed to create client: %v", err)
	}

	ctx := context.Background()
	lightID := "02311dda-a77d-4caf-9ba8-b5d08babb186"

	// Simulate MCP tool parsing
	args := map[string]interface{}{
		"light_id":   lightID,
		"brightness": 25.0,
		"color_xy": map[string]interface{}{
			"x": 0.17,
			"y": 0.3,
		},
	}

	// Build update like the MCP tool does
	update := resources.LightUpdate{}

	// Brightness
	if brightnessVal, ok := args["brightness"]; ok {
		if brightness, ok := brightnessVal.(float64); ok {
			fmt.Printf("Setting brightness: %.2f\n", brightness)
			update.Dimming = &resources.Dimming{Brightness: brightness}
		}
	}

	// Color (XY coordinates)
	if colorXYVal, ok := args["color_xy"]; ok {
		if colorMap, ok := colorXYVal.(map[string]interface{}); ok {
			x, xOk := colorMap["x"].(float64)
			y, yOk := colorMap["y"].(float64)
			if xOk && yOk {
				fmt.Printf("Setting color XY: (%.2f, %.2f)\n", x, y)
				update.Color = &resources.Color{
					XY: resources.ColorXY{
						X: x,
						Y: y,
					},
				}
			}
		}
	}

	// Show what we're sending
	updateJSON, _ := json.MarshalIndent(update, "", "  ")
	fmt.Printf("\nUpdate payload:\n%s\n\n", updateJSON)

	// Send update
	err = client.Lights().Update(ctx, lightID, update)
	if err != nil {
		log.Fatalf("Failed to update light: %v", err)
	}

	fmt.Println("✅ Update successful")

	// Get updated state
	after, err := client.Lights().Get(ctx, lightID)
	if err != nil {
		log.Fatalf("Failed to get light: %v", err)
	}
	afterJSON, _ := json.MarshalIndent(after.Color, "", "  ")
	fmt.Printf("\nAfter update color:\n%s\n", afterJSON)
}
