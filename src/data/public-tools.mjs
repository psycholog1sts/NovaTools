export function isPublicCertifiedTool(tool) {
  return Boolean(tool && tool.public === true && tool.indexable === true && tool.certificationStatus === 'CERTIFIED');
}

export function publicCertifiedTools(tools = []) {
  return tools.filter(isPublicCertifiedTool);
}

export function publicToolsByCategory(tools = []) {
  return publicCertifiedTools(tools).reduce((groups, tool) => {
    const category = tool.category || 'tools';
    groups[category] ||= [];
    groups[category].push(tool);
    return groups;
  }, {});
}

export function canonicalToolPath(tool) {
  const entry = String(tool?.entry || '').trim();
  if (entry.startsWith('/src/tools/')) return entry.replace(/^\/src\//, '/');
  if (entry.startsWith('/tools/')) return entry;
  const path = String(tool?.path || '').replace(/^\/+|\/+$/g, '');
  return path ? `/tools/${path}/` : '/categories/index.html';
}
