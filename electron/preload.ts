import { contextBridge, ipcRenderer, webUtils } from 'electron';

const storage = {
  getAll: (collectionName: string) => ipcRenderer.invoke('storage:getAll', collectionName),
  saveAll: (collectionName: string, items: unknown) => ipcRenderer.invoke('storage:saveAll', collectionName, items),
  add: (collectionName: string, item: { id: string }) => ipcRenderer.invoke('storage:add', collectionName, item),
  update: (collectionName: string, item: { id: string }) => ipcRenderer.invoke('storage:update', collectionName, item),
  delete: (collectionName: string, id: string) => ipcRenderer.invoke('storage:delete', collectionName, id),
  getDataDirectory: () => ipcRenderer.invoke('storage:getDataDirectory'),
  openDataDirectory: () => ipcRenderer.invoke('storage:openDataDirectory'),
  exportBackup: () => ipcRenderer.invoke('storage:exportBackup'),
  importBackup: () => ipcRenderer.invoke('storage:importBackup'),
  exportBackupFile: () => ipcRenderer.invoke('storage:exportBackupFile'),
  importBackupFile: () => ipcRenderer.invoke('storage:importBackupFile'),
  exportCollection: (collectionName: string) => ipcRenderer.invoke('storage:exportCollection', collectionName),
  importCollection: (collectionName: string) => ipcRenderer.invoke('storage:importCollection', collectionName),
  scheduleReminders: (reminders: Array<{ id: string; title: string; body: string; at: string }>) =>
    ipcRenderer.invoke('reminders:schedule', reminders),
};

contextBridge.exposeInMainWorld('mymind', {
  storage,
  notes: {
    listIndex: () => ipcRenderer.invoke('notes:listIndex'),
    listSearchIndex: () => ipcRenderer.invoke('notes:listSearchIndex'),
    get: (noteId: string) => ipcRenderer.invoke('notes:get', noteId),
    save: (note: unknown) => ipcRenderer.invoke('notes:save', note),
    patchMetadata: (noteId: string, patch: unknown) => ipcRenderer.invoke('notes:patchMetadata', noteId, patch),
    patchManyMetadata: (noteIds: string[], patch: unknown) => ipcRenderer.invoke('notes:patchManyMetadata', noteIds, patch),
    delete: (noteId: string) => ipcRenderer.invoke('notes:delete', noteId),
    saveDraft: (noteId: string, editorContent: unknown) => ipcRenderer.invoke('notes:saveDraft', noteId, editorContent),
    getDraft: (noteId: string) => ipcRenderer.invoke('notes:getDraft', noteId),
    deleteDraft: (noteId: string) => ipcRenderer.invoke('notes:deleteDraft', noteId),
    saveAsset: (payload: { noteId: string; name: string; mimeType: string; data: ArrayBuffer }) =>
      ipcRenderer.invoke('notes:saveAsset', payload),
    listAssets: (noteId: string) => ipcRenderer.invoke('notes:listAssets', noteId),
    getAssetInfo: (noteId: string, assetId: string) => ipcRenderer.invoke('notes:getAssetInfo', noteId, assetId),
    deleteAsset: (noteId: string, assetId: string) => ipcRenderer.invoke('notes:deleteAsset', noteId, assetId),
    cleanupUnusedAssets: (noteId: string) => ipcRenderer.invoke('notes:cleanupUnusedAssets', noteId),
    generateHtml: (noteId: string) => ipcRenderer.invoke('notes:generateHtml', noteId),
    getCachedHtml: (noteId: string) => ipcRenderer.invoke('notes:getCachedHtml', noteId),
    invalidateHtmlCache: (noteId: string) => ipcRenderer.invoke('notes:invalidateHtmlCache', noteId),
  },
  files: {
    getPathForFile: (file: unknown) => webUtils.getPathForFile(file as any),
    saveAsset: (payload: { name: string; data: ArrayBuffer }) => ipcRenderer.invoke('files:saveAsset', payload),
    listAssets: () => ipcRenderer.invoke('files:listAssets'),
    getAssetInfo: (url: string) => ipcRenderer.invoke('files:getAssetInfo', url),
    openContainingFolder: (url: string) => ipcRenderer.invoke('files:openContainingFolder', url),
  },
});
