import type { Note, NoteAsset, NoteDraft, NoteIndexItem, NoteSearchIndexItem } from '../types';

function requireNotesApi() {
  if (!window.mymind.notes) {
    throw new Error('Notes storage API is not available. Restart the Electron app to load the updated preload script.');
  }
  return window.mymind.notes;
}

export const noteStorageClient = {
  listIndex(): Promise<NoteIndexItem[]> {
    return requireNotesApi().listIndex();
  },
  listSearchIndex(): Promise<NoteSearchIndexItem[]> {
    return requireNotesApi().listSearchIndex();
  },
  getNote(noteId: string): Promise<Note | null> {
    return requireNotesApi().get(noteId);
  },
  saveNote(note: Note): Promise<Note> {
    return requireNotesApi().save(note);
  },
  patchNoteMetadata(noteId: string, patch: Partial<Note>): Promise<Note | null> {
    return requireNotesApi().patchMetadata(noteId, patch);
  },
  patchManyNoteMetadata(noteIds: string[], patch: Partial<Note>): Promise<boolean> {
    return requireNotesApi().patchManyMetadata(noteIds, patch);
  },
  deleteNote(noteId: string): Promise<boolean> {
    return requireNotesApi().delete(noteId);
  },
  saveDraft(noteId: string, editorContent: unknown): Promise<NoteDraft> {
    return requireNotesApi().saveDraft(noteId, editorContent);
  },
  getDraft(noteId: string): Promise<NoteDraft | null> {
    return requireNotesApi().getDraft(noteId);
  },
  deleteDraft(noteId: string): Promise<boolean> {
    return requireNotesApi().deleteDraft(noteId);
  },
  saveAsset(payload: { noteId: string; name: string; mimeType: string; data: ArrayBuffer }): Promise<NoteAsset & { url: string }> {
    return requireNotesApi().saveAsset(payload);
  },
  listAssets(noteId: string): Promise<Array<NoteAsset & { url: string; exists: boolean }>> {
    return requireNotesApi().listAssets(noteId);
  },
  getAssetInfo(noteId: string, assetId: string): Promise<(NoteAsset & { url: string; exists: boolean }) | null> {
    return requireNotesApi().getAssetInfo(noteId, assetId);
  },
  deleteAsset(noteId: string, assetId: string): Promise<boolean> {
    return requireNotesApi().deleteAsset(noteId, assetId);
  },
  cleanupUnusedAssets(noteId: string): Promise<{ deleted: NoteAsset[]; kept: NoteAsset[]; totalSizeBytes: number }> {
    return requireNotesApi().cleanupUnusedAssets(noteId);
  },
  generateHtml(noteId: string): Promise<string> {
    return requireNotesApi().generateHtml(noteId);
  },
  getCachedHtml(noteId: string): Promise<string | null> {
    return requireNotesApi().getCachedHtml(noteId);
  },
  invalidateHtmlCache(noteId: string): Promise<boolean> {
    return requireNotesApi().invalidateHtmlCache(noteId);
  },
};
