const SKIP_SEGMENTS = new Set([
  '.git', '.hg', '.svn', '.next', '.nuxt', '.svelte-kit', '.turbo', '.cache',
  'node_modules', 'dist', 'build', 'coverage', 'vendor', 'target', '.venv', 'venv',
]);

const CODE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.sql']);

export const DEFAULT_LOCAL_LIMITS = Object.freeze({
  maxFiles: 512,
  maxFileBytes: 512 * 1024,
  maxTotalBytes: 8 * 1024 * 1024,
  maxArchiveBytes: 32 * 1024 * 1024,
  maxArchiveEntries: 4096,
});

export function normalizeRelativePath(value) {
  return String(value ?? '')
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '')
    .replace(/\/{2,}/g, '/');
}

export function safeRelativePath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return false;
  if (value.includes('\0') || value.includes('\\') || value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value)) return false;

  const normalized = normalizeRelativePath(value);
  if (!normalized || normalized.startsWith('/')) return false;
  const parts = normalized.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) return false;
  return true;
}

function basename(path) {
  const normalized = normalizeRelativePath(path);
  return normalized.split('/').at(-1) ?? normalized;
}

function extension(path) {
  const name = basename(path);
  const index = name.lastIndexOf('.');
  return index <= 0 ? '' : name.slice(index).toLowerCase();
}

export function hasSkippedSegment(path) {
  if (!safeRelativePath(path)) return true;
  return normalizeRelativePath(path)
    .split('/')
    .some((part) => SKIP_SEGMENTS.has(part.toLowerCase()));
}

export function isCandidatePath(path) {
  if (!safeRelativePath(path) || hasSkippedSegment(path)) return false;
  const name = basename(path);
  if (/^\.env(?:\..+)?$/i.test(name)) return true;
  return CODE_EXTENSIONS.has(extension(path));
}

export function effectiveLocalLimits(overrides = {}) {
  const result = { ...DEFAULT_LOCAL_LIMITS };
  for (const key of Object.keys(DEFAULT_LOCAL_LIMITS)) {
    const value = overrides?.[key];
    if (Number.isInteger(value) && value > 0) result[key] = value;
  }
  return result;
}

export function createIngestionScope(source) {
  return {
    source,
    selectedFiles: 0,
    skippedFiles: 0,
    bytesSelected: 0,
    truncated: false,
    reasons: [],
  };
}

export function addScopeReason(scope, reason) {
  if (!scope.reasons.includes(reason)) scope.reasons.push(reason);
}
