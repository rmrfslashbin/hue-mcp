package main

import (
	"fmt"
)

func main() {
	fmt.Println("Example: control_lights tool usage")
	fmt.Println("====================================")
	fmt.Println()
	fmt.Println("Single MCP call to set 4 lights to varying shades of sky blue:")
	fmt.Println()
	fmt.Println(`{
  "lights": [
    {
      "light_id": "90b2471c-c9b3-4878-93da-2bb392919a44",
      "brightness": 25,
      "color_xy": {"x": 0.15, "y": 0.28}
    },
    {
      "light_id": "02311dda-a77d-4caf-9ba8-b5d08babb186",
      "brightness": 30,
      "color_xy": {"x": 0.17, "y": 0.30}
    },
    {
      "light_id": "0e8a2e8c-f0c4-4878-b0b3-30db195e53af",
      "brightness": 35,
      "color_xy": {"x": 0.16, "y": 0.27}
    },
    {
      "light_id": "5861792e-f431-40fa-8669-f3d144985fd6",
      "brightness": 40,
      "color_xy": {"x": 0.18, "y": 0.31}
    }
  ]
}`)
	fmt.Println()
	fmt.Println("This replaces 4 separate control_light calls with 1 control_lights call!")
	fmt.Println()
	fmt.Println("Benefits:")
	fmt.Println("  ✓ Single MCP tool invocation")
	fmt.Println("  ✓ Each light can have unique color/brightness")
	fmt.Println("  ✓ Reduced token usage")
	fmt.Println("  ✓ Easier for AI to plan variations")
}
