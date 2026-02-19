# Architecture Overview

High-level design of the OpenAPI MCP Server.

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                   OpenAPI MCP Server                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Express.js HTTP Server                     │  │
│  │  (HTTP transport only - STDIO uses direct streams)   │  │
│  └──────────────────────────────────────────────────────┘  │
│           ↓ POST/GET to /mcp endpoint ↓                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   StreamableHTTPServerTransport / StdioTransport    │  │
│  │    (MCP SDK - handles JSON-RPC & session mgmt)      │  │
│  └──────────────────────────────────────────────────────┘  │
│           ↓ MCP JSON-RPC Messages ↓                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         McpServer (MCP SDK Server)                   │  │
│  │  • Tool discovery (tools/list)                       │  │
│  │  • Tool execution (tools/call)                       │  │
│  │  • Resource management                              │  │
│  └──────────────────────────────────────────────────────┘  │
│           ↓ Tool Registration ↓                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    Tool Generator & OpenAPI Loader                   │  │
│  │  • Parse OpenAPI spec                               │  │
│  │  • Generate MCP tools from endpoints               │  │
│  │  • Build JSON schemas for validation               │  │
│  └──────────────────────────────────────────────────────┘  │
│           ↓ API Calls ↓                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      HTTP Client (executes API calls)                │  │
│  │  • Sends requests to API_BASE_URL                   │  │
│  │  • Tracks authentication (API_KEY)                  │  │
│  │  • Returns structured responses                     │  │
│  └──────────────────────────────────────────────────────┘  │
│           ↓                                                 │
└─────────────────────────────────────────────────────────────┘
                      ↓
           ┌──────────────────────────┐
           │   Your OpenAPI-based     │
           │   REST API Service       │
           └──────────────────────────┘
```

## Data Flow

### 1. Initialization (First Request)

```
Client                          MCP Server                Your API
  │                                 │                         │
  ├─ POST /mcp                      │                         │
  │  (initialize request)            │                         │
  │                                 ├─ Load OpenAPI spec     │
  │                                 ├─ Generate tools         │
  │                                 ├─ Create session        │
  │  Response + Session ID ─────────┤                         │
  │  (Mcp-Session-Id header)        │                         │
```

### 2. Tool Discovery

```
Client                          MCP Server                Your API
  │                                 │                         │
  ├─ POST /mcp (tools/list)        │                         │
  │  With Session ID               │                         │
  │                                 ├─ Retrieve cached tools │
  │  List of available tools ───────┤                         │
  │  (with schemas and descriptions)│                         │
```

### 3. Tool Execution

```
Client                          MCP Server                Your API
  │                                 │                         │
  ├─ POST /mcp (tools/call)        │                         │
  │  Tool name + parameters         │                         │
  │                                 ├─ Validate parameters   │
  │                                 ├─ Build HTTP request    │
  │                                 ├─ Call API ────────────>│
  │                                 │                         │
  │                                 │<─ Receive response ────│
  │                                 ├─ Parse & structure     │
  │  Tool result ───────────────────┤                         │
  │  (structured data)              │                         │
```

## Module Breakdown

### `src/index.js` - Entry Point
- Initializes Express.js server (HTTP mode)
- Sets up transport based on `TRANSPORT_MODE`
- Handles /mcp endpoint routing
- Manages session lifecycle
- Provides DNS-rebinding protection via ALLOWED_ORIGINS

### `src/mcpServer.js` - MCP Server Core
- Extends MCP SDK Server class
- Registers tools with proper input schemas
- Handles tool execution requests
- Executes HTTP calls to the API
- Transforms API responses to MCP format

### `src/openapiLoader.js` - OpenAPI Spec Loading
- Fetches OpenAPI spec from URL or file
- Parses and validates JSON/YAML
- Caches spec for performance
- Provides error handling for malformed specs

### `src/toolGenerator.js` - Tool Generation
- Converts each OpenAPI endpoint to MCP tool
- Generates input schemas from parameter definitions
- Creates tool descriptions from operation summaries
- Maps HTTP methods and paths
- Handles authentication headers

### `src/logger.js` - Logging Utility
- Structured logging with levels (debug, info, warn, error)
- Colored console output in development
- JSON logging option for production

### `config.js` - Configuration Manager
- Centralized configuration
- Environment variable overrides
- Default fallback values

### `src/env.js` - Environment Setup
- Loads .env file into `process.env`
- Runs before all other modules

## Session Management

### HTTP Mode
- Each new connection creates a unique session ID (UUID)
- Session lives as long as SSE connection is open
- New MCP server instance per session
- Auto cleanup on disconnect

### STDIO Mode
- Single session for the entire process lifetime
- Single MCP server instance
- No session ID management needed

## Tool Registration Flow

```
OpenAPI Spec Input:
  GET /api/users           → list_users_api_users_get
  POST /api/users          → create_user_api_users_post
  GET /api/users/{id}      → get_user_api_users__id_get
  ...

Tool Generation:
  Endpoint → Tool name (unique identifier)
  Parameters → JSON Schema
  Description → Summary + parameter details

MCP Registration:
  tool(name, description, inputSchema, handler)
```

## Error Handling

| Layer | Error Type | Handling |
|-------|-----------|----------|
| OpenAPI Loading | Spec not found, parse error | Log + return 500 |
| Tool Generation | Invalid parameter, missing schema | Skip problematic endpoint, continue |
| Tool Execution | API call fails, network error | Return error to client via MCP |
| Session Management | Invalid session ID | Return 404 with error message |

## Performance Considerations

1. **OpenAPI Spec Caching**
   - Loaded once at startup
   - Reused for all sessions
   - No re-parsing per request

2. **Per-Session Servers (HTTP)**
   - Each session has independent server instance
   - Isolation prevents state leakage
   - Memory cleanup on disconnect

3. **Streaming Response (HTTP)**
   - SSE keeps connection open
   - Bidirectional messages
   - No polling required

## Security Features

1. **DNS-Rebinding Protection**
   - Optional ALLOWED_ORIGINS whitelist
   - Validates Origin header
   - Prevents unauthorized access

2. **API Key Support**
   - Optional bearer token via API_KEY env var
   - Automatically added to all API requests
   - Not exposed to client

3. **Parameter Validation**
   - Input schema validation before API call
   - Prevents invalid requests reaching API
   - Uses AJV for JSON Schema validation

## Extensibility

The architecture is modular, making it easy to:

- **Add new transport modes** - Implement in `src/index.js`
- **Custom tool generation** - Modify `src/toolGenerator.js`
- **Pre/post-processing hooks** - Add in `src/mcpServer.js`
- **Alternative spec formats** - Extend `src/openapiLoader.js`
- **Caching strategies** - Modify spec loading logic

## Deployment Options

- **Local**: STDIO mode + subprocess
- **Docker**: Container with HTTP mode
- **Cloud (AWS/Azure/GCP)**: HTTP mode + managed service
- **Serverless**: Could be adapted for Lambda/Cloud Functions (not currently tested)

## Technology Stack

- **MCP SDK**: v1.27.0 (Model Context Protocol)
- **Web Framework**: Express.js v4.18.2
- **HTTP Client**: Node.js built-in
- **JSON Validation**: AJV v8.12.0
- **CORS**: cors v2.8.5
- **Environment**: dotenv v16.6.1
- **EventSource**: v4.1.0 (for SSE polyfill)
