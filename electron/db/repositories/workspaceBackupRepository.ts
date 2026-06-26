import Database from 'better-sqlite3';
import fs from 'node:fs/promises';
import path from 'node:path';
import { assertCollectionName, defaultValue, nowIso, type CollectionName } from '../../ipc/storageRegistry';
import { ensureDataDirectory, getDataDirectory, getDatabasePath, getDocumentsDirectory, parseJson, stringifyJson } from '../core';

type SqliteDatabase = Database.Database;

type WorkspaceBackupRepositoryOptions = {
  getDb: () => SqliteDatabase;
  closeDatabase: () => void;
  reopenDatabase: () => void;
  readCollection: (collectionName: CollectionName) => Promise<unknown>;
  writeCollection: (collectionName: CollectionName, value: unknown) => Promise<unknown>;
};

export function createWorkspaceBackupRepository({
  getDb,
  closeDatabase,
  reopenDatabase,
  readCollection,
  writeCollection,
}: WorkspaceBackupRepositoryOptions) {
  async function snapshotDatabaseTo(targetPath: string) {
    await ensureDataDirectory();
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.rm(targetPath, { force: true });

    const db = getDb();
    db.pragma('wal_checkpoint(TRUNCATE)');

    const escaped = targetPath.replace(/'/g, "''");
    db.exec(`VACUUM INTO '${escaped}'`);
  }

  function validateWorkspaceDatabase(filePath: string) {
    const imported = new Database(filePath, { readonly: true });
    try {
      const row = imported
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'collections'")
        .get() as { name?: string } | undefined;

      if (!row?.name) {
        throw new Error('Selected file is not a MyMind SQLite workspace.');
      }
    } finally {
      imported.close();
    }
  }

  async function replaceWorkspaceDatabaseFromFile(sourceFile: string) {
    validateWorkspaceDatabase(sourceFile);

    await ensureDataDirectory();
    closeDatabase();
    await fs.copyFile(sourceFile, getDatabasePath());
    reopenDatabase();
  }

  async function exportWorkspaceBackupFolder() {
    await ensureDataDirectory();

    const backupDirectory = path.join(getDocumentsDirectory(), 'MyMind', 'backups', `backup-${Date.now()}`);
    await fs.mkdir(backupDirectory, { recursive: true });

    await snapshotDatabaseTo(path.join(backupDirectory, 'mymind.sqlite'));

    try {
      await fs.cp(path.join(getDataDirectory(), 'assets'), path.join(backupDirectory, 'assets'), { recursive: true });
    } catch {
      // Assets are optional.
    }

    return backupDirectory;
  }

  async function importWorkspaceBackupFolder(sourceDirectory: string) {
    const sourceDb = path.join(sourceDirectory, 'mymind.sqlite');
    await replaceWorkspaceDatabaseFromFile(sourceDb);

    try {
      await fs.rm(path.join(getDataDirectory(), 'assets'), { recursive: true, force: true });
      await fs.cp(path.join(sourceDirectory, 'assets'), path.join(getDataDirectory(), 'assets'), { recursive: true });
    } catch {
      // Backup can be database-only.
    }

    return getDataDirectory();
  }

  async function exportWorkspaceDatabaseFile(targetPath: string) {
    await snapshotDatabaseTo(targetPath);
    return targetPath;
  }

  async function importWorkspaceDatabaseFile(sourcePath: string) {
    await replaceWorkspaceDatabaseFromFile(sourcePath);
    return getDataDirectory();
  }

  async function exportCollectionDatabase(collectionName: CollectionName, targetPath: string) {
    const safeName = assertCollectionName(collectionName);
    const payload = await readCollection(safeName);

    await fs.rm(targetPath, { force: true });
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    const target = new Database(targetPath);
    try {
      target.exec(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE collections (
          name TEXT PRIMARY KEY,
          payload TEXT NOT NULL CHECK (json_valid(payload)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      const now = nowIso();
      target
        .prepare(
          `
            INSERT INTO collections (name, payload, created_at, updated_at)
            VALUES (?, ?, ?, ?)
          `,
        )
        .run(safeName, stringifyJson(payload), now, now);
    } finally {
      target.close();
    }

    return targetPath;
  }

  async function importCollectionDatabase(collectionName: CollectionName, sourcePath: string) {
    const safeName = assertCollectionName(collectionName);
    const source = new Database(sourcePath, { readonly: true });

    try {
      const row = source
        .prepare('SELECT payload FROM collections WHERE name = ?')
        .get(safeName) as { payload?: string } | undefined;

      if (!row?.payload) {
        throw new Error(`Selected SQLite file does not contain collection: ${safeName}`);
      }

      await writeCollection(safeName, parseJson(row.payload, defaultValue(safeName, getDataDirectory())));
      return getDataDirectory();
    } finally {
      source.close();
    }
  }

  return {
    exportWorkspaceBackupFolder,
    importWorkspaceBackupFolder,
    exportWorkspaceDatabaseFile,
    importWorkspaceDatabaseFile,
    exportCollectionDatabase,
    importCollectionDatabase,
  };
}