export function posterPathToSrc(path: string) {
  const trimmed = path.trim();
  if (!trimmed) {
    return '';
  }
  if (/^(data:image\/|blob:)/i.test(trimmed)) {
    return trimmed;
  }
  if (/^(file|https?):\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^[a-zA-Z]:[\\/]/.test(trimmed)) {
    return encodeURI(`file:///${trimmed.replace(/\\/g, '/')}`);
  }
  if (trimmed.startsWith('\\\\')) {
    return encodeURI(`file://${trimmed.replace(/\\/g, '/')}`);
  }
  return encodeURI(`file://${trimmed.replace(/\\/g, '/')}`);
}
