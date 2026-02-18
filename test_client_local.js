import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const EventSourcePkg = require('eventsource');

const logFile = 'test_client_local.log';
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};
const errorLog = (msg) => {
    console.error(msg);
    fs.appendFileSync(logFile, 'ERROR: ' + msg + '\n');
};

fs.writeFileSync(logFile, '');

// If it's not a function, check for .EventSource property
let EventSourceClass = EventSourcePkg;
if (EventSourcePkg.EventSource) {
    EventSourceClass = EventSourcePkg.EventSource;
}
global.EventSource = EventSourceClass;

const client = new Client(
    {
        name: "test-client-local",
        version: "1.0.0",
    },
    {
        capabilities: {},
    }
);

async function main() {
    try {
        const url = "http://localhost:3003/mcp/stream";
        log(`Creating transport for ${url}...`);

        const transport = new SSEClientTransport(new URL(url));

        log("Connecting to transport...");
        await client.connect(transport);
        log("Connected successfully!");

        log("Listing tools...");
        const tools = await client.listTools();
        log("Tools available: " + JSON.stringify(tools, null, 2));

        await client.close();
        log("Closed connection.");
        process.exit(0);
    } catch (error) {
        errorLog("CAUGHT ERROR: " + error);
        if (error.stack) errorLog(error.stack);
        process.exit(1);
    }
}

main();
