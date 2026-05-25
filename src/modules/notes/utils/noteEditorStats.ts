import { buildNoteAssetDiagnostics } from '../assets/noteAssets';
import { countVisualBlocks, flattenBlocks } from '../editor/blockActions';
import type { AnyBlock } from '../editor/types';
import { editorContentToPlainText } from '../noteUtils';

export interface EditorStats {
  words: number;
  characters: number;
  visualBlocks: number;
}

export function calculateEditorStats(blocks: AnyBlock[]): EditorStats {
  const text = editorContentToPlainText(blocks);
  return {
    words: text ? text.split(/\s+/).length : 0,
    characters: text.length,
    visualBlocks: countVisualBlocks(blocks),
  };
}

export function logNoteSaveDiagnostics({
  blocks,
  plainTextDurationMs,
  saveDurationMs,
}: {
  blocks: AnyBlock[];
  plainTextDurationMs: number;
  saveDurationMs: number;
}) {
  if (!import.meta.env.DEV) {
    return;
  }

  const diagnostics = buildNoteAssetDiagnostics(blocks);
  console.info('[notes:save]', {
    blockCount: flattenBlocks(blocks).length,
    approximateEditorContentSizeBytes: diagnostics.approximateEditorContentSizeBytes,
    assetRefs: diagnostics.assetRefs.length,
    localAssets: diagnostics.localAssetCount,
    embeddedBase64Media: diagnostics.embeddedBase64Count,
    plainTextDurationMs: Math.round(plainTextDurationMs * 10) / 10,
    saveDurationMs: Math.round(saveDurationMs * 10) / 10,
  });
}
