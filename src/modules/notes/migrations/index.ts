import type { Note, NoteFile } from '../types';
import { migrateNoteToCurrentSchema } from './migrateNote';

export const NOTE_SCHEMA_VERSION = 3;

export function migrateNote(note: Note | NoteFile): NoteFile {
  return migrateNoteToCurrentSchema(note);
}

export function hasCurrentNoteSchema(note: Partial<Note | NoteFile>) {
  return note.schemaVersion === NOTE_SCHEMA_VERSION && Array.isArray(note.editorContent);
}
