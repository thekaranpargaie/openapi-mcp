# API Integration Guide

How to connect your REST API to the MCP Server.

## Prerequisites

- Your REST API has a valid OpenAPI spec (JSON or YAML)
- OpenAPI spec is accessible via HTTP or file path
- Your API is running and accessible

## Quick Integration

### 1. Generate/Expose OpenAPI Spec

Your API server should expose the spec at a standard endpoint:

```bash
# Common locations:
GET /openapi.json
GET /openapi.yaml
GET /api/openapi.json
GET /docs/openapi.json
GET /swagger.json

# Or serve from documentation:
# Swagger UI: /swagger-ui.html
# ReDoc: /redoc
```

**If your API doesn't have a spec, generate one:**

```bash
# For FastAPI
# Spec available at /openapi.json automatically

# For Express.js
npm install swagger-jsdoc swagger-ui-express
# Then use swagger-jsdoc to generate from JSDoc comments

# For Django REST
pip install drf-spectacular
# Then configure in settings.py

# For other frameworks
# Use OpenAPI generation tools for your framework
# Or write spec manually at https://editor.swagger.io
```

### 2. Configure MCP Server

Update `.env` with your API details:

```bash
OPENAPI_SPEC_URL=https://api.example.com/openapi.json
API_BASE_URL=https://api.example.com
API_KEY=sk_prod_your_api_key  # If authentication required
TRANSPORT_MODE=http
PORT=3000
```

### 3. Start Server

```bash
npm start
```

That's it! Your API is now accessible via MCP.

## Authentication Methods

### Method 1: Bearer Token (Recommended)

For APIs using Bearer token authentication:

```bash
# .env
API_KEY=your_bearer_token_here
```

Server automatically sends:
```
Authorization: Bearer your_bearer_token_here
```

### Method 2: API Key Header

If API uses custom header (e.g., `X-API-Key`):

Edit `src/mcpServer.js` and modify the headers:

```javascript
const headers = {
  'X-API-Key': config.openapi.apiKey,
  'Content-Type': 'application/json'
};
```

### Method 3: OAuth2

OAuth2 requires additional setup:

1. Obtain access token outside the server
2. Pass token via API_KEY
3. Implement token refresh (not automatic)

```bash
# Get token once
TOKEN=$(curl -X POST https://auth.example.com/oauth2/token \
  -d "client_id=..." -d "client_secret=...")

# Use in MCP server
API_KEY=$TOKEN npm start
```

### Method 4: Custom Headers

Edit `src/mcpServer.js`:

```javascript
const headers = {
  'Authorization': `Bearer ${config.openapi.apiKey}`,
  'X-Custom-Header': 'value',
  'X-Request-ID': randomUUID(),
  'Content-Type': 'application/json'
};
```

### Method 5: Mutual TLS (mTLS)

For APIs requiring client certificates:

```javascript
// In src/mcpServer.js, modify HTTP client:
import fs from 'fs';

const options = {
  hostname: new URL(url).hostname,
  key: fs.readFileSync('/path/to/client-key.pem'),
  cert: fs.readFileSync('/path/to/client-cert.pem'),
  // ... rest of options
};
```

## Request/Response Handling

### Parameter Mapping

OpenAPI parameters → MCP tool arguments:

```json
{
  "parameters": [
    {
      "name": "user_id",
      "in": "path",
      "required": true,
      "schema": { "type": "integer" }
    },
    {
      "name": "limit",
      "in": "query",
      "required": false,
      "schema": { "type": "integer", "default": 10 }
    }
  ]
}
```

Becomes MCP tool:

```json
{
  "name": "get_user_user_id_get",
  "inputSchema": {
    "type": "object",
    "required": ["user_id"],
    "properties": {
      "user_id": { "type": "integer" },
      "limit": { "type": "integer" }
    }
  }
}
```

### Request Construction

The server automatically builds requests:

```
GET /api/users/{user_id}?limit=10

Becomes:
- Path parameter: user_id → URL path
- Query parameter: limit → URL query string
- Body parameter: → JSON body
- Header parameter: → HTTP header
```

### Response Handling

API responses are passed through to the client:

```json
API Response:
{
  "id": 1,
  "name": "John",
  "email": "john@example.com"
}

Client receives:
{
  "content": [
    {
      "type": "text",
      "text": "{...JSON response...}"
    }
  ]
}
```

## Common API Patterns

### Pattern 1: RESTful API with Standard Endpoints

```yaml
paths:
  /users:
    get:
      operationId: listUsers
      parameters:
        - name: skip
          in: query
          type: integer
        - name: limit
          in: query
          type: integer
      responses:
        '200':
          description: List of users
  /users/{id}:
    get:
      operationId: getUser
      parameters:
        - name: id
          in: path
          type: integer
      responses:
        '200':
          description: A single user
```

✅ Supported: MCP creates separate tools for list and get

### Pattern 2: RPC-Style API with POST

```yaml
paths:
  /api/method:
    post:
      operationId: executeMethod
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                method: { type: string }
                params: { type: object }
      responses:
        '200':
          description: Method result
```

✅ Supported: MCP passes entire body as JSON

### Pattern 3: GraphQL Over HTTP

⚠️ Limited support - GraphQL is not REST

**Workaround:** Create REST wrapper endpoints that call GraphQL internally

### Pattern 4: API with Webhooks

⚠️ Not supported - MCP is request/response only

**Workaround:** Expose webhook status via REST endpoints

### Pattern 5: Streaming APIs

⚠️ Not supported - MCP expects complete responses

**Workaround:** Use REST endpoints that return aggregated results

## OpenAPI Spec Requirements

### Minimum Valid Spec

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "My API",
    "version": "1.0.0"
  },
  "paths": {
    "/users": {
      "get": {
        "operationId": "listUsers",
        "responses": {
          "200": {
            "description": "Success"
          }
        }
      }
    }
  }
}
```

### Required Fields for Each Endpoint

- `operationId` - Unique identifier (becomes tool name)
- `description` or `summary` - Tool description
- `parameters` - Input parameters with schemas
- `requestBody` - Request body with schema (if POST/PUT)
- `responses` - Response description (used for context)

### Supported Parameter Types

```yaml
parameters:
  - name: id
    in: path              # ✅ path, query, header, cookie
    required: true
    schema:
      type: integer       # ✅ integer, string, boolean, number
  - name: tags
    schema:
      type: array
      items:
        type: string      # ✅ arrays, objects
  - name: filter
    schema:
      type: object
      properties:
        name: { type: string }
        age: { type: integer }
```

### Response Spec

Response specs don't affect tool execution, but help with:
- Tool descriptions
- Validation context
- Documentation

## Testing Integration

### 1. Verify Spec Loading

```bash
# Check spec is accessible
curl https://api.example.com/openapi.json | jq '.info'

# Should output API info
# {
#   "title": "Your API Name",
#   "version": "1.0.0"
# }
```

### 2. Start Server and Check Tools

```bash
npm start

# In another terminal
npm run test:http

# Should list all tools
```

### 3. Test a Specific Tool

```bash
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
        "name": "test",
        "version": "1.0.0"
      }
    }
  }'

# Note the Mcp-Session-Id from response

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: {session_id}" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "your_tool_name",
      "arguments": {
        "param1": "value1"
      }
    }
  }'
```

## Debugging Integration

### Server can't load spec

```bash
# 1. Verify URL is correct
curl https://api.example.com/openapi.json

# 2. Check spec is valid JSON
curl https://api.example.com/openapi.json | jq '.'

# 3. Try again with verbose logging
npm start -- --verbose
```

### Tools created but fail on execution

```bash
# 1. Check API is running
curl https://api.example.com/status

# 2. Test endpoint directly
curl https://api.example.com/users

# 3. Look at server logs
npm start -- --verbose | grep -i error

# 4. Test with curl manually
curl -H "Authorization: Bearer ${API_KEY}" https://api.example.com/users
```

### Wrong parameters in tools

```bash
# 1. Check OpenAPI spec has correct operationId
curl https://api.example.com/openapi.json | jq '.paths."YOUR_PATH".YOUR_METHOD'

# 2. Verify parameters match spec
# Tool should have same parameters as spec

# 3. Check parameter types
# MCP uses JSON Schema types (string, integer, etc.)
# Not native types
```

## Production Deployment

### Checklist

- ✅ OPENAPI_SPEC_URL is stable and production-ready
- ✅ API_BASE_URL points to production API
- ✅ API_KEY is valid and has required permissions
- ✅ ALLOWED_ORIGINS is configured for production domain
- ✅ Rate limiting configured on API (if needed)
- ✅ Authentication is secure (HTTPS, valid certs)
- ✅ Monitoring/logging is set up
- ✅ Error handling is robust
- ✅ Tested with production API

### Example Production Setup

```bash
# docker-compose.yml or Kubernetes
environment:
  OPENAPI_SPEC_URL: https://api.example.com/v1/openapi.json
  API_BASE_URL: https://api.example.com/v1
  API_KEY: ${API_KEY}  # From secrets manager
  ALLOWED_ORIGINS: https://playground.ai.cloudflare.com
  TRANSPORT_MODE: http
  PORT: 3000
```

### Monitoring

Monitor these metrics:

- API response times
- Tool execution success rate
- Error rates by tool
- Spec loading time
- Session count
- Connection errors

## Integration Examples

### Example: FastAPI Backend

```python
# main.py
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

app = FastAPI(
    title="My API",
    version="1.0.0",
    openapi_url="/openapi.json"
)

@app.get("/users")
async def list_users():
    """List all users"""
    return [{"id": 1, "name": "John"}]

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    """Get a specific user"""
    return {"id": user_id, "name": "John"}

# Spec automatically available at /openapi.json
# MCP Server config:
# OPENAPI_SPEC_URL=http://localhost:8000/openapi.json
# API_BASE_URL=http://localhost:8000
```

### Example: Express.js Backend

```javascript
const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My API',
      version: '1.0.0',
    },
    servers: [{url: 'http://localhost:3000'}],
  },
  apis: ['./routes/*.js'],
};

const specs = swaggerJsdoc(options);
const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
app.get('/openapi.json', (req, res) => res.json(specs));

// Routes with JSDoc comments:
/**
 * @openapi
 * /users:
 *   get:
 *     operationId: listUsers
 *     responses:
 *       '200':
 *         description: List of users
 */
app.get('/users', (req, res) => {
  res.json([{id: 1, name: 'John'}]);
});
```

## See Also

- [CONFIGURATION.md](CONFIGURATION.md) - Environment setup
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.0.3) - Official spec
