import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDataDirectory, getDataDirectory, getDatabasePath } from './sqlitePaths';

const legacyJsonStorageNames = [
  'movies.json',
  'workouts.json',
  'todos.json',
  'finance.json',
  'habits.json',
  'calendar_events.json',
  'journal_entries.json',
  'notes.json',
  'templates.json',
  'projects.json',
  'contacts.json',
  'health.json',
  'goals.json',
  'inventory.json',
  'app_settings.json',
  'notes.index.json',
  'search.index.json',
  'notes.legacy-backup.done',
  'notes',
  'drafts',
  'html-cache',
];

let legacyCleanupStarted = false;

export function startLegacyJsonCleanup() {
  if (legacyCleanupStarted) {
    return;
  }

  legacyCleanupStarted = true;

  void cleanupLegacyJsonStorage().catch((error) => {
    if (!app.isPackaged) {
      console.warn('[sqlite] legacy JSON cleanup failed:', error);
    }
  });
}

async function cleanupLegacyJsonStorage() {
  await ensureDataDirectory();

  for (const name of legacyJsonStorageNames) {
    const target = path.join(getDataDirectory(), name);
    if (target === getDatabasePath()) {
      continue;
    }

    await fs.rm(target, { recursive: true, force: true });
  }
}