package tools

import (
	"github.com/mark3labs/mcp-go/server"
	"github.com/rmrfslashbin/hue-mcp/pkg/bridge"
	"github.com/rmrfslashbin/hue-mcp/pkg/config"
)

// RegisterAllTools registers all MCP tools with the server
func RegisterAllTools(s *server.MCPServer, bm *bridge.Manager, cfg *config.Config) {
	// Setup tools - for discovering and configuring bridges
	RegisterSetupTools(s, bm, cfg)

	// Cache management tools
	RegisterCacheTools(s, bm)

	// Bridge control tools
	RegisterLightTools(s, bm)
	RegisterBulkLightTools(s, bm)
	RegisterGroupedLightTools(s, bm)
	RegisterRoomTools(s, bm)
	RegisterSceneTools(s, bm)
	RegisterBridgeTools(s, bm)
}
