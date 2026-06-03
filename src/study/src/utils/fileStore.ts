export interface StoredStudyFile {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  blob: Blob;
}

const DB_NAME = "mymind-study-files";
const DB_VERSION = 1;
const STORE_NAME = "files";

function createFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function openFileDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Could not open file database."));
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

async function runFileStoreTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openFileDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);

    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error("File storage request failed."));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    transaction.oncomplete = () => {
      database.close();
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("File storage transaction failed."));
    };
  });
}

export async function saveFileToStore(file: File): Promise<StoredStudyFile> {
  const storedFile: StoredStudyFile = {
    id: createFileId(),
    fileName: file.name,
    mimeType: file.type || "unknown",
    size: file.size,
    createdAt: new Date().toISOString(),
    blob: file,
  };

  await runFileStoreTransaction("readwrite", (store) => store.put(storedFile));

  return storedFile;
}

export async function getFileFromStore(fileId: string): Promise<StoredStudyFile | null> {
  if (!fileId) {
    return null;
  }

  const result = await runFileStoreTransaction<StoredStudyFile | undefined>(
    "readonly",
    (store) => store.get(fileId)
  );

  return result ?? null;
}

export async function deleteFileFromStore(fileId: string): Promise<void> {
  if (!fileId) {
    return;
  }

  await runFileStoreTransaction("readwrite", (store) => store.delete(fileId));
}

export async function clearAllStoredFiles(): Promise<void> {
  await runFileStoreTransaction("readwrite", (store) => store.clear());
}

export function markFileStorageResetDone(resetKey: string): void {
  localStorage.setItem(resetKey, "done");
}

export function wasFileStorageResetDone(resetKey: string): boolean {
  return localStorage.getItem(resetKey) === "done";
}
