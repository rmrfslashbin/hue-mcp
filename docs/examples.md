# Natural Language Examples

This guide demonstrates the powerful natural language capabilities of the Hue MCP Server. These examples show how users can interact with their lighting system using intuitive, conversational commands.

## Basic Light Control

### Simple On/Off Commands

```
"Turn on the living room lights"
→ Activates all lights in the living room

"Turn off the bedroom lamp"
→ Turns off the specific bedroom lamp

"Switch on the kitchen"
→ Turns on all lights in the kitchen
```

### Brightness Control

```
"Set the desk lamp to 50%"
→ Sets desk lamp to 50% brightness

"Dim the bedroom lights"
→ Sets bedroom lights to 30% brightness

"Make the office brighter"
→ Increases office light brightness

"Set living room to 75% brightness"
→ Sets all living room lights to 75%
```

## Color Control

### Basic Colors

```
"Turn the accent light red"
→ Sets accent light to bright red

"Make the bedroom blue"
→ Sets bedroom lights to blue

"Set the living room to green"
→ Sets living room lights to green
```

### Color Temperature

```
"Set the office to warm white"
→ Uses warm white temperature (2700K)

"Make the reading lamp cool white"
→ Uses cool white temperature (5500K)

"Turn the bedroom to candlelight"
→ Very warm temperature (2000K)

"Set the kitchen to daylight"
→ Cool daylight temperature (6500K)
```

### Advanced Color Descriptions

```
"Set the living room to stormy dusk"
→ Deep blue-purple with low brightness (h:250, s:35, v:25)

"Turn the bedroom to sunrise colors"
→ Orange-yellow with medium brightness (h:30, s:60, v:90)

"Make the office like ocean water"
→ Blue-cyan colors (h:200, s:70, v:60)

"Set the accent light to fire colors"
→ Red-orange with high saturation (h:10, s:90, v:90)
```

## Room and Zone Control

### Entire Room Control

```
"Turn the living room to movie mode"
→ Dims all living room lights for comfortable viewing

"Set the bedroom to relaxing mode"
→ Warm, dim lighting for relaxation

"Make the office energizing"
→ Bright, cool white lighting for productivity

"Turn the kitchen to cooking mode"
→ Bright, neutral lighting for tasks
```

### Multiple Room Commands

```
"Turn off all the lights"
→ Turns off every light in the house

"Set the downstairs to 30%"
→ Dims all downstairs lights to 30%

"Make the upstairs warm and cozy"
→ Sets upstairs to warm white at moderate brightness
```

## Scene Control

### Scene Activation

```
"Activate the dinner scene"
→ Activates predefined dinner scene

"Turn on the party lights"
→ Activates party scene if available

"Set the house to sleep mode"
→ Activates bedtime scene

"Switch to reading mode"
→ Activates reading scene
```

### Scene Discovery

```
"What scenes are available?"
→ Lists all available scenes

"Show me the living room scenes"
→ Lists scenes available for the living room

"What relaxing scenes do I have?"
→ Lists scenes with "relax" in the name
```

## Advanced Natural Language

### Complex Color Combinations

```
"Set the living room to a stormy evening atmosphere"
→ Deep blues and purples with low brightness

"Make the bedroom like a warm sunset"
→ Orange-pink gradient with medium brightness

"Turn the office to crisp morning light"
→ Cool white with high brightness

"Set the dining room to candlelit dinner ambiance"
→ Very warm white at low brightness
```

### Transition Specifications

```
"Slowly turn the bedroom to warm white"
→ 3-second transition to warm white

"Quickly flash the living room red"
→ Fast transition to red

"Gradually dim the office lights"
→ Slow transition to lower brightness

"Immediately turn off all lights"
→ Instant transition to off
```

### Conditional and Contextual Commands

```
"If anyone is still awake, dim the living room to 20%"
→ Conditional lighting based on context

"Set the lights for a romantic dinner"
→ Warm, dim lighting appropriate for the context

"Prepare the office for a video call"
→ Bright, even lighting for professional appearance

"Set up reading lights in the bedroom"
→ Focused, comfortable lighting for reading
```

## Time-Based and Adaptive Commands

### Time of Day Awareness

```
"Set appropriate evening lighting"
→ Warm, moderate lighting suitable for evening

"Turn on morning lights"
→ Bright, cool lighting to help wake up

"Set bedtime lighting"
→ Very dim, warm lighting for sleep preparation

"Activate daytime mode"
→ Bright, neutral lighting for daytime activities
```

### Activity-Based Lighting

```
"Set lights for working from home"
→ Bright, focused lighting for productivity

"Prepare lighting for watching TV"
→ Dim ambient lighting to reduce screen glare

"Set up party atmosphere"
→ Colorful, dynamic lighting for entertainment

"Create a spa-like atmosphere"
→ Soft, warm lighting for relaxation
```

## Information and Status Queries

### System Overview

```
"What's the status of my lights?"
→ Comprehensive system summary

"How many lights are currently on?"
→ Count of active lights

"Show me all my rooms"
→ List of all configured rooms

"What lights are unreachable?"
→ List of lights with connectivity issues
```

### Specific Light Information

```
"Tell me about the kitchen lights"
→ Detailed information about kitchen lighting

"What color is the accent light?"
→ Current color and brightness of specific light

"Is the bedroom lamp reachable?"
→ Connection status of specific light

"Show me the living room light states"
→ Current state of all living room lights
```

## Energy and Efficiency Commands

### Energy Management

```
"Turn off any lights that aren't needed"
→ Intelligent power management

"Show me which lights are using the most energy"
→ Brightness analysis for energy optimization

"Set eco-friendly lighting throughout the house"
→ Optimized lighting for energy efficiency

"What's my current energy usage for lighting?"
→ Power consumption overview
```

### Optimization Suggestions

```
"How can I save energy with my lighting?"
→ Personalized energy-saving recommendations

"What lights should I turn off when leaving?"
→ Smart suggestions for departure

"Optimize my lighting for sleep"
→ Circadian rhythm-friendly settings
```

## Error Recovery and Fallbacks

### Graceful Error Handling

```
User: "Turn on the kitchen light"
System: No specific "kitchen light" found
Response: "I found 3 lights in the kitchen. Would you like me to turn them all on?"

User: "Set the nonexistent room to blue"
System: Room not found
Response: "I couldn't find that room. Here are your available rooms: Living Room, Bedroom, Kitchen, Office"

User: "Activate the party scene"
System: Scene not found
Response: "I couldn't find a 'party' scene. Here are your available scenes: Energize, Relax, Concentrate, Bright"
```

### Clarification Requests

```
User: "Turn on the lamp"
System: Multiple lamps found
Response: "I found 3 lamps. Which one? Bedside Lamp, Desk Lamp, or Floor Lamp?"

User: "Make it warmer"
System: Ambiguous room context
Response: "Which room would you like me to make warmer? Or do you mean all rooms?"
```

## Best Practices for Natural Language

### Effective Command Patterns

**✅ Good Examples:**
- "Set the living room to warm white at 60%"
- "Turn the bedroom lights to a relaxing sunset color"
- "Activate the dinner scene in the dining room"
- "Slowly dim all the upstairs lights"

**❌ Avoid These Patterns:**
- "Do something with the lights" (too vague)
- "Change light 1 to hue 180 saturation 75" (too technical)
- "Make it nice" (no specific intent)

### Tips for Better Interactions

1. **Be Specific**: Mention room names or light names when possible
2. **Use Descriptive Colors**: "Stormy dusk" works better than "dark blue"
3. **Include Context**: "Reading lights" or "movie lighting" helps interpretation
4. **Combine Actions**: "Turn the living room to warm white and dim the bedroom"

### Common Synonyms and Alternatives

**Brightness:**
- "Bright" = "100%", "Full brightness", "Maximum"
- "Dim" = "30%", "Low", "Soft"
- "Medium" = "50%", "Moderate", "Half"

**Colors:**
- "Warm white" = "Cozy", "Comfortable", "Evening light"
- "Cool white" = "Daylight", "Crisp", "Bright white"
- "Red" = "Rose", "Crimson", "Cherry"

**Actions:**
- "Turn on" = "Switch on", "Activate", "Light up"
- "Turn off" = "Switch off", "Deactivate", "Shut off"
- "Set to" = "Change to", "Make", "Adjust to"

This natural language processing makes the Hue MCP Server incredibly intuitive to use, allowing users to control their lighting with the same ease as talking to a friend about their preferences.