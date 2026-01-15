import readline from 'readline';
import { Groq } from 'groq-sdk';
import config from '../config.js';
import logger from './logger.js';

const groq = new Groq({
  apiKey: config.groq.apiKey
});

export function startChat(mcp) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let conversationHistory = [];
  const MAX_HISTORY_LENGTH = 50; // Keep only the last 50 messages to prevent unbounded growth

  function trimHistory() {
    if (conversationHistory.length > MAX_HISTORY_LENGTH) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY_LENGTH);
    }
  }

  async function loop() {
    rl.question('> ', async (input) => {
      try {
        conversationHistory.push({
          role: 'user',
          content: input
        });
        trimHistory();

        // Build tool descriptions
        const toolsList = mcp.listTools().map(t => 
          `- ${t.name}: ${t.description}`
        ).join('\n');

        const systemPrompt = config.chat.systemPrompt.replace('{TOOLS_LIST}', toolsList);

        const completion = await groq.chat.completions.create({
          model: config.groq.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory
          ],
          temperature: config.groq.temperature,
          max_completion_tokens: config.groq.maxTokens,
          top_p: config.groq.topP
        });

        const msg = completion.choices[0].message;
        logger.debug('Raw message response:', msg.content);

        // Parse ALL tool calls from the response
        const toolCalls = [];
        
        // Match pattern: word: { json object }
        // This will match tool_name: { "name": "...", "args": {...} }
        const lines = msg.content.split('\n');
        let i = 0;
        while (i < lines.length) {
          const line = lines[i].trim();
          
          // Check if line contains a tool call pattern (tool_name: {)
          if (line.includes(':') && line.includes('{')) {
            try {
              // Extract the part after the colon
              const colonIndex = line.indexOf(':');
              const toolName = line.substring(0, colonIndex).trim();
              const jsonStart = line.indexOf('{', colonIndex);
              
              if (jsonStart !== -1) {
                // Try to extract the complete JSON object
                let jsonStr = line.substring(jsonStart);
                let braceCount = 1;
                let j = i;
                
                // If the JSON continues on next lines, collect it
                while (braceCount > 0 && j < lines.length) {
                  const currentLine = j === i ? jsonStr : lines[j].trim();
                  for (let k = 0; k < currentLine.length; k++) {
                    if (currentLine[k] === '{') braceCount++;
                    else if (currentLine[k] === '}') braceCount--;
                  }
                  if (braceCount > 0 && j > i) {
                    jsonStr += '\n' + lines[j].trim();
                  }
                  j++;
                }
                
                // Extract just the JSON part
                jsonStr = jsonStr.substring(0, jsonStr.lastIndexOf('}') + 1);
                const parsed = JSON.parse(jsonStr);
                
                if (parsed.name) {
                  toolCalls.push(parsed);
                  logger.debug(`Parsed tool call: ${parsed.name}`);
                }
                
                i = j;
              } else {
                i++;
              }
            } catch (e) {
              logger.debug('Failed to parse tool call at line:', line);
              i++;
            }
          } else {
            i++;
          }
        }
        
        logger.debug(`Found ${toolCalls.length} tool calls`);
        
        if (toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            logger.debug(`Calling tool: ${toolCall.name}`, toolCall.args);
            try {
              const result = await mcp.execute(toolCall.name, toolCall.args || {});
              logger.debug('Tool execution result:', result);
              
              conversationHistory.push({
                role: 'assistant',
                content: msg.content
              });
              trimHistory();
              
              conversationHistory.push({
                role: 'user',
                content: `Tool execution successful. Result from ${toolCall.name}: ${JSON.stringify(result)}`
              });
              trimHistory();
            } catch (toolError) {
              logger.error(`Tool execution failed: ${toolError.message}`);
              conversationHistory.push({
                role: 'assistant',
                content: msg.content
              });
              trimHistory();
              
              conversationHistory.push({
                role: 'user',
                content: `Tool execution failed: ${toolError.message}`
              });
              trimHistory();
            }
          }
        } else {
          logger.debug('No tool calls found');
          conversationHistory.push({
            role: 'assistant',
            content: msg.content
          });
          trimHistory();
        }

        // Extract and display only the human-friendly response
        // Remove tool calls from the message if in clean output mode
        let displayMessage = msg.content;
        if (config.app.cleanOutput) {
          // Remove tool call blocks from the output
          displayMessage = msg.content
            .split('\n')
            .filter(line => {
              const trimmed = line.trim();
              // Filter out lines that are part of tool calls
              return !trimmed.match(/^\w+:\s*{/) && 
                     !trimmed.match(/^\s*["']\w+["']:\s*/) &&
                     trimmed.length > 0;
            })
            .join('\n')
            .trim();
          
          // If all content was tool calls, show a generic success message
          if (!displayMessage || displayMessage.length === 0) {
            displayMessage = '✓ Task completed successfully';
          }
        }
        
        logger.output(displayMessage);
      } catch (error) {
        logger.error('Chat error:', error.message);
      }

      loop();
    });
  }

  loop();
}
