import Ajv from 'ajv';
import logger from './logger.js';

const ajv = new Ajv();

export class McpServer {
  constructor(baseUrl, config = {}) {
    this.baseUrl = baseUrl;
    this.tools = [];
    this.openapi = null;
    this.config = {
      strict: config.strict ?? false  // If true, validation errors stop execution
    };
  }

  setOpenApiSpec(spec) {
    this.openapi = spec;
    ajv.addMetaSchema(spec);
  }

  registerTools(tools) {
    this.tools = tools.map(t => ({
      ...t,
      validate: t.schema ? ajv.compile(t.schema) : null
    }));
  }

  listTools() {
    return this.tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.schema || { type: 'object' }
    }));
  }

  async execute(name, args) {
    const tool = this.tools.find(t => t.name === name);
    if (!tool) throw new Error('Tool not found');

    if (tool.validate) {
      const valid = tool.validate(args);
      if (!valid) {
        const errorMsg = `Validation failed: ${JSON.stringify(tool.validate.errors)}`;
        if (this.config.strict) {
          throw new Error(errorMsg);
        } else {
          logger.debug(`Validation warning: ${errorMsg}. Proceeding anyway.`);
        }
      }
    }

    // Substitute path parameters
    let url = this.baseUrl + tool.path;
    const pathParams = new Set();
    url = url.replace(/{([^}]+)}/g, (match, paramName) => {
      pathParams.add(paramName);
      return args[paramName] !== undefined ? args[paramName] : match;
    });

    // Build query string for GET requests
    if (tool.method === 'GET') {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(args)) {
        if (!pathParams.has(key)) {
          queryParams.append(key, value);
        }
      }
      if (queryParams.toString()) {
        url += '?' + queryParams.toString();
      }
    }

    const res = await fetch(url, {
      method: tool.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.API_KEY || ''
      },
      body: tool.method === 'GET' ? undefined : JSON.stringify(args)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${errorText}`);
    }

    return res.json();
  }
}
