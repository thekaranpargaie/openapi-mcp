import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
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
          resources: {},
        },
      }
    );
    this.tools = [];
    this._resources = [];
    this._resourceTemplates = [];

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

    // -----------------------------------------------------------------------
    // Resources — static list (populated dynamically from spec)
    // -----------------------------------------------------------------------
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: this._resources };
    });

    // -----------------------------------------------------------------------
    // Resources — parameterised templates (populated dynamically from spec)
    // -----------------------------------------------------------------------
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
      return { resourceTemplates: this._resourceTemplates };
    });

    // -----------------------------------------------------------------------
    // Resources — read / fetch
    // -----------------------------------------------------------------------
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      logger.info(`Reading resource: ${uri}`);

      const text = await this.readResource(uri);
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text,
        }],
      };
    });
  }

  setOpenApiSpec(spec) {
    this.openapi = spec;

    // -----------------------------------------------------------------------
    // Derive resources and templates from the spec's GET operations.
    // No path params  → static resource  (api://<path>)
    // Has path params → URI template     (api://<path/{param}>)
    // The spec itself is always exposed as openapi://spec
    // -----------------------------------------------------------------------
    this._resources = [
      {
        uri: 'openapi://spec',
        name: `${spec.info?.title || 'API'} — OpenAPI Specification`,
        description:
          `Full OpenAPI spec for ${spec.info?.title || 'this API'}` +
          (spec.info?.version ? ` v${spec.info.version}` : '') +
          '. Use this to understand all available endpoints, parameters, and response schemas.',
        mimeType: 'application/json',
      },
    ];
    this._resourceTemplates = [];

    for (const [path, pathItem] of Object.entries(spec.paths || {})) {
      const op = pathItem?.get;
      if (!op) continue; // only expose readable (GET) endpoints as resources

      const hasPathParams = path.includes('{');
      // Convert OpenAPI path to a URI: strip leading slash, keep {param} notation
      const uriPath = path.replace(/^\//, '');
      const name = op.summary || op.operationId || `GET ${path}`;
      const description =
        op.description || op.summary || `Live data from GET ${path}`;

      if (hasPathParams) {
        this._resourceTemplates.push({
          uriTemplate: `api://${uriPath}`,
          name,
          description,
          mimeType: 'application/json',
        });
      } else {
        this._resources.push({
          uri: `api://${uriPath}`,
          name,
          description,
          mimeType: 'application/json',
        });
      }
    }

    logger.info(
      `Resources derived from spec: ${this._resources.length} static, ` +
      `${this._resourceTemplates.length} templates`
    );
  }

  registerTools(tools) {
    this.tools = tools;
  }

  // -------------------------------------------------------------------------
  // Resource fetcher — maps URIs to live API calls or cached spec
  // -------------------------------------------------------------------------
  async readResource(uri) {
    // Static: the OpenAPI spec loaded at startup
    if (uri === 'openapi://spec') {
      return JSON.stringify(this.openapi, null, 2);
    }

    // Strip the custom scheme and map to a real API path
    // api://users              → GET /users
    // api://tasks              → GET /tasks
    // api://users/{id}         → GET /users/{id}
    // api://users/{id}/tasks   → GET /users/{id}/tasks
    const apiPath = uri.replace(/^api:\/\//, '/');
    const url = this.baseUrl + apiPath;

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.API_KEY || '',
      },
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status} fetching resource ${uri}`);
    }

    const data = await res.json();
    return JSON.stringify(data, null, 2);
  }

  async executeTool(tool, args) {
    logger.info(`Executing tool: ${tool.name} with args: ${JSON.stringify(args)}`);

    const paramLocations = tool.paramLocations || {};

    // -------------------------------------------------------------------------
    // 1. Substitute path parameters in the URL
    // -------------------------------------------------------------------------
    let url = this.baseUrl + tool.path;
    const pathParamNames = new Set();
    url = url.replace(/{([^}]+)}/g, (match, paramName) => {
      pathParamNames.add(paramName);
      return args[paramName] !== undefined ? encodeURIComponent(String(args[paramName])) : match;
    });

    // -------------------------------------------------------------------------
    // 2. Bucket remaining args by their declared location
    // -------------------------------------------------------------------------
    const queryParams = new URLSearchParams();
    const extraHeaders = {};
    const bodyParams = {};

    for (const [key, value] of Object.entries(args)) {
      if (pathParamNames.has(key)) continue; // already embedded in URL

      const location = paramLocations[key];

      if (location === 'header') {
        extraHeaders[key] = String(value);
      } else if (location === 'query') {
        if (value !== null && value !== undefined) {
          queryParams.append(key, String(value));
        }
      } else if (location === 'body') {
        bodyParams[key] = value;
      } else {
        // Fallback: GET → query string, everything else → body
        if (tool.method === 'GET') {
          if (value !== null && value !== undefined) {
            queryParams.append(key, String(value));
          }
        } else {
          bodyParams[key] = value;
        }
      }
    }

    if (queryParams.toString()) {
      url += '?' + queryParams.toString();
    }

    // -------------------------------------------------------------------------
    // 3. Build fetch options
    // -------------------------------------------------------------------------
    const options = {
      method: tool.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.API_KEY || '',
        ...extraHeaders,          // header-location parameters
      },
    };

    if (tool.method !== 'GET' && Object.keys(bodyParams).length > 0) {
      options.body = JSON.stringify(bodyParams);
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
