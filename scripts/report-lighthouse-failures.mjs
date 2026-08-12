import fs from 'node:fs';
import path from 'node:path';

const roots = ['.lighthouseci', 'lighthouse-results'];
const reports = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.json')) {
      try {
        const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (parsed?.categories && parsed?.audits) reports.push({ file: full, lhr: parsed });
      } catch {
        // Ignore non-LHR JSON such as manifests.
      }
    }
  }
}

for (const root of roots) walk(root);

function escapeCommand(value) {
  return String(value)
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A');
}

function summarizeConsoleErrors(lhr) {
  const items = lhr.audits?.['errors-in-console']?.details?.items || [];
  return items.slice(0, 8).map((item) => {
    const source = item.source || 'console';
    const location = item.sourceLocation?.url || item.url || '';
    const description = item.description || item.text || item.message || '';
    return `${source}${location ? ` ${location}` : ''}: ${description}`.trim();
  }).filter(Boolean);
}

function summarizeLayoutShifts(lhr) {
  const items = lhr.audits?.['layout-shifts']?.details?.items || [];
  return items.slice(0, 8).map((item) => {
    const score = item.score ?? item.value ?? '';
    const node = item.node?.selector || item.node?.snippet || item.node?.nodeLabel || item.node?.path || '';
    const causes = (item.subItems?.items || [])
      .map((cause) => `${cause.cause || ''}${cause.extra?.value ? ` ${cause.extra.value}` : ''}`.trim())
      .filter(Boolean)
      .join(', ');
    return `${score}${node ? ` ${node}` : ''}${causes ? ` causes=${causes}` : ''}`.trim();
  }).filter(Boolean);
}

if (!reports.length) {
  console.log('::error title=Lighthouse diagnostics unavailable::No Lighthouse result JSON was found in .lighthouseci or lighthouse-results.');
  process.exit(0);
}

const blockingCategories = ['accessibility', 'best-practices', 'seo'];
let emitted = 0;

for (const { file, lhr } of reports) {
  const url = lhr.finalDisplayedUrl || lhr.finalUrl || lhr.requestedUrl || file;
  const categoryScores = Object.fromEntries(
    ['performance', ...blockingCategories].map((id) => [id, lhr.categories?.[id]?.score ?? null])
  );
  const cls = lhr.audits?.['cumulative-layout-shift']?.numericValue ?? null;

  const blocking = [];
  for (const id of blockingCategories) {
    const category = lhr.categories?.[id];
    if (category?.score != null && category.score < 1) {
      const failedAudits = (category.auditRefs || [])
        .map((ref) => lhr.audits?.[ref.id])
        .filter((audit) => audit && audit.scoreDisplayMode !== 'manual' && audit.score != null && audit.score < 1)
        .map((audit) => `${audit.id}=${audit.score}${audit.title ? ` (${audit.title})` : ''}`)
        .slice(0, 12);
      blocking.push(`${id}=${category.score}${failedAudits.length ? `; audits: ${failedAudits.join(', ')}` : ''}`);
    }
  }

  if (typeof cls === 'number' && cls > 0.1) {
    blocking.push(`cumulative-layout-shift=${cls} (>0.1)`);
  }

  const consoleErrors = summarizeConsoleErrors(lhr);
  if (consoleErrors.length) blocking.push(`console=${consoleErrors.join(' || ')}`);
  const layoutShifts = summarizeLayoutShifts(lhr);
  if (typeof cls === 'number' && cls > 0.1 && layoutShifts.length) {
    blocking.push(`layout-shifts=${layoutShifts.join(' || ')}`);
  }

  if (blocking.length) {
    emitted += 1;
    const message = `${url} | ${blocking.join(' | ')} | categoryScores=${JSON.stringify(categoryScores)}`;
    console.log(`::error title=Lighthouse blocking assertion::${escapeCommand(message)}`);
  }
}

if (!emitted) {
  console.log('::notice title=Lighthouse diagnostics::LHR files were found, but no configured blocking category/CLS threshold failure was detected.');
}
