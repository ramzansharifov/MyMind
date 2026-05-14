import { contextBridge, ipcRenderer } from 'electron';

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
});
