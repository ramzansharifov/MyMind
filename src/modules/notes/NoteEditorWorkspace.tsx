import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useCreateBlockNote, useSelectedBlocks } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { createId } from '../../shared/utils/idGenerator';
import type { ContentGroup } from '../../shared/types/common';
import { DRAWING_BLOCK_DIRTY_EVENT, DRAWING_BLOCK_SELECTED_EVENT } from './blocks/drawing';
import { ReadOnlyBlocks } from './editor/ReadOnlyBlocks';
import { BlockNoteEditorShell } from './editor/BlockNoteEditorShell';
import { EditorStatusBar } from './editor/EditorStatusBar';
import { QuickBlockToolbar } from './editor/QuickBlockToolbar';
import { UnsavedNoteChangesDialog } from './editor/UnsavedNoteChangesDialog';
import { findBlockById, getCurrentBlock, insertBlock } from './editor/blockActions';
import { createEmptyBlock, mergeDrawingBlockData, prepareInitialEditorContent, sanitizeInitialContent } from './editor/contentSanitizer';
import { noteSchema } from './editor/noteSchema';
import type { AnyBlock, NoteMode } from './editor/types';
import { NoteMetadata } from './components/NoteMetadata';
import { NoteTopBar } from './components/NoteTopBar';
import { ReadOnlyNoteHeader } from './components/ReadOnlyNoteHeader';
import { normalizeNoteLayoutWidth } from './components/NoteLayoutWidthPicker';
import { NotePropertiesPanel } from './sidebar/NotePropertiesPanel';
import { editorContentToPlainText, getNoteEditorContent, NOTE_SCHEMA_VERSION } from './noteUtils';
import { noteStorageClient } from './storage/noteStorageClient';
import type { Note, NoteLayoutWidth, NoteProperty } from './types';
import { clampImagePreviewWidths, enforceLightweightMediaPreviews, syncActiveEditorBlock, syncBlockTextSizeStyles, syncVisualListGroups } from './utils/noteEditorDom';
import { logNoteSaveDiagnostics } from './utils/noteEditorStats';
import { uploadNoteFile } from './utils/noteEditorUpload';

export interface NoteEditorNavigationActions {
  save: () => Promise<void>;
  discard: () => void;
}

export interface NoteEditorWorkspaceProps {
  note?: Note | null;
  groups?: ContentGroup[];
  defaultGroupId?: string | null;
  initialMode?: NoteMode;
  onCancel: () => void;
  onSave: (note: Note) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onNavigationActionsChange?: (actions: NoteEditorNavigationActions | null) => void;
}

export function NoteEditorWorkspace({
  note,
  groups = [],
  defaultGroupId = null,
  initialMode,
  onCancel,
  onSave,
  onDirtyChange,
  onNavigationActionsChange,
}: NoteEditorWorkspaceProps) {
  const editorNoteId = useMemo(() => note?.id ?? createId('note'), [note?.id]);
  const initialContent = useMemo(() => prepareInitialEditorContent(sanitizeInitialContent(getNoteEditorContent(note))), [note?.id]);
  const [mode, setMode] = useState<NoteMode>(initialMode ?? (note ? 'read' : 'edit'));
  const [title, setTitle] = useState(note?.title ?? '');
  const [category, setCategory] = useState(note?.category ?? '');
  const [groupId, setGroupId] = useState<string | null>(note?.groupId ?? defaultGroupId ?? null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [properties, setProperties] = useState<NoteProperty[]>(note?.properties ?? []);
  const [layoutWidth, setLayoutWidth] = useState<NoteLayoutWidth>(normalizeNoteLayoutWidth(note?.layoutWidth));
  const [selectedBlock, setSelectedBlock] = useState<AnyBlock | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [lastSavedLabel, setLastSavedLabel] = useState(note?.updatedAt ? 'загружено' : 'новая заметка');
  const [editorRevision, setEditorRevision] = useState(0);
  const selectedBlockId = selectedBlock?.id ?? null;
  const saveNoteRef = useRef<() => Promise<void>>(async () => undefined);
  const discardNoteRef = useRef<() => void>(() => undefined);
  const editorRefreshFrameRef = useRef<number | null>(null);
  const mediaPreviewFrameRef = useRef<number | null>(null);
  const draftSaveTimeoutRef = useRef<number | null>(null);
  const sidebarInteractionUntilRef = useRef(0);
  const manualBlockSelectionUntilRef = useRef(0);

  const uploadFile = useCallback((file: File) => uploadNoteFile(editorNoteId, file), [editorNoteId]);

  const editor = useCreateBlockNote(
    {
      schema: noteSchema,
      initialContent: initialContent as any,
      uploadFile,
      domAttributes: {
        editor: {
          class: 'mymind-blocknote-editor',
        },
      },
      placeholders: {
        default: 'Введите текст...',
        emptyDocument: 'Начните писать заметку...',
      },
    },
    [editorNoteId],
  );
  const blockNoteSelectedBlocks = useSelectedBlocks(editor as any) as AnyBlock[];

  const isReadMode = mode === 'read';

  const activateBlock = useCallback((block: AnyBlock | null) => {
    if (!block) {
      return;
    }

    manualBlockSelectionUntilRef.current = performance.now() + 900;
    setSelectedBlock(block);
  }, []);

  const activateBlockById = useCallback(
    (blockId: string) => {
      const block = findBlockById(editor.document as AnyBlock[], blockId);
      activateBlock(block);
    },
    [activateBlock, editor],
  );

  useEffect(() => {
    setSelectedBlock(getCurrentBlock(editor));
    setEditorRevision((current) => current + 1);
  }, [editor]);

  useEffect(() => {
    return () => {
      if (editorRefreshFrameRef.current !== null) {
        window.cancelAnimationFrame(editorRefreshFrameRef.current);
      }
      if (mediaPreviewFrameRef.current !== null) {
        window.cancelAnimationFrame(mediaPreviewFrameRef.current);
      }
      if (draftSaveTimeoutRef.current !== null) {
        window.clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      syncVisualListGroups(editor);
      syncBlockTextSizeStyles(editor);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editor, editorRevision, mode]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      syncActiveEditorBlock(mode === 'edit' ? selectedBlockId : null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editorRevision, mode, selectedBlockId]);

  useEffect(() => {
    const now = performance.now();
    if (mode !== 'edit' || now < sidebarInteractionUntilRef.current || now < manualBlockSelectionUntilRef.current) {
      return;
    }

    const block = blockNoteSelectedBlocks[0];
    if (block?.id && block.id !== selectedBlockId) {
      setSelectedBlock(block);
    }
  }, [blockNoteSelectedBlocks, mode, selectedBlockId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      clampImagePreviewWidths(editor);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editor, mode]);

  useEffect(() => {
    if (mode !== 'edit') {
      return;
    }

    const handleResizeEnd = () => {
      window.requestAnimationFrame(() => clampImagePreviewWidths(editor));
    };

    window.addEventListener('mouseup', handleResizeEnd);
    window.addEventListener('touchend', handleResizeEnd);
    return () => {
      window.removeEventListener('mouseup', handleResizeEnd);
      window.removeEventListener('touchend', handleResizeEnd);
    };
  }, [editor, mode]);

  useEffect(() => {
    function handleDrawingDirty() {
      setDirty(true);
    }

    function handleDrawingSelected(event: Event) {
      const blockId = (event as CustomEvent<{ blockId?: string }>).detail?.blockId;
      if (!blockId) {
        return;
      }

      activateBlockById(blockId);
    }

    window.addEventListener(DRAWING_BLOCK_DIRTY_EVENT, handleDrawingDirty);
    window.addEventListener(DRAWING_BLOCK_SELECTED_EVENT, handleDrawingSelected);
    return () => {
      window.removeEventListener(DRAWING_BLOCK_DIRTY_EVENT, handleDrawingDirty);
      window.removeEventListener(DRAWING_BLOCK_SELECTED_EVENT, handleDrawingSelected);
    };
  }, [activateBlockById]);

  const refreshSelectedBlock = useCallback(() => {
    const now = performance.now();
    if (now < sidebarInteractionUntilRef.current || now < manualBlockSelectionUntilRef.current) {
      return;
    }

    const block = getCurrentBlock(editor);
    if (block) {
      setSelectedBlock(block);
    }
  }, [editor]);

  const markSidebarInteraction = useCallback(() => {
    sidebarInteractionUntilRef.current = performance.now() + 1000;
  }, []);

  function scheduleEditorRefresh() {
    if (editorRefreshFrameRef.current !== null) {
      return;
    }

    editorRefreshFrameRef.current = window.requestAnimationFrame(() => {
      editorRefreshFrameRef.current = null;
      setEditorRevision((current) => current + 1);
    });
  }

  function scheduleLightweightMediaPreviewSync() {
    if (mediaPreviewFrameRef.current !== null) {
      return;
    }

    mediaPreviewFrameRef.current = window.requestAnimationFrame(() => {
      mediaPreviewFrameRef.current = null;
      enforceLightweightMediaPreviews(editor);
    });
  }

  function handleEditorChange() {
    scheduleLightweightMediaPreviewSync();
    setDirty(true);
    scheduleEditorRefresh();
    if (selectedBlockId) {
      const freshBlock = findBlockById(editor.document as AnyBlock[], selectedBlockId);
      if (freshBlock) {
        setSelectedBlock(freshBlock);
      }
    }
  }

  async function saveNote() {
    const saveStartedAt = performance.now();
    const blocks = mergeDrawingBlockData(editor.document as AnyBlock[]);
    const plainTextStartedAt = performance.now();
    const plainText = editorContentToPlainText(blocks);
    const plainTextDurationMs = performance.now() - plainTextStartedAt;
    const timestamp = new Date().toISOString();
    const saved: Note = {
      id: editorNoteId,
      createdAt: note?.createdAt ?? timestamp,
      updatedAt: timestamp,
      archivedAt: note?.archivedAt ?? null,
      trashedAt: note?.trashedAt ?? null,
      trashExpiresAt: note?.trashExpiresAt ?? null,
      statusBeforeArchive: note?.statusBeforeArchive ?? null,
      statusBeforeTrash: note?.statusBeforeTrash ?? null,
      pinnedAt: note?.pinnedAt ?? null,
      pinned: note?.pinned ?? false,
      title: title.trim() || 'Без названия',
      category: category.trim(),
      groupId,
      tags,
      properties,
      assets: note?.assets ?? [],
      content: plainText,
      contentFormat: 'plain',
      editorContent: blocks,
      editorPlainText: plainText,
      editorHtml: undefined,
      schemaVersion: NOTE_SCHEMA_VERSION,
      layoutWidth,
    };

    logNoteSaveDiagnostics({
      blocks,
      plainTextDurationMs,
      saveDurationMs: performance.now() - saveStartedAt,
    });

    setDirty(false);
    setShowLeaveDialog(false);
    setLastSavedLabel('только что');
    try {
      await noteStorageClient.deleteDraft(editorNoteId);
    } catch (error) {
      console.warn('Failed to delete note draft:', error);
    }
    onSave(saved);
  }

  function requestBack() {
    if (!dirty) {
      onCancel();
      return;
    }

    setShowLeaveDialog(true);
  }

  function leaveWithoutSaving() {
    setShowLeaveDialog(false);
    onCancel();
  }

  saveNoteRef.current = saveNote;
  discardNoteRef.current = leaveWithoutSaving;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty || mode !== 'edit') {
      return;
    }

    if (draftSaveTimeoutRef.current !== null) {
      window.clearTimeout(draftSaveTimeoutRef.current);
    }

    draftSaveTimeoutRef.current = window.setTimeout(() => {
      draftSaveTimeoutRef.current = null;
      void noteStorageClient.saveDraft(editorNoteId, mergeDrawingBlockData(editor.document as AnyBlock[])).catch((error) => {
        console.warn('Failed to save note draft:', error);
      });
    }, 15000);

    return () => {
      if (draftSaveTimeoutRef.current !== null) {
        window.clearTimeout(draftSaveTimeoutRef.current);
        draftSaveTimeoutRef.current = null;
      }
    };
  }, [dirty, editor, editorNoteId, editorRevision, mode]);

  useEffect(() => {
    onNavigationActionsChange?.({
      save: () => saveNoteRef.current(),
      discard: () => discardNoteRef.current(),
    });

    return () => onNavigationActionsChange?.(null);
  }, [onNavigationActionsChange]);

  function changeLayoutWidth(value: NoteLayoutWidth) {
    setLayoutWidth(value);
    setDirty(true);
  }

  function addBlock(type: string) {
    insertBlock(editor, createEmptyBlock(type));
    setMode('edit');
    setDirty(true);
  }

  function addTag(value = tagInput) {
    const normalized = value.trim().replace(/^#/, '');
    if (!normalized || tags.includes(normalized)) {
      setTagInput('');
      return;
    }
    setTags((current) => [...current, normalized]);
    setTagInput('');
    setDirty(true);
  }

  function removeTag(value: string) {
    setTags((current) => current.filter((tag) => tag !== value));
    setDirty(true);
  }

  return (
    <section className={`note-editor-page${isReadMode ? ' read-mode' : ''}`} style={{ '--note-content-width': `${layoutWidth}px` } as CSSProperties}>
      <NoteTopBar
        mode={mode}
        dirty={dirty}
        lastSavedLabel={lastSavedLabel}
        layoutWidth={layoutWidth}
        onBack={requestBack}
        onLayoutWidthChange={changeLayoutWidth}
        onModeChange={setMode}
        onSave={() => void saveNote()}
      />
      {showLeaveDialog ? (
        <UnsavedNoteChangesDialog
          message="Save this note before leaving the editor?"
          saveLabel="Save and leave"
          onCancel={() => setShowLeaveDialog(false)}
          onDiscard={leaveWithoutSaving}
          onSave={() => void saveNote()}
        />
      ) : null}

      <div className="note-editor-title-area">
        {isReadMode ? (
          <ReadOnlyNoteHeader title={title} tags={tags} />
        ) : (
          <>
            <input
              className="note-title-input"
              value={title}
              placeholder="Название заметки"
              onChange={(event) => {
                setTitle(event.target.value);
                setDirty(true);
              }}
            />
            <NoteMetadata
              tags={tags}
              groups={groups}
              groupId={groupId}
              tagInput={tagInput}
              properties={properties}
              onGroupChange={(value) => {
                setGroupId(value);
                setDirty(true);
              }}
              onTagInputChange={setTagInput}
              onAddTag={addTag}
              onRemoveTag={removeTag}
              onChangeProperty={(property) => {
                setProperties((current) => current.map((item) => (item.id === property.id ? property : item)));
                setDirty(true);
              }}
              onRemoveProperty={(id) => {
                setProperties((current) => current.filter((item) => item.id !== id));
                setDirty(true);
              }}
            />
          </>
        )}
      </div>

      {mode === 'edit' ? <QuickBlockToolbar onAddBlock={addBlock} /> : null}
      <div className={`note-editor-layout${isReadMode ? ' read-mode' : ''}`}>
        <div className="note-editor-main">
          {isReadMode ? <ReadOnlyBlocks blocks={mergeDrawingBlockData(editor.document as AnyBlock[])} /> : null}
          <div className={isReadMode ? 'note-live-editor-hidden' : undefined} aria-hidden={isReadMode}>
            <BlockNoteEditorShell editor={editor} readOnly={isReadMode} onChange={handleEditorChange} onSelectionChange={refreshSelectedBlock} onBlockActivate={activateBlock} />
          </div>
          <EditorStatusBar editor={editor} revision={editorRevision} lastSavedLabel={lastSavedLabel} />
        </div>
        {!isReadMode ? (
          <NotePropertiesPanel
            editor={editor}
            block={selectedBlock}
            onBlockChange={(block) => setSelectedBlock(block)}
            onInteract={markSidebarInteraction}
            onDirty={() => setDirty(true)}
          />
        ) : null}
      </div>
    </section>
  );
}
