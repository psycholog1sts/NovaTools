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

function declaredUncompressedSize(entry) {
  const value = entry?._data?.uncompressedSize;
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function rejectEntry(scope, reason) {
  scope.skippedFiles += 1;
  scope.truncated = true;
  addScopeReason(scope, reason);
}

export async function virtualFilesFromZipBytes(bytes, options = {}) {
  const limits = effectiveLocalLimits(options.limits);
  const archiveSize = bytes?.byteLength ?? bytes?.length ?? 0;
  if (!Number.isFinite(archiveSize) || archiveSize <= 0) throw new TypeError('A non-empty ZIP archive is required.');
  if (archiveSize > limits.maxArchiveBytes) throw new RangeError('ZIP archive exceeds the local scan archive-size limit.');

  const zip = await JSZip.loadAsync(bytes, { createFolders: false });
  const archiveEntries = Object.values(zip.files);
  if (archiveEntries.length > limits.maxArchiveEntries) {
    throw new RangeError('ZIP archive contains too many entries for a bounded local scan.');
  }

  const scope = createIngestionScope('local-zip');
  const entries = archiveEntries
    .filter((entry) => !entry.dir)
    .sort((left, right) => left.name.localeCompare(right.name));
  const files = [];

  for (const entry of entries) {
    // JSZip sanitizes traversal components on load and keeps the pre-sanitized
    // name in unsafeOriginalName. Validate that original name too so a ZIP-slip
    // path can never be silently converted into an apparently safe scan path.
    const originalPath = typeof entry.unsafeOriginalName === 'string'
      ? entry.unsafeOriginalName
      : entry.name;
    if (!safeRelativePath(originalPath)) {
      rejectEntry(scope, 'zip-path-traversal-rejected');
      continue;
    }

    const path = normalizeRelativePath(entry.name);
    if (!safeRelativePath(path) || !isCandidatePath(path)) {
      scope.skippedFiles += 1;
      continue;
    }
    if (files.length >= limits.maxFiles) {
      rejectEntry(scope, 'local-file-count-limit-reached');
      continue;
    }

    // Environment files are represented by existence only. Their bytes are
    // deliberately not decompressed or read into memory/evidence.
    if (isEnvironmentFile(path)) {
      files.push({ path, text: '' });
      scope.selectedFiles += 1;
      continue;
    }

    // JSZip exposes central-directory sizes on its private compressed-object
    // metadata. Treat this only as a preflight guard; post-decompression limits
    // below remain authoritative if the metadata is absent or inaccurate.
    const declaredSize = declaredUncompressedSize(entry);
    if (declaredSize != null && declaredSize > limits.maxFileBytes) {
      rejectEntry(scope, 'local-file-exceeded-size-limit');
      continue;
    }
    if (declaredSize != null && scope.bytesSelected + declaredSize > limits.maxTotalBytes) {
      rejectEntry(scope, 'local-total-byte-limit-reached');
      continue;
    }

    const data = await entry.async('uint8array');
    if (data.byteLength > limits.maxFileBytes) {
      rejectEntry(scope, 'local-file-exceeded-size-limit');
      continue;
    }
    if (scope.bytesSelected + data.byteLength > limits.maxTotalBytes) {
      rejectEntry(scope, 'local-total-byte-limit-reached');
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
