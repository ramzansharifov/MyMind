const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const storageSource = fs.readFileSync(path.join(root, 'electron/ipc/storage.ipc.ts'), 'utf8');
const packageSource = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

const requiredTokens = [
  'better-sqlite3',
  'CREATE TABLE IF NOT EXISTS collections',
  'CREATE TABLE IF NOT EXISTS collection_items',
  'CREATE TABLE IF NOT EXISTS notes',
  'CREATE TABLE IF NOT EXISTS note_drafts',
  'CREATE TABLE IF NOT EXISTS note_html_cache',
  'CREATE TABLE IF NOT EXISTS study_materials',
  'storage_migrations',
  'writeCollectionToDatabase',
  'readCollectionFromDatabase',
  'migrateLegacyNoteStorageIfNeeded',
  'migrateLegacyStudyStorageIfNeeded',
];

for (const token of requiredTokens) {
  if (!storageSource.includes(token) && !packageSource.includes(token)) {
    throw new Error(`SQLite storage verification failed: missing ${token}`);
  }
}

for (const removedToken of ['writeJsonFile(', 'ensureJsonFile(', '@blocknote/', '"tldraw"']) {
  if (storageSource.includes(removedToken) || packageSource.includes(removedToken)) {
    throw new Error(`SQLite storage verification failed: found removed token ${removedToken}`);
  }
}

console.log('SQLite storage checks passed.');
