function hasUnresolvedRefs(obj) {
  if (!obj || typeof obj !== 'object') return false;
  
  if (obj.$ref) return true;
  
  for (const value of Object.values(obj)) {
    if (hasUnresolvedRefs(value)) return true;
  }
  
  return false;
}

export function generateTools(openapi) {
  const tools = [];
  for (const [path, methods] of Object.entries(openapi.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      const schema = op.requestBody?.content?.['application/json']?.schema;
      
      // Check if schema has unresolved references, skip validation if it does
      const shouldSkipValidation = schema && hasUnresolvedRefs(schema);
      
      tools.push({
        name: op.operationId,
        description: op.summary || `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase(),
        path,
        schema: shouldSkipValidation ? null : schema
      });
    }
  }
  return tools;
}

