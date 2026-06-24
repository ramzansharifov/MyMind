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

assertIncludes('electron/db/sqliteRepository.ts', 'CREATE TABLE IF NOT EXISTS collections');
assertIncludes('electron/db/sqliteRepository.ts', 'CREATE TABLE IF NOT EXISTS notes');
assertIncludes('electron/db/sqliteRepository.ts', 'CREATE TABLE IF NOT EXISTS note_drafts');
assertIncludes('electron/db/sqliteRepository.ts', 'CREATE TABLE IF NOT EXISTS note_html_cache');

assertIncludes('electron/db/studyRepository.ts', 'CREATE TABLE IF NOT EXISTS study_materials');
assertIncludes('electron/db/studyRepository.ts', 'ALTER TABLE study_materials ADD COLUMN');
assertIncludes('electron/db/studyRepository.ts', 'ON CONFLICT(id) DO UPDATE');
assertIncludes('electron/db/studyRepository.ts', 'readStudyMaterialIndex');
assertIncludes('electron/db/studyRepository.ts', 'saveStudyMaterial');

assertIncludes('electron/ipc/storage.ipc.ts', "from '../db/studyRepository'");
assertIncludes('electron/ipc/storage.ipc.ts', "study:listIndex");
assertIncludes('electron/ipc/storage.ipc.ts', "study:get");
assertIncludes('electron/ipc/storage.ipc.ts', "study:save");
assertIncludes('electron/ipc/storage.ipc.ts', "study:delete");

assertIncludes('electron/preload.ts', 'study:save');
assertIncludes('src/modules/study/storage/studyStorageClient.ts', 'treeSaveQueue');
assertIncludes('src/modules/study/StudyPage.tsx', 'flushPendingStudySaves');
assertIncludes('src/modules/study/StudyPage.tsx', 'lastReconciledStudySignatureRef');

for (const removedToken of ['writeJsonFile(', 'ensureJsonFile(', '@blocknote/', '"tldraw"']) {
  assertNotIncludes('electron/ipc/storage.ipc.ts', removedToken);
  assertNotIncludes('package.json', removedToken);
}

console.log('SQLite + Study persistence checks passed.');