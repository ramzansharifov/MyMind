import { app, dialog, ipcMain, Notification, shell } from "electron";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertCollectionName,
  defaultValue,
  listCollections,
  nowIso,
  type CollectionName,
} from "./storageRegistry";

const retryableStorageErrorCodes = new Set(["EBUSY", "EPERM", "EACCES"]);
const storageRetryDelaysMs = [50, 100, 200, 400, 800];
const collectionWriteQueues = new Map<CollectionName, Promise<unknown>>();
const sqliteDatabaseFileName = "mymind.sqlite";

type SqliteRunResult = { changes: number; lastInsertRowid: number | bigint };
type SqliteStatement = {
  run: (...params: unknown[]) => SqliteRunResult;
  get: (...params: unknown[]) => any;
  all: (...params: unknown[]) => any[];
};
type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatement;
  pragma: (sql: string) => unknown;
  transaction: <T extends (...args: any[]) => any>(fn: T) => T;
  close: () => void;
};

const BetterSqliteDatabase = require("better-sqlite3") as new (
  file: string,
) => SqliteDatabase;
let sqliteDatabase: SqliteDatabase | null = null;

type NoteAssetType = "image" | "video" | "audio" | "file" | "drawing";

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
  contentFormat?: "plain" | "html" | "markdown";
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

type StudyBoardLink = {
  id: string;
  boardId: string;
  title: string;
  createdAt: string;
};

type StudyMaterialFile = {
  id: string;
  title: string;
  editorContent: unknown;
  plainText: string;
  boardLinks: StudyBoardLink[];
  createdAt: string;
  updatedAt: string;
};

type StudyMaterialIndexItem = {
  id: string;
  title: string;
  plainText: string;
  boardCount: number;
  createdAt: string;
  updatedAt: string;
};

function getDocumentsDirectory() {
  return app.getPath("documents") || path.join(os.homedir(), "Documents");
}

function getDataDirectory() {
  return path.join(getDocumentsDirectory(), "MyMind", "data");
}

function getDatabasePath() {
  return path.join(getDataDirectory(), sqliteDatabaseFileName);
}

function getDatabase() {
  if (sqliteDatabase) {
    return sqliteDatabase;
  }

  fsSync.mkdirSync(getDataDirectory(), { recursive: true });
  const database = new BetterSqliteDatabase(getDatabasePath());
  database.pragma("foreign_keys = ON");
  database.pragma("journal_mode = DELETE");
  database.exec(`
    DROP TABLE IF EXISTS storage_migrations;

    CREATE TABLE IF NOT EXISTS collections (
      name TEXT PRIMARY KEY,
      storage_kind TEXT NOT NULL CHECK (storage_kind IN ('document', 'items')),
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collection_items (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      value TEXT NOT NULL,
      position INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (collection, id),
      FOREIGN KEY (collection) REFERENCES collections(name) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_collection_items_collection_position
      ON collection_items(collection, position);

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      title TEXT NOT NULL,
      preview_text TEXT NOT NULL,
      editor_plain_text TEXT NOT NULL,
      tags TEXT NOT NULL,
      category TEXT NOT NULL,
      group_id TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      trashed_at TEXT,
      pinned_at TEXT,
      layout_width INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_pinned_updated_at ON notes(pinned DESC, updated_at DESC);

    CREATE TABLE IF NOT EXISTS note_search_index (
      note_id TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS note_drafts (
      note_id TEXT PRIMARY KEY,
      editor_content TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS note_html_cache (
      note_id TEXT PRIMARY KEY,
      html TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_materials (
      id TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      title TEXT NOT NULL,
      plain_text TEXT NOT NULL,
      board_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_study_materials_updated_at ON study_materials(updated_at DESC);
  `);
  sqliteDatabase = database;
  return database;
}

function closeDatabase() {
  if (!sqliteDatabase) {
    return;
  }
  sqliteDatabase.close();
  sqliteDatabase = null;
}

function encodeSqliteJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

function decodeSqliteJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function collectionItemId(item: unknown, index: number) {
  if (item && typeof item === "object") {
    const id = (item as { id?: unknown }).id;
    if (typeof id === "string" && id.trim()) {
      return id;
    }
  }
  return `__item_${index}`;
}

function readCollectionFromDatabase(collectionName: CollectionName) {
  const database = getDatabase();
  const row = database
    .prepare("SELECT storage_kind, value FROM collections WHERE name = ?")
    .get(collectionName) as
    | { storage_kind: "document" | "items"; value: string }
    | undefined;

  if (!row) {
    return defaultValue(collectionName, getDataDirectory());
  }

  if (row.storage_kind === "items") {
    return database
      .prepare(
        "SELECT value FROM collection_items WHERE collection = ? ORDER BY position ASC",
      )
      .all(collectionName)
      .map((item) => decodeSqliteJson((item as { value: string }).value, null))
      .filter((item) => item !== null);
  }

  return decodeSqliteJson(
    row.value,
    defaultValue(collectionName, getDataDirectory()),
  );
}

function writeCollectionToDatabase(
  collectionName: CollectionName,
  value: unknown,
) {
  const database = getDatabase();
  const timestamp = nowIso();
  const transaction = database.transaction((nextValue: unknown) => {
    if (Array.isArray(nextValue)) {
      database
        .prepare(
          `
          INSERT INTO collections (name, storage_kind, value, updated_at)
          VALUES (?, 'items', '[]', ?)
          ON CONFLICT(name) DO UPDATE SET storage_kind = excluded.storage_kind, value = excluded.value, updated_at = excluded.updated_at
        `,
        )
        .run(collectionName, timestamp);
      database
        .prepare("DELETE FROM collection_items WHERE collection = ?")
        .run(collectionName);
      const insertItem = database.prepare(`
        INSERT INTO collection_items (collection, id, value, position, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      nextValue.forEach((item, index) => {
        insertItem.run(
          collectionName,
          collectionItemId(item, index),
          encodeSqliteJson(item),
          index,
          timestamp,
        );
      });
      return;
    }

    database
      .prepare(
        `
        INSERT INTO collections (name, storage_kind, value, updated_at)
        VALUES (?, 'document', ?, ?)
        ON CONFLICT(name) DO UPDATE SET storage_kind = excluded.storage_kind, value = excluded.value, updated_at = excluded.updated_at
      `,
      )
      .run(collectionName, encodeSqliteJson(nextValue), timestamp);
    database
      .prepare("DELETE FROM collection_items WHERE collection = ?")
      .run(collectionName);
  });

  transaction(value);
}

function collectionExistsInDatabase(collectionName: CollectionName) {
  return Boolean(
    getDatabase()
      .prepare("SELECT 1 FROM collections WHERE name = ?")
      .get(collectionName),
  );
}

async function ensureDataDirectory() {
  await fs.mkdir(getDataDirectory(), { recursive: true });
}

async function ensureAssetsDirectory() {
  const assetsDirectory = path.join(getDataDirectory(), "assets");
  await fs.mkdir(assetsDirectory, { recursive: true });
  return assetsDirectory;
}

function getNoteAssetsDirectory(noteId: string) {
  return path.join(getDataDirectory(), "assets", sanitizeNoteId(noteId));
}

async function ensureNoteStorageDirectory() {
  await ensureDataDirectory();
  await fs.mkdir(path.join(getDataDirectory(), "assets"), { recursive: true });
  getDatabase();
}

function sanitizeAssetFileName(value: unknown) {
  const rawName =
    typeof value === "string" && value.trim() ? value.trim() : "attachment";
  const parsed = path.parse(rawName);
  const baseName = (parsed.name || "attachment")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .slice(0, 80);
  const extension = parsed.ext
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .slice(0, 16);
  return `${baseName || "attachment"}${extension}`;
}

async function listAssetFiles(
  directory = path.join(getDataDirectory(), "assets"),
): Promise<Array<{ path: string; url: string; sizeBytes: number }>> {
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
        return [
          {
            path: target,
            url: pathToFileURL(target).href,
            sizeBytes: stats.size,
          },
        ];
      }),
    );
    return results.flat();
  } catch (error) {
    if (getStorageErrorCode(error) === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function getAssetInfoFromUrl(url: string) {
  const assetsDirectory = await ensureAssetsDirectory();
  const targetPath = getPathFromLocalAssetUrl(url);
  if (!targetPath) {
    return { url, exists: false, sizeBytes: 0 };
  }

  const relative = path.relative(assetsDirectory, targetPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return { url, exists: false, sizeBytes: 0 };
  }

  try {
    const stats = await fs.stat(targetPath);
    return {
      url,
      exists: stats.isFile(),
      sizeBytes: stats.isFile() ? stats.size : 0,
    };
  } catch (error) {
    if (getStorageErrorCode(error) === "ENOENT") {
      return { url, exists: false, sizeBytes: 0 };
    }
    throw error;
  }
}

function getPathFromLocalAssetUrl(url: string) {
  try {
    if (url.startsWith("mymind-asset:")) {
      const parsedUrl = new URL(url);
      const relativePath = decodeURIComponent(
        parsedUrl.pathname.replace(/^\/+/, ""),
      );
      return resolveRelativeDataPath(relativePath);
    }

    return fileURLToPath(url);
  } catch {
    return "";
  }
}

async function openContainingFolderFromUrl(url: string) {
  const targetPath = getPathFromLocalAssetUrl(url);
  if (!targetPath) {
    throw new Error("Invalid file URL.");
  }

  const stats = await fs.stat(targetPath);
  const folderPath = stats.isDirectory()
    ? targetPath
    : path.dirname(targetPath);
  return shell.openPath(folderPath);
}

function isRetryableStorageError(error: unknown) {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    retryableStorageErrorCodes.has(String((error as { code?: unknown }).code))
  );
}

function getStorageErrorCode(error: unknown) {
  if (error !== null && typeof error === "object" && "code" in error) {
    return String((error as { code?: unknown }).code);
  }
  return null;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withStorageRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= storageRetryDelaysMs.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (
        !isRetryableStorageError(error) ||
        attempt === storageRetryDelaysMs.length
      ) {
        throw error;
      }
      await wait(storageRetryDelaysMs[attempt]);
    }
  }

  throw lastError;
}

async function enqueueCollectionWrite<T>(
  collectionName: CollectionName,
  operation: () => Promise<T>,
) {
  const previous =
    collectionWriteQueues.get(collectionName) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  let tracked: Promise<T>;

  tracked = next.finally(() => {
    if (collectionWriteQueues.get(collectionName) === tracked) {
      collectionWriteQueues.delete(collectionName);
    }
  });

  collectionWriteQueues.set(collectionName, tracked);

  return tracked;
}

async function ensureCollection(collectionName: CollectionName) {
  await ensureDataDirectory();
  getDatabase();
  if (collectionExistsInDatabase(collectionName)) {
    return;
  }

  await writeJson(
    collectionName,
    defaultValue(collectionName, getDataDirectory()),
  );
}

async function writeJson(collectionName: CollectionName, value: unknown) {
  return enqueueCollectionWrite(collectionName, async () => {
    await ensureDataDirectory();
    writeCollectionToDatabase(collectionName, value);
  });
}

async function readJson(collectionName: CollectionName) {
  await ensureCollection(collectionName);
  return readCollectionFromDatabase(collectionName);
}

async function exportSqliteDatabase(targetPath: string) {
  await ensureDataDirectory();
  getDatabase();
  closeDatabase();
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await withStorageRetry(() => fs.copyFile(getDatabasePath(), targetPath));
}

async function importSqliteDatabase(sourcePath: string) {
  await ensureDataDirectory();
  closeDatabase();
  await withStorageRetry(() => fs.copyFile(sourcePath, getDatabasePath()));
}

function ensureListCollection(
  collectionName: CollectionName,
  value: unknown,
): Array<{ id: string }> {
  if (!listCollections.has(collectionName) || !Array.isArray(value)) {
    throw new Error(
      `${collectionName} does not support item-level storage operations`,
    );
  }
  return value.filter((item): item is { id: string } =>
    Boolean(item && typeof item === "object" && "id" in item),
  );
}

function sanitizeNoteId(value: unknown) {
  const id = String(value ?? "").trim();
  if (!id || /[\\/]/.test(id) || id.includes("..")) {
    throw new Error("Invalid note id.");
  }
  return id.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function createAssetId() {
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function inferAssetType(mimeType: string): NoteAssetType {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  return "file";
}

function toRelativeDataPath(file: string) {
  return path.relative(getDataDirectory(), file).replace(/\\/g, "/");
}

function resolveRelativeDataPath(relativePath: string) {
  const target = path.resolve(getDataDirectory(), relativePath);
  const relative = path.relative(getDataDirectory(), target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid asset path.");
  }
  return target;
}

function assetUrlFromRelativePath(relativePath: string) {
  return `mymind-asset://local/${encodeURI(relativePath)}`;
}

function inlineContentToPlainText(content: unknown): string {
  if (!content) {
    return "";
  }
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map(inlineContentToPlainText).join("");
  }
  if (typeof content === "object") {
    const value = content as Record<string, unknown>;
    if (typeof value.text === "string") {
      return value.text;
    }
    if (Array.isArray(value.content)) {
      return value.content.map(inlineContentToPlainText).join("");
    }
  }
  return "";
}

function editorContentToPlainText(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return "";
  }
  const parts: string[] = [];
  const walk = (blocks: unknown[]) => {
    for (const block of blocks) {
      if (!block || typeof block !== "object") {
        continue;
      }
      const current = block as Record<string, unknown>;
      const text = inlineContentToPlainText(current.content);
      if (text) {
        parts.push(text);
      }
      const props = current.props as Record<string, unknown> | undefined;
      if (current.type === "image" && typeof props?.caption === "string") {
        parts.push(props.caption);
      }
      if (current.type === "drawing") {
        parts.push("Drawing board");
      }
      if (Array.isArray(current.children)) {
        walk(current.children);
      }
    }
  };
  walk(content);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function noteIndexItemFromNote(note: NoteFile): NoteIndexItem {
  return {
    id: note.id,
    title: note.title || "Untitled",
    previewText: (note.editorPlainText || note.content || "").slice(0, 400),
    tags: Array.isArray(note.tags) ? note.tags : [],
    category: note.category ?? "",
    groupId: note.groupId ?? null,
    pinned: Boolean(note.pinned),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    archivedAt: note.archivedAt ?? null,
    trashedAt: note.trashedAt ?? null,
    trashExpiresAt: note.trashExpiresAt ?? null,
    pinnedAt: note.pinnedAt ?? null,
    statusBeforeArchive: note.statusBeforeArchive ?? null,
    statusBeforeTrash: note.statusBeforeTrash ?? null,
    coverAssetId: note.coverAssetId ?? null,
    layoutWidth: note.layoutWidth,
  };
}

function searchItemFromNote(note: NoteFile): NoteSearchIndexItem {
  return {
    noteId: note.id,
    title: note.title || "Untitled",
    editorPlainText: note.editorPlainText ?? "",
    tags: Array.isArray(note.tags) ? note.tags : [],
    category: note.category ?? "",
    groupId: note.groupId ?? null,
    updatedAt: note.updatedAt,
  };
}

function normalizeNoteFile(note: Partial<NoteFile> & { id: string }): NoteFile {
  const timestamp = new Date().toISOString();
  const editorContent = note.editorContent ?? "";
  const editorPlainText =
    String(note.editorPlainText ?? "") ||
    editorContentToPlainText(editorContent);
  return {
    ...note,
    id: sanitizeNoteId(note.id),
    title: note.title || "Untitled",
    previewText: note.previewText ?? editorPlainText.slice(0, 400),
    content: note.content ?? editorPlainText,
    contentFormat: "plain",
    editorContent,
    editorPlainText,
    editorHtml: undefined,
    properties: Array.isArray(note.properties) ? note.properties : [],
    assets: Array.isArray(note.assets) ? note.assets : [],
    schemaVersion: Number(note.schemaVersion) || 2,
    layoutWidth: ([900, 1000, 1100, 1200] as const).includes(
      note.layoutWidth as 900 | 1000 | 1100 | 1200,
    )
      ? (note.layoutWidth as 900 | 1000 | 1100 | 1200)
      : 1200,
    tags: Array.isArray(note.tags) ? note.tags : [],
    category: note.category ?? "",
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

function noteFromDatabaseRow(row: { value: string } | undefined) {
  if (!row) {
    return null;
  }
  const note = decodeSqliteJson<NoteFile | null>(row.value, null);
  return note ? normalizeNoteFile(note) : null;
}

function writeNoteToDatabase(note: NoteFile) {
  const database = getDatabase();
  const indexItem = noteIndexItemFromNote(note);
  database
    .prepare(
      `
    INSERT INTO notes (
      id, value, title, preview_text, editor_plain_text, tags, category, group_id, pinned,
      created_at, updated_at, archived_at, trashed_at, pinned_at, layout_width
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      value = excluded.value,
      title = excluded.title,
      preview_text = excluded.preview_text,
      editor_plain_text = excluded.editor_plain_text,
      tags = excluded.tags,
      category = excluded.category,
      group_id = excluded.group_id,
      pinned = excluded.pinned,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      archived_at = excluded.archived_at,
      trashed_at = excluded.trashed_at,
      pinned_at = excluded.pinned_at,
      layout_width = excluded.layout_width
  `,
    )
    .run(
      note.id,
      encodeSqliteJson(note),
      indexItem.title,
      indexItem.previewText,
      note.editorPlainText,
      encodeSqliteJson(indexItem.tags),
      indexItem.category,
      indexItem.groupId ?? null,
      indexItem.pinned ? 1 : 0,
      indexItem.createdAt,
      indexItem.updatedAt,
      indexItem.archivedAt ?? null,
      indexItem.trashedAt ?? null,
      indexItem.pinnedAt ?? null,
      indexItem.layoutWidth ?? null,
    );
}

function writeSearchItemToDatabase(item: NoteSearchIndexItem) {
  getDatabase()
    .prepare(
      `
    INSERT INTO note_search_index (note_id, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(note_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `,
    )
    .run(item.noteId, encodeSqliteJson(item), item.updatedAt);
}

function readHtmlCacheFromDatabase(noteId: string) {
  const row = getDatabase()
    .prepare("SELECT html FROM note_html_cache WHERE note_id = ?")
    .get(sanitizeNoteId(noteId)) as { html: string | null } | undefined;
  return row?.html ?? null;
}

function writeHtmlCacheToDatabase(noteId: string, html: string | null) {
  getDatabase()
    .prepare(
      `
    INSERT INTO note_html_cache (note_id, html, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(note_id) DO UPDATE SET html = excluded.html, updated_at = excluded.updated_at
  `,
    )
    .run(sanitizeNoteId(noteId), html, nowIso());
}

function deleteHtmlCacheFromDatabase(noteId: string) {
  getDatabase()
    .prepare("DELETE FROM note_html_cache WHERE note_id = ?")
    .run(sanitizeNoteId(noteId));
}

function writeStudyMaterialToDatabase(material: StudyMaterialFile) {
  const item = studyIndexItemFromMaterial(material);
  getDatabase()
    .prepare(
      `
    INSERT INTO study_materials (id, value, title, plain_text, board_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      value = excluded.value,
      title = excluded.title,
      plain_text = excluded.plain_text,
      board_count = excluded.board_count,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
  `,
    )
    .run(
      material.id,
      encodeSqliteJson(material),
      item.title,
      item.plainText,
      item.boardCount,
      item.createdAt,
      item.updatedAt,
    );
}

function walkEditorBlocks(
  content: unknown,
  visitor: (block: Record<string, unknown>) => void,
) {
  if (!Array.isArray(content)) {
    return;
  }
  const walk = (blocks: unknown[]) => {
    for (const block of blocks) {
      if (!block || typeof block !== "object") {
        continue;
      }
      const current = block as Record<string, unknown>;
      visitor(current);
      if (Array.isArray(current.children)) {
        walk(current.children);
      }
    }
  };
  walk(content);
}

function mapEditorBlocks(
  content: unknown,
  mapBlock: (block: Record<string, unknown>) => Record<string, unknown>,
) {
  if (!Array.isArray(content)) {
    return content;
  }
  const mapBlocks = (blocks: unknown[]): unknown[] =>
    blocks
      .filter((block) => block && typeof block === "object")
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
    if (!["image", "video", "audio", "file"].includes(String(block.type))) {
      return block;
    }

    const props = {
      ...((block.props as Record<string, unknown> | undefined) ?? {}),
    };
    const url = typeof props.url === "string" ? props.url : "";
    if (url.startsWith("file:")) {
      try {
        const targetPath = fileURLToPath(url);
        const relativePath = toRelativeDataPath(targetPath);
        if (relativePath.startsWith("assets/")) {
          props.relativePath = relativePath;
          props.assetId =
            typeof props.assetId === "string"
              ? props.assetId
              : path.basename(targetPath).split("-").slice(0, 3).join("-");
          delete props.url;
        }
      } catch {
        // Keep non-local or malformed URLs untouched.
      }
    }
    props.showPreview = false;
    return { ...block, props };
  });
}

function hydrateEditorContentForRenderer(content: unknown) {
  return mapEditorBlocks(content, (block) => {
    if (!["image", "video", "audio", "file"].includes(String(block.type))) {
      return block;
    }

    const props = {
      ...((block.props as Record<string, unknown> | undefined) ?? {}),
    };
    if (typeof props.relativePath === "string" && !props.url) {
      try {
        props.url = assetUrlFromRelativePath(props.relativePath);
      } catch {
        // Broken asset links are left unresolved for diagnostics.
      }
    }
    props.showPreview = false;
    return { ...block, props };
  });
}

async function buildAssetsFromContent(noteId: string, content: unknown) {
  const assets = new Map<string, NoteAsset>();
  walkEditorBlocks(content, (block) => {
    if (!["image", "video", "audio", "file"].includes(String(block.type))) {
      return;
    }
    const props = (block.props as Record<string, unknown> | undefined) ?? {};
    const relativePath =
      typeof props.relativePath === "string" ? props.relativePath : "";
    if (!relativePath) {
      return;
    }
    const name =
      typeof props.name === "string" ? props.name : path.basename(relativePath);
    const mimeType = typeof props.mimeType === "string" ? props.mimeType : "";
    const assetId =
      typeof props.assetId === "string"
        ? props.assetId
        : path.basename(relativePath).split("-").slice(0, 3).join("-");
    assets.set(assetId, {
      id: assetId,
      noteId,
      type: inferAssetType(mimeType),
      name,
      mimeType,
      size: Number(props.size ?? 0) || 0,
      sizeBytes: Number(props.size ?? 0) || 0,
      relativePath,
      createdAt:
        typeof props.createdAt === "string"
          ? props.createdAt
          : new Date().toISOString(),
    });
  });

  const hydrated = await Promise.all(
    Array.from(assets.values()).map(async (asset) => {
      try {
        const stats = await fs.stat(
          resolveRelativeDataPath(asset.relativePath),
        );
        return { ...asset, size: stats.size, sizeBytes: stats.size };
      } catch {
        return asset;
      }
    }),
  );
  return hydrated;
}

async function readNoteIndex() {
  await ensureNoteStorageDirectory();
  return getDatabase()
    .prepare("SELECT value FROM notes ORDER BY pinned DESC, updated_at DESC")
    .all()
    .map((row) => noteFromDatabaseRow(row as { value: string }))
    .filter((note): note is NoteFile => Boolean(note))
    .map(noteIndexItemFromNote);
}

async function writeNoteIndex(items: NoteIndexItem[]) {
  await ensureNoteStorageDirectory();
  for (const item of items) {
    const note = await readNoteFile(item.id);
    if (note) {
      writeNoteToDatabase(
        normalizeNoteFile({
          ...note,
          ...item,
          editorPlainText: item.previewText,
        }),
      );
    }
  }
}

async function readSearchIndex() {
  await ensureNoteStorageDirectory();
  return getDatabase()
    .prepare("SELECT value FROM note_search_index ORDER BY updated_at DESC")
    .all()
    .map((row) =>
      decodeSqliteJson<NoteSearchIndexItem | null>(
        (row as { value: string }).value,
        null,
      ),
    )
    .filter((item): item is NoteSearchIndexItem => Boolean(item));
}

async function writeSearchIndex(items: NoteSearchIndexItem[]) {
  await ensureNoteStorageDirectory();
  const database = getDatabase();
  const transaction = database.transaction(
    (nextItems: NoteSearchIndexItem[]) => {
      database.prepare("DELETE FROM note_search_index").run();
      nextItems.forEach((item) => writeSearchItemToDatabase(item));
    },
  );
  transaction(items);
}

async function readNoteFile(noteId: string) {
  await ensureNoteStorageDirectory();
  const note = noteFromDatabaseRow(
    getDatabase()
      .prepare("SELECT value FROM notes WHERE id = ?")
      .get(sanitizeNoteId(noteId)) as { value: string } | undefined,
  );
  if (!note) {
    return null;
  }
  return {
    ...normalizeNoteFile(note),
    editorContent: hydrateEditorContentForRenderer(note.editorContent),
  };
}

async function saveNoteFile(note: Partial<NoteFile> & { id: string }) {
  await ensureNoteStorageDirectory();
  const timestamp = new Date().toISOString();
  const normalized = normalizeNoteFile({
    ...note,
    updatedAt: note.updatedAt ?? timestamp,
  });
  const storageContent = serializeEditorContentForStorage(
    normalized.editorContent,
  );
  const editorPlainText =
    normalized.editorPlainText || editorContentToPlainText(storageContent);
  const storageNote = normalizeNoteFile({
    ...normalized,
    content: editorPlainText,
    editorContent: storageContent,
    editorPlainText,
    assets: await buildAssetsFromContent(normalized.id, storageContent),
    updatedAt: timestamp,
  });

  writeNoteToDatabase(storageNote);
  writeSearchItemToDatabase(searchItemFromNote(storageNote));
  deleteHtmlCacheFromDatabase(storageNote.id);

  return {
    ...storageNote,
    editorContent: hydrateEditorContentForRenderer(storageNote.editorContent),
  };
}

async function patchNoteMetadata(noteId: string, patch: Partial<NoteFile>) {
  const note = await readNoteFile(noteId);
  if (!note) {
    return null;
  }
  return saveNoteFile({ ...note, ...patch, id: note.id });
}

async function deleteNoteStorage(noteId: string) {
  await ensureNoteStorageDirectory();
  const safeId = sanitizeNoteId(noteId);
  await Promise.all([
    fs.rm(getNoteAssetsDirectory(safeId), { recursive: true, force: true }),
  ]);
  const database = getDatabase();
  database.prepare("DELETE FROM notes WHERE id = ?").run(safeId);
  database
    .prepare("DELETE FROM note_search_index WHERE note_id = ?")
    .run(safeId);
  database.prepare("DELETE FROM note_drafts WHERE note_id = ?").run(safeId);
  database.prepare("DELETE FROM note_html_cache WHERE note_id = ?").run(safeId);
  return true;
}

async function saveNoteDraft(noteId: string, editorContent: unknown) {
  await ensureNoteStorageDirectory();
  const draft: NoteDraft = {
    noteId: sanitizeNoteId(noteId),
    editorContent: serializeEditorContentForStorage(editorContent),
    updatedAt: new Date().toISOString(),
  };
  getDatabase()
    .prepare(
      `
    INSERT INTO note_drafts (note_id, editor_content, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(note_id) DO UPDATE SET editor_content = excluded.editor_content, updated_at = excluded.updated_at
  `,
    )
    .run(draft.noteId, encodeSqliteJson(draft.editorContent), draft.updatedAt);
  return draft;
}

async function readNoteDraft(noteId: string) {
  await ensureNoteStorageDirectory();
  const row = getDatabase()
    .prepare(
      "SELECT note_id, editor_content, updated_at FROM note_drafts WHERE note_id = ?",
    )
    .get(sanitizeNoteId(noteId)) as
    | { note_id: string; editor_content: string; updated_at: string }
    | undefined;
  const draft = row
    ? {
        noteId: row.note_id,
        editorContent: decodeSqliteJson(row.editor_content, null),
        updatedAt: row.updated_at,
      }
    : null;
  return draft
    ? {
        ...draft,
        editorContent: hydrateEditorContentForRenderer(draft.editorContent),
      }
    : null;
}

async function ensureStudyStorageDirectory() {
  await ensureDataDirectory();
  getDatabase();
}

function isStudyRichTextDocument(value: unknown) {
  return (
    value !== null &&
    typeof value === "object" &&
    (value as { format?: unknown }).format === "rich-html-v1" &&
    typeof (value as { html?: unknown }).html === "string"
  );
}

function isStudyBlockDocument(value: unknown) {
  return (
    value !== null &&
    typeof value === "object" &&
    (value as { format?: unknown }).format === "study-blocks-v1" &&
    Array.isArray((value as { blocks?: unknown }).blocks)
  );
}

function normalizeStudyEditorContent(content: unknown) {
  if (isStudyBlockDocument(content)) {
    const source = content as {
      format: "study-blocks-v1";
      version?: unknown;
      blocks: unknown[];
      plainText?: unknown;
    };

    return {
      format: source.format,
      version: Number(source.version) || 1,
      blocks: source.blocks,
      plainText: typeof source.plainText === "string" ? source.plainText : "",
    };
  }

  if (isStudyRichTextDocument(content)) {
    const source = content as {
      format: "rich-html-v1";
      version?: unknown;
      html: string;
      plainText?: unknown;
    };

    return {
      format: source.format,
      version: Number(source.version) || 1,
      html: source.html,
      plainText: typeof source.plainText === "string" ? source.plainText : "",
    };
  }

  if (typeof content === "string" || Array.isArray(content)) {
    return content;
  }

  return "";
}

function stripStudyHtml(value: string) {
  return value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\u200b/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function studyEditorContentToPlainText(content: unknown): string {
  if (isStudyBlockDocument(content)) {
    const document = content as { blocks: unknown[]; plainText?: unknown };
    const plainText =
      typeof document.plainText === "string" ? document.plainText.trim() : "";

    if (plainText) return plainText;

    return document.blocks
      .map((block) => {
        const source = block as {
          type?: unknown;
          content?: unknown;
        };

        if (source.type === "text") {
          return studyEditorContentToPlainText(source.content);
        }

        if (source.type === "heading") {
          return typeof (source as { text?: unknown }).text === "string"
            ? ((source as { text: string }).text.trim())
            : "";
        }

        if (source.type === "markdown" || source.type === "latex" || source.type === "code") {
          return typeof (source as { source?: unknown }).source === "string"
            ? ((source as { source: string }).source.trim())
            : "";
        }

        return "";
      })
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  if (isStudyRichTextDocument(content)) {
    const document = content as { html: string; plainText?: unknown };
    const plainText =
      typeof document.plainText === "string" ? document.plainText.trim() : "";

    return plainText || stripStudyHtml(document.html);
  }

  if (typeof content === "string") return stripStudyHtml(content);
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];

  const visit = (blocks: unknown[]) => {
    blocks.forEach((block) => {
      const item = block as { content?: unknown; children?: unknown };

      if (Array.isArray(item.content)) {
        const text = item.content
          .map((leaf) => ((leaf as { text?: unknown }).text ?? "").toString())
          .join("");

        if (text.trim()) parts.push(text.trim());
      }

      if (Array.isArray(item.children)) visit(item.children);
    });
  };

  visit(content);
  return parts.join("\n\n").trim();
}

function normalizeStudyMaterial(
  material: Partial<StudyMaterialFile> & { id: string },
): StudyMaterialFile {
  const timestamp = new Date().toISOString();
  const editorContent = normalizeStudyEditorContent(material.editorContent);
  const plainText =
    material.plainText?.trim() || studyEditorContentToPlainText(editorContent);

  return {
    id: sanitizeNoteId(material.id),
    title: material.title || "Новый материал",
    editorContent,
    plainText,
    boardLinks: Array.isArray(material.boardLinks)
      ? material.boardLinks
          .filter((link) => link?.boardId)
          .map((link) => ({
            id: link.id || `${link.boardId}-link`,
            boardId: link.boardId,
            title: link.title || "Доска",
            createdAt: link.createdAt ?? timestamp,
          }))
      : [],
    createdAt: material.createdAt ?? timestamp,
    updatedAt: material.updatedAt ?? material.createdAt ?? timestamp,
  };
}

function studyIndexItemFromMaterial(
  material: StudyMaterialFile,
): StudyMaterialIndexItem {
  return {
    id: material.id,
    title: material.title,
    plainText: material.plainText,
    boardCount: material.boardLinks.length,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
}

async function readStudyIndex() {
  await ensureStudyStorageDirectory();
  return getDatabase()
    .prepare("SELECT value FROM study_materials ORDER BY updated_at DESC")
    .all()
    .map((row) =>
      decodeSqliteJson<StudyMaterialFile | null>(
        (row as { value: string }).value,
        null,
      ),
    )
    .filter((material): material is StudyMaterialFile => Boolean(material))
    .map((material) =>
      studyIndexItemFromMaterial(normalizeStudyMaterial(material)),
    );
}

async function writeStudyIndex(items: StudyMaterialIndexItem[]) {
  await ensureStudyStorageDirectory();
  for (const item of items) {
    const material = await readStudyMaterial(item.id);
    if (material) {
      writeStudyMaterialToDatabase(
        normalizeStudyMaterial({ ...material, ...item }),
      );
    }
  }
}

async function readStudyMaterial(materialId: string) {
  await ensureStudyStorageDirectory();
  const row = getDatabase()
    .prepare("SELECT value FROM study_materials WHERE id = ?")
    .get(sanitizeNoteId(materialId)) as { value: string } | undefined;
  const material = row
    ? decodeSqliteJson<StudyMaterialFile | null>(row.value, null)
    : null;
  return material ? normalizeStudyMaterial(material) : null;
}

async function saveStudyMaterial(
  material: Partial<StudyMaterialFile> & { id: string },
) {
  await ensureStudyStorageDirectory();
  const normalized = normalizeStudyMaterial({
    ...material,
    updatedAt: material.updatedAt ?? new Date().toISOString(),
  });
  writeStudyMaterialToDatabase(normalized);
  return normalized;
}

async function deleteStudyMaterial(materialId: string) {
  await ensureStudyStorageDirectory();
  const safeId = sanitizeNoteId(materialId);
  getDatabase().prepare("DELETE FROM study_materials WHERE id = ?").run(safeId);
  return true;
}

async function saveNoteAsset(payload: {
  noteId?: unknown;
  name?: unknown;
  mimeType?: unknown;
  data?: ArrayBuffer;
}) {
  if (!payload?.data || !(payload.data instanceof ArrayBuffer)) {
    throw new Error("Asset payload is empty.");
  }
  const noteId = sanitizeNoteId(payload.noteId);
  const assetId = createAssetId();
  const mimeType = String(payload.mimeType ?? "");
  const safeName = sanitizeAssetFileName(payload.name);
  const targetDirectory = getNoteAssetsDirectory(noteId);
  await fs.mkdir(targetDirectory, { recursive: true });
  const targetPath = path.join(targetDirectory, `${assetId}-${safeName}`);
  await fs.writeFile(targetPath, Buffer.from(payload.data));
  const stats = await fs.stat(targetPath);
  const asset: NoteAsset & { url: string } = {
    id: assetId,
    noteId,
    type: inferAssetType(mimeType),
    name: safeName,
    mimeType,
    size: stats.size,
    sizeBytes: stats.size,
    relativePath: toRelativeDataPath(targetPath),
    createdAt: new Date().toISOString(),
    url: assetUrlFromRelativePath(toRelativeDataPath(targetPath)),
  };
  return asset;
}

async function listNoteAssetFiles(noteId: string) {
  await ensureNoteStorageDirectory();
  const directory = getNoteAssetsDirectory(noteId);
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const assets = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const targetPath = path.join(directory, entry.name);
          const stats = await fs.stat(targetPath);
          const [prefix, timestamp, random] = entry.name.split("-");
          const assetId =
            [prefix, timestamp, random].filter(Boolean).join("-") ||
            path.parse(entry.name).name;
          return {
            id: assetId,
            noteId: sanitizeNoteId(noteId),
            type: "file" as NoteAssetType,
            name: entry.name.replace(`${assetId}-`, ""),
            mimeType: "",
            size: stats.size,
            sizeBytes: stats.size,
            relativePath: toRelativeDataPath(targetPath),
            createdAt: stats.birthtime.toISOString(),
            url: assetUrlFromRelativePath(toRelativeDataPath(targetPath)),
            exists: true,
          };
        }),
    );
    return assets;
  } catch (error) {
    if (getStorageErrorCode(error) === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function collectUsedAssetIds(content: unknown) {
  const used = new Set<string>();
  walkEditorBlocks(content, (block) => {
    if (!["image", "video", "audio", "file"].includes(String(block.type))) {
      return;
    }
    const assetId = (block.props as Record<string, unknown> | undefined)
      ?.assetId;
    if (typeof assetId === "string" && assetId) {
      used.add(assetId);
    }
  });
  return used;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function noteContentToHtml(content: unknown): string {
  if (typeof content === "string") {
    return content
      .split(/\n{2,}/)
      .map(
        (paragraph) =>
          `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`,
      )
      .join("");
  }
  if (!Array.isArray(content)) {
    return "";
  }

  return content.map(blockToHtml).join("");
}

function blockToHtml(block: unknown): string {
  if (!block || typeof block !== "object") {
    return "";
  }
  const current = block as Record<string, unknown>;
  const props = (current.props as Record<string, unknown> | undefined) ?? {};
  const children = Array.isArray(current.children)
    ? current.children.map(blockToHtml).join("")
    : "";
  const text = escapeHtml(inlineContentToPlainText(current.content)).replace(
    /\n/g,
    "<br>",
  );

  switch (current.type) {
    case "heading": {
      const level = Math.min(3, Math.max(1, Number(props.level) || 1));
      return `<h${level}>${text}</h${level}>${children}`;
    }
    case "bulletListItem":
      return `<ul><li>${text}${children}</li></ul>`;
    case "numberedListItem":
      return `<ol><li>${text}${children}</li></ol>`;
    case "checkListItem":
      return `<p>${props.checked ? "[x]" : "[ ]"} ${text}</p>${children}`;
    case "quote":
      return `<blockquote>${text}</blockquote>${children}`;
    case "codeBlock":
      return `<pre><code>${text}</code></pre>${children}`;
    case "divider":
      return "<hr>";
    case "image": {
      const url =
        typeof props.relativePath === "string"
          ? assetUrlFromRelativePath(props.relativePath)
          : String(props.url ?? "");
      const caption = escapeHtml(String(props.caption ?? ""));
      return url
        ? `<figure><img src="${escapeHtml(url)}" loading="lazy">${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`
        : "";
    }
    case "video": {
      const url =
        typeof props.relativePath === "string"
          ? assetUrlFromRelativePath(props.relativePath)
          : String(props.url ?? "");
      return url
        ? `<video src="${escapeHtml(url)}" controls preload="metadata"></video>`
        : "";
    }
    case "audio": {
      const url =
        typeof props.relativePath === "string"
          ? assetUrlFromRelativePath(props.relativePath)
          : String(props.url ?? "");
      return url
        ? `<audio src="${escapeHtml(url)}" controls preload="metadata"></audio>`
        : "";
    }
    case "file": {
      const url =
        typeof props.relativePath === "string"
          ? assetUrlFromRelativePath(props.relativePath)
          : String(props.url ?? "");
      const name = escapeHtml(String(props.name ?? "File"));
      return url ? `<p><a href="${escapeHtml(url)}">${name}</a></p>` : "";
    }
    default:
      return `<p>${text}</p>${children}`;
  }
}

export function registerStorageIpc() {
  ipcMain.handle("storage:getAll", async (_event, collectionName: string) => {
    return readJson(assertCollectionName(collectionName));
  });

  ipcMain.handle(
    "storage:saveAll",
    async (_event, collectionName: string, items: unknown) => {
      const safeName = assertCollectionName(collectionName);
      await writeJson(safeName, items);
      return readJson(safeName);
    },
  );

  ipcMain.handle(
    "storage:add",
    async (_event, collectionName: string, item: { id: string }) => {
      const safeName = assertCollectionName(collectionName);
      const list = ensureListCollection(safeName, await readJson(safeName));
      list.push(item);
      await writeJson(safeName, list);
      return item;
    },
  );

  ipcMain.handle(
    "storage:update",
    async (_event, collectionName: string, item: { id: string }) => {
      const safeName = assertCollectionName(collectionName);
      const list = ensureListCollection(safeName, await readJson(safeName));
      const index = list.findIndex((existing) => existing.id === item.id);
      if (index === -1) {
        list.push(item);
      } else {
        list[index] = item;
      }
      await writeJson(safeName, list);
      return item;
    },
  );

  ipcMain.handle(
    "storage:delete",
    async (_event, collectionName: string, id: string) => {
      const safeName = assertCollectionName(collectionName);
      const list = ensureListCollection(safeName, await readJson(safeName));
      await writeJson(
        safeName,
        list.filter((item) => item.id !== id),
      );
      return true;
    },
  );

  ipcMain.handle("storage:getDataDirectory", async () => {
    await ensureDataDirectory();
    return getDataDirectory();
  });

  ipcMain.handle("storage:openDataDirectory", async () => {
    await ensureDataDirectory();
    return shell.openPath(getDataDirectory());
  });

  ipcMain.handle(
    "files:saveAsset",
    async (_event, payload: { name?: unknown; data?: ArrayBuffer }) => {
      if (!payload?.data || !(payload.data instanceof ArrayBuffer)) {
        throw new Error("Asset payload is empty.");
      }

      const assetsDirectory = await ensureAssetsDirectory();
      const safeName = sanitizeAssetFileName(payload.name);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;
      const targetPath = path.join(assetsDirectory, fileName);
      await fs.writeFile(targetPath, Buffer.from(payload.data));
      return pathToFileURL(targetPath).href;
    },
  );

  ipcMain.handle("files:listAssets", async () => {
    await ensureAssetsDirectory();
    return listAssetFiles();
  });

  ipcMain.handle("files:getAssetInfo", async (_event, url: string) => {
    return getAssetInfoFromUrl(url);
  });

  ipcMain.handle("files:openContainingFolder", async (_event, url: string) => {
    return openContainingFolderFromUrl(url);
  });

  ipcMain.handle("notes:listIndex", async () => {
    const startedAt = performance.now();
    const index = await readNoteIndex();
    if (!app.isPackaged) {
      console.info("[notes:index]", {
        items: index.length,
        loadMs: Math.round((performance.now() - startedAt) * 10) / 10,
      });
    }
    return index;
  });

  ipcMain.handle("notes:listSearchIndex", async () => {
    return readSearchIndex();
  });

  ipcMain.handle("notes:get", async (_event, noteId: string) => {
    const startedAt = performance.now();
    const note = await readNoteFile(noteId);
    if (!app.isPackaged && note) {
      console.info("[notes:get]", {
        noteId,
        loadMs: Math.round((performance.now() - startedAt) * 10) / 10,
        approximateSizeBytes: Buffer.byteLength(JSON.stringify(note), "utf8"),
        assetCount: note.assets.length,
      });
    }
    return note;
  });

  ipcMain.handle("notes:save", async (_event, note: NoteFile) => {
    const startedAt = performance.now();
    const saved = await saveNoteFile(note);
    if (!app.isPackaged) {
      console.info("[notes:save:file]", {
        noteId: saved.id,
        saveMs: Math.round((performance.now() - startedAt) * 10) / 10,
        approximateSizeBytes: Buffer.byteLength(JSON.stringify(saved), "utf8"),
        assetCount: saved.assets.length,
      });
    }
    return saved;
  });

  ipcMain.handle(
    "notes:patchMetadata",
    async (_event, noteId: string, patch: Partial<NoteFile>) => {
      return patchNoteMetadata(noteId, patch);
    },
  );

  ipcMain.handle(
    "notes:patchManyMetadata",
    async (_event, noteIds: string[], patch: Partial<NoteFile>) => {
      await Promise.all(
        noteIds.map((noteId) => patchNoteMetadata(noteId, patch)),
      );
      return true;
    },
  );

  ipcMain.handle("notes:delete", async (_event, noteId: string) => {
    return deleteNoteStorage(noteId);
  });

  ipcMain.handle(
    "notes:saveDraft",
    async (_event, noteId: string, editorContent: unknown) => {
      const startedAt = performance.now();
      const draft = await saveNoteDraft(noteId, editorContent);
      if (!app.isPackaged) {
        console.info("[notes:draft:save]", {
          noteId,
          saveMs: Math.round((performance.now() - startedAt) * 10) / 10,
        });
      }
      return draft;
    },
  );

  ipcMain.handle("notes:getDraft", async (_event, noteId: string) => {
    return readNoteDraft(noteId);
  });

  ipcMain.handle("notes:deleteDraft", async (_event, noteId: string) => {
    await ensureNoteStorageDirectory();
    getDatabase()
      .prepare("DELETE FROM note_drafts WHERE note_id = ?")
      .run(sanitizeNoteId(noteId));
    return true;
  });

  ipcMain.handle(
    "notes:saveAsset",
    async (
      _event,
      payload: {
        noteId?: unknown;
        name?: unknown;
        mimeType?: unknown;
        data?: ArrayBuffer;
      },
    ) => {
      return saveNoteAsset(payload);
    },
  );

  ipcMain.handle("notes:listAssets", async (_event, noteId: string) => {
    return listNoteAssetFiles(noteId);
  });

  ipcMain.handle(
    "notes:getAssetInfo",
    async (_event, noteId: string, assetId: string) => {
      return (
        (await listNoteAssetFiles(noteId)).find(
          (asset) => asset.id === assetId,
        ) ?? null
      );
    },
  );

  ipcMain.handle(
    "notes:deleteAsset",
    async (_event, noteId: string, assetId: string) => {
      const asset = (await listNoteAssetFiles(noteId)).find(
        (item) => item.id === assetId,
      );
      if (!asset) {
        return false;
      }
      await fs.rm(resolveRelativeDataPath(asset.relativePath), { force: true });
      return true;
    },
  );

  ipcMain.handle(
    "notes:cleanupUnusedAssets",
    async (_event, noteId: string) => {
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
        await fs.rm(resolveRelativeDataPath(asset.relativePath), {
          force: true,
        });
        deleted.push(asset);
      }

      return {
        deleted,
        kept,
        totalSizeBytes: kept.reduce(
          (sum, asset) => sum + (asset.sizeBytes || asset.size || 0),
          0,
        ),
      };
    },
  );

  ipcMain.handle("notes:generateHtml", async (_event, noteId: string) => {
    const note = await readNoteFile(noteId);
    const html = note ? noteContentToHtml(note.editorContent) : "";
    writeHtmlCacheToDatabase(noteId, html);
    return html;
  });

  ipcMain.handle("notes:getCachedHtml", async (_event, noteId: string) => {
    await ensureNoteStorageDirectory();
    return readHtmlCacheFromDatabase(noteId);
  });

  ipcMain.handle(
    "notes:invalidateHtmlCache",
    async (_event, noteId: string) => {
      await ensureNoteStorageDirectory();
      deleteHtmlCacheFromDatabase(noteId);
      return true;
    },
  );

  ipcMain.handle("study:listIndex", async () => {
    return readStudyIndex();
  });

  ipcMain.handle("study:get", async (_event, materialId: string) => {
    return readStudyMaterial(materialId);
  });

  ipcMain.handle("study:save", async (_event, material: StudyMaterialFile) => {
    return saveStudyMaterial(material);
  });

  ipcMain.handle("study:delete", async (_event, materialId: string) => {
    return deleteStudyMaterial(materialId);
  });

  ipcMain.handle("storage:exportBackup", async () => {
    await ensureDataDirectory();
    const backupDirectory = path.join(
      getDocumentsDirectory(),
      "MyMind",
      "backups",
      `backup-${Date.now()}`,
    );
    await fs.mkdir(backupDirectory, { recursive: true });
    await exportSqliteDatabase(path.join(backupDirectory, sqliteDatabaseFileName));
    try {
      await fs.cp(
        path.join(getDataDirectory(), "assets"),
        path.join(backupDirectory, "assets"),
        { recursive: true },
      );
    } catch {
      // Assets are optional and older backups may not have them.
    }
    return backupDirectory;
  });

  ipcMain.handle("storage:exportBackupFile", async () => {
    await ensureDataDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const result = await dialog.showSaveDialog({
      title: "Export MyMind SQLite backup",
      defaultPath: path.join(
        getDocumentsDirectory(),
        `mymind-backup-${timestamp}.sqlite`,
      ),
      filters: [{ name: "SQLite", extensions: ["sqlite", "db"] }],
    });
    if (result.canceled || !result.filePath) {
      return null;
    }
    await exportSqliteDatabase(result.filePath);
    return result.filePath;
  });

  ipcMain.handle("storage:importBackupFile", async () => {
    const result = await dialog.showOpenDialog({
      title: "Import MyMind SQLite backup",
      properties: ["openFile"],
      filters: [{ name: "SQLite", extensions: ["sqlite", "db"] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const confirmation = await dialog.showMessageBox({
      type: "warning",
      buttons: ["Import backup", "Cancel"],
      defaultId: 1,
      cancelId: 1,
      title: "Import backup preview",
      message: "This will replace the current MyMind SQLite database.",
      detail: "Assets are not stored inside the SQLite file. Import asset folders from a folder backup when needed.",
    });
    if (confirmation.response !== 0) {
      return null;
    }
    await importSqliteDatabase(result.filePaths[0]);
    return getDataDirectory();
  });

  ipcMain.handle("storage:importBackup", async () => {
    const result = await dialog.showOpenDialog({
      title: "Select MyMind backup folder",
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    await ensureDataDirectory();
    const sourceDirectory = result.filePaths[0];
    const sqliteBackupPath = path.join(sourceDirectory, sqliteDatabaseFileName);
    try {
      await fs.access(sqliteBackupPath);
    } catch (error) {
      if (getStorageErrorCode(error) !== "ENOENT") {
        throw error;
      }
      throw new Error("Selected backup folder does not contain mymind.sqlite.");
    }
    await importSqliteDatabase(sqliteBackupPath);
    try {
      await fs.cp(
        path.join(sourceDirectory, "assets"),
        path.join(getDataDirectory(), "assets"),
        { recursive: true },
      );
    } catch {
      // Import partial backups without crashing.
    }
    return getDataDirectory();
  });

  ipcMain.handle(
    "storage:exportCollection",
    async (_event, collectionName: string) => {
      const safeName = assertCollectionName(collectionName);
      await ensureCollection(safeName);
      const result = await dialog.showSaveDialog({
        title: `Export ${safeName}`,
        defaultPath: path.join(getDocumentsDirectory(), `${safeName}.json`),
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (result.canceled || !result.filePath) {
        return null;
      }
      await fs.writeFile(result.filePath, `${JSON.stringify(await readJson(safeName), null, 2)}\n`, "utf8");
      return result.filePath;
    },
  );

  ipcMain.handle(
    "storage:importCollection",
    async (_event, collectionName: string) => {
      const safeName = assertCollectionName(collectionName);
      const result = await dialog.showOpenDialog({
        title: `Import ${safeName}`,
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      const content = await fs.readFile(result.filePaths[0], "utf8");
      const parsed = JSON.parse(content);
      await writeJson(safeName, parsed);
      return getDatabasePath();
    },
  );

  ipcMain.handle(
    "reminders:schedule",
    async (
      _event,
      reminders: Array<{ id: string; title: string; body: string; at: string }>,
    ) => {
      scheduleReminders(reminders);
      return true;
    },
  );
}

const reminderTimers = new Map<string, NodeJS.Timeout>();

function scheduleReminders(
  reminders: Array<{ id: string; title: string; body: string; at: string }>,
) {
  for (const timer of reminderTimers.values()) {
    clearTimeout(timer);
  }
  reminderTimers.clear();

  for (const reminder of reminders) {
    const delay = new Date(reminder.at).getTime() - Date.now();
    if (delay <= 0 || delay > 2147483647) {
      continue;
    }
    const timer = setTimeout(() => {
      if (Notification.isSupported()) {
        new Notification({ title: reminder.title, body: reminder.body }).show();
      }
      reminderTimers.delete(reminder.id);
    }, delay);
    reminderTimers.set(reminder.id, timer);
  }
}
