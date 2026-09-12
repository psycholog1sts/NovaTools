export function unquoteIdentifier(value) {
  const raw = String(value ?? '').trim();
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
    return raw.slice(1, -1).replaceAll('""', '"');
  }
  return raw.toLowerCase();
}

export function normalizeQualifiedName(schema, name, defaultSchema = 'public') {
  const normalizedSchema = unquoteIdentifier(schema || defaultSchema) || defaultSchema;
  const normalizedName = unquoteIdentifier(name);
  return normalizedName ? `${normalizedSchema}.${normalizedName}` : '';
}

export function parseQualifiedName(value, defaultSchema = 'public') {
  const raw = String(value ?? '').trim().replace(/[;,]$/, '');
  const match = /^(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_$]*))(?:\.(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_$]*)))?$/.exec(raw);
  if (!match) return null;
  if (match[3] || match[4]) {
    return normalizeQualifiedName(match[1] ?? match[2], match[3] ?? match[4], defaultSchema);
  }
  return normalizeQualifiedName(defaultSchema, match[1] ?? match[2], defaultSchema);
}

export function normalizeRole(value) {
  return unquoteIdentifier(String(value ?? '').trim());
}

export function splitCommaList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
