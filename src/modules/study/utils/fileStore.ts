export interface StoredStudyFile {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  blob: Blob;
}

const DB_NAME = 'mymind-study-files';
const DB_VERSION = 1;
const STORE_NAME = 'files';

export function createStudyFileId() {
  return `study-file-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error('Could not open study file database.'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);

    request.onerror = () => reject(request.error ?? new Error('Study file operation failed.'));
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Study file transaction failed.'));
    };
  });
}

export async function saveStudyFile(file: File): Promise<StoredStudyFile> {
  const storedFile: StoredStudyFile = {
    id: createStudyFileId(),
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    createdAt: new Date().toISOString(),
    blob: file,
  };

  await runTransaction('readwrite', (store) => store.put(storedFile));
  return storedFile;
}

export async function getStudyFile(fileId: string): Promise<StoredStudyFile | null> {
  if (!fileId) {
    return null;
  }

  return (await runTransaction('readonly', (store) => store.get(fileId))) ?? null;
}

export async function deleteStudyFile(fileId: string): Promise<void> {
  if (!fileId) {
    return;
  }

  await runTransaction('readwrite', (store) => store.delete(fileId));
}

export function formatStudyFileSize(size?: number) {
  if (!size || size <= 0) {
    return '0 B';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
