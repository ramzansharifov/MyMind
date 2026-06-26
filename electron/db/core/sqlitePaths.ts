import { app } from 'electron';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export function getDocumentsDirectory() {
  return app.getPath('documents') || path.join(os.homedir(), 'Documents');
}

export function getDataDirectory() {
  return path.join(getDocumentsDirectory(), 'MyMind', 'data');
}

export function getDatabasePath() {
  return path.join(getDataDirectory(), 'mymind.sqlite');
}

export async function ensureDataDirectory() {
  await fs.mkdir(getDataDirectory(), { recursive: true });
}

export function ensureDataDirectorySync() {
  fsSync.mkdirSync(getDataDirectory(), { recursive: true });
}
