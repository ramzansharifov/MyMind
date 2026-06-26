import Database from 'better-sqlite3';
import { collections, defaultValue, nowIso } from '../ipc/storageRegistry';
import { configureSqliteDatabase, ensureDataDirectorySync, getDataDirectory, getDatabasePath, startLegacyJsonCleanup, stringifyJson } from './core';
import { createCollectionRepository, createNotesRepository, createWorkspaceBackupRepository } from './repositories';
import { initializeDatabaseSchema } from './schema';

export { ensureDataDirectory, getDataDirectory, getDatabasePath, getDocumentsDirectory } from './core';

type SqliteDatabase = Database.Database;

let database: SqliteDatabase | null = null;

function getDb() {
  if (database) {
    return database;
  }

  ensureDataDirectorySync();

  const db = new Database(getDatabasePath());
  configureSqliteDatabase(db);

  initializeDatabase(db);
  database = db;
  startLegacyJsonCleanup();

  return database;
}

function initializeDatabase(db: SqliteDatabase) {
  initializeDatabaseSchema(db);
  seedDefaultCollections(db);
}

function seedDefaultCollections(db: SqliteDatabase) {
  const now = nowIso();
  const insertCollection = db.prepare(`
    INSERT OR IGNORE INTO collections (name, payload, created_at, updated_at)
    VALUES (@name, @payload, @createdAt, @updatedAt)
  `);

  const tx = db.transaction(() => {
    for (const collectionName of collections) {
      insertCollection.run({
        name: collectionName,
        payload: stringifyJson(defaultValue(collectionName, getDataDirectory())),
        createdAt: now,
        updatedAt: now,
      });
    }

    db.prepare(`
      INSERT OR REPLACE INTO meta (key, value)
      VALUES ('schema_version', '1')
    `).run();
  });

  tx();
}

const collectionRepository = createCollectionRepository({ getDb });

export const readCollection = collectionRepository.readCollection;
export const writeCollection = collectionRepository.writeCollection;
export const addCollectionItem = collectionRepository.addCollectionItem;
export const updateCollectionItem = collectionRepository.updateCollectionItem;
export const deleteCollectionItem = collectionRepository.deleteCollectionItem;

const notesRepository = createNotesRepository({ getDb });

export const saveGlobalAsset = notesRepository.saveGlobalAsset;
export const listGlobalAssets = notesRepository.listGlobalAssets;
export const getAssetInfoFromUrl = notesRepository.getAssetInfoFromUrl;
export const openContainingFolderFromUrl = notesRepository.openContainingFolderFromUrl;
export const readNoteIndex = notesRepository.readNoteIndex;
export const readSearchIndex = notesRepository.readSearchIndex;
export const readNoteFile = notesRepository.readNoteFile;
export const saveNoteFile = notesRepository.saveNoteFile;
export const patchNoteMetadata = notesRepository.patchNoteMetadata;
export const deleteNoteStorage = notesRepository.deleteNoteStorage;
export const saveNoteDraft = notesRepository.saveNoteDraft;
export const readNoteDraft = notesRepository.readNoteDraft;
export const deleteNoteDraft = notesRepository.deleteNoteDraft;
export const saveNoteAsset = notesRepository.saveNoteAsset;
export const listNoteAssetFiles = notesRepository.listNoteAssetFiles;
export const deleteNoteAsset = notesRepository.deleteNoteAsset;
export const cleanupUnusedAssets = notesRepository.cleanupUnusedAssets;
export const generateNoteHtml = notesRepository.generateNoteHtml;
export const getCachedNoteHtml = notesRepository.getCachedNoteHtml;
export const invalidateNoteHtmlCache = notesRepository.invalidateNoteHtmlCache;

export function closeDatabase() {
  if (!database) {
    return;
  }

  try {
    database.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // The database may already be closing; the next startup can still recover WAL.
  }

  database.close();
  database = null;
}

function reopenDatabase() {
  database = null;
  getDb();
}

const workspaceBackupRepository = createWorkspaceBackupRepository({
  getDb,
  closeDatabase,
  reopenDatabase,
  readCollection,
  writeCollection,
});

export const exportWorkspaceBackupFolder = workspaceBackupRepository.exportWorkspaceBackupFolder;
export const importWorkspaceBackupFolder = workspaceBackupRepository.importWorkspaceBackupFolder;
export const exportWorkspaceDatabaseFile = workspaceBackupRepository.exportWorkspaceDatabaseFile;
export const importWorkspaceDatabaseFile = workspaceBackupRepository.importWorkspaceDatabaseFile;
export const exportCollectionDatabase = workspaceBackupRepository.exportCollectionDatabase;
export const importCollectionDatabase = workspaceBackupRepository.importCollectionDatabase;