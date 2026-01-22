package tools

import (
	"github.com/mark3labs/mcp-go/server"
	"github.com/rmrfslashbin/hue-mcp/pkg/bridge"
)

// RegisterAllTools registers all MCP tools with the server
func RegisterAllTools(s *server.MCPServer, bm *bridge.Manager) {
	RegisterLightTools(s, bm)
	RegisterRoomTools(s, bm)
	RegisterSceneTools(s, bm)
	RegisterBridgeTools(s, bm)
}
