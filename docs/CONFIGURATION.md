# Configuration Guide

Comprehensive configuration reference for the OpenAPI MCP Server.

## Environment Variables

All configuration uses environment variables. Create a `.env` file in the project root:

```bash
# Copy template
cp .env.example .env

# Edit .env with your values
```

### Required Variables

These are essential for basic functionality:

#### `OPENAPI_SPEC_URL`
- **Type:** URL or file path
- **Default:** `http://localhost:8000/openapi.json`
- **Description:** Where to load your OpenAPI specification from
- **Examples:**
  ```bash
  # Remote URL
  OPENAPI_SPEC_URL=https://api.example.com/openapi.json

  # Local file
  OPENAPI_SPEC_URL=file:///path/to/openapi.json

  # Docker service URL
  OPENAPI_SPEC_URL=http://test-api:8002/openapi.json
  ```

#### `API_BASE_URL`
- **Type:** URL
- **Default:** `http://localhost:8000`
- **Description:** Base URL where the actual API is hosted (for making tool calls)
- **Notes:** Can be different from OPENAPI_SPEC_URL (spec can be at CDN, API at internal service)
- **Examples:**
  ```bash
  # Production API
  API_BASE_URL=https://api.example.com

  # Local testing
  API_BASE_URL=http://localhost:8000

  # Docker service
  API_BASE_URL=http://test-api:8002
  ```

### Transport Configuration

#### `TRANSPORT_MODE`
- **Type:** enum
- **Default:** `http`
- **Options:**
  - `http` - Streamable HTTP (for remote clients, Cloudflare AI Playground)
  - `stdio` - Direct stdin/stdout (for local integrations)
- **Examples:**
  ```bash
  # Remote deployment
  TRANSPORT_MODE=http

  # Local integration
  TRANSPORT_MODE=stdio
  ```

#### `PORT`
- **Type:** number
- **Default:** `3000`
- **Description:** HTTP server port (HTTP mode only, ignored in STDIO mode)
- **Examples:**
  ```bash
  PORT=3000
  PORT=8080
  PORT=0  # Use any available port
  ```

### Security Configuration

#### `API_KEY`
- **Type:** string (bearer token)
- **Default:** _(empty - no auth)*
- **Description:** Optional authentication token sent to your API
- **Format:** Will be sent as `Authorization: Bearer <API_KEY>`
- **Examples:**
  ```bash
  API_KEY=sk_prod_abc123xyz
  API_KEY=eyJhbGc...  # JWT token
  ```

#### `ALLOWED_ORIGINS`
- **Type:** comma-separated string
- **Default:** _(unrestricted - all origins allowed)*
- **Description:** DNS-rebinding protection - whitelist origins that can connect
- **Notes:** Only checked for browser requests (requests with Origin header)
- **Examples:**
  ```bash
  # Single origin
  ALLOWED_ORIGINS=https://playground.ai.cloudflare.com

  # Multiple origins
  ALLOWED_ORIGINS=https://playground.ai.cloudflare.com,https://app.example.com,http://localhost:3000

  # Restricted for production
  ALLOWED_ORIGINS=https://your-domain.com
  ```

### Development Configuration

#### `DEBUG` or `--verbose` flag
- **Type:** boolean flag
- **Default:** `false`
- **Description:** Enable verbose logging
- **Usage:**
  ```bash
  # Option 1: Command line flag
  npm start -- --verbose

  # Option 2: Environment variable
  DEBUG=true npm start
  ```

## Configuration File

The `config.js` file provides default values that can be overridden by environment variables:

```javascript
export const config = {
  openapi: {
    specUrl: process.env.OPENAPI_SPEC_URL || 'http://localhost:8000/openapi.json',
    baseUrl: process.env.API_BASE_URL || 'http://localhost:8000',
    apiKey: process.env.API_KEY || ''
  },
  app: {
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    cleanOutput: !process.argv.includes('--json')
  }
};
```

## .env File Examples

### Example 1: Local Development
```bash
# .env
OPENAPI_SPEC_URL=http://localhost:8000/openapi.json
API_BASE_URL=http://localhost:8000
TRANSPORT_MODE=http
PORT=3000
```

### Example 2: Local Development with Docker
```bash
# .env
OPENAPI_SPEC_URL=http://test-api:8002/openapi.json
API_BASE_URL=http://test-api:8002
TRANSPORT_MODE=http
PORT=3000
```

### Example 3: Production Deployment
```bash
# .env
OPENAPI_SPEC_URL=https://api.example.com/openapi.json
API_BASE_URL=https://api.example.com
API_KEY=sk_prod_your_api_key_here
TRANSPORT_MODE=http
PORT=3000
ALLOWED_ORIGINS=https://playground.ai.cloudflare.com,https://your-domain.com
```

### Example 4: Remote API with Cloudflare tunnel
```bash
# .env
OPENAPI_SPEC_URL=https://api.example.com/openapi.json
API_BASE_URL=https://api.example.com
TRANSPORT_MODE=http
PORT=3000
# Then expose via: cloudflared tunnel --url http://localhost:3000
```

### Example 5: Local Integration (STDIO)
```bash
# .env
OPENAPI_SPEC_URL=http://localhost:8000/openapi.json
API_BASE_URL=http://localhost:8000
TRANSPORT_MODE=stdio
```

## Loading Priority

Configuration is resolved in this order (highest to lowest priority):

1. Environment variables
2. .env file (processed by dotenv)
3. Hardcoded defaults in config.js

**Example:**
```bash
# This environment variable overrides .env and defaults
OPENAPI_SPEC_URL=https://override.example.com npm start
```

## Docker Environment

When using docker-compose, set variables in:

1. **docker-compose.yml** (environment section)
   ```yaml
   environment:
     - OPENAPI_SPEC_URL=http://test-api:8002/openapi.json
     - API_BASE_URL=http://test-api:8002
   ```

2. **.env file** (docker-compose reads .env automatically)
   ```bash
   OPENAPI_SPEC_URL=http://test-api:8002/openapi.json
   ```

3. **Command line override**
   ```bash
   docker-compose run -e OPENAPI_SPEC_URL=http://api:8000 mcp-server
   ```

## Validation

The server performs basic validation on startup:

- ✅ OPENAPI_SPEC_URL is accessible
- ✅ OpenAPI spec parses successfully
- ✅ OpenAPI spec contains endpoints
- ✅ PORT is available (if HTTP mode)

If validation fails, server exits with error message.

## Common Configuration Mistakes

| Issue | Solution |
|-------|----------|
| "Spec not found" | Check OPENAPI_SPEC_URL is correct and accessible |
| "Port already in use" | Change PORT or stop conflicting process |
| "Connection refused to API" | Verify API_BASE_URL is correct and service is running |
| "CORS error" | Check ALLOWED_ORIGINS includes your client origin |
| "Unauthorized (401)" | Verify API_KEY is correct format and valid |

## Dynamic Configuration

To change configuration without restart:

1. Update .env file
2. Restart the server: `npm start`

Note: Configuration is loaded at startup. Changes require restart.

## Sensitive Values

**Best Practices:**

- ✅ Never commit .env to git (it's in .gitignore)
- ✅ Use .env.example for template
- ✅ Use environment variables for sensitive values in CI/CD
- ✅ Rotate API_KEY regularly
- ✅ Use ALLOWED_ORIGINS in production
- ✅ Log sensitive values carefully (they're masked in logs)

## Advanced Options

### Using with Different OpenAPI Formats

The loader supports:
- OpenAPI 3.0.x JSON
- OpenAPI 3.1.x JSON
- Basic YAML support (via JSON parsing)

Variables are always loaded as JSON, so YAML is not directly supported via environment variable, but can be served from a URL that returns YAML.

### Performance Tuning

For large OpenAPI specs (1000+ endpoints):
- The spec is cached after first load
- Subsequent requests use the cache
- No performance impact per request

### Custom Headers

To add custom headers to API calls, modify `src/mcpServer.js`:
```javascript
// In the tool execution handler
const headers = {
  'Authorization': `Bearer ${config.openapi.apiKey}`,
  'X-Custom-Header': 'custom-value'  // Add here
};
```

## Troubleshooting Configuration

**Check current configuration:**
```bash
# The server logs configuration on startup
npm start 2>&1 | grep -i config

# Or access via debug mode
npm start -- --verbose
```

**Verify environment variables are loaded:**
```bash
# Print all loaded vars
node -e "require('dotenv').config(); console.log(process.env)"
```

**Test spec loading directly:**
```bash
# Test if spec is accessible
curl https://api.example.com/openapi.json | jq '.info'
```

## See Also

- [GETTING_STARTED.md](GETTING_STARTED.md) - Quick setup guide
- [TRANSPORT_MODES.md](TRANSPORT_MODES.md) - Transport configuration details
- [ARCHITECTURE.md](ARCHITECTURE.md) - How configuration is used
