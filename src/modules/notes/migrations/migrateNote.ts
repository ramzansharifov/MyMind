import type { Note, NoteFile } from '../types';
import { migrateV1ToV2 } from './versions/migrateV1ToV2';
import { migrateV2ToV3 } from './versions/migrateV2ToV3';

export function migrateNoteToCurrentSchema(note: Note | NoteFile): NoteFile {
  const v2 = migrateV1ToV2(note);
  return migrateV2ToV3(v2);
}
