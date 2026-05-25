export async function uploadNoteFile(noteId: string, file: File) {
  const asset = await saveFileAsset(noteId, file);
  if (asset?.url) {
    return asset.url;
  }

  const localUrl = getLocalFileUrl(file);
  if (localUrl) {
    return localUrl;
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось загрузить файл'));
    reader.readAsDataURL(file);
  });
}

async function saveFileAsset(noteId: string, file: File) {
  if (!window.mymind?.notes?.saveAsset) {
    return null;
  }

  try {
    const data = await file.arrayBuffer();
    return window.mymind.notes.saveAsset({
      noteId,
      name: file.name || 'attachment',
      mimeType: file.type || 'application/octet-stream',
      data,
    });
  } catch {
    return null;
  }
}

function getLocalFileUrl(file: File) {
  try {
    const bridgedPath = window.mymind?.files?.getPathForFile(file);
    if (bridgedPath) {
      return filePathToUrl(bridgedPath);
    }
  } catch {
    // Browser fallback below.
  }

  const directPath = (file as File & { path?: string }).path;
  if (directPath) {
    return filePathToUrl(directPath);
  }

  return '';
}

function filePathToUrl(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/');
  const prefixed = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return encodeURI(`file://${prefixed}`);
}
