export function generateTools(openapi) {
  const tools = [];
  for (const [path, methods] of Object.entries(openapi.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      const schema = op.requestBody?.content?.['application/json']?.schema;
      
      // Check if schema has unresolved references, skip validation if it does
      const hasUnresolvedRefs = schema && JSON.stringify(schema).includes('$ref');
      
      tools.push({
        name: op.operationId,
        description: op.summary || `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase(),
        path,
        schema: hasUnresolvedRefs ? null : schema
      });
    }
  }
  return tools;
}

