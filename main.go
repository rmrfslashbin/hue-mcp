package main

import (
	"context"
	"fmt"
	"log"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/rmrfslashbin/hue-mcp/pkg/bridge"
	"github.com/rmrfslashbin/hue-mcp/pkg/config"
	"github.com/rmrfslashbin/hue-mcp/pkg/tools"
)

const (
	serverName    = "hue-mcp-server"
	serverVersion = "0.1.0"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize bridge manager
	bridgeManager := bridge.NewManager(cfg)

	// Initialize all bridges
	ctx := context.Background()
	if err := bridgeManager.InitializeBridges(ctx); err != nil {
		log.Fatalf("Failed to initialize bridges: %v", err)
	}

	// Create MCP server
	mcpServer := server.NewMCPServer(
		serverName,
		serverVersion,
		server.WithToolCapabilities(true),
		server.WithResourceCapabilities(true, false),
		server.WithPromptCapabilities(true),
	)

	// Register tools
	tools.RegisterAllTools(mcpServer, bridgeManager)

	// Register resources
	registerResources(mcpServer, bridgeManager)

	// Register prompts
	registerPrompts(mcpServer)

	// Start stdio server for Claude Desktop
	if err := server.ServeStdio(mcpServer); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

// registerResources registers all MCP resources
func registerResources(s *server.MCPServer, bm *bridge.Manager) {
	// Bridge status resource
	s.AddResource(
		mcp.Resource{
			URI:         "bridges://status",
			Name:        "Bridge Status",
			Description: "Status of all configured Hue bridges",
			MIMEType:    "application/json",
		},
		func(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
			status, err := bm.GetBridgesStatus()
			if err != nil {
				return nil, err
			}
			return []mcp.ResourceContents{
				mcp.TextResourceContents{
					URI:      "bridges://status",
					MIMEType: "application/json",
					Text:     status,
				},
			}, nil
		},
	)

	// Device inventory resource
	s.AddResource(
		mcp.Resource{
			URI:         "bridges://devices",
			Name:        "Device Inventory",
			Description: "Complete device inventory across all bridges",
			MIMEType:    "application/json",
		},
		func(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
			devices, err := bm.GetDeviceInventory()
			if err != nil {
				return nil, err
			}
			return []mcp.ResourceContents{
				mcp.TextResourceContents{
					URI:      "bridges://devices",
					MIMEType: "application/json",
					Text:     devices,
				},
			}, nil
		},
	)

	// Rooms resource
	s.AddResource(
		mcp.Resource{
			URI:         "bridges://rooms",
			Name:        "Rooms",
			Description: "All rooms across all bridges",
			MIMEType:    "application/json",
		},
		func(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
			rooms, err := bm.GetRooms()
			if err != nil {
				return nil, err
			}
			return []mcp.ResourceContents{
				mcp.TextResourceContents{
					URI:      "bridges://rooms",
					MIMEType: "application/json",
					Text:     rooms,
				},
			}, nil
		},
	)

	// Scenes resource
	s.AddResource(
		mcp.Resource{
			URI:         "bridges://scenes",
			Name:        "Scenes",
			Description: "All scenes across all bridges",
			MIMEType:    "application/json",
		},
		func(ctx context.Context, request mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
			scenes, err := bm.GetScenes()
			if err != nil {
				return nil, err
			}
			return []mcp.ResourceContents{
				mcp.TextResourceContents{
					URI:      "bridges://scenes",
					MIMEType: "application/json",
					Text:     scenes,
				},
			}, nil
		},
	)
}

// registerPrompts registers all MCP prompts
func registerPrompts(s *server.MCPServer) {
	// Smart lighting suggestions prompt
	s.AddPrompt(
		mcp.Prompt{
			Name:        "smart-lighting",
			Description: "Get smart lighting suggestions based on time of day and activity",
			Arguments: []mcp.PromptArgument{
				{
					Name:        "activity",
					Description: "Current activity (e.g., working, relaxing, cooking)",
					Required:    false,
				},
			},
		},
		func(ctx context.Context, request mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
			activity := request.Params.Arguments["activity"]
			if activity == "" {
				activity = "general"
			}

			prompt := fmt.Sprintf(`I'd like lighting suggestions for %s. Please analyze my current lights and rooms, and suggest:
1. Scene adjustments for optimal lighting
2. Color temperature recommendations
3. Brightness levels
4. Which lights to turn on/off

Consider time of day, room function, and energy efficiency.`, activity)

			return &mcp.GetPromptResult{
				Messages: []mcp.PromptMessage{
					{
						Role: mcp.RoleUser,
						Content: mcp.TextContent{
							Type: "text",
							Text: prompt,
						},
					},
				},
			}, nil
		},
	)

	// Scene creation assistant prompt
	s.AddPrompt(
		mcp.Prompt{
			Name:        "create-scene",
			Description: "Interactive scene creation assistant",
			Arguments: []mcp.PromptArgument{
				{
					Name:        "scene_name",
					Description: "Name for the new scene",
					Required:    true,
				},
				{
					Name:        "room",
					Description: "Room to create scene in",
					Required:    false,
				},
			},
		},
		func(ctx context.Context, request mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
			sceneName := request.Params.Arguments["scene_name"]
			room := request.Params.Arguments["room"]

			prompt := fmt.Sprintf(`Help me create a scene called "%s"`, sceneName)
			if room != "" {
				prompt += fmt.Sprintf(` for the %s`, room)
			}
			prompt += `. Please:
1. Suggest light settings (brightness, color, temperature)
2. Recommend which lights to include
3. Propose mood and atmosphere
4. Create the scene configuration

Ask me questions if you need more details about the desired lighting.`

			return &mcp.GetPromptResult{
				Messages: []mcp.PromptMessage{
					{
						Role: mcp.RoleUser,
						Content: mcp.TextContent{
							Type: "text",
							Text: prompt,
						},
					},
				},
			}, nil
		},
	)

	// Energy usage insights prompt
	s.AddPrompt(
		mcp.Prompt{
			Name:        "energy-insights",
			Description: "Analyze lighting usage and suggest energy-saving improvements",
		},
		func(ctx context.Context, request mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
			prompt := `Analyze my current lighting setup and provide energy-saving insights:
1. Which lights are on unnecessarily
2. Brightness optimization opportunities
3. Color temperature efficiency
4. Automation suggestions for energy savings
5. Estimated energy usage

Focus on practical, implementable suggestions.`

			return &mcp.GetPromptResult{
				Messages: []mcp.PromptMessage{
					{
						Role: mcp.RoleUser,
						Content: mcp.TextContent{
							Type: "text",
							Text: prompt,
						},
					},
				},
			}, nil
		},
	)
}
