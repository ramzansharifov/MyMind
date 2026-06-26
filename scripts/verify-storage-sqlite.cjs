const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function assertIncludes(file, token) {
  const source = read(file);
  if (!source.includes(token)) {
    throw new Error(`${file} must include ${token}`);
  }
}

function assertNotIncludes(file, token) {
  const source = read(file);
  if (source.includes(token)) {
    throw new Error(`${file} must not include ${token}`);
  }
}

assertIncludes('package.json', 'better-sqlite3');
assertIncludes('package.json', 'drizzle-orm');

assertIncludes('electron/db/sqliteRepository.ts', 'initializeDatabaseSchema(db)');
assertIncludes('electron/db/sqliteRepository.ts', 'createCollectionRepository');
assertIncludes('electron/db/sqliteRepository.ts', 'createNotesRepository({ getDb })');
assertIncludes('electron/db/sqliteRepository.ts', 'createWorkspaceBackupRepository');
assertIncludes('electron/db/sqliteRepository.ts', 'startLegacyJsonCleanup');
assertIncludes('electron/db/sqliteRepository.ts', "from './core'");
assertIncludes('electron/db/sqliteRepository.ts', "from './repositories'");
assertIncludes('electron/db/sqliteRepository.ts', 'export const readCollection = collectionRepository.readCollection');
assertNotIncludes('electron/db/sqliteRepository.ts', 'legacyJsonStorageNames');
assertNotIncludes('electron/db/sqliteRepository.ts', 'validateWorkspaceDatabase');

assertIncludes('electron/db/core/sqlitePaths.ts', 'getDatabasePath');
assertIncludes('electron/db/core/sqlitePragmas.ts', 'foreign_keys = ON');
assertIncludes('electron/db/core/json.ts', 'parseJson');
assertIncludes('electron/db/core/sqliteErrors.ts', 'getStorageErrorCode');
assertIncludes('electron/db/core/legacyJsonCleanup.ts', 'legacyJsonStorageNames');
assertIncludes('electron/db/core/legacyJsonCleanup.ts', 'startLegacyJsonCleanup');
assertIncludes('electron/db/core/index.ts', "export * from './sqlitePaths'");

assertIncludes('electron/db/schema/initializeSchema.ts', 'CREATE TABLE IF NOT EXISTS collections');
assertIncludes('electron/db/schema/initializeSchema.ts', 'CREATE TABLE IF NOT EXISTS notes');
assertIncludes('electron/db/schema/initializeSchema.ts', 'CREATE TABLE IF NOT EXISTS note_drafts');
assertIncludes('electron/db/schema/initializeSchema.ts', 'CREATE TABLE IF NOT EXISTS note_html_cache');
assertIncludes('electron/db/schema/initializeSchema.ts', 'CREATE TABLE IF NOT EXISTS study_materials');
assertIncludes('electron/db/schema/index.ts', 'initializeDatabaseSchema');
assertIncludes('electron/db/schema/coreTables.ts', 'noteAssetsTable');
assertIncludes('electron/db/schema/coreTables.ts', 'noteDraftsTable');
assertIncludes('electron/db/schema/coreTables.ts', 'noteHtmlCacheTable');
assertIncludes('electron/db/schema/coreTables.ts', 'studyMaterialsTable');

assertIncludes('electron/db/repositories/index.ts', 'createWorkspaceBackupRepository');
assertIncludes('electron/db/repositories/collectionRepository.ts', 'ON CONFLICT(name) DO UPDATE');
assertIncludes('electron/db/repositories/collectionRepository.ts', 'ensureListCollection');
assertIncludes('electron/db/repositories/notesRepository.ts', 'createNotesRepository');
assertIncludes('electron/db/repositories/notesRepository.ts', 'saveNoteFile');
assertIncludes('electron/db/repositories/notesRepository.ts', 'saveGlobalAsset');
assertIncludes('electron/db/repositories/notesRepository.ts', 'generateNoteHtml');
assertIncludes('electron/db/repositories/notesRepository.ts', "from '../core'");
assertIncludes('electron/db/repositories/workspaceBackupRepository.ts', 'createWorkspaceBackupRepository');
assertIncludes('electron/db/repositories/workspaceBackupRepository.ts', 'exportWorkspaceBackupFolder');
assertIncludes('electron/db/repositories/workspaceBackupRepository.ts', 'importCollectionDatabase');

assertIncludes('electron/db/studyRepository.ts', "from './repositories'");
assertIncludes('electron/db/repositories/studyRepository.ts', 'CREATE TABLE IF NOT EXISTS study_materials');
assertIncludes('electron/db/repositories/studyRepository.ts', 'ALTER TABLE study_materials ADD COLUMN');
assertIncludes('electron/db/repositories/studyRepository.ts', 'ON CONFLICT(id) DO UPDATE');
assertIncludes('electron/db/repositories/studyRepository.ts', 'readStudyMaterialIndex');
assertIncludes('electron/db/repositories/studyRepository.ts', 'saveStudyMaterial');
assertIncludes('electron/db/repositories/studyRepository.ts', "from '../core'");
assertIncludes('electron/db/repositories/studyRepository.ts', 'configureSqliteDatabase(db)');
assertNotIncludes('electron/db/repositories/studyRepository.ts', "from '../sqliteRepository'");

assertIncludes('electron/ipc/storage.ipc.ts', "from '../db/studyRepository'");
assertIncludes('electron/ipc/storage.ipc.ts', 'study:listIndex');
assertIncludes('electron/ipc/storage.ipc.ts', 'study:get');
assertIncludes('electron/ipc/storage.ipc.ts', 'study:save');
assertIncludes('electron/ipc/storage.ipc.ts', 'study:delete');

assertIncludes('electron/preload.ts', 'study:save');
assertIncludes('src/modules/study/storage/studyStorageClient.ts', 'treeSaveQueue');
assertIncludes('src/modules/study/StudyPage.tsx', 'flushPendingStudySaves');
assertIncludes('src/modules/study/StudyPage.tsx', 'lastReconciledStudySignatureRef');

for (const removedToken of ['writeJsonFile(', 'ensureJsonFile(', '@blocknote/', '"tldraw"']) {
  assertNotIncludes('electron/ipc/storage.ipc.ts', removedToken);
  assertNotIncludes('package.json', removedToken);
}

console.log('SQLite + Study persistence checks passed.');