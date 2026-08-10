#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function runAudit(extraArgs = []) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['audit', '--json', ...extraArgs], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });

  const raw = (result.stdout || result.stderr || '').trim();
  if (!raw) throw new Error('npm audit returned no JSON output');

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('npm audit returned invalid JSON output');
  }
}

function severityRank(severity) {
  return { low: 1, moderate: 2, high: 3, critical: 4 }[String(severity || '').toLowerCase()] || 0;
}

function collect(report, minimumSeverity) {
  const minimum = severityRank(minimumSeverity);
  return Object.entries(report?.vulnerabilities || {})
    .map(([name, details]) => ({ name, ...details }))
    .filter((item) => severityRank(item.severity) >= minimum)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.name.localeCompare(b.name));
}

function fixDescription(fixAvailable) {
  if (fixAvailable === true) return 'available';
  if (!fixAvailable) return 'none';
  if (typeof fixAvailable === 'object') {
    const target = [fixAvailable.name, fixAvailable.version].filter(Boolean).join('@');
    return `${target || 'available'}${fixAvailable.isSemVerMajor ? ' (major)' : ''}`;
  }
  return String(fixAvailable);
}

function annotation(scope, item) {
  const message = [
    `scope=${scope}`,
    `package=${item.name}`,
    `severity=${item.severity}`,
    `direct=${Boolean(item.isDirect)}`,
    `range=${item.range || 'unknown'}`,
    `fix=${fixDescription(item.fixAvailable)}`
  ].join(', ');
  console.error(`::error title=Dependency audit::${message}`);
}

const productionReport = runAudit(['--omit=dev']);
const fullReport = runAudit();

const productionBlockers = collect(productionReport, 'high');
const allCritical = collect(fullReport, 'critical');
const productionNames = new Set(productionBlockers.map((item) => item.name));
const devCritical = allCritical.filter((item) => !productionNames.has(item.name));

for (const item of productionBlockers) annotation('production', item);
for (const item of devCritical) annotation('dev-or-build', item);

if (productionBlockers.length || devCritical.length) {
  console.error(`Dependency audit: FAIL (${productionBlockers.length} production high/critical, ${devCritical.length} dev/build critical)`);
  process.exit(1);
}

const totals = fullReport?.metadata?.vulnerabilities || {};
console.log(`Dependency audit: PASS (production high/critical=0, all critical=0; npm totals=${JSON.stringify(totals)})`);
