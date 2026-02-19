# Getting Started with OpenAPI MCP Server

A quick guide to get your MCP server running and connected to an AI playground.

## 5-Minute Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure your OpenAPI spec
Create a `.env` file in the project root:
```bash
OPENAPI_SPEC_URL=http://localhost:8000/openapi.json
API_BASE_URL=http://localhost:8000
TRANSPORT_MODE=http
PORT=3000
```

**For local testing with the included example API:**
```bash
docker compose up --build
# This starts both test-api (port 8002) and mcp-server (port 3000)
```

### 3. Start the server
```bash
npm start
```

You should see:
```
[MCP Server Running - Streamable HTTP (2025-06-18)]
> Endpoint: http://localhost:3000/mcp
>   GET  http://localhost:3000/mcp  → open SSE stream (requires Mcp-Session-Id header)
>   POST http://localhost:3000/mcp  → send JSON-RPC message
> Tools:    12 available
```

## Connect to Cloudflare AI Playground

The quickest way to test your server:

### Option 1: Local testing with ngrok
```bash
# Terminal 1: Start your MCP server
npm start

# Terminal 2: Expose it via ngrok
ngrok http 3000

# Terminal 3: Get tunnel URL and open Cloudflare AI Playground
# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Visit https://playground.ai.cloudflare.com
# Add MCP Server: https://abc123.ngrok.io/mcp
```

### Option 2: Using Cloudflare Tunnel
```bash
# Terminal 1: Start your MCP server
npm start

# Terminal 2: Create tunnel
cloudflared tunnel --url http://localhost:3000

# Terminal 3: Copy tunnel URL, open Cloudflare AI Playground
# Visit https://playground.ai.cloudflare.com
# Add MCP Server: https://your-tunnel-url/mcp
```

### Option 3: Docker deployment
```bash
# Start with Docker
docker compose up --build

# Expose via tunnel
# Either ngrok or Cloudflare Tunnel as above
```

## Verify It Works

### Using npm test scripts
```bash
# Test HTTP mode
npm run test:http

# Test STDIO mode
npm run test:stdio
```

### Using curl (HTTP mode must be running)
```bash
# Initialize a session
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'

# You'll get back a session ID in the Mcp-Session-Id header
```

## Understanding Your Setup

```
Your OpenAPI API
    ↓
OpenAPI Spec (JSON)
    ↓
MCP Server (reads spec, generates tools)
    ↓
AI Playground / Client (calls tools)
    ↓
MCP Server executes API calls
    ↓
Response back to AI
```

## What's Happening

1. **MCP Server starts** and reads your OpenAPI spec
2. **Tools are generated** from each API endpoint
3. **Spec data cached** for fast tool discovery
4. **Client connects** via HTTP (SSE) or STDIO
5. **Client lists tools** via MCP protocol
6. **Client calls tools** with parameters
7. **Server executes API** calls on your behalf
8. **Results returned** to client as structured data

## Environment Variables

See [CONFIGURATION.md](CONFIGURATION.md) for detailed configuration options.

Minimum required:
- `OPENAPI_SPEC_URL` - Where your OpenAPI spec lives
- `API_BASE_URL` - Where your API lives (can be different from spec URL)

## Common Issues

**"Connection refused"**
- Make sure the server is running (`npm start`)
- Check that PORT 3000 is not in use

**"OpenAPI spec not found"**
- Verify `OPENAPI_SPEC_URL` is correct and accessible
- Check firewall/CORS settings

**"No tools available"**
- Ensure your OpenAPI spec has valid endpoint definitions
- Check server logs for parsing errors

**Session not found**
- Make sure you're using consistent `Mcp-Session-Id` header for follow-up requests
- Initialize a new session if the session expires

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more help.

## Next Steps

- Learn about [transport modes](TRANSPORT_MODES.md)
- Understand the [architecture](ARCHITECTURE.md)
- Configure [advanced options](CONFIGURATION.md)
- Check [troubleshooting guide](TROUBLESHOOTING.md)

## Example: Using Your Own API

```bash
# 1. Set your API's OpenAPI spec URL
export OPENAPI_SPEC_URL=https://api.example.com/openapi.json
export API_BASE_URL=https://api.example.com

# 2. If API requires auth, set the API key
export API_KEY=your-api-key-here

# 3. Start server
npm start

# 4. Connect to playground and use your API through natural language!
```

That's it! Your API is now accessible through an AI playground with natural language interface.
