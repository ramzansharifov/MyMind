import { app, dialog, ipcMain, Notification, shell } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertCollectionName, collectionFiles, defaultValue, listCollections, nowIso, type CollectionName } from './storageRegistry';

const retryableStorageErrorCodes = new Set(['EBUSY', 'EPERM', 'EACCES']);
const storageRetryDelaysMs = [50, 100, 200, 400, 800];
const collectionWriteQueues = new Map<CollectionName, Promise<unknown>>();
const fileWriteQueues = new Map<string, Promise<unknown>>();

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

function getDocumentsDirectory() {
  return app.getPath('documents') || path.join(os.homedir(), 'Documents');
}

function getDataDirectory() {
  return path.join(getDocumentsDirectory(), 'MyMind', 'data');
}

async function ensureDataDirectory() {
  await fs.mkdir(getDataDirectory(), { recursive: true });
}

async function ensureAssetsDirectory() {
  const assetsDirectory = path.join(getDataDirectory(), 'assets');
  await fs.mkdir(assetsDirectory, { recursive: true });
  return assetsDirectory;
}

function getNotesDirectory() {
  return path.join(getDataDirectory(), 'notes');
}

function getDraftsDirectory() {
  return path.join(getDataDirectory(), 'drafts');
}

function getNotesIndexPath() {
  return path.join(getDataDirectory(), 'notes.index.json');
}

function getSearchIndexPath() {
  return path.join(getDataDirectory(), 'search.index.json');
}

function getNoteFilePath(noteId: string) {
  return path.join(getNotesDirectory(), `${sanitizeNoteId(noteId)}.json`);
}

function getDraftFilePath(noteId: string) {
  return path.join(getDraftsDirectory(), `${sanitizeNoteId(noteId)}.draft.json`);
}

function getNoteAssetsDirectory(noteId: string) {
  return path.join(getDataDirectory(), 'assets', sanitizeNoteId(noteId));
}

async function ensureNoteStorageDirectory() {
  await ensureDataDirectory();
  await fs.mkdir(getNotesDirectory(), { recursive: true });
  await fs.mkdir(getDraftsDirectory(), { recursive: true });
  await fs.mkdir(path.join(getDataDirectory(), 'assets'), { recursive: true });

  await ensureJsonFile(getNotesIndexPath(), []);
  await ensureJsonFile(getSearchIndexPath(), []);
  await backupLegacyNotesFileIfNeeded();
}

async function backupLegacyNotesFileIfNeeded() {
  const legacyPath = filePath('notes');
  const markerPath = path.join(getDataDirectory(), 'notes.legacy-backup.done');

  try {
    await fs.access(markerPath);
    return;
  } catch {
    // Continue and create the marker below.
  }

  try {
    await fs.access(legacyPath);
    await fs.copyFile(legacyPath, path.join(getDataDirectory(), `notes.legacy-backup.${Date.now()}.json`));
  } catch {
    // Legacy notes may not exist. The new storage starts clean.
  }

  await fs.writeFile(markerPath, `${new Date().toISOString()}\n`, 'utf8');
}

function filePath(collectionName: CollectionName) {
  return path.join(getDataDirectory(), collectionFiles[collectionName]);
}

function sanitizeAssetFileName(value: unknown) {
  const rawName = typeof value === 'string' && value.trim() ? value.trim() : 'attachment';
  const parsed = path.parse(rawName);
  const baseName = (parsed.name || 'attachment').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 80);
  const extension = parsed.ext.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').slice(0, 16);
  return `${baseName || 'attachment'}${extension}`;
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

async function getAssetInfoFromUrl(url: string) {
  const assetsDirectory = await ensureAssetsDirectory();
  let targetPath = '';

  try {
    targetPath = fileURLToPath(url);
  } catch {
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

function isRetryableStorageError(error: unknown) {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    retryableStorageErrorCodes.has(String((error as { code?: unknown }).code))
  );
}

function getStorageErrorCode(error: unknown) {
  if (error !== null && typeof error === 'object' && 'code' in error) {
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
      if (!isRetryableStorageError(error) || attempt === storageRetryDelaysMs.length) {
        throw error;
      }
      await wait(storageRetryDelaysMs[attempt]);
    }
  }

  throw lastError;
}

async function enqueueCollectionWrite<T>(collectionName: CollectionName, operation: () => Promise<T>) {
  const previous = collectionWriteQueues.get(collectionName) ?? Promise.resolve();
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

async function enqueueFileWrite<T>(fileKey: string, operation: () => Promise<T>) {
  const previous = fileWriteQueues.get(fileKey) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  let tracked: Promise<T>;

  tracked = next.finally(() => {
    if (fileWriteQueues.get(fileKey) === tracked) {
      fileWriteQueues.delete(fileKey);
    }
  });

  fileWriteQueues.set(fileKey, tracked);

  return tracked;
}

async function ensureJsonFile(file: string, fallback: unknown) {
  try {
    await withStorageRetry(() => fs.access(file));
  } catch (error) {
    if (getStorageErrorCode(error) !== 'ENOENT') {
      throw error;
    }
    await writeJsonFile(file, fallback);
  }
}

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  await ensureDataDirectory();
  try {
    const content = await withStorageRetry(() => fs.readFile(file, 'utf8'));
    if (!content.trim()) {
      await writeJsonFile(file, fallback);
      return fallback;
    }
    return JSON.parse(content) as T;
  } catch (error) {
    if (getStorageErrorCode(error) === 'ENOENT') {
      await writeJsonFile(file, fallback);
      return fallback;
    }
    if (isRetryableStorageError(error)) {
      throw error;
    }
    try {
      await fs.copyFile(file, `${file}.corrupted.${Date.now()}`);
    } catch {
      // Continue with a clean fallback when backup fails.
    }
    await writeJsonFile(file, fallback);
    return fallback;
  }
}

async function writeJsonFile(file: string, value: unknown) {
  return enqueueFileWrite(file, async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const encoded = `${JSON.stringify(value, null, 2)}\n`;
    const tempPath = `${file}.${process.pid}.${Date.now()}.tmp`;
    try {
      await withStorageRetry(() => fs.writeFile(tempPath, encoded, 'utf8'));
      await withStorageRetry(() => fs.rename(tempPath, file));
    } catch (error) {
      try {
        await fs.unlink(tempPath);
      } catch {
        // Temp cleanup is best-effort.
      }
      throw error;
    }
  });
}

async function ensureFile(collectionName: CollectionName) {
  await ensureDataDirectory();
  const target = filePath(collectionName);
  try {
    await withStorageRetry(() => fs.access(target));
  } catch (error) {
    if (getStorageErrorCode(error) !== 'ENOENT') {
      throw error;
    }
    await writeJson(collectionName, defaultValue(collectionName, getDataDirectory()));
  }
}

async function writeJson(collectionName: CollectionName, value: unknown) {
  return enqueueCollectionWrite(collectionName, async () => {
    await ensureDataDirectory();
    const encoded = `${JSON.stringify(value, null, 2)}\n`;
    const target = filePath(collectionName);
    const tempPath = `${target}.${process.pid}.${Date.now()}.tmp`;
    try {
      await withStorageRetry(() => fs.writeFile(tempPath, encoded, 'utf8'));
      await withStorageRetry(() => fs.rename(tempPath, target));
    } catch (error) {
      try {
        await fs.unlink(tempPath);
      } catch {
        // Temp cleanup is best-effort.
      }
      throw error;
    }
  });
}

async function readJson(collectionName: CollectionName) {
  await ensureFile(collectionName);
  const target = filePath(collectionName);
  try {
    const content = await withStorageRetry(() => fs.readFile(target, 'utf8'));
    if (!content.trim()) {
      const safeDefault = defaultValue(collectionName, getDataDirectory());
      await writeJson(collectionName, safeDefault);
      return safeDefault;
    }
    return JSON.parse(content) as unknown;
  } catch (error) {
    if (isRetryableStorageError(error)) {
      throw error;
    }
    const backupPath = `${target}.corrupted.${Date.now()}`;
    try {
      await fs.copyFile(target, backupPath);
    } catch {
      // Recovery should continue even when the backup copy cannot be written.
    }
    const safeDefault = defaultValue(collectionName, getDataDirectory());
    await writeJson(collectionName, safeDefault);
    return safeDefault;
  }
}

function ensureListCollection(collectionName: CollectionName, value: unknown): Array<{ id: string }> {
  if (!listCollections.has(collectionName) || !Array.isArray(value)) {
    throw new Error(`${collectionName} does not support item-level storage operations`);
  }
  return value.filter((item): item is { id: string } => Boolean(item && typeof item === 'object' && 'id' in item));
}

function sanitizeNoteId(value: unknown) {
  const id = String(value ?? '').trim();
  if (!id || /[\\/]/.test(id) || id.includes('..')) {
    throw new Error('Invalid note id.');
  }
  return id.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function createAssetId() {
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function inferAssetType(mimeType: string): NoteAssetType {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  return 'file';
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

function inlineContentToPlainText(content: unknown): string {
  if (!content) {
    return '';
  }
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map(inlineContentToPlainText).join('');
  }
  if (typeof content === 'object') {
    const value = content as Record<string, unknown>;
    if (typeof value.text === 'string') {
      return value.text;
    }
    if (Array.isArray(value.content)) {
      return value.content.map(inlineContentToPlainText).join('');
    }
  }
  return '';
}

function editorContentToPlainText(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }
  const parts: string[] = [];
  const walk = (blocks: unknown[]) => {
    for (const block of blocks) {
      if (!block || typeof block !== 'object') {
        continue;
      }
      const current = block as Record<string, unknown>;
      const text = inlineContentToPlainText(current.content);
      if (text) {
        parts.push(text);
      }
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

function noteIndexItemFromNote(note: NoteFile): NoteIndexItem {
  return {
    id: note.id,
    title: note.title || 'Untitled',
    previewText: (note.editorPlainText || note.content || '').slice(0, 400),
    tags: Array.isArray(note.tags) ? note.tags : [],
    category: note.category ?? '',
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
    title: note.title || 'Untitled',
    editorPlainText: note.editorPlainText ?? '',
    tags: Array.isArray(note.tags) ? note.tags : [],
    category: note.category ?? '',
    groupId: note.groupId ?? null,
    updatedAt: note.updatedAt,
  };
}

function normalizeNoteFile(note: Partial<NoteFile> & { id: string }): NoteFile {
  const timestamp = new Date().toISOString();
  const editorContent = Array.isArray(note.editorContent) ? note.editorContent : [];
  const editorPlainText = String(note.editorPlainText ?? '') || editorContentToPlainText(editorContent);
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
    layoutWidth: ([900, 1000, 1100, 1200] as const).includes(note.layoutWidth as 900 | 1000 | 1100 | 1200) ? note.layoutWidth as 900 | 1000 | 1100 | 1200 : 1200,
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

function walkEditorBlocks(content: unknown, visitor: (block: Record<string, unknown>) => void) {
  if (!Array.isArray(content)) {
    return;
  }
  const walk = (blocks: unknown[]) => {
    for (const block of blocks) {
      if (!block || typeof block !== 'object') {
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

function mapEditorBlocks(content: unknown, mapBlock: (block: Record<string, unknown>) => Record<string, unknown>) {
  if (!Array.isArray(content)) {
    return [];
  }
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
        // Keep non-local or malformed URLs untouched.
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
      createdAt: typeof props.createdAt === 'string' ? props.createdAt : new Date().toISOString(),
    });
  });

  const hydrated = await Promise.all(
    Array.from(assets.values()).map(async (asset) => {
      try {
        const stats = await fs.stat(resolveRelativeDataPath(asset.relativePath));
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
  const value = await readJsonFile<NoteIndexItem[]>(getNotesIndexPath(), []);
  return Array.isArray(value) ? value : [];
}

async function writeNoteIndex(items: NoteIndexItem[]) {
  await ensureNoteStorageDirectory();
  await writeJsonFile(getNotesIndexPath(), items);
}

async function readSearchIndex() {
  await ensureNoteStorageDirectory();
  const value = await readJsonFile<NoteSearchIndexItem[]>(getSearchIndexPath(), []);
  return Array.isArray(value) ? value : [];
}

async function writeSearchIndex(items: NoteSearchIndexItem[]) {
  await ensureNoteStorageDirectory();
  await writeJsonFile(getSearchIndexPath(), items);
}

async function readNoteFile(noteId: string) {
  await ensureNoteStorageDirectory();
  const note = await readJsonFile<NoteFile | null>(getNoteFilePath(noteId), null);
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
  const normalized = normalizeNoteFile({ ...note, updatedAt: note.updatedAt ?? timestamp });
  const storageContent = serializeEditorContentForStorage(normalized.editorContent);
  const editorPlainText = normalized.editorPlainText || editorContentToPlainText(storageContent);
  const storageNote = normalizeNoteFile({
    ...normalized,
    content: editorPlainText,
    editorContent: storageContent,
    editorPlainText,
    assets: await buildAssetsFromContent(normalized.id, storageContent),
    updatedAt: timestamp,
  });

  await writeJsonFile(getNoteFilePath(storageNote.id), storageNote);

  const index = await readNoteIndex();
  const indexItem = noteIndexItemFromNote(storageNote);
  const nextIndex = [indexItem, ...index.filter((item) => item.id !== storageNote.id)].sort(
    (a, b) => Number(Boolean(b.pinned || b.pinnedAt)) - Number(Boolean(a.pinned || a.pinnedAt)) || b.updatedAt.localeCompare(a.updatedAt),
  );
  await writeNoteIndex(nextIndex);

  const search = await readSearchIndex();
  await writeSearchIndex([searchItemFromNote(storageNote), ...search.filter((item) => item.noteId !== storageNote.id)]);
  await writeJsonFile(path.join(getDataDirectory(), 'html-cache', `${storageNote.id}.json`), { noteId: storageNote.id, html: null, updatedAt: timestamp });

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
    fs.rm(getNoteFilePath(safeId), { force: true }),
    fs.rm(getDraftFilePath(safeId), { force: true }),
    fs.rm(getNoteAssetsDirectory(safeId), { recursive: true, force: true }),
    fs.rm(path.join(getDataDirectory(), 'html-cache', `${safeId}.json`), { force: true }),
  ]);
  await writeNoteIndex((await readNoteIndex()).filter((item) => item.id !== safeId));
  await writeSearchIndex((await readSearchIndex()).filter((item) => item.noteId !== safeId));
  return true;
}

async function saveNoteDraft(noteId: string, editorContent: unknown) {
  await ensureNoteStorageDirectory();
  const draft: NoteDraft = {
    noteId: sanitizeNoteId(noteId),
    editorContent: serializeEditorContentForStorage(editorContent),
    updatedAt: new Date().toISOString(),
  };
  await writeJsonFile(getDraftFilePath(noteId), draft);
  return draft;
}

async function readNoteDraft(noteId: string) {
  await ensureNoteStorageDirectory();
  const draft = await readJsonFile<NoteDraft | null>(getDraftFilePath(noteId), null);
  return draft
    ? {
        ...draft,
        editorContent: hydrateEditorContentForRenderer(draft.editorContent),
      }
    : null;
}

async function saveNoteAsset(payload: { noteId?: unknown; name?: unknown; mimeType?: unknown; data?: ArrayBuffer }) {
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
          const [prefix, timestamp, random] = entry.name.split('-');
          const assetId = [prefix, timestamp, random].filter(Boolean).join('-') || path.parse(entry.name).name;
          return {
            id: assetId,
            noteId: sanitizeNoteId(noteId),
            type: 'file' as NoteAssetType,
            name: entry.name.replace(`${assetId}-`, ''),
            mimeType: '',
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
    if (getStorageErrorCode(error) === 'ENOENT') {
      return [];
    }
    throw error;
  }
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

export function registerStorageIpc() {
  ipcMain.handle('storage:getAll', async (_event, collectionName: string) => {
    return readJson(assertCollectionName(collectionName));
  });

  ipcMain.handle('storage:saveAll', async (_event, collectionName: string, items: unknown) => {
    const safeName = assertCollectionName(collectionName);
    await writeJson(safeName, items);
    return readJson(safeName);
  });

  ipcMain.handle('storage:add', async (_event, collectionName: string, item: { id: string }) => {
    const safeName = assertCollectionName(collectionName);
    const list = ensureListCollection(safeName, await readJson(safeName));
    list.push(item);
    await writeJson(safeName, list);
    return item;
  });

  ipcMain.handle('storage:update', async (_event, collectionName: string, item: { id: string }) => {
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
  });

  ipcMain.handle('storage:delete', async (_event, collectionName: string, id: string) => {
    const safeName = assertCollectionName(collectionName);
    const list = ensureListCollection(safeName, await readJson(safeName));
    await writeJson(
      safeName,
      list.filter((item) => item.id !== id),
    );
    return true;
  });

  ipcMain.handle('storage:getDataDirectory', async () => {
    await ensureDataDirectory();
    return getDataDirectory();
  });

  ipcMain.handle('storage:openDataDirectory', async () => {
    await ensureDataDirectory();
    return shell.openPath(getDataDirectory());
  });

  ipcMain.handle('files:saveAsset', async (_event, payload: { name?: unknown; data?: ArrayBuffer }) => {
    if (!payload?.data || !(payload.data instanceof ArrayBuffer)) {
      throw new Error('Asset payload is empty.');
    }

    const assetsDirectory = await ensureAssetsDirectory();
    const safeName = sanitizeAssetFileName(payload.name);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;
    const targetPath = path.join(assetsDirectory, fileName);
    await fs.writeFile(targetPath, Buffer.from(payload.data));
    return pathToFileURL(targetPath).href;
  });

  ipcMain.handle('files:listAssets', async () => {
    await ensureAssetsDirectory();
    return listAssetFiles();
  });

  ipcMain.handle('files:getAssetInfo', async (_event, url: string) => {
    return getAssetInfoFromUrl(url);
  });

  ipcMain.handle('notes:listIndex', async () => {
    const startedAt = performance.now();
    const index = await readNoteIndex();
    if (!app.isPackaged) {
      console.info('[notes:index]', { items: index.length, loadMs: Math.round((performance.now() - startedAt) * 10) / 10 });
    }
    return index;
  });

  ipcMain.handle('notes:listSearchIndex', async () => {
    return readSearchIndex();
  });

  ipcMain.handle('notes:get', async (_event, noteId: string) => {
    const startedAt = performance.now();
    const note = await readNoteFile(noteId);
    if (!app.isPackaged && note) {
      console.info('[notes:get]', {
        noteId,
        loadMs: Math.round((performance.now() - startedAt) * 10) / 10,
        approximateSizeBytes: Buffer.byteLength(JSON.stringify(note), 'utf8'),
        assetCount: note.assets.length,
      });
    }
    return note;
  });

  ipcMain.handle('notes:save', async (_event, note: NoteFile) => {
    const startedAt = performance.now();
    const saved = await saveNoteFile(note);
    if (!app.isPackaged) {
      console.info('[notes:save:file]', {
        noteId: saved.id,
        saveMs: Math.round((performance.now() - startedAt) * 10) / 10,
        approximateSizeBytes: Buffer.byteLength(JSON.stringify(saved), 'utf8'),
        assetCount: saved.assets.length,
      });
    }
    return saved;
  });

  ipcMain.handle('notes:patchMetadata', async (_event, noteId: string, patch: Partial<NoteFile>) => {
    return patchNoteMetadata(noteId, patch);
  });

  ipcMain.handle('notes:patchManyMetadata', async (_event, noteIds: string[], patch: Partial<NoteFile>) => {
    await Promise.all(noteIds.map((noteId) => patchNoteMetadata(noteId, patch)));
    return true;
  });

  ipcMain.handle('notes:delete', async (_event, noteId: string) => {
    return deleteNoteStorage(noteId);
  });

  ipcMain.handle('notes:saveDraft', async (_event, noteId: string, editorContent: unknown) => {
    const startedAt = performance.now();
    const draft = await saveNoteDraft(noteId, editorContent);
    if (!app.isPackaged) {
      console.info('[notes:draft:save]', { noteId, saveMs: Math.round((performance.now() - startedAt) * 10) / 10 });
    }
    return draft;
  });

  ipcMain.handle('notes:getDraft', async (_event, noteId: string) => {
    return readNoteDraft(noteId);
  });

  ipcMain.handle('notes:deleteDraft', async (_event, noteId: string) => {
    await fs.rm(getDraftFilePath(noteId), { force: true });
    return true;
  });

  ipcMain.handle('notes:saveAsset', async (_event, payload: { noteId?: unknown; name?: unknown; mimeType?: unknown; data?: ArrayBuffer }) => {
    return saveNoteAsset(payload);
  });

  ipcMain.handle('notes:listAssets', async (_event, noteId: string) => {
    return listNoteAssetFiles(noteId);
  });

  ipcMain.handle('notes:getAssetInfo', async (_event, noteId: string, assetId: string) => {
    return (await listNoteAssetFiles(noteId)).find((asset) => asset.id === assetId) ?? null;
  });

  ipcMain.handle('notes:deleteAsset', async (_event, noteId: string, assetId: string) => {
    const asset = (await listNoteAssetFiles(noteId)).find((item) => item.id === assetId);
    if (!asset) {
      return false;
    }
    await fs.rm(resolveRelativeDataPath(asset.relativePath), { force: true });
    return true;
  });

  ipcMain.handle('notes:cleanupUnusedAssets', async (_event, noteId: string) => {
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
      deleted.push(asset);
    }

    return {
      deleted,
      kept,
      totalSizeBytes: kept.reduce((sum, asset) => sum + (asset.sizeBytes || asset.size || 0), 0),
    };
  });

  ipcMain.handle('notes:generateHtml', async (_event, noteId: string) => {
    const note = await readNoteFile(noteId);
    const html = note ? noteContentToHtml(note.editorContent) : '';
    await writeJsonFile(path.join(getDataDirectory(), 'html-cache', `${sanitizeNoteId(noteId)}.json`), {
      noteId: sanitizeNoteId(noteId),
      html,
      updatedAt: new Date().toISOString(),
    });
    return html;
  });

  ipcMain.handle('notes:getCachedHtml', async (_event, noteId: string) => {
    const cache = await readJsonFile<{ html?: string | null } | null>(path.join(getDataDirectory(), 'html-cache', `${sanitizeNoteId(noteId)}.json`), null);
    return cache?.html ?? null;
  });

  ipcMain.handle('notes:invalidateHtmlCache', async (_event, noteId: string) => {
    await fs.rm(path.join(getDataDirectory(), 'html-cache', `${sanitizeNoteId(noteId)}.json`), { force: true });
    return true;
  });

  ipcMain.handle('storage:exportBackup', async () => {
    await ensureDataDirectory();
    const backupDirectory = path.join(getDocumentsDirectory(), 'MyMind', 'backups', `backup-${Date.now()}`);
    await fs.mkdir(backupDirectory, { recursive: true });
    for (const fileName of Object.values(collectionFiles)) {
      try {
        await fs.copyFile(path.join(getDataDirectory(), fileName), path.join(backupDirectory, fileName));
      } catch {
        // Continue exporting the files that exist.
      }
    }
    try {
      await fs.cp(path.join(getDataDirectory(), 'assets'), path.join(backupDirectory, 'assets'), { recursive: true });
    } catch {
      // Assets are optional and older backups may not have them.
    }
    for (const noteStorageName of ['notes.index.json', 'search.index.json', 'notes', 'drafts', 'html-cache']) {
      try {
        await fs.cp(path.join(getDataDirectory(), noteStorageName), path.join(backupDirectory, noteStorageName), { recursive: true });
      } catch {
        // New note storage files are optional for older workspaces.
      }
    }
    return backupDirectory;
  });

  ipcMain.handle('storage:exportBackupFile', async () => {
    await ensureDataDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const result = await dialog.showSaveDialog({
      title: 'Export full MyMind backup',
      defaultPath: path.join(getDocumentsDirectory(), `mymind-backup-${timestamp}.json`),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) {
      return null;
    }
    const collections = Object.fromEntries(
      await Promise.all(
        Object.keys(collectionFiles).map(async (collectionName) => [
          collectionName,
          await readJson(collectionName as CollectionName),
        ]),
      ),
    );
    await fs.writeFile(
      result.filePath,
      `${JSON.stringify({ app: 'MyMind', version: 1, exportedAt: nowIso(), collections }, null, 2)}\n`,
      'utf8',
    );
    return result.filePath;
  });

  ipcMain.handle('storage:importBackupFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import full MyMind backup',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const content = await fs.readFile(result.filePaths[0], 'utf8');
    const parsed = JSON.parse(content) as { collections?: Partial<Record<CollectionName, unknown>>; exportedAt?: string };
    if (!parsed.collections || typeof parsed.collections !== 'object') {
      throw new Error('Selected file is not a MyMind backup.');
    }
    const availableCollections = Object.keys(parsed.collections).filter((name) => name in collectionFiles);
    const confirmation = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Import backup', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'Import backup preview',
      message: `This backup contains ${availableCollections.length} collections.`,
      detail: `Exported: ${parsed.exportedAt ?? 'unknown'}\nCollections: ${availableCollections.join(', ')}\n\nImporting will replace the matching local JSON files.`,
    });
    if (confirmation.response !== 0) {
      return null;
    }
    await ensureDataDirectory();
    for (const collectionName of availableCollections) {
      await writeJson(collectionName as CollectionName, parsed.collections[collectionName as CollectionName]);
    }
    return getDataDirectory();
  });

  ipcMain.handle('storage:importBackup', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select MyMind JSON backup folder',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    await ensureDataDirectory();
    for (const fileName of Object.values(collectionFiles)) {
      try {
        await fs.copyFile(path.join(result.filePaths[0], fileName), path.join(getDataDirectory(), fileName));
      } catch {
        // Import partial backups without crashing.
      }
    }
    try {
      await fs.cp(path.join(result.filePaths[0], 'assets'), path.join(getDataDirectory(), 'assets'), { recursive: true });
    } catch {
      // Import partial backups without crashing.
    }
    for (const noteStorageName of ['notes.index.json', 'search.index.json', 'notes', 'drafts', 'html-cache']) {
      try {
        await fs.cp(path.join(result.filePaths[0], noteStorageName), path.join(getDataDirectory(), noteStorageName), { recursive: true });
      } catch {
        // Import partial backups without crashing.
      }
    }
    return getDataDirectory();
  });

  ipcMain.handle('storage:exportCollection', async (_event, collectionName: string) => {
    const safeName = assertCollectionName(collectionName);
    await ensureFile(safeName);
    const result = await dialog.showSaveDialog({
      title: `Export ${safeName}`,
      defaultPath: path.join(getDocumentsDirectory(), `${safeName}.json`),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) {
      return null;
    }
    await fs.copyFile(filePath(safeName), result.filePath);
    return result.filePath;
  });

  ipcMain.handle('storage:importCollection', async (_event, collectionName: string) => {
    const safeName = assertCollectionName(collectionName);
    const result = await dialog.showOpenDialog({
      title: `Import ${safeName}`,
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const content = await fs.readFile(result.filePaths[0], 'utf8');
    const parsed = JSON.parse(content);
    await writeJson(safeName, parsed);
    return filePath(safeName);
  });

  ipcMain.handle('reminders:schedule', async (_event, reminders: Array<{ id: string; title: string; body: string; at: string }>) => {
    scheduleReminders(reminders);
    return true;
  });
}

const reminderTimers = new Map<string, NodeJS.Timeout>();

function scheduleReminders(reminders: Array<{ id: string; title: string; body: string; at: string }>) {
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
