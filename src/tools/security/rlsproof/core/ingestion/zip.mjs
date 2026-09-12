import JSZip from 'jszip';
import {
  addScopeReason,
  createIngestionScope,
  effectiveLocalLimits,
  isCandidatePath,
  normalizeRelativePath,
  safeRelativePath,
} from './file-policy.mjs';

function isEnvironmentFile(path) {
  return /^\.env(?:\..+)?$/i.test(path.split('/').at(-1) ?? '');
}

export async function virtualFilesFromZipBytes(bytes, options = {}) {
  const limits = effectiveLocalLimits(options.limits);
  const archiveSize = bytes?.byteLength ?? bytes?.length ?? 0;
  if (!Number.isFinite(archiveSize) || archiveSize <= 0) throw new TypeError('A non-empty ZIP archive is required.');
  if (archiveSize > limits.maxArchiveBytes) throw new RangeError('ZIP archive exceeds the local scan archive-size limit.');

  const zip = await JSZip.loadAsync(bytes, { createFolders: false });
  const scope = createIngestionScope('local-zip');
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .sort((left, right) => left.name.localeCompare(right.name));
  const files = [];

  for (const entry of entries) {
    const path = normalizeRelativePath(entry.name);
    if (!safeRelativePath(path) || !isCandidatePath(path)) {
      scope.skippedFiles += 1;
      continue;
    }
    if (files.length >= limits.maxFiles) {
      scope.skippedFiles += 1;
      scope.truncated = true;
      addScopeReason(scope, 'local-file-count-limit-reached');
      continue;
    }

    if (isEnvironmentFile(path)) {
      files.push({ path, text: '' });
      scope.selectedFiles += 1;
      continue;
    }

    const data = await entry.async('uint8array');
    if (data.byteLength > limits.maxFileBytes) {
      scope.skippedFiles += 1;
      scope.truncated = true;
      addScopeReason(scope, 'local-file-exceeded-size-limit');
      continue;
    }
    if (scope.bytesSelected + data.byteLength > limits.maxTotalBytes) {
      scope.skippedFiles += 1;
      scope.truncated = true;
      addScopeReason(scope, 'local-total-byte-limit-reached');
      continue;
    }

    files.push({ path, text: new TextDecoder('utf-8', { fatal: false }).decode(data) });
    scope.selectedFiles += 1;
    scope.bytesSelected += data.byteLength;
  }

  return { files, scope };
}

export async function virtualFilesFromZip(file, options = {}) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new TypeError('A ZIP File/Blob is required.');
  const limits = effectiveLocalLimits(options.limits);
  if (Number(file.size) > limits.maxArchiveBytes) throw new RangeError('ZIP archive exceeds the local scan archive-size limit.');
  return virtualFilesFromZipBytes(await file.arrayBuffer(), options);
}
