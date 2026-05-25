import type { Note } from '../types';

const ASSET_BLOCK_TYPES = new Set(['image', 'video', 'audio', 'file']);
const LOCAL_ASSETS_MARKER = '/MyMind/data/assets/';

export interface NoteAssetRef {
  blockId: string;
  type: string;
  url: string;
  name?: string;
  assetPath?: string;
  isEmbeddedDataUrl: boolean;
  isLocalAsset: boolean;
}

export interface NoteAssetStatus {
  url: string;
  exists: boolean;
  sizeBytes?: number;
}

export interface NoteAssetDiagnostics {
  assetRefs: NoteAssetRef[];
  embeddedBase64Count: number;
  localAssetCount: number;
  approximateEditorContentSizeBytes: number;
}

export function buildNoteAssetDiagnostics(content: unknown): NoteAssetDiagnostics {
  const assetRefs = extractNoteAssetRefsFromContent(content);
  return {
    assetRefs,
    embeddedBase64Count: assetRefs.filter((ref) => ref.isEmbeddedDataUrl).length,
    localAssetCount: assetRefs.filter((ref) => ref.isLocalAsset).length,
    approximateEditorContentSizeBytes: estimateEditorContentSizeBytes(content),
  };
}

export function extractNoteAssetRefs(note: Note) {
  return extractNoteAssetRefsFromContent(note.editorContent);
}

export function extractNoteAssetRefsFromContent(content: unknown): NoteAssetRef[] {
  if (!Array.isArray(content)) {
    return [];
  }

  const refs: NoteAssetRef[] = [];
  walkBlocks(content, (block) => {
    const type = typeof block.type === 'string' ? block.type : '';
    if (!ASSET_BLOCK_TYPES.has(type)) {
      return;
    }

    const props = block.props && typeof block.props === 'object' ? (block.props as Record<string, unknown>) : {};
    const url = typeof props.url === 'string' ? props.url : '';
    if (!url) {
      return;
    }

    refs.push({
      blockId: typeof block.id === 'string' ? block.id : '',
      type,
      url,
      name: typeof props.name === 'string' ? props.name : undefined,
      assetPath: getAssetPathFromUrl(url),
      isEmbeddedDataUrl: isDataUrl(url),
      isLocalAsset: isLocalAssetUrl(url),
    });
  });

  return refs;
}

export function findUnusedAssetUrls(notes: Note[], knownAssetUrls: string[]) {
  const used = new Set(notes.flatMap((note) => extractNoteAssetRefs(note).map((ref) => ref.url)));
  return knownAssetUrls.filter((url) => !used.has(url));
}

export function findBrokenNoteAssetRefs(refs: NoteAssetRef[], statuses: NoteAssetStatus[]) {
  const statusByUrl = new Map(statuses.map((status) => [status.url, status]));
  return refs.filter((ref) => statusByUrl.get(ref.url)?.exists === false);
}

export async function getNoteAssetStatuses(refs: NoteAssetRef[]): Promise<NoteAssetStatus[]> {
  if (!window.mymind?.files?.getAssetInfo) {
    return [];
  }

  return Promise.all(refs.filter((ref) => ref.isLocalAsset).map((ref) => window.mymind.files!.getAssetInfo(ref.url)));
}

export async function findUnusedLocalAssets(notes: Note[]) {
  if (!window.mymind?.files?.listAssets) {
    return [];
  }

  const assets = await window.mymind.files.listAssets();
  const unusedUrls = findUnusedAssetUrls(
    notes,
    assets.map((asset) => asset.url),
  );
  const unused = new Set(unusedUrls);
  return assets.filter((asset) => unused.has(asset.url));
}

export function estimateEditorContentSizeBytes(content: unknown) {
  try {
    return new TextEncoder().encode(JSON.stringify(content ?? null)).byteLength;
  } catch {
    return 0;
  }
}

export function hasEmbeddedBase64Media(content: unknown) {
  return extractNoteAssetRefsFromContent(content).some((ref) => ref.isEmbeddedDataUrl);
}

function walkBlocks(blocks: unknown[], visit: (block: Record<string, unknown>) => void) {
  for (const item of blocks) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const block = item as Record<string, unknown>;
    visit(block);

    if (Array.isArray(block.children)) {
      walkBlocks(block.children, visit);
    }
  }
}

function isDataUrl(value: string) {
  return value.startsWith('data:');
}

function isLocalAssetUrl(value: string) {
  return getAssetPathFromUrl(value) !== undefined;
}

function getAssetPathFromUrl(value: string) {
  const normalized = decodeURIComponent(value).replace(/\\/g, '/');
  const markerIndex = normalized.indexOf(LOCAL_ASSETS_MARKER);
  if (markerIndex === -1) {
    return undefined;
  }

  return normalized.slice(markerIndex + LOCAL_ASSETS_MARKER.length);
}
