import fs from 'fs';

// ---------------------------------------------------------------------------
// Resolve all internal $ref values (JSON Pointer format: #/a/b/c) in-place.
// Handles circular references by tracking the resolution chain.
// ---------------------------------------------------------------------------
function resolveRefs(spec) {
  function lookup(ref) {
    // Only handle local JSON Pointer refs: #/components/schemas/Foo
    if (!ref.startsWith('#/')) return null;
    const parts = ref.slice(2).split('/');
    let node = spec;
    for (const part of parts) {
      if (node == null || typeof node !== 'object') return null;
      node = node[part.replace(/~1/g, '/').replace(/~0/g, '~')];
    }
    return node;
  }

  // Walk and replace $ref nodes. `seen` prevents infinite loops on circular refs.
  function walk(node, seen = new Set()) {
    if (!node || typeof node !== 'object') return node;

    if (node.$ref) {
      if (seen.has(node.$ref)) return node; // circular — leave as-is
      const resolved = lookup(node.$ref);
      if (!resolved) return node;           // unresolvable — leave as-is
      const nextSeen = new Set(seen).add(node.$ref);
      return walk(resolved, nextSeen);
    }

    if (Array.isArray(node)) {
      return node.map(item => walk(item, seen));
    }

    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = walk(v, seen);
    }
    return out;
  }

  return walk(spec);
}

export async function loadSpec(path) {
  let raw;

  if (path.startsWith('http://') || path.startsWith('https://')) {
    const maxRetries = 10;
    const retryDelay = 3000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        raw = await response.json();
        break;
      } catch (error) {
        console.log(`Failed to load spec from ${path} (Attempt ${i + 1}/${maxRetries}): ${error.message}`);
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  } else {
    raw = JSON.parse(fs.readFileSync(path, 'utf-8'));
  }

  return resolveRefs(raw);
}
