import { browserQuickScanGithubRepo, BrowserQuickScanError } from './core/browser-quick-scan.mjs';

const form = document.querySelector('[data-rlsproof-form]');
const input = document.querySelector('[data-rlsproof-repository]');
const button = document.querySelector('[data-rlsproof-submit]');
const status = document.querySelector('[data-rlsproof-status]');
const resultPanel = document.querySelector('[data-rlsproof-results]');
const findingsRoot = document.querySelector('[data-rlsproof-findings]');
const metricScore = document.querySelector('[data-rlsproof-score]');
const metricGate = document.querySelector('[data-rlsproof-gate]');
const metricFiles = document.querySelector('[data-rlsproof-files]');
const metricCoverage = document.querySelector('[data-rlsproof-coverage]');

function setStatus(message) {
  if (status) status.textContent = message;
}

function setBusy(busy) {
  if (button) {
    button.disabled = busy;
    button.textContent = busy ? 'Scanning…' : 'Run Quick Scan';
  }
  if (input) input.disabled = busy;
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

function renderResult(result) {
  metricScore.textContent = `${result.readiness.score}/100`;
  metricGate.textContent = result.releaseGate;
  metricGate.className = result.releaseGate === 'blocked' ? 'rlsproof-state-blocked' : 'rlsproof-state-incomplete';
  metricFiles.textContent = String(result.scope.filesScanned);
  metricCoverage.textContent = result.coverage.complete ? 'complete' : 'incomplete';

  findingsRoot.replaceChildren();
  if (result.findings.length === 0) {
    findingsRoot.append(textElement('p', 'rlsproof-disclaimer', 'No native findings were detected in the bounded files selected for this Quick Scan. This is not a PASS or a complete security assessment.'));
  } else {
    const fragment = document.createDocumentFragment();
    for (const finding of result.findings) fragment.append(renderFinding(finding));
    findingsRoot.append(fragment);
  }

  resultPanel.hidden = false;
  setStatus(`Scan complete for ${result.repository.owner}/${result.repository.name}. Coverage remains incomplete by design.`);
}

function errorMessage(error) {
  if (error instanceof BrowserQuickScanError) return error.message;
  if (error instanceof TypeError) return error.message;
  return 'Quick Scan could not complete. No PASS result was produced.';
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const repository = input?.value?.trim() ?? '';
  resultPanel.hidden = true;
  findingsRoot.replaceChildren();
  setBusy(true);
  setStatus('Reading bounded public repository metadata and selected source files from GitHub…');

  try {
    const result = await browserQuickScanGithubRepo(repository);
    renderResult(result);
  } catch (error) {
    setStatus(errorMessage(error));
  } finally {
    setBusy(false);
  }
});
