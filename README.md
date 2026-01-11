# OpenAPI → MCP-style AI Chat (Working MVP)

This is a **working MVP** that:
- Accepts **OpenAPI v3 JSON**
- Converts endpoints into AI tools
- Provides a **CLI chat interface**
- Executes real API calls safely
- Uses Groq API for chat intelligence

## Requirements
- Node.js 18+
- npm
- Groq API key

## Setup

### 1. Clone and Install
```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update with your values:
```bash
cp .env.example .env
```

Then edit `.env`:
```bash
GROQ_API_KEY=your_groq_api_key
OPENAPI_SPEC_URL=http://localhost:8000/openapi.json
API_BASE_URL=http://localhost:8000
```

### 3. Run the Application
```bash
npm start
```

## Configuration

All configuration is managed in `config.js`. You can:
- Update API endpoints
- Adjust Groq model settings (temperature, max tokens, etc.)
- Customize system prompts

Environment variables override hardcoded values in `config.js`.

## Usage
```text
> can you list all users
> create a task for rajesh to get some eggs
> get all tasks
```

## Project Structure

- `config.js` - Centralized configuration for APIs, secrets, and settings
- `src/index.js` - Application entry point
- `src/chat.js` - Chat interface and tool calling logic
- `src/mcpServer.js` - MCP server that manages tools and executes API calls
- `src/openapiLoader.js` - Loads OpenAPI specs from URLs or files
- `src/toolGenerator.js` - Converts OpenAPI endpoints into callable tools
- `.env.example` - Example environment variables

---

This is a minimal but real implementation using Groq API for chat and dynamic OpenAPI integration.
