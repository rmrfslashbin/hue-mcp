package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/rmrfslashbin/hue-mcp/pkg/bridge"
	"github.com/rmrfslashbin/hue-mcp/pkg/config"
	hue "github.com/rmrfslashbin/hue-sdk"
)

// DiscoveredBridge represents a bridge found via discovery
type DiscoveredBridge struct {
	ID                string `json:"id"`
	InternalIPAddress string `json:"internalipaddress"`
	Port              int    `json:"port,omitempty"`
	Name              string `json:"name,omitempty"`
}

// RegisterSetupTools registers all setup wizard tools
func RegisterSetupTools(s *server.MCPServer, bm *bridge.Manager, cfg *config.Config) {
	// discover_bridges tool - uses Philips discovery.meethue.com (N-UPnP)
	s.AddTool(
		mcp.Tool{
			Name:        "discover_bridges",
			Description: "Discover Philips Hue bridges on your network using the Philips discovery service. This is the recommended discovery method.",
			InputSchema: mcp.ToolInputSchema{
				Type:       "object",
				Properties: map[string]interface{}{},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			// Use Philips discovery service (N-UPnP)
			discoveryURL := "https://discovery.meethue.com/"

			client := &http.Client{Timeout: 10 * time.Second}
			req, err := http.NewRequestWithContext(ctx, "GET", discoveryURL, nil)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to create discovery request: %v", err)), nil
			}

			resp, err := client.Do(req)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to discover bridges: %v", err)), nil
			}
			defer resp.Body.Close()

			body, err := io.ReadAll(resp.Body)
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to read discovery response: %v", err)), nil
			}

			var bridges []DiscoveredBridge
			if err := json.Unmarshal(body, &bridges); err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to parse discovery response: %v", err)), nil
			}

			if len(bridges) == 0 {
				return mcp.NewToolResultText("No bridges found. Please ensure:\n" +
					"1. Your bridge is powered on and connected to your network\n" +
					"2. Your bridge has internet connectivity for cloud discovery\n" +
					"3. You're on the same network as your bridge"), nil
			}

			// Format results
			type formattedBridge struct {
				ID   string `json:"id"`
				IP   string `json:"ip_address"`
				Name string `json:"name,omitempty"`
			}

			var formatted []formattedBridge
			for _, b := range bridges {
				formatted = append(formatted, formattedBridge{
					ID:   b.ID,
					IP:   b.InternalIPAddress,
					Name: b.Name,
				})
			}

			data, err := json.MarshalIndent(formatted, "", "  ")
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to format results: %v", err)), nil
			}

			result := fmt.Sprintf("Found %d bridge(s):\n\n%s\n\n"+
				"Next step: Use authenticate_bridge with the IP address to get an app key.",
				len(formatted), string(data))

			return mcp.NewToolResultText(result), nil
		},
	)

	// authenticate_bridge tool - uses SDK's Authenticate method
	s.AddTool(
		mcp.Tool{
			Name:        "authenticate_bridge",
			Description: "Authenticate with a Hue bridge. YOU MUST PRESS THE LINK BUTTON on the bridge before calling this. The link button is the round button on top of the bridge. You have 30 seconds after pressing it.",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"bridge_ip": map[string]interface{}{
						"type":        "string",
						"description": "The IP address of the bridge (from discover_bridges)",
					},
					"app_name": map[string]interface{}{
						"type":        "string",
						"description": "Name of your application (e.g., 'claude-desktop')",
					},
					"device_name": map[string]interface{}{
						"type":        "string",
						"description": "Name of this device (e.g., 'macbook-pro')",
					},
				},
				Required: []string{"bridge_ip", "app_name", "device_name"},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			bridgeIP, err := request.RequireString("bridge_ip")
			if err != nil {
				return mcp.NewToolResultError("bridge_ip is required"), nil
			}

			appName, err := request.RequireString("app_name")
			if err != nil {
				return mcp.NewToolResultError("app_name is required"), nil
			}

			deviceName, err := request.RequireString("device_name")
			if err != nil {
				return mcp.NewToolResultError("device_name is required"), nil
			}

			// Create client for this bridge (without app key)
			client, err := hue.NewClient(hue.WithBridgeIP(bridgeIP))
			if err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to create client: %v", err)), nil
			}

			// Devicetype format: "appname#devicename"
			devicetype := fmt.Sprintf("%s#%s", appName, deviceName)

			// Attempt authentication
			authCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
			defer cancel()

			authResp, err := client.Authenticate(authCtx, devicetype)
			if err != nil {
				// Check if it's a link button error
				if err.Error() == "link button not pressed" || err.Error() == "unauthorized user" {
					return mcp.NewToolResultText(fmt.Sprintf(
						"⚠️  LINK BUTTON NOT PRESSED\n\n"+
							"Please press the round link button on top of your Hue bridge at %s\n"+
							"and call this tool again within 30 seconds.\n\n"+
							"The button will glow blue when pressed.",
						bridgeIP,
					)), nil
				}
				return mcp.NewToolResultError(fmt.Sprintf("Authentication failed: %v", err)), nil
			}

			if authResp.Error != nil {
				return mcp.NewToolResultError(fmt.Sprintf(
					"Authentication error: %s (type: %d)",
					authResp.Error.Description,
					authResp.Error.Type,
				)), nil
			}

			if authResp.Success == nil || authResp.Success.Username == "" {
				return mcp.NewToolResultError("Authentication succeeded but no app key returned"), nil
			}

			result := map[string]string{
				"bridge_ip": bridgeIP,
				"app_key":   authResp.Success.Username,
				"app_name":  appName,
				"device":    deviceName,
				"status":    "✅ Authentication successful!",
				"next_step": "Use add_bridge to save this configuration",
			}

			data, _ := json.MarshalIndent(result, "", "  ")
			return mcp.NewToolResultText(string(data)), nil
		},
	)

	// add_bridge tool
	s.AddTool(
		mcp.Tool{
			Name:        "add_bridge",
			Description: "Add an authenticated bridge to the configuration and start using it",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "Unique ID for this bridge (e.g., 'home', 'office'). Use lowercase letters and hyphens only.",
					},
					"bridge_name": map[string]interface{}{
						"type":        "string",
						"description": "Friendly name for this bridge (e.g., 'Home Bridge', 'Office Bridge')",
					},
					"bridge_ip": map[string]interface{}{
						"type":        "string",
						"description": "IP address of the bridge",
					},
					"app_key": map[string]interface{}{
						"type":        "string",
						"description": "App key from authenticate_bridge",
					},
				},
				Required: []string{"bridge_id", "bridge_name", "bridge_ip", "app_key"},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			bridgeID, err := request.RequireString("bridge_id")
			if err != nil {
				return mcp.NewToolResultError("bridge_id is required"), nil
			}

			bridgeName, err := request.RequireString("bridge_name")
			if err != nil {
				return mcp.NewToolResultError("bridge_name is required"), nil
			}

			bridgeIP, err := request.RequireString("bridge_ip")
			if err != nil {
				return mcp.NewToolResultError("bridge_ip is required"), nil
			}

			appKey, err := request.RequireString("app_key")
			if err != nil {
				return mcp.NewToolResultError("app_key is required"), nil
			}

			// Add bridge to configuration
			bridgeCfg := config.BridgeConfig{
				ID:      bridgeID,
				Name:    bridgeName,
				IP:      bridgeIP,
				AppKey:  appKey,
				Enabled: true,
			}

			if err := cfg.AddBridge(bridgeCfg); err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to add bridge: %v", err)), nil
			}

			// Initialize the new bridge in the manager
			if err := bm.InitializeBridges(ctx); err != nil {
				return mcp.NewToolResultText(fmt.Sprintf(
					"⚠️  Bridge added to configuration but failed to initialize: %v\n\n"+
						"Configuration saved to: %s\n\n"+
						"You may need to check the bridge IP and app key.",
					err, config.ConfigPath(),
				)), nil
			}

			return mcp.NewToolResultText(fmt.Sprintf(
				"✅ Bridge '%s' added successfully!\n\n"+
					"Configuration saved to: %s\n\n"+
					"You can now use:\n"+
					"  • list_lights - See all your lights\n"+
					"  • control_light - Control individual lights\n"+
					"  • list_rooms - See all rooms\n"+
					"  • list_scenes - See all scenes\n"+
					"  • And more!",
				bridgeName, config.ConfigPath(),
			)), nil
		},
	)

	// remove_bridge tool
	s.AddTool(
		mcp.Tool{
			Name:        "remove_bridge",
			Description: "Remove a bridge from the configuration",
			InputSchema: mcp.ToolInputSchema{
				Type: "object",
				Properties: map[string]interface{}{
					"bridge_id": map[string]interface{}{
						"type":        "string",
						"description": "ID of the bridge to remove",
					},
				},
				Required: []string{"bridge_id"},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			bridgeID, err := request.RequireString("bridge_id")
			if err != nil {
				return mcp.NewToolResultError("bridge_id is required"), nil
			}

			if err := cfg.RemoveBridge(bridgeID); err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("Failed to remove bridge: %v", err)), nil
			}

			// Reinitialize bridges
			if err := bm.InitializeBridges(ctx); err != nil {
				return mcp.NewToolResultText(fmt.Sprintf(
					"Bridge removed from configuration but reinitialization had issues: %v",
					err,
				)), nil
			}

			return mcp.NewToolResultText(fmt.Sprintf("✅ Bridge '%s' removed successfully", bridgeID)), nil
		},
	)

	// get_config_path tool
	s.AddTool(
		mcp.Tool{
			Name:        "get_config_path",
			Description: "Get the path to the configuration file",
			InputSchema: mcp.ToolInputSchema{
				Type:       "object",
				Properties: map[string]interface{}{},
			},
		},
		func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			return mcp.NewToolResultText(fmt.Sprintf(
				"📁 Configuration file location:\n\n%s\n\n"+
					"Setup workflow:\n"+
					"1. discover_bridges - Find bridges on your network\n"+
					"2. authenticate_bridge - Press link button and get app key\n"+
					"3. add_bridge - Save configuration and start using the bridge\n\n"+
					"You can edit this file manually if needed, but using the tools is recommended.",
				config.ConfigPath(),
			)), nil
		},
	)
}
