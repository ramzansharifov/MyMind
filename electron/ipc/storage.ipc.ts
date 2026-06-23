import { app, dialog, ipcMain, Notification, shell } from 'electron';
import path from 'node:path';
import { assertCollectionName, type CollectionName } from './storageRegistry';
import {
  addCollectionItem,
  cleanupUnusedAssets,
  deleteCollectionItem,
  deleteNoteAsset,
  deleteNoteDraft,
  deleteNoteStorage,
  ensureDataDirectory,
  exportCollectionDatabase,
  exportWorkspaceBackupFolder,
  exportWorkspaceDatabaseFile,
  generateNoteHtml,
  getAssetInfoFromUrl,
  getCachedNoteHtml,
  getDataDirectory,
  getDocumentsDirectory,
  importCollectionDatabase,
  importWorkspaceBackupFolder,
  importWorkspaceDatabaseFile,
  invalidateNoteHtmlCache,
  listGlobalAssets,
  listNoteAssetFiles,
  openContainingFolderFromUrl,
  patchNoteMetadata,
  readCollection,
  readNoteDraft,
  readNoteFile,
  readNoteIndex,
  readSearchIndex,
  saveGlobalAsset,
  saveNoteAsset,
  saveNoteDraft,
  saveNoteFile,
  updateCollectionItem,
  writeCollection,
} from '../db/sqliteRepository';

type NoteFile = {
  id: string;
  [key: string]: unknown;
};

export function registerStorageIpc() {
  ipcMain.handle('storage:getAll', async (_event, collectionName: string) => {
    return readCollection(assertCollectionName(collectionName));
  });

  ipcMain.handle('storage:saveAll', async (_event, collectionName: string, items: unknown) => {
    return writeCollection(assertCollectionName(collectionName), items);
  });

  ipcMain.handle('storage:add', async (_event, collectionName: string, item: { id: string }) => {
    return addCollectionItem(assertCollectionName(collectionName), item);
  });

  ipcMain.handle('storage:update', async (_event, collectionName: string, item: { id: string }) => {
    return updateCollectionItem(assertCollectionName(collectionName), item);
  });

  ipcMain.handle('storage:delete', async (_event, collectionName: string, id: string) => {
    return deleteCollectionItem(assertCollectionName(collectionName), id);
  });

  ipcMain.handle('storage:getDataDirectory', async () => {
    await ensureDataDirectory();
    return getDataDirectory();
  });

  ipcMain.handle('storage:openDataDirectory', async () => {
    await ensureDataDirectory();
    return shell.openPath(getDataDirectory());
  });

  ipcMain.handle('files:saveAsset', async (_event, payload: { name?: unknown; data?: ArrayBuffer }) => {
    return saveGlobalAsset(payload);
  });

  ipcMain.handle('files:listAssets', async () => {
    return listGlobalAssets();
  });

  ipcMain.handle('files:getAssetInfo', async (_event, url: string) => {
    return getAssetInfoFromUrl(url);
  });

  ipcMain.handle('files:openContainingFolder', async (_event, url: string) => {
    return openContainingFolderFromUrl(url);
  });

  ipcMain.handle('notes:listIndex', async () => {
    const startedAt = performance.now();
    const index = await readNoteIndex();

    if (!app.isPackaged) {
      console.info('[notes:index:sqlite]', {
        items: index.length,
        loadMs: Math.round((performance.now() - startedAt) * 10) / 10,
      });
    }

    return index;
  });

  ipcMain.handle('notes:listSearchIndex', async () => {
    return readSearchIndex();
  });

  ipcMain.handle('notes:get', async (_event, noteId: string) => {
    const startedAt = performance.now();
    const note = await readNoteFile(noteId);

    if (!app.isPackaged && note) {
      console.info('[notes:get:sqlite]', {
        noteId,
        loadMs: Math.round((performance.now() - startedAt) * 10) / 10,
        approximateSizeBytes: Buffer.byteLength(JSON.stringify(note), 'utf8'),
        assetCount: Array.isArray(note.assets) ? note.assets.length : 0,
      });
    }

    return note;
  });

  ipcMain.handle('notes:save', async (_event, note: NoteFile) => {
    const startedAt = performance.now();
    const saved = await saveNoteFile(note);

    if (!app.isPackaged && saved) {
      console.info('[notes:save:sqlite]', {
        noteId: saved.id,
        saveMs: Math.round((performance.now() - startedAt) * 10) / 10,
        approximateSizeBytes: Buffer.byteLength(JSON.stringify(saved), 'utf8'),
        assetCount: Array.isArray(saved.assets) ? saved.assets.length : 0,
      });
    }

    return saved;
  });

  ipcMain.handle('notes:patchMetadata', async (_event, noteId: string, patch: Partial<NoteFile>) => {
    return patchNoteMetadata(noteId, patch);
  });

  ipcMain.handle('notes:patchManyMetadata', async (_event, noteIds: string[], patch: Partial<NoteFile>) => {
    await Promise.all(noteIds.map((noteId) => patchNoteMetadata(noteId, patch)));
    return true;
  });

  ipcMain.handle('notes:delete', async (_event, noteId: string) => {
    return deleteNoteStorage(noteId);
  });

  ipcMain.handle('notes:saveDraft', async (_event, noteId: string, editorContent: unknown) => {
    const startedAt = performance.now();
    const draft = await saveNoteDraft(noteId, editorContent);

    if (!app.isPackaged) {
      console.info('[notes:draft:save:sqlite]', {
        noteId,
        saveMs: Math.round((performance.now() - startedAt) * 10) / 10,
      });
    }

    return draft;
  });

  ipcMain.handle('notes:getDraft', async (_event, noteId: string) => {
    return readNoteDraft(noteId);
  });

  ipcMain.handle('notes:deleteDraft', async (_event, noteId: string) => {
    return deleteNoteDraft(noteId);
  });

  ipcMain.handle('notes:saveAsset', async (_event, payload: { noteId?: unknown; name?: unknown; mimeType?: unknown; data?: ArrayBuffer }) => {
    return saveNoteAsset(payload);
  });

  ipcMain.handle('notes:listAssets', async (_event, noteId: string) => {
    return listNoteAssetFiles(noteId);
  });

  ipcMain.handle('notes:getAssetInfo', async (_event, noteId: string, assetId: string) => {
    return (await listNoteAssetFiles(noteId)).find((asset) => asset.id === assetId) ?? null;
  });

  ipcMain.handle('notes:deleteAsset', async (_event, noteId: string, assetId: string) => {
    return deleteNoteAsset(noteId, assetId);
  });

  ipcMain.handle('notes:cleanupUnusedAssets', async (_event, noteId: string) => {
    return cleanupUnusedAssets(noteId);
  });

  ipcMain.handle('notes:generateHtml', async (_event, noteId: string) => {
    return generateNoteHtml(noteId);
  });

  ipcMain.handle('notes:getCachedHtml', async (_event, noteId: string) => {
    return getCachedNoteHtml(noteId);
  });

  ipcMain.handle('notes:invalidateHtmlCache', async (_event, noteId: string) => {
    return invalidateNoteHtmlCache(noteId);
  });

  ipcMain.handle('storage:exportBackup', async () => {
    return exportWorkspaceBackupFolder();
  });

  ipcMain.handle('storage:importBackup', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select MyMind SQLite backup folder',
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return importWorkspaceBackupFolder(result.filePaths[0]);
  });

  ipcMain.handle('storage:exportBackupFile', async () => {
    await ensureDataDirectory();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const result = await dialog.showSaveDialog({
      title: 'Export MyMind SQLite workspace',
      defaultPath: path.join(getDocumentsDirectory(), `mymind-backup-${timestamp}.sqlite`),
      filters: [{ name: 'SQLite database', extensions: ['sqlite', 'db'] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    return exportWorkspaceDatabaseFile(result.filePath);
  });

  ipcMain.handle('storage:importBackupFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import MyMind SQLite workspace',
      properties: ['openFile'],
      filters: [{ name: 'SQLite database', extensions: ['sqlite', 'db'] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const confirmation = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Import SQLite workspace', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'Replace current workspace',
      message: 'Importing will replace the current MyMind SQLite database.',
      detail: 'This development patch does not migrate or preserve the old JSON workspace.',
    });

    if (confirmation.response !== 0) {
      return null;
    }

    return importWorkspaceDatabaseFile(result.filePaths[0]);
  });

  ipcMain.handle('storage:exportCollection', async (_event, collectionName: string) => {
    const safeName = assertCollectionName(collectionName);
    const result = await dialog.showSaveDialog({
      title: `Export ${safeName}`,
      defaultPath: path.join(getDocumentsDirectory(), `${safeName}.sqlite`),
      filters: [{ name: 'SQLite database', extensions: ['sqlite', 'db'] }],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    return exportCollectionDatabase(safeName, result.filePath);
  });

  ipcMain.handle('storage:importCollection', async (_event, collectionName: string) => {
    const safeName = assertCollectionName(collectionName);
    const result = await dialog.showOpenDialog({
      title: `Import ${safeName}`,
      properties: ['openFile'],
      filters: [{ name: 'SQLite database', extensions: ['sqlite', 'db'] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return importCollectionDatabase(safeName as CollectionName, result.filePaths[0]);
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
