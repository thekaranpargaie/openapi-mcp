# OpenAPI → MCP Server

A lightweight **Model Context Protocol (MCP) server** that dynamically converts any OpenAPI v3 spec into MCP tools. Point it at an OpenAPI spec and any MCP-compatible AI client can discover and call your API endpoints automatically.

## What it does

- Fetches an **OpenAPI v3 JSON** spec at startup
- Converts every endpoint into a named **MCP tool** with proper input schemas
- Exposes the tools over **Streamable HTTP** (default) or **stdio**
- Executes real API calls and returns structured results to the AI client

## Requirements

- Node.js 18+
- npm

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment variables

```bash
OPENAPI_SPEC_URL=http://localhost:8000/openapi.json   # URL or file path to your OpenAPI spec
API_BASE_URL=http://localhost:8000                    # Base URL for outbound API calls
TRANSPORT_MODE=http                                   # 'http' (default) or 'stdio'
PORT=3000                                             # HTTP port (HTTP mode only)
```

### 3. Start the server

```bash
npm start
```

The MCP endpoint will be available at `http://localhost:3000/mcp`.

## Transport modes

| Mode | When to use |
|------|-------------|
| `http` | Remote/cloud deployments, Cloudflare AI Playground, any HTTP-capable MCP client |
| `stdio` | Local integrations (Claude Desktop, direct process communication) |

Set `TRANSPORT_MODE=stdio` to switch to stdio mode.

## Docker

```bash
# Start both the test API and MCP server
docker compose up --build
```

The MCP server will be available at `http://localhost:3000/mcp`.

## Testing with Cloudflare AI Playground

You can connect this MCP server to [Cloudflare AI Playground](https://playground.ai.cloudflare.com) to explore and invoke your API tools through natural language:

1. Deploy the MCP server somewhere publicly accessible — for local testing, expose it with a tunnel:
   ```bash
   # Using Cloudflare Tunnel
   cloudflared tunnel --url http://localhost:3000

   # Or using ngrok
   ngrok http 3000
   ```
2. Open [https://playground.ai.cloudflare.com](https://playground.ai.cloudflare.com).
3. Click **Add MCP Server** and enter your server URL:
   ```
   https://your-tunnel-url/mcp
   ```
4. The playground will auto-discover all tools generated from your OpenAPI spec — you can then invoke them through natural language prompts.

## Project Structure

```
config.js              - Configuration (URLs, settings)
src/                   - Core server code
  index.js             - Entry point, HTTP/stdio transport setup
  mcpServer.js         - MCP server, tool registration and execution
  openapiLoader.js     - Loads OpenAPI specs from URLs or files
  toolGenerator.js     - Converts OpenAPI endpoints into MCP tools
  env.js               - Environment variable loader
  logger.js            - Logging utility
test/                  - Test scripts and utilities
  test_modes.js        - Transport mode testing (HTTP/STDIO)
  test_client.js       - HTTP client testing
  test_client_local.js - Local HTTP client testing
  README.md            - Testing documentation
test_api/              - Example FastAPI service for local testing
docs/                  - Documentation
  TRANSPORT_MODES.md   - Detailed transport mode specifications
```

## Testing

Run the test suite to validate the server:

```bash
# Test HTTP mode
npm run test:http

# Test STDIO mode
npm run test:stdio

# Run all tests
npm test

# Connect an HTTP client
npm run test:client
```

See [test/README.md](test/README.md) for detailed testing instructions.

## Documentation

Complete guides and references:

- **[GETTING_STARTED.md](docs/GETTING_STARTED.md)** - 5-minute quick start guide
- **[API_INTEGRATION.md](docs/API_INTEGRATION.md)** - How to connect your API
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design and how it works
- **[CONFIGURATION.md](docs/CONFIGURATION.md)** - All environment variables and settings
- **[TRANSPORT_MODES.md](docs/TRANSPORT_MODES.md)** - HTTP vs STDIO modes explained
- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Solutions to common issues
- **[docs/README.md](docs/README.md)** - Documentation index

## Environment variables reference

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAPI_SPEC_URL` | `http://localhost:8000/openapi.json` | OpenAPI spec URL or file path |
| `API_BASE_URL` | `http://localhost:8000` | Base URL for outbound API calls |
| `API_KEY` | _(none)_ | Optional bearer token for the target API |
| `TRANSPORT_MODE` | `http` | `http` or `stdio` |
| `PORT` | `3000` | Listening port (HTTP mode) |
| `ALLOWED_ORIGINS` | _(all)_ | Comma-separated allowed origins for DNS-rebinding protection |

See [CONFIGURATION.md](docs/CONFIGURATION.md) for detailed configuration options.
