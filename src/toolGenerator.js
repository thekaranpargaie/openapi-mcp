const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);

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

  for (const [path, pathItem] of Object.entries(openapi.paths)) {
    // Path-level parameters shared across all methods on this path
    const pathLevelParams = pathItem.parameters || [];

    for (const [method, op] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method)) continue; // skip 'parameters', 'summary', etc.

      // -----------------------------------------------------------------------
      // 1. Collect all parameters: path-level + operation-level (op wins on dup)
      // -----------------------------------------------------------------------
      const seenParamKeys = new Set();
      const mergedParams = [];

      // Operation-level params take precedence; add them first
      for (const p of (op.parameters || [])) {
        if (!p.$ref) {
          seenParamKeys.add(`${p.in}:${p.name}`);
          mergedParams.push(p);
        }
      }
      // Append path-level params that weren't overridden
      for (const p of pathLevelParams) {
        if (!p.$ref && !seenParamKeys.has(`${p.in}:${p.name}`)) {
          mergedParams.push(p);
        }
      }

      // -----------------------------------------------------------------------
      // 2. Build inputSchema properties + track where each param belongs
      // -----------------------------------------------------------------------
      const properties = {};
      const required = [];
      const paramLocations = {}; // name → 'path' | 'query' | 'header' | 'cookie' | 'body'

      for (const param of mergedParams) {
        const { name, in: location, required: isRequired, schema: paramSchema, description } = param;

        properties[name] = {
          ...(paramSchema || { type: 'string' }),
          ...(description ? { description } : {}),
        };

        if (isRequired) required.push(name);
        paramLocations[name] = location; // 'path', 'query', 'header', 'cookie'
      }

      // -----------------------------------------------------------------------
      // 3. Merge request body fields into the schema
      // -----------------------------------------------------------------------
      const bodySchema = op.requestBody?.content?.['application/json']?.schema;

      if (bodySchema && !hasUnresolvedRefs(bodySchema)) {
        if (bodySchema.type === 'object' && bodySchema.properties) {
          // Flatten object body fields into the top-level schema
          for (const [key, fieldSchema] of Object.entries(bodySchema.properties)) {
            properties[key] = fieldSchema;
            paramLocations[key] = 'body';
          }
          for (const r of (bodySchema.required || [])) {
            if (!required.includes(r)) required.push(r);
          }
        } else {
          // Non-object body (array, oneOf, etc.) — expose as a single '_body' field
          properties['_body'] = bodySchema;
          paramLocations['_body'] = 'body';
          if (op.requestBody.required) required.push('_body');
        }
      }

      // -----------------------------------------------------------------------
      // 4. Compose the tool record
      // -----------------------------------------------------------------------
      const inputSchema = {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      };

      tools.push({
        name: op.operationId || `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`,
        description: op.description || op.summary || `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase(),
        path,
        schema: inputSchema,
        paramLocations,          // used by executeTool to route args correctly
        hasRequestBody: !!bodySchema,
      });
    }
  }

  return tools;
}

