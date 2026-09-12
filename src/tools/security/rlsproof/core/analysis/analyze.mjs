import { scanVirtualFiles as legacyScanVirtualFiles } from '../content-scan.mjs';
import { buildMigrationState, stateSummary } from '../sql/migration-state.mjs';
import { runRules } from '../rules/registry.mjs';
import { buildCoverage } from './coverage.mjs';
import { releaseGateForFindings, severitySummary } from './gate.mjs';

function normalizePath(value) {
  return String(value ?? '').replaceAll('\\', '/').replace(/^\.\/+/, '');
}

function isSql(path) {
  return normalizePath(path).toLowerCase().endsWith('.sql');
}

function normalizedFiles(files) {
  if (!Array.isArray(files)) throw new TypeError('files must be an array');
  return files
    .filter((file) => file && typeof file === 'object' && typeof file.path === 'string')
    .map((file) => ({ path: normalizePath(file.path), text: typeof file.text === 'string' ? file.text : '' }));
}

function dedupeFindings(findings) {
  const seen = new Set();
  const result = [];
  for (const finding of findings) {
    const key = [finding.rule, finding.path ?? '', finding.line ?? '', finding.title].join('\u0000');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(finding);
  }
  return result.sort((left, right) => {
    const path = String(left.path ?? '').localeCompare(String(right.path ?? ''));
    if (path !== 0) return path;
    const line = (left.line ?? 0) - (right.line ?? 0);
    if (line !== 0) return line;
    return String(left.rule).localeCompare(String(right.rule));
  });
}

export function analyzeVirtualFiles(files, options = {}) {
  const normalized = normalizedFiles(files);
  const sqlFiles = normalized.filter((file) => isSql(file.path));
  const state = buildMigrationState(sqlFiles);

  const legacyFindings = legacyScanVirtualFiles(normalized);
  const registryFindings = runRules({ files: normalized, state, options });
  const findings = dedupeFindings([...legacyFindings, ...registryFindings]);
  const totalBytes = normalized.reduce((sum, file) => sum + new TextEncoder().encode(file.text).length, 0);
  const scope = {
    mode: options.mode ?? 'static-local',
    filesScanned: normalized.length,
    sqlFilesScanned: sqlFiles.length,
    bytesScanned: totalBytes,
    truncated: options.scope?.truncated === true,
    ...(options.scope ?? {}),
  };
  const coverage = buildCoverage({
    state,
    scope,
    source: options.source ?? 'virtual-files',
  });

  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    target: options.target ?? null,
    source: options.source ?? 'virtual-files',
    scope,
    coverage,
    state: stateSummary(state),
    summary: severitySummary(findings),
    releaseGate: releaseGateForFindings(findings),
    findings,
  };
}
