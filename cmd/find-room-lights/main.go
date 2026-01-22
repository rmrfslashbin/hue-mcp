package main

import (
	"context"
	"fmt"
	"log"

	"github.com/rmrfslashbin/hue-sdk"
)

func main() {
	// Robert's Office device IDs
	targetDevices := map[string]bool{
		"6cd8124b-cfab-4c69-9dd7-486c2b20df4d": true,
		"d2dab512-0606-4aa8-9bb5-54cdb5c46492": true,
		"f97636a7-d14d-41b4-bca6-92baf4e847fe": true,
		"58c4269e-2d15-40cc-9249-5efb482f2486": true,
		"946f0ea0-048b-43cb-94da-5b7b6e099705": true,
	}

	// Create SDK client
	client, err := hue.NewClient(
		hue.WithBridgeIP("192.168.50.137"),
		hue.WithAppKey("2qicvSReKbPNRjPG7DmcVg0CbrVZykzYR5jBO5Nu"),
	)
	if err != nil {
		log.Fatalf("Failed to create client: %v", err)
	}

	// Get all lights
	ctx := context.Background()
	lights, err := client.Lights().List(ctx)
	if err != nil {
		log.Fatalf("Failed to list lights: %v", err)
	}

	// Find lights belonging to Robert's Office
	fmt.Println("Robert's Office Lights:")
	fmt.Println("=======================")
	for _, light := range lights {
		if targetDevices[light.Owner.RID] {
			fmt.Printf("Light ID: %s\n", light.ID)
			fmt.Printf("  Name: %s\n", light.Metadata.Name)
			fmt.Printf("  On: %v\n", light.On.On)
			if light.Dimming != nil {
				fmt.Printf("  Brightness: %.2f%%\n", light.Dimming.Brightness)
			}
			if light.Color != nil {
				fmt.Printf("  Current Color XY: (%.4f, %.4f)\n", light.Color.XY.X, light.Color.XY.Y)
			}
			fmt.Printf("  Owner Device: %s\n", light.Owner.RID)
			fmt.Println()
		}
	}
}
