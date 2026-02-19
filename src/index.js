import './env.js';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadSpec } from './openapiLoader.js';
import { generateTools } from './toolGenerator.js';
import { McpServer } from './mcpServer.js';
import config from '../config.js';
import logger from './logger.js';


const app = express();
const PORT = process.env.PORT || 3000;
const TRANSPORT_MODE = process.env.TRANSPORT_MODE || 'http'; // 'stdio' or 'http'

// Optional comma-separated allowlist for Origin header validation.
// If unset, all origins are permitted (suitable for server-to-server or dev use).
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null;

app.use(cors());
app.use(express.json());

// --- DNS-rebinding protection ---
function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;         // non-browser clients (curl, Postman, server agents)
  if (!ALLOWED_ORIGINS) return true; // no allowlist configured → open
  return ALLOWED_ORIGINS.includes(origin);
}

// --- Detect InitializeRequest (single or batch) ---
function isInitializeRequest(body) {
  if (!body) return false;
  if (Array.isArray(body)) return body.some(msg => msg?.method === 'initialize');
  return body?.method === 'initialize';
}

// Per-session transport store
const transports = new Map(); // Map<sessionId, StreamableHTTPServerTransport>

(async () => {
  try {
    // 1. Load OpenAPI Spec
    logger.info(`Loading OpenAPI spec from ${config.openapi.specUrl}...`);
    const spec = await loadSpec(config.openapi.specUrl);

    // 2. Generate Tools
    logger.info('Generating tools...');
    const tools = generateTools(spec);
    logger.info(`Generated ${tools.length} tools.`);

    // Factory: each session gets its own McpServer (and therefore its own
    // low-level Server instance) wired to the shared tools/spec.
    function createMcpServer() {
      const mcp = new McpServer(config.openapi.baseUrl);
      mcp.setOpenApiSpec(spec);
      mcp.registerTools(tools);
      return mcp;
    }

    if (TRANSPORT_MODE === 'stdio') {
      // --- STDIO mode (local / direct) ---
      logger.info('Starting MCP server in STDIO mode...');
      const mcp = createMcpServer();
      const transport = new StdioServerTransport();
      await mcp.connect(transport);
      logger.info('MCP server connected via STDIO');

    } else if (TRANSPORT_MODE === 'http') {
      // --- Streamable HTTP mode — 2025-06-18 spec ---
      logger.info('Starting MCP server in Streamable HTTP mode (2025-06-18)...');

      // Single /mcp endpoint handles both GET (SSE listen) and POST (JSON-RPC)
      app.all('/mcp', async (req, res) => {

        // 1. Origin validation (DNS-rebinding protection)
        if (!isAllowedOrigin(req)) {
          logger.warn(`Rejected request from disallowed origin: ${req.headers.origin}`);
          res.status(403).json({ error: 'Forbidden: Origin not allowed' });
          return;
        }

        // 2. Protocol version — default to 2025-03-26 when header is absent
        const protocolVersion = req.headers['mcp-protocol-version'] || '2025-03-26';
        logger.debug(`MCP-Protocol-Version: ${protocolVersion}`);

        // 3. Session routing
        const sessionId = req.headers['mcp-session-id'];

        if (sessionId) {
          // Route to an existing session
          const transport = transports.get(sessionId);
          if (!transport) {
            res.status(404).json({ error: `Session not found: ${sessionId}` });
            return;
          }
          logger.debug(`Routing to existing session: ${sessionId}`);
          await transport.handleRequest(req, res, req.body);

        } else {
          // No session header — only InitializeRequests are allowed without one
          if (req.method !== 'POST' || !isInitializeRequest(req.body)) {
            res.status(400).json({
              error: 'Missing Mcp-Session-Id header. Only initialize requests may omit it.'
            });
            return;
          }

          // Create a new stateful session
          logger.info('New initialize request — creating session...');
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
          });

          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid) {
              logger.info(`Session closed: ${sid}`);
              transports.delete(sid);
            }
          };

          // Connect a fresh server instance to this transport
          const mcp = createMcpServer();
          await mcp.connect(transport);

          // Handle the request — the SDK writes the Mcp-Session-Id response
          // header and the InitializeResponse (or 202 for notifications) here.
          await transport.handleRequest(req, res, req.body);

          // Store for future requests once the session ID is known
          if (transport.sessionId) {
            transports.set(transport.sessionId, transport);
            logger.info(`Session established: ${transport.sessionId}`);
          }
        }
      });

      // 4. Start HTTP server
      app.listen(PORT, () => {
        const mcpUrl = `http://localhost:${PORT}/mcp`;
        console.log(`\n[MCP Server Running - Streamable HTTP (2025-06-18)]`);
        console.log(`> Endpoint: ${mcpUrl}`);
        console.log(`>   GET  ${mcpUrl}  → open SSE stream (requires Mcp-Session-Id header)`);
        console.log(`>   POST ${mcpUrl}  → send JSON-RPC message`);
        console.log(`> Tools:    ${tools.length} available\n`);
      });

    } else {
      throw new Error(`Unknown transport mode: ${TRANSPORT_MODE}. Use 'stdio' or 'http'`);
    }

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
})();
