package main

import (
	"context"
	"fmt"
	"log"

	"github.com/rmrfslashbin/hue-sdk"
	"github.com/rmrfslashbin/hue-sdk/resources"
)

func main() {
	client, err := hue.NewClient(
		hue.WithBridgeIP("192.168.50.137"),
		hue.WithAppKey("2qicvSReKbPNRjPG7DmcVg0CbrVZykzYR5jBO5Nu"),
	)
	if err != nil {
		log.Fatalf("Failed to create client: %v", err)
	}

	ctx := context.Background()

	// Update Fan 01
	fmt.Println("Updating Fan 01 to sky blue...")
	err = client.Lights().Update(ctx, "0e8a2e8c-f0c4-4878-b0b3-30db195e53af", resources.LightUpdate{
		Dimming: &resources.Dimming{Brightness: 25},
		Color: &resources.Color{
			XY: resources.ColorXY{X: 0.16, Y: 0.27},
		},
	})
	if err != nil {
		log.Printf("Fan 01 error: %v", err)
	} else {
		fmt.Println("✅ Fan 01 updated")
	}

	// Update Fan 02
	fmt.Println("Updating Fan 02 to sky blue...")
	err = client.Lights().Update(ctx, "5861792e-f431-40fa-8669-f3d144985fd6", resources.LightUpdate{
		Dimming: &resources.Dimming{Brightness: 25},
		Color: &resources.Color{
			XY: resources.ColorXY{X: 0.18, Y: 0.31},
		},
	})
	if err != nil {
		log.Printf("Fan 02 error: %v", err)
	} else {
		fmt.Println("✅ Fan 02 updated")
	}

	fmt.Println("\nAll 4 Robert's Office lights should now be varying shades of sky blue at 25% brightness!")
}
