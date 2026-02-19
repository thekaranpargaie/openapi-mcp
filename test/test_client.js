import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const EventSourcePkg = require('eventsource');

// Check what strictly is returned
const logFile = 'test_client.log';
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};
const errorLog = (msg) => {
    console.error(msg);
    fs.appendFileSync(logFile, 'ERROR: ' + msg + '\n');
};

fs.writeFileSync(logFile, '');

log("Type of require('eventsource'): " + typeof EventSourcePkg);
log("EventSourcePkg keys: " + Object.keys(EventSourcePkg));
log("Is EventSourcePkg a function/constructor? " + (typeof EventSourcePkg === 'function'));

// If it's not a function, check for .EventSource property
let EventSourceClass = EventSourcePkg;
if (EventSourcePkg.EventSource) {
    EventSourceClass = EventSourcePkg.EventSource;
    log("Found EventSource property, using that.");
}

global.EventSource = EventSourceClass;
globalThis.EventSource = EventSourceClass;

log("Global EventSource set. Type: " + typeof global.EventSource);

const client = new Client(
    {
        name: "test-client",
        version: "1.0.0",
    },
    {
        capabilities: {},
    }
);

async function main() {
    try {
        const url = "https://mcp-task.taazaahost.com/mcp/stream";
        log(`Creating transport for ${url}...`);
        // Verify we can instantiate it manually
        try {
            new global.EventSource(url);
            log("Manual instantiation succeeded.");
        } catch (e) {
            errorLog("Manual instantiation failed: " + e);
        }

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
