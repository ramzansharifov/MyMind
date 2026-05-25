import type { NoteFile } from '../../types';

export function migrateV2ToV3(note: NoteFile): NoteFile {
  return {
    ...note,
    schemaVersion: 3,
    assets: (note.assets ?? []).map((asset) => ({
      ...asset,
      noteId: asset.noteId ?? note.id,
      size: asset.size ?? asset.sizeBytes ?? 0,
      sizeBytes: asset.sizeBytes ?? asset.size ?? 0,
      createdAt: asset.createdAt ?? note.createdAt,
    })),
  };
}
