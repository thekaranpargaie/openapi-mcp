# Troubleshooting Guide

Solutions to common issues when running the OpenAPI MCP Server.

## Server Won't Start

### "Error: EADDRINUSE: address already in use :::3000"

**Cause:** Another process is using the same port.

**Solutions:**
```bash
# Option 1: Use a different port
PORT=3001 npm start

# Option 2: Kill process using port 3000
# On Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# On macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### "Error: Cannot find module '@modelcontextprotocol/sdk'"

**Cause:** Dependencies not installed or corrupted.

**Solutions:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
npm install
```

### "Error: Failed to load OpenAPI spec"

**Cause:** OPENAPI_SPEC_URL is unreachable or invalid.

**Solutions:**
```bash
# Verify spec URL is accessible
curl https://api.example.com/openapi.json

# Check .env file for typos
cat .env | grep OPENAPI_SPEC_URL

# Verify the URL returns valid JSON
curl https://api.example.com/openapi.json | jq '.'

# If using local file, check path
ls -la /path/to/openapi.json
```

## Connection Issues

### "Error: Connection refused to API"

**Cause:** API_BASE_URL is unreachable.

**Solutions:**
```bash
# Verify API is running
curl https://api.example.com/health

# Check API_BASE_URL in .env
cat .env | grep API_BASE_URL

# Test network connectivity
ping api.example.com

# Check firewall rules
# On Windows: netsh advfirewall show allprofiles

# For Docker: verify service name and network
docker network ls
docker network inspect mcp-network  # from docker-compose
```

### "error: CORS error / origin not allowed"

**Cause:** Client origin not whitelisted.

**Solutions:**
```bash
# Remove origin restrictions (dev only)
unset ALLOWED_ORIGINS
npm start

# Or add origin to whitelist
ALLOWED_ORIGINS=https://your-origin.com npm start

# Verify origin in browser console
# console.log(window.location.origin)

# Check docker-compose if using that
# Ensure API service is on same network
docker compose logs -f
```

## Tool/API Execution Problems

### "Error: No tools available / tools/list returns empty"

**Cause:** OpenAPI spec has no valid endpoints or spec parsing failed.

**Solutions:**
```bash
# Verify spec contains endpoints
curl https://api.example.com/openapi.json | jq '.paths'

# Check spec version support
curl https://api.example.com/openapi.json | jq '.openapi'
# Should be 3.0.x or 3.1.x

# Check for spec errors
npm start -- --verbose 2>&1 | grep -i "tool\|error\|generated"

# Verify spec is valid JSON
curl https://api.example.com/openapi.json | jq '.' > /dev/null && echo "Valid"
```

### "Error: Invalid tool parameter / parameter validation failed"

**Cause:** Client sent invalid parameters or schema mismatch.

**Solutions:**
```bash
# Check tool schema
# Get tools list, examine inputSchema for specific tool

# Verify parameter types match spec
# String: "param": "value"
# Number: "param": 123
# Boolean: "param": true
# Object: "param": {...}

# Enable verbose logging to see validation errors
npm start -- --verbose
# Look for "AJV validation" errors
```

### "Error: 401 Unauthorized / 403 Forbidden"

**Cause:** API authentication failed.

**Solutions:**
```bash
# Verify API_KEY is correct
cat .env | grep API_KEY

# Test API key manually
curl -H "Authorization: Bearer YOUR_KEY" https://api.example.com/endpoint

# Check API key format
# Should be: sk_xxx, eyJhbGc... (JWT), or similar
# NOT: "Bearer YOUR_KEY" (server adds this automatically)

# Regenerate API key if expired
# Then update .env and restart

# Check API documentation for required headers
# May need custom headers beyond Authorization
```

### "Error: Tool execution timeout / hanging request"

**Cause:** API taking too long to respond.

**Solutions:**
```bash
# Test API endpoint directly
curl --max-time 10 https://api.example.com/endpoint

# Check API logs for slow queries
# Optimize database queries on API side

# Increase timeout in src/mcpServer.js if needed
// Search for 'timeout' in mcpServer.js and adjust

# Monitor API performance
# Use API's monitoring/logging tools
```

## Transport Mode Problems

### HTTP Mode Issues

#### "Error: SSE stream closed unexpectedly"

**Cause:** Connection interrupted or session cleanup.

**Solutions:**
```bash
# Check network connectivity
# Look at browser console for connection errors

# Verify ALLOWED_ORIGINS if crossing domains
ALLOWED_ORIGINS=https://playground.ai.cloudflare.com npm start

# Try without origin restriction (dev)
# unset ALLOWED_ORIGINS

# Check if server process crashed
npm start 2>&1 | tail -20
```

#### "Error: Mcp-Session-Id header missing / invalid"

**Cause:** Client not using session ID correctly.

**Solutions:**
```bash
# Session ID must be in header for GET/POST after initialize
# GET /mcp
# Headers: {
#   "Mcp-Session-Id": "abc-123-def"
# }

# Get session ID from initialize response
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize",...}'

# Look for "Mcp-Session-Id" in response headers
```

### STDIO Mode Issues

#### "Error: No input received / hanging forever"

**Cause:** stdin not connected or not receiving data.

**Solutions:**
```bash
# Verify STDIO mode is enabled
cat .env | grep TRANSPORT_MODE

# Test with echo
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npm start

# Check subprocess creation
# Look at parent process managing stdio

# Verify shell has proper piping
# Use: stdin must be connected to pipe, not /dev/null
```

## Cloudflare AI Playground Issues

### "Error: Failed to connect to MCP server"

**Cause:** URL unreachable or session initialization failed.

**Solutions:**
```bash
# Verify tunnel is active
# If using ngrok: ngrok http 3000
# If using cloudflared: cloudflared tunnel --url http://localhost:3000

# Test tunnel URL directly
curl https://your-tunnel-url/mcp

# Verify initialize request works
curl -X POST https://your-tunnel-url/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize",...}'

# Check browser console for CORS errors
```

### "Tools discovered but can't call them"

**Cause:** Tool execution failing, usually authentication or parameter issue.

**Solutions:**
```bash
# Check server logs during tool call
npm start -- --verbose

# Look for: "Tool execution error", "API returned", error codes

# Test tool directly
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"tool_name",
      "arguments":{...}
    }
  }'

# Check API endpoint directly
curl https://api.example.com/endpoint
```

## Docker-Specific Issues

### "Error: test-api service not found"

**Cause:** Docker network not configured correctly.

**Solutions:**
```bash
# Rebuild docker-compose
docker compose down
docker compose up --build

# Check services are running
docker compose ps

# Check network connectivity
docker compose exec mcp-server curl http://test-api:8002/health

# Verify service names in docker-compose.yml
docker compose config
```

### "Error: Port 3000 already in use (Docker)"

**Solutions:**
```bash
# Change port in docker-compose.yml
# Or use -p flag
docker compose run -p 3001:3000 mcp-server

# Kill existing containers
docker compose down
docker system prune

# List running containers
docker ps
```

## Performance Issues

### "Server slow / high memory usage"

**Causes:** Large OpenAPI spec, many concurrent connections.

**Solutions:**
```bash
# Check spec size
curl https://api.example.com/openapi.json | wc -c

# Monitor memory
npm start 2>&1 | grep -i memory

# Reduce spec complexity if possible
# Generate spec excluding internal endpoints

# For Docker:
docker stats mcp-server
```

### "Tools/list is slow"

**Cause:** Large number of endpoints (100+).

**Solutions:**
```bash
# Spec is cached after first load
# Subsequent calls should be fast

# If still slow, check network
curl --verbose https://api.example.com/openapi.json

# Monitor server logs
npm start -- --verbose | grep -i "tool\|load\|cache"
```

## Debugging Techniques

### Enable Verbose Logging
```bash
npm start -- --verbose
```

### Check All Environment Variables
```bash
node -e "require('dotenv').config(); Object.entries(process.env).forEach(([k,v]) => console.log(k+'='+v))"
```

### Test OpenAPI Spec Validity
```bash
npm run test:http  # Tests spec loading and tool generation
```

### Monitor Network Activity
```bash
# Inside docker-compose
docker compose logs -f mcp-server

# On local machine
npm start 2>&1 | tee debug.log
```

### Check Config is Loaded
```bash
# See what config.js loaded
node -e "import('./config.js').then(m => console.log(JSON.stringify(m.default, null, 2)))"
```

## Common Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| "EADDRINUSE" | Port in use | Change PORT or kill process |
| "ENOTFOUND" | DNS lookup failed | Check URL spelling, network |
| "ECONNREFUSED" | Connection refused | Start target service |
| "401 Unauthorized" | Auth failed | Check API_KEY |
| "403 Forbidden" | Access denied | Check permissions, scope |
| "404 Not Found" | Endpoint doesn't exist | Check path in OpenAPI spec |
| "CORS error" | Origin not allowed | Add to ALLOWED_ORIGINS |
| "Cannot find module" | Missing dependency | Run npm install |
| "Invalid schema" | Bad OpenAPI spec | Validate spec at https://editor.swagger.io |

## Getting Help

If you're stuck:

1. **Check the logs**
   ```bash
   npm start -- --verbose 2>&1 | head -50
   ```

2. **Read relevant docs**
   - [CONFIGURATION.md](CONFIGURATION.md) - Configuration issues
   - [TRANSPORT_MODES.md](TRANSPORT_MODES.md) - Connection issues
   - [ARCHITECTURE.md](ARCHITECTURE.md) - System design

3. **Test with curl**
   ```bash
   # Initialize
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize",...}'
   
   # List tools
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
   ```

4. **Verify prerequisites**
   - Node.js 18+
   - npm packages installed
   - API is running
   - OpenAPI spec is valid
   - Network connectivity

5. **Check .env file**
   - All variables set correctly
   - No typos in URLs
   - File is readable

Still stuck? Check if this is a known issue by:
- Searching the server logs
- Testing with the included test-api service
- Running the test scripts
