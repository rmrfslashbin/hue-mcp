# Atmospheric Light Variation

> Create immersive, realistic lighting scenes with automatic individual light variations

## Overview

The Hue MCP Server includes an intelligent atmospheric variation system that automatically applies subtle differences to each light in a room when creating mood-based scenes. This creates more natural and immersive lighting environments compared to uniform room control.

## How It Works

### Automatic Detection

The system automatically detects when to apply variations based on keywords in your natural language commands:

**Atmospheric Keywords** that trigger variation:
- Weather: `stormy`, `storm`, `thunderstorm`, `lightning`
- Time of day: `sunset`, `sunrise`, `dawn`, `dusk`, `twilight`, `evening`, `night`
- Fire effects: `fire`, `fireplace`, `campfire`, `candle`, `candlelight`
- Nature: `ocean`, `forest`, `nature`, `atmospheric`
- Moods: `moody`, `romantic`, `cozy`, `dreamy`
- Special effects: `aurora`, `galaxy`, `cosmic`

### Manual Control

You can explicitly control variation using the `useVariation` parameter:

```json
{
  "roomId": "84",
  "naturalLanguage": "warm blue lights",
  "useVariation": true
}
```

## Variation Algorithm

Each light receives randomized variations within these ranges:

### Color Variations
- **Hue**: ±15° variation
  - Creates subtle color temperature differences
  - Example: Base 240° → Light 1: 235°, Light 2: 248°, Light 3: 242°

### Intensity Variations  
- **Saturation**: ±10% variation
  - Adds depth and richness differences
  - Example: Base 20% → Light 1: 18%, Light 2: 25%, Light 3: 21%

- **Brightness**: ±20% variation
  - Creates natural intensity differences
  - Example: Base 30% → Light 1: 25%, Light 2: 38%, Light 3: 22%

### Temperature Variations
- **Color Temperature**: ±50 mireds variation
  - Varies warmth across lights
  - Example: Base 366 → Light 1: 340, Light 2: 390, Light 3: 365

### Timing Variations
- **Transition Time**: +0-1000ms variation
  - Creates organic, non-synchronized transitions
  - Prevents artificial "all at once" changes

## Examples

### Thunderstorm Scene
```
Command: "Set living room to thunderstormy afternoon"

Result:
- Light 1: Deep blue (240°), 16% saturation, 38% brightness
- Light 2: Purple-blue (250°), 11% saturation, 11% brightness  
- Light 3: Blue (234°), 25% saturation, 34% brightness
- Light 4: Blue-purple (248°), 13% saturation, 47% brightness
```

### Sunset Scene
```
Command: "Create a sunset mood in the bedroom"

Result:
- Light 1: Orange (35°), 85% saturation, 65% brightness
- Light 2: Red-orange (25°), 92% saturation, 55% brightness
- Light 3: Yellow-orange (40°), 78% saturation, 70% brightness
- Light 4: Deep orange (30°), 88% saturation, 60% brightness
```

## Performance Considerations

### Efficiency
- **Parallel Execution**: All lights are updated simultaneously using `Promise.all()`
- **No Extra API Calls**: Uses the same number of API calls as uniform control
- **Optimistic Caching**: Cache updates happen without verification calls
- **Smart Fallback**: Reverts to uniform control if individual control fails

### When NOT to Use Variation
- Simple on/off commands
- Specific color requests (e.g., "set to red")
- Reading or work lighting
- When consistency is required

## API Response

When variation is applied, the response includes detailed information:

```json
{
  "success": true,
  "roomId": "84",
  "roomName": "Living room",
  "lightingMode": "varied_atmospheric",
  "variationUsed": true,
  "appliedStates": [
    {
      "lightId": "16",
      "variation": {
        "hue": 239.7,
        "saturation": 16.2,
        "brightness": 38.5
      }
    }
    // ... more lights
  ],
  "efficiency": "Applied 4 individual variations for atmospheric realism"
}
```

## Best Practices

1. **Let it Auto-Detect**: The system is smart about when to apply variations
2. **Trust the Randomization**: The algorithm creates pleasing, natural variations
3. **Use for Ambiance**: Best for mood lighting, not task lighting
4. **Combine with Scenes**: Create custom scenes that leverage variation

## Troubleshooting

**Variation not applying?**
- Check if your command includes atmospheric keywords
- Verify the room has multiple lights
- Ensure lights support color/brightness control

**Too much variation?**
- The ranges are carefully tuned, but you can disable with `useVariation: false`
- Use specific color commands for uniform lighting

**Performance issues?**
- Variation uses parallel execution and should be as fast as uniform control
- Check network connectivity if delays occur