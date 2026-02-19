/**
 * Configuration file for OpenAPI MCP Server
 * Environment variables override these defaults
 */

export const config = {
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
  }
};

export default config;
