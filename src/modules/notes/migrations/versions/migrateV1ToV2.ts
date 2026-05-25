import type { Note, NoteFile } from '../../types';

export function migrateV1ToV2(note: Note | NoteFile): NoteFile {
  const editorContent = Array.isArray(note.editorContent) ? note.editorContent : [];
  const editorPlainText = note.editorPlainText ?? note.content ?? '';
  const timestamp = new Date().toISOString();

  return {
    ...note,
    title: note.title || 'Untitled',
    content: note.content ?? editorPlainText,
    contentFormat: 'plain',
    editorContent,
    editorPlainText,
    editorHtml: undefined,
    properties: note.properties ?? [],
    assets: note.assets ?? [],
    schemaVersion: 2,
    layoutWidth: note.layoutWidth ?? 1000,
    tags: note.tags ?? [],
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
