# Testing the MCP Server

This directory contains test scripts and utilities for validating the MCP server implementation.

## Test Files

### 1. `test_modes.js` - Transport Mode Testing

Tests both HTTP and STDIO transport modes.

**Usage:**
```bash
# Test HTTP mode (default)
node test/test_modes.js http

# Test STDIO mode
node test/test_modes.js stdio
```

This script:
- Spawns the server in the specified transport mode
- Sends a test `tools/list` message
- Validates the response
- Automatically shuts down the server

### 2. `test_client.js` - HTTP Client Testing

Comprehensive HTTP client that connects to the server via SSE (Server-Sent Events).

**Usage:**
```bash
# Make sure server is running in HTTP mode
npm start

# In another terminal
node test/test_client.js
```

This script:
- Establishes an SSE connection to the MCP server
- Lists available tools
- Tests tool invocation with sample parameters
- Logs all interactions to `test_client.log`

### 3. `test_client_local.js` - Local HTTP Client Testing

Simple HTTP client for testing local server connections.

**Usage:**
```bash
# Make sure server is running in HTTP mode on port 3003
TRANSPORT_MODE=http PORT=3003 npm start

# In another terminal
node test/test_client_local.js
```

This script:
- Connects to a local HTTP MCP server
- Lists available tools
- Logs interactions to `test_client_local.log`

## Running Tests with Docker

Test both the server and test API together:

```bash
# Start both test-api and mcp-server
docker compose up --build

# In another terminal, run test_modes.js
node test/test_modes.js http
```

## What Gets Tested

- ✅ Tool discovery and listing
- ✅ Transport mode switching (HTTP/STDIO)
- ✅ SSE client connections
- ✅ JSON-RPC message handling
- ✅ OpenAPI spec loading
- ✅ Tool parameter validation

## Log Files

Test runs generate log files in this directory:
- `test_client.log` - HTTP client test output
- `test_client_local.log` - Local HTTP client test output

These are ignored by git (see `.gitignore`).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port already in use | Change PORT env var (e.g., `PORT=3001 npm start`) |
| EventSource not defined | Ensure `eventsource` package is installed (`npm install`) |
| Connection refused | Make sure server is running before running client tests |
| STDIO mode hangs | Check that the server has permission to read/write to stdin/stdout |
