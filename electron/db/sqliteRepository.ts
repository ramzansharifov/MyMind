import { app, shell } from 'electron';
import Database from 'better-sqlite3';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertCollectionName, collections, defaultValue, nowIso, type CollectionName } from '../ipc/storageRegistry';

type SqliteDatabase = Database.Database;

type NoteAssetType = 'image' | 'video' | 'audio' | 'file' | 'drawing';

type NoteAsset = {
  id: string;
  noteId: string;
  type: NoteAssetType;
  name: string;
  mimeType: string;
  size: number;
  sizeBytes: number;
  relativePath: string;
  createdAt: string;
};

type NoteIndexItem = {
  id: string;
  title: string;
  previewText: string;
  tags: string[];
  category: string;
  groupId?: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  trashedAt?: string | null;
  trashExpiresAt?: string | null;
  pinnedAt?: string | null;
  statusBeforeArchive?: string | null;
  statusBeforeTrash?: string | null;
  coverAssetId?: string | null;
  layoutWidth?: 900 | 1000 | 1100 | 1200;
};

type NoteFile = NoteIndexItem & {
  content?: string;
  contentFormat?: 'plain' | 'html' | 'markdown';
  editorContent: unknown;
  editorPlainText: string;
  editorHtml?: string;
  properties: unknown[];
  assets: NoteAsset[];
  schemaVersion: number;
};

type NoteDraft = {
  noteId: string;
  editorContent: unknown;
  updatedAt: string;
};

type NoteSearchIndexItem = {
  noteId: string;
  title: string;
  editorPlainText: string;
  tags: string[];
  category: string;
  groupId?: string | null;
  updatedAt: string;
};

type StudyMaterial = {
  id: string;
  title: string;
  editorContent: unknown;
  plainText: string;
  boardLinks: unknown[];
  createdAt: string;
  updatedAt: string;
};

let database: SqliteDatabase | null = null;
let legacyCleanupStarted = false;

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

function ensureDataDirectorySync() {
  fsSync.mkdirSync(getDataDirectory(), { recursive: true });
}

function getDb() {
  if (database) {
    return database;
  }

  ensureDataDirectorySync();

  const db = new Database(getDatabasePath());
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');
  db.pragma('busy_timeout = 5000');

  initializeDatabase(db);
  database = db;
  startLegacyJsonCleanup();

  return database;
}

function initializeDatabase(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collections (
      name TEXT PRIMARY KEY,
      payload TEXT NOT NULL CHECK (json_valid(payload)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      preview_text TEXT NOT NULL,
      tags TEXT NOT NULL CHECK (json_valid(tags)),
      category TEXT NOT NULL,
      group_id TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      trashed_at TEXT,
      trash_expires_at TEXT,
      pinned_at TEXT,
      status_before_archive TEXT,
      status_before_trash TEXT,
      cover_asset_id TEXT,
      layout_width INTEGER,
      content TEXT,
      content_format TEXT NOT NULL DEFAULT 'plain',
      editor_content TEXT NOT NULL CHECK (json_valid(editor_content)),
      editor_plain_text TEXT NOT NULL,
      editor_html TEXT,
      properties TEXT NOT NULL CHECK (json_valid(properties)),
      schema_version INTEGER NOT NULL DEFAULT 2
    );

    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
    CREATE INDEX IF NOT EXISTS idx_notes_group_id ON notes(group_id);
    CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
    CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned);
    CREATE INDEX IF NOT EXISTS idx_notes_trashed_at ON notes(trashed_at);
    CREATE INDEX IF NOT EXISTS idx_notes_archived_at ON notes(archived_at);

    CREATE TABLE IF NOT EXISTS note_assets (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      relative_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_note_assets_note_id ON note_assets(note_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_note_assets_note_path ON note_assets(note_id, relative_path);

    CREATE TABLE IF NOT EXISTS note_drafts (
      note_id TEXT PRIMARY KEY,
      editor_content TEXT NOT NULL CHECK (json_valid(editor_content)),
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_html_cache (
      note_id TEXT PRIMARY KEY,
      html TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_materials (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      editor_content TEXT NOT NULL CHECK (json_valid(editor_content)),
      plain_text TEXT NOT NULL,
      board_links TEXT NOT NULL CHECK (json_valid(board_links)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_study_materials_updated_at ON study_materials(updated_at);
  `);

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

function startLegacyJsonCleanup() {
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

function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function nullable(value: unknown) {
  return value === undefined ? null : value;
}

function boolInt(value: unknown) {
  return value ? 1 : 0;
}

function getStorageErrorCode(error: unknown) {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code);
  }
  return null;
}

export async function readCollection(collectionName: CollectionName) {
  const safeName = assertCollectionName(collectionName);
  const row = getDb()
    .prepare('SELECT payload FROM collections WHERE name = ?')
    .get(safeName) as { payload: string } | undefined;

  if (!row) {
    const fallback = defaultValue(safeName, getDataDirectory());
    await writeCollection(safeName, fallback);
    return fallback;
  }

  return parseJson(row.payload, defaultValue(safeName, getDataDirectory()));
}

export async function writeCollection(collectionName: CollectionName, value: unknown) {
  const safeName = assertCollectionName(collectionName);
  const now = nowIso();

  getDb()
    .prepare(`
      INSERT INTO collections (name, payload, created_at, updated_at)
      VALUES (@name, @payload, @createdAt, @updatedAt)
      ON CONFLICT(name) DO UPDATE SET
        payload = excluded.payload,
        updated_at = excluded.updated_at
    `)
    .run({
      name: safeName,
      payload: stringifyJson(value),
      createdAt: now,
      updatedAt: now,
    });

  return readCollection(safeName);
}

function ensureListCollection(collectionName: CollectionName, value: unknown): Array<{ id: string }> {
  if (Array.isArray(value)) {
    return value.filter((item): item is { id: string } => Boolean(item && typeof item === 'object' && 'id' in item));
  }

  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
    return ((value as { items: unknown[] }).items).filter(
      (item): item is { id: string } => Boolean(item && typeof item === 'object' && 'id' in item),
    );
  }

  throw new Error(`${collectionName} does not support item-level storage operations`);
}

async function writeListCollection(collectionName: CollectionName, previousValue: unknown, items: Array<{ id: string }>) {
  if (Array.isArray(previousValue)) {
    await writeCollection(collectionName, items);
    return;
  }

  if (previousValue && typeof previousValue === 'object' && Array.isArray((previousValue as { items?: unknown }).items)) {
    await writeCollection(collectionName, { ...(previousValue as Record<string, unknown>), items });
    return;
  }

  await writeCollection(collectionName, items);
}

export async function addCollectionItem(collectionName: CollectionName, item: { id: string }) {
  const previous = await readCollection(collectionName);
  const list = ensureListCollection(collectionName, previous);
  list.push(item);
  await writeListCollection(collectionName, previous, list);
  return item;
}

export async function updateCollectionItem(collectionName: CollectionName, item: { id: string }) {
  const previous = await readCollection(collectionName);
  const list = ensureListCollection(collectionName, previous);
  const index = list.findIndex((existing) => existing.id === item.id);
  if (index === -1) {
    list.push(item);
  } else {
    list[index] = item;
  }
  await writeListCollection(collectionName, previous, list);
  return item;
}

export async function deleteCollectionItem(collectionName: CollectionName, id: string) {
  const previous = await readCollection(collectionName);
  const list = ensureListCollection(collectionName, previous);
  await writeListCollection(
    collectionName,
    previous,
    list.filter((item) => item.id !== id),
  );
  return true;
}

function sanitizeNoteId(value: unknown) {
  const id = String(value ?? '').trim();
  if (!id || /[\\/]/.test(id) || id.includes('..')) {
    throw new Error('Invalid note id.');
  }
  return id.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function sanitizeStudyMaterialId(value: unknown) {
  const id = String(value ?? '').trim();
  if (!id || /[\\/]/.test(id) || id.includes('..')) {
    throw new Error('Invalid study material id.');
  }
  return id.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function studyMaterialFromRow(row: Record<string, unknown>): StudyMaterial {
  const boardLinks = parseJson(String(row.board_links ?? '[]'), []);

  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    editorContent: parseJson(String(row.editor_content ?? 'null'), null),
    plainText: String(row.plain_text ?? ''),
    boardLinks: Array.isArray(boardLinks) ? boardLinks : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function normalizeStudyMaterial(material: Partial<StudyMaterial> & { id: string }): StudyMaterial {
  const timestamp = nowIso();
  const boardLinks = Array.isArray(material.boardLinks) ? material.boardLinks : [];

  return {
    id: sanitizeStudyMaterialId(material.id),
    title: String(material.title ?? 'Новый материал'),
    editorContent: material.editorContent ?? null,
    plainText: String(material.plainText ?? ''),
    boardLinks,
    createdAt: material.createdAt ?? timestamp,
    updatedAt: material.updatedAt ?? timestamp,
  };
}

export async function readStudyMaterialIndex() {
  const rows = getDb()
    .prepare(
      `
        SELECT id, title, plain_text, board_links, created_at, updated_at
        FROM study_materials
        ORDER BY updated_at DESC
      `,
    )
    .all() as Record<string, unknown>[];

  return rows.map((row) => {
    const boardLinks = parseJson(String(row.board_links ?? '[]'), []);

    return {
      id: String(row.id),
      title: String(row.title ?? ''),
      plainText: String(row.plain_text ?? ''),
      boardCount: Array.isArray(boardLinks) ? boardLinks.length : 0,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  });
}

export async function readStudyMaterial(materialId: string) {
  const row = getDb()
    .prepare(
      `
        SELECT id, title, editor_content, plain_text, board_links, created_at, updated_at
        FROM study_materials
        WHERE id = ?
      `,
    )
    .get(sanitizeStudyMaterialId(materialId)) as Record<string, unknown> | undefined;

  return row ? studyMaterialFromRow(row) : null;
}

export async function saveStudyMaterial(material: Partial<StudyMaterial> & { id: string }) {
  const timestamp = nowIso();
  const normalized = normalizeStudyMaterial({ ...material, updatedAt: timestamp });

  getDb()
    .prepare(
      `
        INSERT INTO study_materials (id, title, editor_content, plain_text, board_links, created_at, updated_at)
        VALUES (@id, @title, @editorContent, @plainText, @boardLinks, @createdAt, @updatedAt)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          editor_content = excluded.editor_content,
          plain_text = excluded.plain_text,
          board_links = excluded.board_links,
          updated_at = excluded.updated_at
      `,
    )
    .run({
      id: normalized.id,
      title: normalized.title,
      editorContent: stringifyJson(normalized.editorContent),
      plainText: normalized.plainText,
      boardLinks: stringifyJson(normalized.boardLinks),
      createdAt: normalized.createdAt,
      updatedAt: timestamp,
    });

  return readStudyMaterial(normalized.id);
}

export async function deleteStudyMaterial(materialId: string) {
  getDb().prepare('DELETE FROM study_materials WHERE id = ?').run(sanitizeStudyMaterialId(materialId));
  return true;
}

function sanitizeAssetFileName(value: unknown) {
  const rawName = typeof value === 'string' && value.trim() ? value.trim() : 'attachment';
  const parsed = path.parse(rawName);
  const baseName = (parsed.name || 'attachment').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 80);
  const extension = parsed.ext.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').slice(0, 16);
  return `${baseName || 'attachment'}${extension}`;
}

function createAssetId() {
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function inferAssetType(mimeType: string): NoteAssetType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
}

async function ensureAssetsDirectory() {
  const assetsDirectory = path.join(getDataDirectory(), 'assets');
  await fs.mkdir(assetsDirectory, { recursive: true });
  return assetsDirectory;
}

function getNoteAssetsDirectory(noteId: string) {
  return path.join(getDataDirectory(), 'assets', sanitizeNoteId(noteId));
}

function toRelativeDataPath(file: string) {
  return path.relative(getDataDirectory(), file).replace(/\\/g, '/');
}

function resolveRelativeDataPath(relativePath: string) {
  const target = path.resolve(getDataDirectory(), relativePath);
  const relative = path.relative(getDataDirectory(), target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid asset path.');
  }
  return target;
}

function assetUrlFromRelativePath(relativePath: string) {
  return `mymind-asset://local/${encodeURI(relativePath)}`;
}

function getPathFromLocalAssetUrl(url: string) {
  try {
    if (url.startsWith('mymind-asset:')) {
      const parsedUrl = new URL(url);
      const relativePath = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));
      return resolveRelativeDataPath(relativePath);
    }
    return fileURLToPath(url);
  } catch {
    return '';
  }
}

async function listAssetFiles(directory = path.join(getDataDirectory(), 'assets')): Promise<Array<{ path: string; url: string; sizeBytes: number }>> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const results = await Promise.all(
      entries.map(async (entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          return listAssetFiles(target);
        }
        if (!entry.isFile()) {
          return [];
        }
        const stats = await fs.stat(target);
        return [{ path: target, url: pathToFileURL(target).href, sizeBytes: stats.size }];
      }),
    );
    return results.flat();
  } catch (error) {
    if (getStorageErrorCode(error) === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function saveGlobalAsset(payload: { name?: unknown; data?: ArrayBuffer }) {
  if (!payload?.data || !(payload.data instanceof ArrayBuffer)) {
    throw new Error('Asset payload is empty.');
  }

  const assetsDirectory = await ensureAssetsDirectory();
  const safeName = sanitizeAssetFileName(payload.name);
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;
  const targetPath = path.join(assetsDirectory, fileName);
  await fs.writeFile(targetPath, Buffer.from(payload.data));
  return pathToFileURL(targetPath).href;
}

export async function listGlobalAssets() {
  await ensureAssetsDirectory();
  return listAssetFiles();
}

export async function getAssetInfoFromUrl(url: string) {
  const assetsDirectory = await ensureAssetsDirectory();
  const targetPath = getPathFromLocalAssetUrl(url);
  if (!targetPath) {
    return { url, exists: false, sizeBytes: 0 };
  }

  const relative = path.relative(assetsDirectory, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return { url, exists: false, sizeBytes: 0 };
  }

  try {
    const stats = await fs.stat(targetPath);
    return { url, exists: stats.isFile(), sizeBytes: stats.isFile() ? stats.size : 0 };
  } catch (error) {
    if (getStorageErrorCode(error) === 'ENOENT') {
      return { url, exists: false, sizeBytes: 0 };
    }
    throw error;
  }
}

export async function openContainingFolderFromUrl(url: string) {
  const targetPath = getPathFromLocalAssetUrl(url);
  if (!targetPath) {
    throw new Error('Invalid file URL.');
  }

  const stats = await fs.stat(targetPath);
  const folderPath = stats.isDirectory() ? targetPath : path.dirname(targetPath);
  return shell.openPath(folderPath);
}

function inlineContentToPlainText(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(inlineContentToPlainText).join('');
  if (typeof content === 'object') {
    const value = content as Record<string, unknown>;
    if (typeof value.text === 'string') return value.text;
    if (Array.isArray(value.content)) return value.content.map(inlineContentToPlainText).join('');
  }
  return '';
}

function editorContentToPlainText(content: unknown): string {
  if (!Array.isArray(content)) return '';

  const parts: string[] = [];

  const walk = (blocks: unknown[]) => {
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue;

      const current = block as Record<string, unknown>;
      const text = inlineContentToPlainText(current.content);
      if (text) parts.push(text);

      const props = current.props as Record<string, unknown> | undefined;
      if (current.type === 'image' && typeof props?.caption === 'string') {
        parts.push(props.caption);
      }
      if (current.type === 'drawing') {
        parts.push('Drawing board');
      }
      if (Array.isArray(current.children)) {
        walk(current.children);
      }
    }
  };

  walk(content);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function walkEditorBlocks(content: unknown, visitor: (block: Record<string, unknown>) => void) {
  if (!Array.isArray(content)) return;

  const walk = (blocks: unknown[]) => {
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue;

      const current = block as Record<string, unknown>;
      visitor(current);

      if (Array.isArray(current.children)) {
        walk(current.children);
      }
    }
  };

  walk(content);
}

function mapEditorBlocks(content: unknown, mapBlock: (block: Record<string, unknown>) => Record<string, unknown>) {
  if (!Array.isArray(content)) return [];

  const mapBlocks = (blocks: unknown[]): unknown[] =>
    blocks
      .filter((block) => block && typeof block === 'object')
      .map((block) => {
        const current = { ...(block as Record<string, unknown>) };
        if (Array.isArray(current.children)) {
          current.children = mapBlocks(current.children);
        }
        return mapBlock(current);
      });

  return mapBlocks(content);
}

function serializeEditorContentForStorage(content: unknown) {
  return mapEditorBlocks(content, (block) => {
    if (!['image', 'video', 'audio', 'file'].includes(String(block.type))) {
      return block;
    }

    const props = { ...((block.props as Record<string, unknown> | undefined) ?? {}) };
    const url = typeof props.url === 'string' ? props.url : '';

    if (url.startsWith('file:')) {
      try {
        const targetPath = fileURLToPath(url);
        const relativePath = toRelativeDataPath(targetPath);
        if (relativePath.startsWith('assets/')) {
          props.relativePath = relativePath;
          props.assetId = typeof props.assetId === 'string' ? props.assetId : path.basename(targetPath).split('-').slice(0, 3).join('-');
          delete props.url;
        }
      } catch {
        // Keep malformed URLs untouched.
      }
    }

    props.showPreview = false;
    return { ...block, props };
  });
}

function hydrateEditorContentForRenderer(content: unknown) {
  return mapEditorBlocks(content, (block) => {
    if (!['image', 'video', 'audio', 'file'].includes(String(block.type))) {
      return block;
    }

    const props = { ...((block.props as Record<string, unknown> | undefined) ?? {}) };
    if (typeof props.relativePath === 'string' && !props.url) {
      try {
        props.url = assetUrlFromRelativePath(props.relativePath);
      } catch {
        // Broken links stay unresolved.
      }
    }
    props.showPreview = false;
    return { ...block, props };
  });
}

function normalizeNoteFile(note: Partial<NoteFile> & { id: string }): NoteFile {
  const timestamp = nowIso();
  const editorContent = Array.isArray(note.editorContent) ? note.editorContent : [];
  const editorPlainText = String(note.editorPlainText ?? '') || editorContentToPlainText(editorContent);
  const layoutWidth = ([900, 1000, 1100, 1200] as const).includes(note.layoutWidth as 900 | 1000 | 1100 | 1200)
    ? (note.layoutWidth as 900 | 1000 | 1100 | 1200)
    : 1200;

  return {
    ...note,
    id: sanitizeNoteId(note.id),
    title: note.title || 'Untitled',
    previewText: note.previewText ?? editorPlainText.slice(0, 400),
    content: note.content ?? editorPlainText,
    contentFormat: 'plain',
    editorContent,
    editorPlainText,
    editorHtml: undefined,
    properties: Array.isArray(note.properties) ? note.properties : [],
    assets: Array.isArray(note.assets) ? note.assets : [],
    schemaVersion: Number(note.schemaVersion) || 2,
    layoutWidth,
    tags: Array.isArray(note.tags) ? note.tags : [],
    category: note.category ?? '',
    groupId: note.groupId ?? null,
    pinned: Boolean(note.pinned),
    createdAt: note.createdAt ?? timestamp,
    updatedAt: note.updatedAt ?? timestamp,
    archivedAt: note.archivedAt ?? null,
    trashedAt: note.trashedAt ?? null,
    trashExpiresAt: note.trashExpiresAt ?? null,
    pinnedAt: note.pinnedAt ?? null,
    statusBeforeArchive: note.statusBeforeArchive ?? null,
    statusBeforeTrash: note.statusBeforeTrash ?? null,
  };
}

async function buildAssetsFromContent(noteId: string, content: unknown) {
  const assets = new Map<string, NoteAsset>();

  walkEditorBlocks(content, (block) => {
    if (!['image', 'video', 'audio', 'file'].includes(String(block.type))) {
      return;
    }

    const props = (block.props as Record<string, unknown> | undefined) ?? {};
    const relativePath = typeof props.relativePath === 'string' ? props.relativePath : '';
    if (!relativePath) {
      return;
    }

    const name = typeof props.name === 'string' ? props.name : path.basename(relativePath);
    const mimeType = typeof props.mimeType === 'string' ? props.mimeType : '';
    const assetId = typeof props.assetId === 'string' ? props.assetId : path.basename(relativePath).split('-').slice(0, 3).join('-');

    assets.set(assetId, {
      id: assetId,
      noteId,
      type: inferAssetType(mimeType),
      name,
      mimeType,
      size: Number(props.size ?? 0) || 0,
      sizeBytes: Number(props.size ?? 0) || 0,
      relativePath,
      createdAt: typeof props.createdAt === 'string' ? props.createdAt : nowIso(),
    });
  });

  return Promise.all(
    Array.from(assets.values()).map(async (asset) => {
      try {
        const stats = await fs.stat(resolveRelativeDataPath(asset.relativePath));
        return { ...asset, size: stats.size, sizeBytes: stats.size };
      } catch {
        return asset;
      }
    }),
  );
}

function noteIndexItemFromRow(row: Record<string, unknown>): NoteIndexItem {
  return {
    id: String(row.id),
    title: String(row.title || 'Untitled'),
    previewText: String(row.preview_text || ''),
    tags: parseJson(String(row.tags ?? '[]'), [] as string[]),
    category: String(row.category || ''),
    groupId: row.group_id === null ? null : String(row.group_id ?? ''),
    pinned: Boolean(row.pinned),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    archivedAt: row.archived_at === null ? null : String(row.archived_at ?? ''),
    trashedAt: row.trashed_at === null ? null : String(row.trashed_at ?? ''),
    trashExpiresAt: row.trash_expires_at === null ? null : String(row.trash_expires_at ?? ''),
    pinnedAt: row.pinned_at === null ? null : String(row.pinned_at ?? ''),
    statusBeforeArchive: row.status_before_archive === null ? null : String(row.status_before_archive ?? ''),
    statusBeforeTrash: row.status_before_trash === null ? null : String(row.status_before_trash ?? ''),
    coverAssetId: row.cover_asset_id === null ? null : String(row.cover_asset_id ?? ''),
    layoutWidth: row.layout_width ? (Number(row.layout_width) as 900 | 1000 | 1100 | 1200) : undefined,
  };
}

function readNoteAssetsFromDb(noteId: string): Array<NoteAsset & { url: string; exists: boolean }> {
  const rows = getDb()
    .prepare(`
      SELECT id, note_id, type, name, mime_type, size_bytes, relative_path, created_at
      FROM note_assets
      WHERE note_id = ?
      ORDER BY created_at ASC
    `)
    .all(sanitizeNoteId(noteId)) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: String(row.id),
    noteId: String(row.note_id),
    type: String(row.type || 'file') as NoteAssetType,
    name: String(row.name || 'attachment'),
    mimeType: String(row.mime_type || ''),
    size: Number(row.size_bytes || 0),
    sizeBytes: Number(row.size_bytes || 0),
    relativePath: String(row.relative_path || ''),
    createdAt: String(row.created_at || nowIso()),
    url: assetUrlFromRelativePath(String(row.relative_path || '')),
    exists: fsSync.existsSync(resolveRelativeDataPath(String(row.relative_path || ''))),
  }));
}

function noteFileFromRow(row: Record<string, unknown>): NoteFile {
  const index = noteIndexItemFromRow(row);

  return {
    ...index,
    content: row.content === null ? '' : String(row.content ?? ''),
    contentFormat: 'plain',
    editorContent: hydrateEditorContentForRenderer(parseJson(String(row.editor_content ?? '[]'), [])),
    editorPlainText: String(row.editor_plain_text ?? ''),
    editorHtml: row.editor_html === null ? undefined : String(row.editor_html ?? ''),
    properties: parseJson(String(row.properties ?? '[]'), [] as unknown[]),
    assets: readNoteAssetsFromDb(index.id),
    schemaVersion: Number(row.schema_version || 2),
  };
}

export async function readNoteIndex() {
  const rows = getDb()
    .prepare(`
      SELECT id, title, preview_text, tags, category, group_id, pinned, created_at, updated_at,
             archived_at, trashed_at, trash_expires_at, pinned_at, status_before_archive,
             status_before_trash, cover_asset_id, layout_width
      FROM notes
      ORDER BY
        CASE WHEN pinned = 1 OR pinned_at IS NOT NULL THEN 0 ELSE 1 END,
        updated_at DESC
    `)
    .all() as Array<Record<string, unknown>>;

  return rows.map(noteIndexItemFromRow);
}

export async function readSearchIndex() {
  const rows = getDb()
    .prepare(`
      SELECT id, title, editor_plain_text, tags, category, group_id, updated_at
      FROM notes
      ORDER BY updated_at DESC
    `)
    .all() as Array<Record<string, unknown>>;

  return rows.map((row): NoteSearchIndexItem => ({
    noteId: String(row.id),
    title: String(row.title || 'Untitled'),
    editorPlainText: String(row.editor_plain_text || ''),
    tags: parseJson(String(row.tags ?? '[]'), [] as string[]),
    category: String(row.category || ''),
    groupId: row.group_id === null ? null : String(row.group_id ?? ''),
    updatedAt: String(row.updated_at),
  }));
}

export async function readNoteFile(noteId: string) {
  const row = getDb()
    .prepare(`
      SELECT *
      FROM notes
      WHERE id = ?
    `)
    .get(sanitizeNoteId(noteId)) as Record<string, unknown> | undefined;

  return row ? noteFileFromRow(row) : null;
}

function upsertNoteAsset(asset: NoteAsset) {
  getDb()
    .prepare(`
      INSERT INTO note_assets (id, note_id, type, name, mime_type, size_bytes, relative_path, created_at)
      VALUES (@id, @noteId, @type, @name, @mimeType, @sizeBytes, @relativePath, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        note_id = excluded.note_id,
        type = excluded.type,
        name = excluded.name,
        mime_type = excluded.mime_type,
        size_bytes = excluded.size_bytes,
        relative_path = excluded.relative_path,
        created_at = excluded.created_at
    `)
    .run({
      id: asset.id,
      noteId: asset.noteId,
      type: asset.type,
      name: asset.name,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes || asset.size || 0,
      relativePath: asset.relativePath,
      createdAt: asset.createdAt,
    });
}

export async function saveNoteFile(note: Partial<NoteFile> & { id: string }) {
  const timestamp = nowIso();
  const normalized = normalizeNoteFile({ ...note, updatedAt: note.updatedAt ?? timestamp });
  const storageContent = serializeEditorContentForStorage(normalized.editorContent);
  const editorPlainText = normalized.editorPlainText || editorContentToPlainText(storageContent);
  const assets = await buildAssetsFromContent(normalized.id, storageContent);

  const storageNote = normalizeNoteFile({
    ...normalized,
    content: editorPlainText,
    editorContent: storageContent,
    editorPlainText,
    assets,
    updatedAt: timestamp,
  });

  const tx = getDb().transaction(() => {
    getDb()
      .prepare(`
        INSERT INTO notes (
          id, title, preview_text, tags, category, group_id, pinned, created_at, updated_at,
          archived_at, trashed_at, trash_expires_at, pinned_at, status_before_archive,
          status_before_trash, cover_asset_id, layout_width, content, content_format,
          editor_content, editor_plain_text, editor_html, properties, schema_version
        )
        VALUES (
          @id, @title, @previewText, @tags, @category, @groupId, @pinned, @createdAt, @updatedAt,
          @archivedAt, @trashedAt, @trashExpiresAt, @pinnedAt, @statusBeforeArchive,
          @statusBeforeTrash, @coverAssetId, @layoutWidth, @content, @contentFormat,
          @editorContent, @editorPlainText, @editorHtml, @properties, @schemaVersion
        )
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          preview_text = excluded.preview_text,
          tags = excluded.tags,
          category = excluded.category,
          group_id = excluded.group_id,
          pinned = excluded.pinned,
          updated_at = excluded.updated_at,
          archived_at = excluded.archived_at,
          trashed_at = excluded.trashed_at,
          trash_expires_at = excluded.trash_expires_at,
          pinned_at = excluded.pinned_at,
          status_before_archive = excluded.status_before_archive,
          status_before_trash = excluded.status_before_trash,
          cover_asset_id = excluded.cover_asset_id,
          layout_width = excluded.layout_width,
          content = excluded.content,
          content_format = excluded.content_format,
          editor_content = excluded.editor_content,
          editor_plain_text = excluded.editor_plain_text,
          editor_html = excluded.editor_html,
          properties = excluded.properties,
          schema_version = excluded.schema_version
      `)
      .run({
        id: storageNote.id,
        title: storageNote.title,
        previewText: storageNote.previewText,
        tags: stringifyJson(storageNote.tags),
        category: storageNote.category,
        groupId: nullable(storageNote.groupId),
        pinned: boolInt(storageNote.pinned),
        createdAt: storageNote.createdAt,
        updatedAt: timestamp,
        archivedAt: nullable(storageNote.archivedAt),
        trashedAt: nullable(storageNote.trashedAt),
        trashExpiresAt: nullable(storageNote.trashExpiresAt),
        pinnedAt: nullable(storageNote.pinnedAt),
        statusBeforeArchive: nullable(storageNote.statusBeforeArchive),
        statusBeforeTrash: nullable(storageNote.statusBeforeTrash),
        coverAssetId: nullable(storageNote.coverAssetId),
        layoutWidth: nullable(storageNote.layoutWidth),
        content: storageNote.content ?? '',
        contentFormat: storageNote.contentFormat ?? 'plain',
        editorContent: stringifyJson(storageContent),
        editorPlainText,
        editorHtml: nullable(storageNote.editorHtml),
        properties: stringifyJson(storageNote.properties),
        schemaVersion: storageNote.schemaVersion,
      });

    getDb().prepare('DELETE FROM note_assets WHERE note_id = ?').run(storageNote.id);
    for (const asset of assets) {
      upsertNoteAsset(asset);
    }

    getDb()
      .prepare(`
        INSERT INTO note_html_cache (note_id, html, updated_at)
        VALUES (?, NULL, ?)
        ON CONFLICT(note_id) DO UPDATE SET html = NULL, updated_at = excluded.updated_at
      `)
      .run(storageNote.id, timestamp);
  });

  tx();

  return readNoteFile(storageNote.id);
}

export async function patchNoteMetadata(noteId: string, patch: Partial<NoteFile>) {
  const note = await readNoteFile(noteId);
  if (!note) {
    return null;
  }
  return saveNoteFile({ ...note, ...patch, id: note.id });
}

export async function deleteNoteStorage(noteId: string) {
  const safeId = sanitizeNoteId(noteId);

  getDb().transaction(() => {
    getDb().prepare('DELETE FROM notes WHERE id = ?').run(safeId);
    getDb().prepare('DELETE FROM note_assets WHERE note_id = ?').run(safeId);
    getDb().prepare('DELETE FROM note_drafts WHERE note_id = ?').run(safeId);
    getDb().prepare('DELETE FROM note_html_cache WHERE note_id = ?').run(safeId);
  })();

  await fs.rm(getNoteAssetsDirectory(safeId), { recursive: true, force: true });
  return true;
}

export async function saveNoteDraft(noteId: string, editorContent: unknown) {
  const safeId = sanitizeNoteId(noteId);
  const draft: NoteDraft = {
    noteId: safeId,
    editorContent: serializeEditorContentForStorage(editorContent),
    updatedAt: nowIso(),
  };

  getDb()
    .prepare(`
      INSERT INTO note_drafts (note_id, editor_content, updated_at)
      VALUES (@noteId, @editorContent, @updatedAt)
      ON CONFLICT(note_id) DO UPDATE SET
        editor_content = excluded.editor_content,
        updated_at = excluded.updated_at
    `)
    .run({
      noteId: draft.noteId,
      editorContent: stringifyJson(draft.editorContent),
      updatedAt: draft.updatedAt,
    });

  return draft;
}

export async function readNoteDraft(noteId: string) {
  const row = getDb()
    .prepare('SELECT note_id, editor_content, updated_at FROM note_drafts WHERE note_id = ?')
    .get(sanitizeNoteId(noteId)) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  return {
    noteId: String(row.note_id),
    editorContent: hydrateEditorContentForRenderer(parseJson(String(row.editor_content ?? '[]'), [])),
    updatedAt: String(row.updated_at),
  };
}

export async function deleteNoteDraft(noteId: string) {
  getDb().prepare('DELETE FROM note_drafts WHERE note_id = ?').run(sanitizeNoteId(noteId));
  return true;
}

export async function saveNoteAsset(payload: { noteId?: unknown; name?: unknown; mimeType?: unknown; data?: ArrayBuffer }) {
  if (!payload?.data || !(payload.data instanceof ArrayBuffer)) {
    throw new Error('Asset payload is empty.');
  }

  const noteId = sanitizeNoteId(payload.noteId);
  const assetId = createAssetId();
  const mimeType = String(payload.mimeType ?? '');
  const safeName = sanitizeAssetFileName(payload.name);
  const targetDirectory = getNoteAssetsDirectory(noteId);

  await fs.mkdir(targetDirectory, { recursive: true });

  const targetPath = path.join(targetDirectory, `${assetId}-${safeName}`);
  await fs.writeFile(targetPath, Buffer.from(payload.data));

  const stats = await fs.stat(targetPath);
  const relativePath = toRelativeDataPath(targetPath);

  const asset: NoteAsset & { url: string } = {
    id: assetId,
    noteId,
    type: inferAssetType(mimeType),
    name: safeName,
    mimeType,
    size: stats.size,
    sizeBytes: stats.size,
    relativePath,
    createdAt: nowIso(),
    url: assetUrlFromRelativePath(relativePath),
  };

  upsertNoteAsset(asset);
  return asset;
}

async function scanNoteAssetFilesFromDisk(noteId: string) {
  const directory = getNoteAssetsDirectory(noteId);

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    return Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const targetPath = path.join(directory, entry.name);
          const stats = await fs.stat(targetPath);
          const [prefix, timestamp, random] = entry.name.split('-');
          const assetId = [prefix, timestamp, random].filter(Boolean).join('-') || path.parse(entry.name).name;
          const relativePath = toRelativeDataPath(targetPath);

          return {
            id: assetId,
            noteId: sanitizeNoteId(noteId),
            type: 'file' as NoteAssetType,
            name: entry.name.replace(`${assetId}-`, ''),
            mimeType: '',
            size: stats.size,
            sizeBytes: stats.size,
            relativePath,
            createdAt: stats.birthtime.toISOString(),
            url: assetUrlFromRelativePath(relativePath),
            exists: true,
          };
        }),
    );
  } catch (error) {
    if (getStorageErrorCode(error) === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function listNoteAssetFiles(noteId: string) {
  const safeId = sanitizeNoteId(noteId);
  const fromDb = readNoteAssetsFromDb(safeId);
  const fromDisk = await scanNoteAssetFilesFromDisk(safeId);
  const merged = new Map<string, NoteAsset & { url: string; exists: boolean }>();

  for (const asset of fromDisk) {
    merged.set(asset.id, asset);
  }
  for (const asset of fromDb) {
    merged.set(asset.id, asset);
  }

  return Array.from(merged.values());
}

function collectUsedAssetIds(content: unknown) {
  const used = new Set<string>();

  walkEditorBlocks(content, (block) => {
    if (!['image', 'video', 'audio', 'file'].includes(String(block.type))) {
      return;
    }

    const assetId = (block.props as Record<string, unknown> | undefined)?.assetId;
    if (typeof assetId === 'string' && assetId) {
      used.add(assetId);
    }
  });

  return used;
}

export async function deleteNoteAsset(noteId: string, assetId: string) {
  const asset = (await listNoteAssetFiles(noteId)).find((item) => item.id === assetId);
  if (!asset) {
    return false;
  }

  await fs.rm(resolveRelativeDataPath(asset.relativePath), { force: true });
  getDb().prepare('DELETE FROM note_assets WHERE id = ? AND note_id = ?').run(assetId, sanitizeNoteId(noteId));
  return true;
}

export async function cleanupUnusedAssets(noteId: string) {
  const note = await readNoteFile(noteId);
  const assets = await listNoteAssetFiles(noteId);
  const usedIds = collectUsedAssetIds(note?.editorContent);
  const deleted: NoteAsset[] = [];
  const kept: NoteAsset[] = [];

  for (const asset of assets) {
    if (usedIds.has(asset.id)) {
      kept.push(asset);
      continue;
    }

    await fs.rm(resolveRelativeDataPath(asset.relativePath), { force: true });
    getDb().prepare('DELETE FROM note_assets WHERE id = ? AND note_id = ?').run(asset.id, sanitizeNoteId(noteId));
    deleted.push(asset);
  }

  return {
    deleted,
    kept,
    totalSizeBytes: kept.reduce((sum, asset) => sum + (asset.sizeBytes || asset.size || 0), 0),
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function noteContentToHtml(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }
  return content.map(blockToHtml).join('');
}

function blockToHtml(block: unknown): string {
  if (!block || typeof block !== 'object') {
    return '';
  }

  const current = block as Record<string, unknown>;
  const props = (current.props as Record<string, unknown> | undefined) ?? {};
  const children = Array.isArray(current.children) ? current.children.map(blockToHtml).join('') : '';
  const text = escapeHtml(inlineContentToPlainText(current.content)).replace(/\n/g, '<br>');

  switch (current.type) {
    case 'heading': {
      const level = Math.min(3, Math.max(1, Number(props.level) || 1));
      return `<h${level}>${text}</h${level}>${children}`;
    }
    case 'bulletListItem':
      return `<ul><li>${text}${children}</li></ul>`;
    case 'numberedListItem':
      return `<ol><li>${text}${children}</li></ol>`;
    case 'checkListItem':
      return `<p>${props.checked ? '[x]' : '[ ]'} ${text}</p>${children}`;
    case 'quote':
      return `<blockquote>${text}</blockquote>${children}`;
    case 'codeBlock':
      return `<pre><code>${text}</code></pre>${children}`;
    case 'divider':
      return '<hr>';
    case 'image': {
      const url = typeof props.relativePath === 'string' ? assetUrlFromRelativePath(props.relativePath) : String(props.url ?? '');
      const caption = escapeHtml(String(props.caption ?? ''));
      return url ? `<figure><img src="${escapeHtml(url)}" loading="lazy">${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>` : '';
    }
    case 'video': {
      const url = typeof props.relativePath === 'string' ? assetUrlFromRelativePath(props.relativePath) : String(props.url ?? '');
      return url ? `<video src="${escapeHtml(url)}" controls preload="metadata"></video>` : '';
    }
    case 'audio': {
      const url = typeof props.relativePath === 'string' ? assetUrlFromRelativePath(props.relativePath) : String(props.url ?? '');
      return url ? `<audio src="${escapeHtml(url)}" controls preload="metadata"></audio>` : '';
    }
    case 'file': {
      const url = typeof props.relativePath === 'string' ? assetUrlFromRelativePath(props.relativePath) : String(props.url ?? '');
      const name = escapeHtml(String(props.name ?? 'File'));
      return url ? `<p><a href="${escapeHtml(url)}">${name}</a></p>` : '';
    }
    default:
      return `<p>${text}</p>${children}`;
  }
}

export async function generateNoteHtml(noteId: string) {
  const safeId = sanitizeNoteId(noteId);
  const note = await readNoteFile(safeId);
  const html = note ? noteContentToHtml(note.editorContent) : '';

  getDb()
    .prepare(`
      INSERT INTO note_html_cache (note_id, html, updated_at)
      VALUES (@noteId, @html, @updatedAt)
      ON CONFLICT(note_id) DO UPDATE SET
        html = excluded.html,
        updated_at = excluded.updated_at
    `)
    .run({
      noteId: safeId,
      html,
      updatedAt: nowIso(),
    });

  return html;
}

export async function getCachedNoteHtml(noteId: string) {
  const row = getDb()
    .prepare('SELECT html FROM note_html_cache WHERE note_id = ?')
    .get(sanitizeNoteId(noteId)) as { html?: string | null } | undefined;

  return row?.html ?? null;
}

export async function invalidateNoteHtmlCache(noteId: string) {
  getDb().prepare('DELETE FROM note_html_cache WHERE note_id = ?').run(sanitizeNoteId(noteId));
  return true;
}

async function snapshotDatabaseTo(targetPath: string) {
  await ensureDataDirectory();
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.rm(targetPath, { force: true });

  const db = getDb();
  db.pragma('wal_checkpoint(TRUNCATE)');

  const escaped = targetPath.replace(/'/g, "''");
  db.exec(`VACUUM INTO '${escaped}'`);
}

function closeDatabase() {
  if (!database) {
    return;
  }

  database.close();
  database = null;
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

  database = null;
  getDb();
}

export async function exportWorkspaceBackupFolder() {
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

export async function importWorkspaceBackupFolder(sourceDirectory: string) {
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

export async function exportWorkspaceDatabaseFile(targetPath: string) {
  await snapshotDatabaseTo(targetPath);
  return targetPath;
}

export async function importWorkspaceDatabaseFile(sourcePath: string) {
  await replaceWorkspaceDatabaseFromFile(sourcePath);
  return getDataDirectory();
}

export async function exportCollectionDatabase(collectionName: CollectionName, targetPath: string) {
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
      .prepare(`
        INSERT INTO collections (name, payload, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `)
      .run(safeName, stringifyJson(payload), now, now);
  } finally {
    target.close();
  }

  return targetPath;
}

export async function importCollectionDatabase(collectionName: CollectionName, sourcePath: string) {
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
