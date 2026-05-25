import { useEffect, useState } from 'react';
import { LoadingState } from '../../shared/components/LoadingState';
import type { ContentGroup } from '../../shared/types/common';
import { noteStorageClient } from './storage/noteStorageClient';
import type { Note } from './types';
import { NoteEditorWorkspace, type NoteEditorNavigationActions } from './NoteEditorWorkspace';
import type { NoteMode } from './editor/types';

interface NoteEditorPageProps {
  noteId?: string | null;
  note?: Note | null;
  groups?: ContentGroup[];
  defaultGroupId?: string | null;
  initialMode?: NoteMode;
  onCancel: () => void;
  onSave: (note: Note) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onNavigationActionsChange?: (actions: NoteEditorNavigationActions | null) => void;
}

export type { NoteEditorNavigationActions };

export function NoteEditorPage({ noteId, note: noteProp, ...props }: NoteEditorPageProps) {
  const [loadedNote, setLoadedNote] = useState<Note | null>(noteProp ?? null);
  const [isLoadingNote, setIsLoadingNote] = useState(Boolean(noteId));

  useEffect(() => {
    let isCancelled = false;

    async function loadNote() {
      if (!noteId) {
        setLoadedNote(noteProp ?? null);
        setIsLoadingNote(false);
        return;
      }

      setIsLoadingNote(true);
      try {
        const [note, draft] = await Promise.all([noteStorageClient.getNote(noteId), noteStorageClient.getDraft(noteId)]);
        if (isCancelled) {
          return;
        }
        setLoadedNote(draft && note ? { ...note, editorContent: draft.editorContent } : note);
      } finally {
        if (!isCancelled) {
          setIsLoadingNote(false);
        }
      }
    }

    void loadNote();
    return () => {
      isCancelled = true;
    };
  }, [noteId, noteProp]);

  if (isLoadingNote) {
    return <LoadingState title="Opening note" message="Loading note file and draft..." variant="page" />;
  }

  return <NoteEditorWorkspace key={loadedNote?.id ?? 'new-note'} note={loadedNote} {...props} />;
}
