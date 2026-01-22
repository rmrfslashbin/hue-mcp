module github.com/rmrfslashbin/hue-mcp

go 1.25.6

replace github.com/rmrfslashbin/hue-sdk => /Users/rmrfslashbin/src/github.com/rmrfslashbin/hue-api/sdk

replace github.com/rmrfslashbin/hue-cache => /tmp/hue-cache

require (
	github.com/mark3labs/mcp-go v0.43.2
	github.com/rmrfslashbin/hue-cache v0.0.0-00010101000000-000000000000
	github.com/rmrfslashbin/hue-sdk v0.0.0-00010101000000-000000000000
)

require (
	github.com/bahlo/generic-list-go v0.2.0 // indirect
	github.com/buger/jsonparser v1.1.1 // indirect
	github.com/google/go-cmp v0.7.0 // indirect
	github.com/google/uuid v1.6.0 // indirect
	github.com/invopop/jsonschema v0.13.0 // indirect
	github.com/mailru/easyjson v0.9.1 // indirect
	github.com/rogpeppe/go-internal v1.14.1 // indirect
	github.com/spf13/cast v1.10.0 // indirect
	github.com/stretchr/testify v1.11.1 // indirect
	github.com/wk8/go-ordered-map/v2 v2.1.8 // indirect
	github.com/yosida95/uritemplate/v3 v3.0.2 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)
