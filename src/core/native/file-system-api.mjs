/**
 * File System Access API Integration
 * Direct file open/edit/save without download dialogs
 */

const state = {
  fileHandles: new Map(),
  currentDirectory: null
};

export function isFileSystemAccessSupported() {
  return 'showOpenFilePicker' in window;
}

export async function openPDFFile() {
  if (!isFileSystemAccessSupported()) return null;

  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'PDF Files', accept: { 'application/pdf': ['.pdf'] } }],
      multiple: false
    });

    const file = await handle.getFile();
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    state.fileHandles.set(fileId, handle);
    
    if (handle.requestPermission) {
      await handle.requestPermission({ mode: 'readwrite' });
    }

    return { file, handle, fileId };
  } catch (err) {
    if (err.name !== 'AbortError') console.error('File picker error:', err);
    return null;
  }
}

export async function saveToOriginalLocation(fileId, blob) {
  const handle = state.fileHandles.get(fileId);
  if (!handle) throw new Error('File handle not found');

  if (handle.queryPermission) {
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      const newPermission = await handle.requestPermission({ mode: 'readwrite' });
      if (newPermission !== 'granted') throw new Error('Permission denied');
    }
  }

  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  return true;
}

export async function saveAsNewFile(suggestedName, blob) {
  if (!isFileSystemAccessSupported()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(url);
    return null;
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'PDF Files', accept: { 'application/pdf': ['.pdf'] } }]
    });

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return handle;
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Save as error:', err);
    return null;
  }
}

export async function openMultiplePDFFiles() {
  if (!isFileSystemAccessSupported()) return [];

  try {
    const handles = await window.showOpenFilePicker({
      types: [{ description: 'PDF Files', accept: { 'application/pdf': ['.pdf'] } }],
      multiple: true
    });

    return await Promise.all(handles.map(async (handle) => {
      const file = await handle.getFile();
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      state.fileHandles.set(fileId, handle);
      return { file, handle, fileId };
    }));
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Multi-file picker error:', err);
    return [];
  }
}

export async function getWorkspaceDirectory() {
  if (!isFileSystemAccessSupported()) return null;
  try {
    state.currentDirectory = await window.showDirectoryPicker();
    return state.currentDirectory;
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Directory picker error:', err);
    return null;
  }
}

export async function saveWorkspaceState(workspaceName, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  
  if (!state.currentDirectory) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspaceName}.zerotools.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const fileHandle = await state.currentDirectory.getFileHandle(
    `${workspaceName}.zerotools.json`,
    { create: true }
  );
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export function registerAsFileHandler() {
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams.files.length) return;
      for (const handle of launchParams.files) {
        const file = await handle.getFile();
        window.dispatchEvent(new CustomEvent('file-system-open', {
          detail: { file, handle, type: file.type }
        }));
      }
    });
  }
}

export { state as fileSystemState };
