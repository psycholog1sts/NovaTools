import {
  addScopeReason,
  createIngestionScope,
  effectiveLocalLimits,
  isCandidatePath,
  normalizeRelativePath,
  safeRelativePath,
} from './file-policy.mjs';

function sourcePath(file) {
  return normalizeRelativePath(file?.webkitRelativePath || file?.name || '');
}

function envPath(path) {
  return /^\.env(?:\..+)?$/i.test(path.split('/').at(-1) ?? '');
}

export async function virtualFilesFromFileList(fileList, options = {}) {
  const limits = effectiveLocalLimits(options.limits);
  const scope = createIngestionScope('local-folder');
  const candidates = Array.from(fileList ?? [])
    .map((file) => ({ file, path: sourcePath(file) }))
    .filter(({ path }) => {
      if (!safeRelativePath(path) || !isCandidatePath(path)) {
        scope.skippedFiles += 1;
        return false;
      }
      return true;
    })
    .sort((left, right) => left.path.localeCompare(right.path));

  const files = [];
  for (const candidate of candidates) {
    const size = Number(candidate.file?.size ?? 0);
    if (!Number.isFinite(size) || size < 0 || size > limits.maxFileBytes) {
      scope.skippedFiles += 1;
      scope.truncated = true;
      addScopeReason(scope, 'local-file-exceeded-size-limit');
      continue;
    }
    if (files.length >= limits.maxFiles) {
      scope.skippedFiles += 1;
      scope.truncated = true;
      addScopeReason(scope, 'local-file-count-limit-reached');
      continue;
    }
    if (scope.bytesSelected + size > limits.maxTotalBytes) {
      scope.skippedFiles += 1;
      scope.truncated = true;
      addScopeReason(scope, 'local-total-byte-limit-reached');
      continue;
    }
    if (typeof candidate.file?.text !== 'function') {
      scope.skippedFiles += 1;
      scope.truncated = true;
      addScopeReason(scope, 'local-file-unreadable');
      continue;
    }

    const text = envPath(candidate.path) ? '' : await candidate.file.text();
    files.push({ path: candidate.path, text });
    scope.selectedFiles += 1;
    scope.bytesSelected += size;
  }

  return { files, scope };
}
