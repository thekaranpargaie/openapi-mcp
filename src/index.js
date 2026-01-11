import { loadSpec } from './openapiLoader.js';
import { generateTools } from './toolGenerator.js';
import { McpServer } from './mcpServer.js';
import { startChat } from './chat.js';
import config from '../config.js';

(async () => {
  const spec = await loadSpec(config.openapi.specUrl);
  const tools = generateTools(spec);

  const mcp = new McpServer(config.openapi.baseUrl);
  mcp.setOpenApiSpec(spec);
  mcp.registerTools(tools);

  startChat(mcp);
})();
