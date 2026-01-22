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
	lightID := "90b2471c-c9b3-4878-93da-2bb392919a44"

	// Get current state
	fmt.Println("BEFORE UPDATE:")
	before, err := client.Lights().Get(ctx, lightID)
	if err != nil {
		log.Fatalf("Failed to get light: %v", err)
	}
	beforeJSON, _ := json.MarshalIndent(before.Color, "", "  ")
	fmt.Printf("Color: %s\n\n", beforeJSON)

	// Update to sky blue
	update := resources.LightUpdate{
		Color: &resources.Color{
			XY: resources.ColorXY{
				X: 0.15,
				Y: 0.28,
			},
		},
	}

	fmt.Println("Sending update...")
	updateJSON, _ := json.MarshalIndent(update, "", "  ")
	fmt.Printf("Update payload: %s\n\n", updateJSON)

	err = client.Lights().Update(ctx, lightID, update)
	if err != nil {
		log.Fatalf("Failed to update light: %v", err)
	}

	// Get updated state
	fmt.Println("AFTER UPDATE:")
	after, err := client.Lights().Get(ctx, lightID)
	if err != nil {
		log.Fatalf("Failed to get light: %v", err)
	}
	afterJSON, _ := json.MarshalIndent(after.Color, "", "  ")
	fmt.Printf("Color: %s\n", afterJSON)
}
