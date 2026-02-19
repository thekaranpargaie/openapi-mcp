# MCP Server Transport Modes

This server supports two transport modes for different use cases:

## 1. HTTP Mode (Default) - For Copilot Studio

**Use case:** Copilot Studio, remote clients, cloud integrations

**Protocol:** Server-Sent Events (SSE) over HTTP - industry standard for Copilot Studio integration

```bash
# Set environment variable
export TRANSPORT_MODE=http
export PORT=3000

# Start server
npm start
```

**Connection endpoints:**
- Stream: `http://localhost:3000/mcp/stream` (GET - establishes SSE connection)
- Messages: `http://localhost:3000/mcp/messages` (POST - handles client messages)

The server uses SSE for bidirectional communication, which is the standard protocol supported by Copilot Studio.

## 2. STDIO Mode - For Local/Direct Integration

**Use case:** Local CLI tools, Node.js integrations, development

```bash
# Set environment variable
export TRANSPORT_MODE=stdio

# Start server  
npm start
```

The server will communicate via stdin/stdout, suitable for local subprocess-based integrations.

## Docker Usage

### HTTP Mode (Default - for Copilot Studio)
```bash
docker-compose up mcp-server
```

### STDIO Mode
```bash
docker-compose run -e TRANSPORT_MODE=stdio mcp-server
```

## Configuration

| Variable | Default | Options |
|----------|---------|---------|
| `TRANSPORT_MODE` | `http` | `http` (SSE based), `stdio` |
| `PORT` | `3000` | Any available port |

## Copilot Studio Configuration

To use with Copilot Studio:

1. Set `TRANSPORT_MODE=http`
2. Configure Copilot Studio to connect to the stream endpoint: `http://localhost:3000/mcp/stream`
3. Copilot Studio will automatically handle the SSE connection and message posting

**Note:** Copilot Studio is tested and optimized for SSE-based communication. This is the recommended mode.

## Local Integration

To use with local Node.js tools or CLI:

1. Set `TRANSPORT_MODE=stdio`
2. Start the server as a subprocess
3. Send/receive MCP protocol messages via stdin/stdout

## Testing

### HTTP Mode (Copilot Studio)
```bash
TRANSPORT_MODE=http npm start
# Will output:
# > Stream URL:   http://localhost:3000/mcp/stream
# > Messages URL: http://localhost:3000/mcp/messages
```

### STDIO Mode (Local)
```bash
TRANSPORT_MODE=stdio npm start
# Server waits for JSON messages on stdin
```

## Technology Stack

- **HTTP/SSE Mode:** Express.js + Server-Sent Events
- **STDIO Mode:** Node.js stdio streams
- **MCP SDK:** v0.6.1

Both modes provide full MCP 1.0 protocol support with your OpenAPI-based tools.

