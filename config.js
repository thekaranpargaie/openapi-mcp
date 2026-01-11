/**
 * Configuration file for API keys, URLs, and other settings
 * Keep this file secure and never commit it to version control
 */

export const config = {
  // Groq API Configuration
  groq: {
    apiKey: process.env.GROQ_API_KEY || 'PASTE_YOUR_GROQ_API_KEY_HERE',
    model: 'llama-3.1-8b-instant',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1
  },

  // OpenAPI Configuration
  openapi: {
    specUrl: process.env.OPENAPI_SPEC_URL || 'http://localhost:8000/openapi.json',
    baseUrl: process.env.API_BASE_URL || 'http://localhost:8000',
    apiKey: process.env.API_KEY || ''
  },

  // Application Settings
  app: {
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    cleanOutput: !process.argv.includes('--json')
  },

  // Chat Configuration
  chat: {
    systemPrompt: `You are a helpful assistant that has access to the following tools:

{TOOLS_LIST}

IMPORTANT: When you need to call a tool, you MUST output it in this EXACT format:

tool_name: {
  "name": "tool_name",
  "args": {
    "param1": "value1",
    "param2": "value2"
  }
}

For example:
list_users_users_get: {
  "name": "list_users_users_get",
  "args": {}
}

RULES:
1. The format MUST be exactly: tool_name: { "name": "...", "args": {...} }
2. You must call tools to help the user
3. Always provide the tool name before the JSON object
4. The JSON must be valid and parseable
5. If a tool call fails, explain what went wrong

After tool execution, provide a human-friendly response about the results.
Think about what tool to use, then provide the tool call in the exact format above.`
  }
};

export default config;
