import { analyzeVirtualFiles } from './core/analysis/analyze.mjs';
import { browserQuickScanGithubRepo, BrowserQuickScanError } from './core/browser-quick-scan.mjs';
import { virtualFilesFromFileList } from './core/ingestion/local-files.mjs';
import { virtualFilesFromZip } from './core/ingestion/zip.mjs';
import { scoreFindings } from './core/score.mjs';

const form = document.querySelector('[data-rlsproof-form]');
const input = document.querySelector('[data-rlsproof-repository]');
const button = document.querySelector('[data-rlsproof-submit]');
const zipInput = document.querySelector('[data-rlsproof-local-zip]');
const folderInput = document.querySelector('[data-rlsproof-local-folder]');
const status = document.querySelector('[data-rlsproof-status]');
const resultPanel = document.querySelector('[data-rlsproof-results]');
const findingsRoot = document.querySelector('[data-rlsproof-findings]');
const coverageReasonsRoot = document.querySelector('[data-rlsproof-coverage-reasons]');
const metricScore = document.querySelector('[data-rlsproof-score]');
const metricGate = document.querySelector('[data-rlsproof-gate]');
const metricFiles = document.querySelector('[data-rlsproof-files]');
const metricCoverage = document.querySelector('[data-rlsproof-coverage]');

function setStatus(message) {
  if (status) status.textContent = message;
}

function setBusy(busy, mode = 'github') {
  if (button) {
    button.disabled = busy;
    button.textContent = busy && mode === 'github' ? 'Scanning…' : 'Run GitHub Scan';
  }
  if (input) input.disabled = busy;
  if (zipInput) zipInput.disabled = busy;
  if (folderInput) folderInput.disabled = busy;
}

function textElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function addDefinition(list, label, value) {
  list.append(textElement('dt', '', label), textElement('dd', '', value || '—'));
}

function renderFinding(finding) {
  const article = document.createElement('article');
  article.className = 'rlsproof-finding';

  const header = document.createElement('div');
  header.className = 'rlsproof-finding-head';
  header.append(
    textElement('h3', '', finding.title),
    textElement('span', 'rlsproof-severity', finding.severity),
  );

  const details = document.createElement('dl');
  addDefinition(details, 'Rule', finding.rule);
  addDefinition(details, 'Location', finding.path ? `${finding.path}${finding.line ? `:${finding.line}` : ''}` : 'Repository');
  addDefinition(details, 'Evidence', finding.evidence || 'Evidence intentionally omitted.');
  addDefinition(details, 'Remediation', finding.remediation);
  article.append(header, details);
  return article;
}

function renderCoverage(result) {
  if (!coverageReasonsRoot) return;
  coverageReasonsRoot.replaceChildren();
  const reasons = Array.isArray(result.coverage?.reasons) ? result.coverage.reasons : [];
  if (reasons.length === 0) return;

  const heading = textElement('strong', '', 'Coverage limits');
  const list = document.createElement('ul');
  for (const reason of reasons) list.append(textElement('li', '', reason.replaceAll('-', ' ')));
  coverageReasonsRoot.append(heading, list);
}

function resultLabel(result) {
  if (result.repository?.owner && result.repository?.name) return `${result.repository.owner}/${result.repository.name}`;
  if (result.target) return String(result.target);
  return 'selected source';
}

function renderResult(result) {
  const readiness = result.readiness ?? scoreFindings(result.findings ?? []);
  metricScore.textContent = `${readiness.score}/100`;
  metricGate.textContent = result.releaseGate;
  metricGate.className = result.releaseGate === 'blocked' ? 'rlsproof-state-blocked' : 'rlsproof-state-incomplete';
  metricFiles.textContent = String(result.scope?.filesScanned ?? 0);
  metricCoverage.textContent = result.coverage?.complete ? 'complete' : 'incomplete';

  renderCoverage(result);
  findingsRoot.replaceChildren();
  if ((result.findings ?? []).length === 0) {
    findingsRoot.append(textElement('p', 'rlsproof-disclaimer', 'No deterministic findings were detected in the bounded files selected for this Quick Scan. This is not a PASS or a complete security assessment.'));
  } else {
    const fragment = document.createDocumentFragment();
    for (const finding of result.findings) fragment.append(renderFinding(finding));
    findingsRoot.append(fragment);
  }

  resultPanel.hidden = false;
  setStatus(`Scan complete for ${resultLabel(result)}. Coverage remains incomplete by design.`);
}

function errorMessage(error) {
  if (error instanceof BrowserQuickScanError) return error.message;
  if (error instanceof TypeError || error instanceof RangeError) return error.message;
  return 'Quick Scan could not complete. No PASS result was produced.';
}

function clearResult() {
  resultPanel.hidden = true;
  findingsRoot.replaceChildren();
  coverageReasonsRoot?.replaceChildren();
}

function localReport(ingestion, source, label) {
  if (!ingestion?.files?.length) {
    throw new TypeError('No supported JavaScript, TypeScript, SQL, or environment-file paths were found in the selected source.');
  }

  const report = analyzeVirtualFiles(ingestion.files, {
    mode: 'local-private',
    source,
    target: label,
    scope: {
      ...ingestion.scope,
      mode: 'local-private',
      filesScanned: ingestion.files.length,
      bytesScanned: ingestion.scope?.bytesSelected ?? 0,
      truncated: ingestion.scope?.truncated === true,
      reasons: ingestion.scope?.reasons ?? [],
    },
  });

  return {
    ...report,
    readiness: scoreFindings(report.findings),
  };
}

async function runLocalScan(loader, source, label) {
  clearResult();
  setBusy(true, 'local');
  setStatus('Reading and analyzing the selected source locally in this browser…');
  try {
    const ingestion = await loader();
    renderResult(localReport(ingestion, source, label));
  } catch (error) {
    setStatus(errorMessage(error));
  } finally {
    setBusy(false);
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const repository = input?.value?.trim() ?? '';
  clearResult();
  setBusy(true, 'github');
  setStatus('Reading bounded public repository metadata and selected source files directly from GitHub…');

  try {
    const result = await browserQuickScanGithubRepo(repository);
    renderResult(result);
  } catch (error) {
    setStatus(errorMessage(error));
  } finally {
    setBusy(false);
  }
});

zipInput?.addEventListener('change', () => {
  const file = zipInput.files?.[0];
  if (!file) return;
  void runLocalScan(
    () => virtualFilesFromZip(file),
    'local-zip',
    file.name || 'private repository ZIP',
  );
});

folderInput?.addEventListener('change', () => {
  const files = folderInput.files;
  if (!files?.length) return;
  const firstPath = files[0]?.webkitRelativePath || files[0]?.name || 'local folder';
  const rootName = firstPath.split('/')[0] || 'local folder';
  void runLocalScan(
    () => virtualFilesFromFileList(files),
    'local-folder',
    rootName,
  );
});
