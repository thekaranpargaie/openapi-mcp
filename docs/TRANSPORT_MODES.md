# MCP Server Transport Modes

This server supports two transport modes for different use cases:

## 1. HTTP Mode (Default) - For Cloud/Remote Clients

**Use case:** Cloudflare AI Playground, remote clients, cloud deployments

**Protocol:** Streamable HTTP with Server-Sent Events (SSE) for bidirectional communication

```bash
# Set environment variable
export TRANSPORT_MODE=http
export PORT=3000

# Start server
npm start
```

**Connection endpoint:**
- `http://localhost:3000/mcp` - Unified endpoint for both SSE streaming and JSON-RPC messages
  - GET request with `Mcp-Session-Id` header → establishes SSE stream
  - POST request with JSON-RPC body → sends messages to server

**Flow:**
1. Client sends POST request to `/mcp` without `Mcp-Session-Id` header containing an `initialize` request
2. Server responds with session ID in `Mcp-Session-Id` header
3. Client uses returned session ID in subsequent requests (both GET and POST)
4. GET with `Mcp-Session-Id` opens SSE stream for server → client messages
5. POST with `Mcp-Session-Id` sends client → server messages

## 2. STDIO Mode - For Local/Direct Integration

**Use case:** Local CLI tools, Node.js integrations, Claude Desktop, development

```bash
# Set environment variable
export TRANSPORT_MODE=stdio

# Start server  
npm start
```

The server communicates via stdin/stdout JSON-RPC, suitable for local subprocess-based integrations.

## Docker Usage

### HTTP Mode (Default - for remote clients)
```bash
docker-compose up mcp-server
# Server available at http://localhost:3000/mcp
```

### STDIO Mode
```bash
docker-compose run -e TRANSPORT_MODE=stdio mcp-server
# Server reads/writes JSON-RPC on stdin/stdout
```

## Configuration

| Variable | Default | Options |
|----------|---------|---------|
| `TRANSPORT_MODE` | `http` | `http` (Streamable HTTP), `stdio` (stdin/stdout) |
| `PORT` | `3000` | Any available port |
| `ALLOWED_ORIGINS` | _(unrestricted)_ | Comma-separated list of allowed origins for DNS-rebinding protection |

## Cloudflare AI Playground Integration

To use with Cloudflare AI Playground:

1. Set `TRANSPORT_MODE=http`
2. Expose the server publicly (or via tunnel):
   ```bash
   # Option A: Cloudflare Tunnel
   cloudflared tunnel --url http://localhost:3000

   # Option B: ngrok
   ngrok http 3000
   ```
3. In Cloudflare AI Playground, add MCP server: `https://your-tunnel-url/mcp`
4. Playground automatically handles session management and SSE streaming

## Local Integration (Claude Desktop, Node.js subprocess)

To use with local tools or Claude Desktop:

1. Set `TRANSPORT_MODE=stdio`
2. Start the server as a subprocess
3. Send/receive MCP protocol messages via stdin/stdout

## Technical Details

### HTTP Mode (Streamable HTTP - 2025-06-18 spec)
- Uses Express.js for HTTP server
- StreamableHTTPServerTransport from MCP SDK
- Session-based with UUID generation
- Per-session MCP server instances
- Automatic session cleanup on disconnect
- DNS-rebinding protection built-in

### STDIO Mode
- Direct stdin/stdout communication
- Single MCP server instance
- Ideal for local subprocess integrations
- No network overhead

## Testing

### HTTP Mode
```bash
TRANSPORT_MODE=http npm start
# Output shows:
# > Endpoint: http://localhost:3000/mcp
# >   GET  http://localhost:3000/mcp  → open SSE stream
# >   POST http://localhost:3000/mcp  → send JSON-RPC message
```

### STDIO Mode
```bash
TRANSPORT_MODE=stdio npm start
# Server waits for JSON-RPC on stdin
# Sends responses to stdout
```

Run tests:
```bash
npm run test:http   # Test HTTP mode
npm run test:stdio  # Test STDIO mode
```

## Protocol Compliance

- **MCP Version:** 1.x
- **HTTP Specification:** Streamable HTTP (2025-06-18)
- **JSON-RPC:** 2.0
- **Session Management:** UUID-based with automatic cleanup

