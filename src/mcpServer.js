import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import logger from './logger.js';


export class McpServer {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.server = new Server(
      {
        name: "openapi-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    this.tools = [];

    // Set up request handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools.map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.schema || { type: 'object' }
        }))
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments || {};

      const tool = this.tools.find(t => t.name === toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      return this.executeTool(tool, args);
    });
  }

  setOpenApiSpec(spec) {
    this.openapi = spec;
  }

  registerTools(tools) {
    this.tools = tools;
  }

  async executeTool(tool, args) {
    logger.info(`Executing tool: ${tool.name} with args: ${JSON.stringify(args)}`);

    // Substitute path parameters
    let url = this.baseUrl + tool.path;
    const pathParams = new Set();
    url = url.replace(/{([^}]+)}/g, (match, paramName) => {
      pathParams.add(paramName);
      return args[paramName] !== undefined ? args[paramName] : match;
    });

    // Build query string for GET requests
    let options = {
      method: tool.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.API_KEY || ''
      }
    };

    if (tool.method === 'GET') {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(args)) {
        if (!pathParams.has(key)) {
          queryParams.append(key, String(value));
        }
      }
      if (queryParams.toString()) {
        url += '?' + queryParams.toString();
      }
    } else {
      options.body = JSON.stringify(args);
    }

    try {
      const res = await fetch(url, options);

      if (!res.ok) {
        const errorText = await res.text();
        return {
          content: [{
            type: "text",
            text: `HTTP Error ${res.status}: ${errorText}`
          }],
          isError: true
        };
      }

      const data = await res.json();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(data, null, 2)
        }]
      };
    } catch (error) {
      logger.error(`Error executing tool ${tool.name}: ${error.message}`);
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }

  async connect(transport) {
    await this.server.connect(transport);
  }
}
