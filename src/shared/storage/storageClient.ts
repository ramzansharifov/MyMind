import type { CollectionMap, CollectionName } from './storageTypes';

export const storageClient = {
  getAll<K extends CollectionName>(collectionName: K) {
    return window.mymind.storage.getAll(collectionName) as Promise<CollectionMap[K]>;
  },
  saveAll<K extends CollectionName>(collectionName: K, items: CollectionMap[K]) {
    return window.mymind.storage.saveAll(collectionName, items) as Promise<CollectionMap[K]>;
  },
  add<T extends { id: string }>(collectionName: CollectionName, item: T) {
    return window.mymind.storage.add(collectionName, item) as Promise<T>;
  },
  update<T extends { id: string }>(collectionName: CollectionName, item: T) {
    return window.mymind.storage.update(collectionName, item) as Promise<T>;
  },
  delete(collectionName: CollectionName, id: string) {
    return window.mymind.storage.delete(collectionName, id);
  },
  getDataDirectory() {
    return window.mymind.storage.getDataDirectory();
  },
  openDataDirectory() {
    return window.mymind.storage.openDataDirectory();
  },
  exportBackup() {
    return window.mymind.storage.exportBackup();
  },
  importBackup() {
    return window.mymind.storage.importBackup();
  },
  exportBackupFile() {
    return window.mymind.storage.exportBackupFile();
  },
  importBackupFile() {
    return window.mymind.storage.importBackupFile();
  },
  exportCollection(collectionName: CollectionName) {
    return window.mymind.storage.exportCollection(collectionName);
  },
  importCollection(collectionName: CollectionName) {
    return window.mymind.storage.importCollection(collectionName);
  },
  scheduleReminders(reminders: Array<{ id: string; title: string; body: string; at: string }>) {
    return window.mymind.storage.scheduleReminders(reminders);
  },
};
