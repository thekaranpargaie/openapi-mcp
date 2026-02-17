import './env.js';
import express from 'express';
import cors from 'cors';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { loadSpec } from './openapiLoader.js';
import { generateTools } from './toolGenerator.js';
import { McpServer } from './mcpServer.js';
import config from '../config.js';
import logger from './logger.js';


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Transport storage for SSE
const transports = new Map();

(async () => {
  try {
    // 1. Load OpenAPI Spec
    logger.info(`Loading OpenAPI spec from ${config.openapi.specUrl}...`);
    const spec = await loadSpec(config.openapi.specUrl);

    // 2. Generate Tools
    logger.info('Generating tools...');
    const tools = generateTools(spec);
    logger.info(`Generated ${tools.length} tools.`);

    // 3. Initialize MCP Server
    const mcp = new McpServer(config.openapi.baseUrl);
    mcp.setOpenApiSpec(spec);
    mcp.registerTools(tools);

    // 4. SSE Endpoints
    app.get('/mcp/stream', async (req, res) => {
      logger.info('New SSE connection initiated');
      const transport = new SSEServerTransport("/mcp/messages", res);

      // Store transport by session ID
      // Note: new transport instance creates a sessionId
      // We set up the transport then connect

      await mcp.connect(transport);

      // The transport.sessionId is available after construction or start?
      // In current SDK, sessionId is UUID generated in constructor.
      transports.set(transport.sessionId, transport);

      logger.info(`Session assigned: ${transport.sessionId}`);

      req.on('close', () => {
        logger.info(`Session closed: ${transport.sessionId}`);
        transports.delete(transport.sessionId);
      });
    });

    app.post('/mcp/messages', async (req, res) => {
      const sessionId = req.query.sessionId;
      if (!sessionId) {
        res.status(400).send("Missing sessionId parameter");
        return;
      }

      const transport = transports.get(sessionId);
      if (!transport) {
        res.status(404).send("Session not found");
        return;
      }

      await transport.handlePostMessage(req, res);
    });

    // 5. Start Server
    app.listen(PORT, () => {
      const serverUrl = `http://localhost:${PORT}/mcp/stream`;
      console.log(`\n\n[MCP Server Running]`);
      console.log(`> Stream URL: ${serverUrl}`);
      console.log(`> Post URL:   http://localhost:${PORT}/mcp/messages`);
      console.log(`> Tools:      ${tools.length} available\n`);
    });

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
})();
