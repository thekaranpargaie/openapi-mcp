# Documentation Index

Complete documentation for the OpenAPI MCP Server.

## Getting Started

**New to the project?** Start here:

- **[GETTING_STARTED.md](GETTING_STARTED.md)** - 5-minute quick start guide
  - Installation
  - Basic configuration
  - Testing setup
  - First connection to Cloudflare AI Playground

## Core Concepts

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design and how components work
  - Data flow diagrams
  - Module breakdown
  - Tool registration
  - Session management
  - Performance considerations

- **[TRANSPORT_MODES.md](TRANSPORT_MODES.md)** - HTTP vs STDIO transport
  - Protocol specifications
  - When to use each mode
  - Connection endpoints
  - Technical details
  - Testing each mode

## Configuration

- **[CONFIGURATION.md](CONFIGURATION.md)** - Complete configuration reference
  - All environment variables
  - Configuration examples
  - Security settings
  - Docker integration
  - Priority/loading order

## Integration

- **[API_INTEGRATION.md](API_INTEGRATION.md)** - How to connect your API
  - Quick integration steps
  - Authentication methods
  - Request/response handling
  - API patterns
  - OpenAPI spec requirements
  - Testing integration
  - Production deployment

## Troubleshooting

- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Solutions to common issues
  - Server won't start
  - Connection problems
  - Tool execution errors
  - Transport mode issues
  - Docker-specific issues
  - Performance tuning
  - Debugging techniques
  - Error message reference

## For Developers

- **[../test/README.md](../test/README.md)** - Testing guide
  - Test scripts explanation
  - Running tests
  - What gets tested
  - Troubleshooting tests

- **[../README.md](../README.md)** - Main project README
  - Project overview
  - Quick start
  - Project structure
  - Feature summary

## Quick Links

### Common Tasks

| Task | Documentation |
|------|---------------|
| Deploy to Cloudflare | [GETTING_STARTED.md](GETTING_STARTED.md#connect-to-cloudflare-ai-playground) |
| Connect my API | [API_INTEGRATION.md](API_INTEGRATION.md) |
| Fix connection error | [TROUBLESHOOTING.md](TROUBLESHOOTING.md#connection-issues) |
| Understand architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Configure advanced options | [CONFIGURATION.md](CONFIGURATION.md) |
| Learn HTTP vs STDIO | [TRANSPORT_MODES.md](TRANSPORT_MODES.md) |
| Run tests | [../test/README.md](../test/README.md) |

### By Role

**For Casual Users:**
1. [GETTING_STARTED.md](GETTING_STARTED.md)
2. [TRANSPORT_MODES.md](TRANSPORT_MODES.md)
3. [API_INTEGRATION.md](API_INTEGRATION.md)

**For Team Leads:**
1. [ARCHITECTURE.md](ARCHITECTURE.md)
2. [CONFIGURATION.md](CONFIGURATION.md)
3. [API_INTEGRATION.md](API_INTEGRATION.md)

**For Developers:**
1. [ARCHITECTURE.md](ARCHITECTURE.md)
2. [API_INTEGRATION.md](API_INTEGRATION.md) (authentication section)
3. [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
4. [../test/README.md](../test/README.md)

**For DevOps/SRE:**
1. [TRANSPORT_MODES.md](TRANSPORT_MODES.md)
2. [CONFIGURATION.md](CONFIGURATION.md)
3. [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
4. [ARCHITECTURE.md](ARCHITECTURE.md) (performance section)

## Environment Variables Quick Reference

| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `OPENAPI_SPEC_URL` | URL/path | `http://localhost:8000/openapi.json` | Where to load API spec |
| `API_BASE_URL` | URL | `http://localhost:8000` | Where the API is running |
| `API_KEY` | string | _(empty)_ | Bearer token for API auth |
| `TRANSPORT_MODE` | enum | `http` | `http` or `stdio` |
| `PORT` | number | `3000` | HTTP server port |
| `ALLOWED_ORIGINS` | string | _(unrestricted)_ | DNS-rebinding protection |

See [CONFIGURATION.md](CONFIGURATION.md) for details.

## File Structure

```
docs/
├── README.md                  # This file (index)
├── GETTING_STARTED.md        # 5-minute quickstart
├── ARCHITECTURE.md           # System design
├── TRANSPORT_MODES.md        # HTTP vs STDIO
├── CONFIGURATION.md          # Environment variables
├── API_INTEGRATION.md        # Connecting your API
└── TROUBLESHOOTING.md        # Common issues & solutions
```

## FAQ

**Q: Where do I start?**
→ [GETTING_STARTED.md](GETTING_STARTED.md)

**Q: How do I connect my API?**
→ [API_INTEGRATION.md](API_INTEGRATION.md)

**Q: What's the difference between HTTP and STDIO?**
→ [TRANSPORT_MODES.md](TRANSPORT_MODES.md)

**Q: How do I configure authentication?**
→ [API_INTEGRATION.md](API_INTEGRATION.md#authentication-methods) and [CONFIGURATION.md](CONFIGURATION.md#security-configuration)

**Q: Server won't start, what do I do?**
→ [TROUBLESHOOTING.md](TROUBLESHOOTING.md#server-wont-start)

**Q: Tools are created but calls fail**
→ [TROUBLESHOOTING.md](TROUBLESHOOTING.md#toolapi-execution-problems)

**Q: How do I deploy to production?**
→ [API_INTEGRATION.md](API_INTEGRATION.md#production-deployment) and [CONFIGURATION.md](CONFIGURATION.md#docker-environment)

**Q: How does it work internally?**
→ [ARCHITECTURE.md](ARCHITECTURE.md)

## Document Conventions

### Code Examples

```bash
# Shell commands
npm start

# Environment variables in snippets
VARIABLE=value npm start
```

```javascript
// JavaScript code
import config from './config.js';
```

```json
// JSON examples
{
  "key": "value"
}
```

### Notes and Warnings

> **Note:** Important information
> Useful context or tips

⚠️ **Warning:** Potential issues

✅ **Success:** Positive outcomes

❌ **Error:** Problems to avoid

### Cross-References

Links use relative paths:
- [GETTING_STARTED.md](GETTING_STARTED.md)
- [../README.md](../README.md)
- [../test/README.md](../test/README.md)

## Keeping Documentation Updated

When changes are made to the server:

1. Update relevant documentation
2. Update this index if adding new docs
3. Check cross-references are still valid
4. Verify examples still work

## License & Support

For issues not covered in documentation:
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Review [ARCHITECTURE.md](ARCHITECTURE.md) for understanding the system
- Enable verbose logging: `npm start -- --verbose`
