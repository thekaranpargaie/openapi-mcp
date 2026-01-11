import Ajv from 'ajv';
import fetch from 'node-fetch';

const ajv = new Ajv();

export class McpServer {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.tools = [];
    this.openapi = null;
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
      try {
        if (!tool.validate(args)) {
          throw new Error(`Validation failed: ${JSON.stringify(tool.validate.errors)}`);
        }
      } catch (err) {
        console.warn(`Validation warning: ${err.message}. Proceeding anyway.`);
      }
    }

    const res = await fetch(this.baseUrl + tool.path, {
      method: tool.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.API_KEY || ''
      },
      body: tool.method === 'GET' ? undefined : JSON.stringify(args)
    });

    return res.json();
  }
}
