import { app, dialog, ipcMain, Notification, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

type CollectionName =
  | 'movies'
  | 'workouts'
  | 'todos'
  | 'finance'
  | 'habits'
  | 'calendar_events'
  | 'journal_entries'
  | 'notes'
  | 'projects'
  | 'contacts'
  | 'health'
  | 'goals'
  | 'inventory'
  | 'app_settings';

const collectionFiles: Record<CollectionName, string> = {
  movies: 'movies.json',
  workouts: 'workouts.json',
  todos: 'todos.json',
  finance: 'finance.json',
  habits: 'habits.json',
  calendar_events: 'calendar_events.json',
  journal_entries: 'journal_entries.json',
  notes: 'notes.json',
  projects: 'projects.json',
  contacts: 'contacts.json',
  health: 'health.json',
  goals: 'goals.json',
  inventory: 'inventory.json',
  app_settings: 'app_settings.json',
};

const listDefaults = new Set<CollectionName>([
  'movies',
  'todos',
  'calendar_events',
  'journal_entries',
  'notes',
  'projects',
  'contacts',
  'goals',
  'inventory',
]);

const retryableStorageErrorCodes = new Set(['EBUSY', 'EPERM', 'EACCES']);
const storageRetryDelaysMs = [50, 100, 200, 400, 800];
const collectionWriteQueues = new Map<CollectionName, Promise<unknown>>();

function nowIso() {
  return new Date().toISOString();
}

function defaultValue(collectionName: CollectionName) {
  if (collectionName === 'workouts') {
    return { exercises: [], exerciseGroups: [], plans: [], sessions: [], startingPosition: null, progressRecords: [], nutritionEntries: [] };
  }
  if (collectionName === 'todos') {
    return { items: [], groups: [] };
  }
  if (collectionName === 'finance') {
    return { startingBalance: 0, startedAt: null, transactions: [], savingsGoals: [], tags: [] };
  }
  if (collectionName === 'habits') {
    return { habits: [], logs: [] };
  }
  if (collectionName === 'health') {
    return { entries: [], metrics: [] };
  }
  if (collectionName === 'app_settings') {
    return {
      themeMode: 'system',
      language: 'en',
      dataDirectory: getDataDirectory(),
      currency: 'USD',
      uiDensity: 'comfortable',
      accentColor: 'teal',
      startModule: 'dashboard',
      seedDataCreated: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }
  return [];
}

function assertCollectionName(value: string): CollectionName {
  if (value in collectionFiles) {
    return value as CollectionName;
  }
  throw new Error(`Unknown storage collection: ${value}`);
}

function getDocumentsDirectory() {
  return app.getPath('documents') || path.join(os.homedir(), 'Documents');
}

function getDataDirectory() {
  return path.join(getDocumentsDirectory(), 'MyMind', 'data');
}

async function ensureDataDirectory() {
  await fs.mkdir(getDataDirectory(), { recursive: true });
}

function filePath(collectionName: CollectionName) {
  return path.join(getDataDirectory(), collectionFiles[collectionName]);
}

function isRetryableStorageError(error: unknown) {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    retryableStorageErrorCodes.has(String((error as { code?: unknown }).code))
  );
}

function getStorageErrorCode(error: unknown) {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code);
  }
  return null;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withStorageRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= storageRetryDelaysMs.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableStorageError(error) || attempt === storageRetryDelaysMs.length) {
        throw error;
      }
      await wait(storageRetryDelaysMs[attempt]);
    }
  }

  throw lastError;
}

async function enqueueCollectionWrite<T>(collectionName: CollectionName, operation: () => Promise<T>) {
  const previous = collectionWriteQueues.get(collectionName) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  let tracked: Promise<T>;

  tracked = next.finally(() => {
    if (collectionWriteQueues.get(collectionName) === tracked) {
      collectionWriteQueues.delete(collectionName);
    }
  });

  collectionWriteQueues.set(collectionName, tracked);

  return tracked;
}

async function ensureFile(collectionName: CollectionName) {
  await ensureDataDirectory();
  const target = filePath(collectionName);
  try {
    await withStorageRetry(() => fs.access(target));
  } catch (error) {
    if (getStorageErrorCode(error) !== 'ENOENT') {
      throw error;
    }
    await writeJson(collectionName, defaultValue(collectionName));
  }
}

async function writeJson(collectionName: CollectionName, value: unknown) {
  return enqueueCollectionWrite(collectionName, async () => {
    await ensureDataDirectory();
    const encoded = `${JSON.stringify(value, null, 2)}\n`;
    await withStorageRetry(() => fs.writeFile(filePath(collectionName), encoded, 'utf8'));
  });
}

async function readJson(collectionName: CollectionName) {
  await ensureFile(collectionName);
  const target = filePath(collectionName);
  try {
    const content = await withStorageRetry(() => fs.readFile(target, 'utf8'));
    if (!content.trim()) {
      const safeDefault = defaultValue(collectionName);
      await writeJson(collectionName, safeDefault);
      return safeDefault;
    }
    return JSON.parse(content) as unknown;
  } catch (error) {
    if (isRetryableStorageError(error)) {
      throw error;
    }
    const backupPath = `${target}.corrupted.${Date.now()}`;
    try {
      await fs.copyFile(target, backupPath);
    } catch {
      // Recovery should continue even when the backup copy cannot be written.
    }
    const safeDefault = defaultValue(collectionName);
    await writeJson(collectionName, safeDefault);
    return safeDefault;
  }
}

function ensureListCollection(collectionName: CollectionName, value: unknown): Array<{ id: string }> {
  if (!listDefaults.has(collectionName) || !Array.isArray(value)) {
    throw new Error(`${collectionName} does not support item-level storage operations`);
  }
  return value.filter((item): item is { id: string } => Boolean(item && typeof item === 'object' && 'id' in item));
}

export function registerStorageIpc() {
  ipcMain.handle('storage:getAll', async (_event, collectionName: string) => {
    return readJson(assertCollectionName(collectionName));
  });

  ipcMain.handle('storage:saveAll', async (_event, collectionName: string, items: unknown) => {
    const safeName = assertCollectionName(collectionName);
    await writeJson(safeName, items);
    return readJson(safeName);
  });

  ipcMain.handle('storage:add', async (_event, collectionName: string, item: { id: string }) => {
    const safeName = assertCollectionName(collectionName);
    const list = ensureListCollection(safeName, await readJson(safeName));
    list.push(item);
    await writeJson(safeName, list);
    return item;
  });

  ipcMain.handle('storage:update', async (_event, collectionName: string, item: { id: string }) => {
    const safeName = assertCollectionName(collectionName);
    const list = ensureListCollection(safeName, await readJson(safeName));
    const index = list.findIndex((existing) => existing.id === item.id);
    if (index === -1) {
      list.push(item);
    } else {
      list[index] = item;
    }
    await writeJson(safeName, list);
    return item;
  });

  ipcMain.handle('storage:delete', async (_event, collectionName: string, id: string) => {
    const safeName = assertCollectionName(collectionName);
    const list = ensureListCollection(safeName, await readJson(safeName));
    await writeJson(
      safeName,
      list.filter((item) => item.id !== id),
    );
    return true;
  });

  ipcMain.handle('storage:getDataDirectory', async () => {
    await ensureDataDirectory();
    return getDataDirectory();
  });

  ipcMain.handle('storage:openDataDirectory', async () => {
    await ensureDataDirectory();
    return shell.openPath(getDataDirectory());
  });

  ipcMain.handle('storage:exportBackup', async () => {
    await ensureDataDirectory();
    const backupDirectory = path.join(getDocumentsDirectory(), 'MyMind', 'backups', `backup-${Date.now()}`);
    await fs.mkdir(backupDirectory, { recursive: true });
    for (const fileName of Object.values(collectionFiles)) {
      try {
        await fs.copyFile(path.join(getDataDirectory(), fileName), path.join(backupDirectory, fileName));
      } catch {
        // Continue exporting the files that exist.
      }
    }
    return backupDirectory;
  });

  ipcMain.handle('storage:exportBackupFile', async () => {
    await ensureDataDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const result = await dialog.showSaveDialog({
      title: 'Export full MyMind backup',
      defaultPath: path.join(getDocumentsDirectory(), `mymind-backup-${timestamp}.json`),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) {
      return null;
    }
    const collections = Object.fromEntries(
      await Promise.all(
        Object.keys(collectionFiles).map(async (collectionName) => [
          collectionName,
          await readJson(collectionName as CollectionName),
        ]),
      ),
    );
    await fs.writeFile(
      result.filePath,
      `${JSON.stringify({ app: 'MyMind', version: 1, exportedAt: nowIso(), collections }, null, 2)}\n`,
      'utf8',
    );
    return result.filePath;
  });

  ipcMain.handle('storage:importBackupFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import full MyMind backup',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const content = await fs.readFile(result.filePaths[0], 'utf8');
    const parsed = JSON.parse(content) as { collections?: Partial<Record<CollectionName, unknown>>; exportedAt?: string };
    if (!parsed.collections || typeof parsed.collections !== 'object') {
      throw new Error('Selected file is not a MyMind backup.');
    }
    const availableCollections = Object.keys(parsed.collections).filter((name) => name in collectionFiles);
    const confirmation = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Import backup', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'Import backup preview',
      message: `This backup contains ${availableCollections.length} collections.`,
      detail: `Exported: ${parsed.exportedAt ?? 'unknown'}\nCollections: ${availableCollections.join(', ')}\n\nImporting will replace the matching local JSON files.`,
    });
    if (confirmation.response !== 0) {
      return null;
    }
    await ensureDataDirectory();
    for (const collectionName of availableCollections) {
      await writeJson(collectionName as CollectionName, parsed.collections[collectionName as CollectionName]);
    }
    return getDataDirectory();
  });

  ipcMain.handle('storage:importBackup', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select MyMind JSON backup folder',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    await ensureDataDirectory();
    for (const fileName of Object.values(collectionFiles)) {
      try {
        await fs.copyFile(path.join(result.filePaths[0], fileName), path.join(getDataDirectory(), fileName));
      } catch {
        // Import partial backups without crashing.
      }
    }
    return getDataDirectory();
  });

  ipcMain.handle('storage:exportCollection', async (_event, collectionName: string) => {
    const safeName = assertCollectionName(collectionName);
    await ensureFile(safeName);
    const result = await dialog.showSaveDialog({
      title: `Export ${safeName}`,
      defaultPath: path.join(getDocumentsDirectory(), `${safeName}.json`),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) {
      return null;
    }
    await fs.copyFile(filePath(safeName), result.filePath);
    return result.filePath;
  });

  ipcMain.handle('storage:importCollection', async (_event, collectionName: string) => {
    const safeName = assertCollectionName(collectionName);
    const result = await dialog.showOpenDialog({
      title: `Import ${safeName}`,
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const content = await fs.readFile(result.filePaths[0], 'utf8');
    const parsed = JSON.parse(content);
    await writeJson(safeName, parsed);
    return filePath(safeName);
  });

  ipcMain.handle('reminders:schedule', async (_event, reminders: Array<{ id: string; title: string; body: string; at: string }>) => {
    scheduleReminders(reminders);
    return true;
  });
}

const reminderTimers = new Map<string, NodeJS.Timeout>();

function scheduleReminders(reminders: Array<{ id: string; title: string; body: string; at: string }>) {
  for (const timer of reminderTimers.values()) {
    clearTimeout(timer);
  }
  reminderTimers.clear();

  for (const reminder of reminders) {
    const delay = new Date(reminder.at).getTime() - Date.now();
    if (delay <= 0 || delay > 2147483647) {
      continue;
    }
    const timer = setTimeout(() => {
      if (Notification.isSupported()) {
        new Notification({ title: reminder.title, body: reminder.body }).show();
      }
      reminderTimers.delete(reminder.id);
    }, delay);
    reminderTimers.set(reminder.id, timer);
  }
}
