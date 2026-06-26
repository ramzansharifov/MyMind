export function getStorageErrorCode(error: unknown) {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code);
  }

  return null;
}