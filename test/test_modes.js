#!/usr/bin/env node

/**
 * Test script for MCP Server - demonstrates both HTTP and STDIO modes
 * 
 * Usage:
 *   node test_modes.js http      - Test HTTP mode
 *   node test_modes.js stdio     - Test STDIO mode
 */

import { spawn } from 'child_process';
import http from 'http';

const MODE = process.argv[2] || 'http';

console.log(`\n[Test] Starting MCP server in ${MODE.toUpperCase()} mode...\n`);

if (MODE === 'http') {
  testHttpMode();
} else if (MODE === 'stdio') {
  testStdioMode();
} else {
  console.error('Invalid mode. Use "http" or "stdio"');
  process.exit(1);
}

function testHttpMode() {
  // Start server in HTTP mode
  const server = spawn('node', ['src/index.js'], {
    env: { ...process.env, TRANSPORT_MODE: 'http', PORT: '3001' },
    stdio: 'inherit'
  });

  // Wait for server to start, then send a test message
  setTimeout(() => {
    console.log('\n[Test] Sending HTTP test request...\n');
    
    const testMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/mcp/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      console.log(`[Test] Status: ${res.statusCode}`);
      console.log(`[Test] Headers: ${JSON.stringify(res.headers)}\n`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('[Test] Response:', data);
        server.kill();
        process.exit(0);
      });
    });

    req.on('error', (error) => {
      console.error('[Test] Error:', error.message);
      server.kill();
      process.exit(1);
    });

    req.write(JSON.stringify(testMessage));
    req.end();
  }, 2000);

  server.on('exit', (code) => {
    if (code !== null) {
      console.log(`\n[Test] Server exited with code ${code}`);
    }
  });
}

function testStdioMode() {
  // Start server in STDIO mode
  const server = spawn('node', ['src/index.js'], {
    env: { ...process.env, TRANSPORT_MODE: 'stdio' },
    stdio: ['pipe', 'pipe', 'inherit']
  });

  console.log('[Test] Server started in STDIO mode');
  console.log('[Test] Sending test message via stdin...\n');

  // Send a test message via stdin
  const testMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  server.stdin.write(JSON.stringify(testMessage) + '\n');

  // Capture response
  let responseData = '';
  server.stdout.on('data', (data) => {
    responseData += data.toString();
    console.log('[Test] Received:', data.toString());
    
    if (responseData.includes('jsonrpc')) {
      server.kill();
      process.exit(0);
    }
  });

  server.on('exit', (code) => {
    if (code !== null) {
      console.log(`\n[Test] Server exited with code ${code}`);
    }
  });

  // Timeout after 5 seconds
  setTimeout(() => {
    console.log('\n[Test] Timeout - closing server');
    server.kill();
    process.exit(0);
  }, 5000);
}
