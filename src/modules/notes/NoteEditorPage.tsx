import {
  ArrowLeft,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  BookOpen,
  Brush,
  ChevronDown,
  Code2,
  Copy,
  File as FileIcon,
  Grid3X3,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link,
  List,
  Music,
  Minus,
  PanelRight,
  Quote,
  Save,
  Settings2,
  Strikethrough,
  Tags,
  Trash2,
  Type,
  Underline,
  Video,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FC, type KeyboardEvent, type MouseEvent } from 'react';
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import { getDefaultReactSlashMenuItems, SideMenu, SideMenuController, SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { ModalPortal } from '../../shared/components/ModalPortal';
import { createId } from '../../shared/utils/idGenerator';
import { DRAWING_BLOCK_DIRTY_EVENT } from './blocks/drawing';
import { DRAWING_BLOCK_SELECTED_EVENT } from './blocks/drawing';
import { editorContentToPlainText, getNoteEditorContent, NOTE_SCHEMA_VERSION } from './noteUtils';
import type { ContentGroup } from '../../shared/types/common';
import type { Note, NoteLayoutWidth, NoteProperty } from './types';
import { ReadOnlyBlocks } from './editor/ReadOnlyBlocks';
import {
  BLOCKS_WITH_LIBRARY_ENTER,
  COLOR_PRESETS,
  DEFAULT_DRAWING_HEIGHT,
  DRAWING_COLOR_PRESETS,
  DRAWING_WIDTH_PRESETS,
  LIST_BLOCK_TYPES,
  TOGGLE_HEADING_LEVELS,
  type BlockNoteColor,
} from './editor/constants';
import { countVisualBlocks, findBlockById, flattenBlocks, getContiguousListGroup, getCurrentBlock, insertBlock, insertHardBreak, stripBlockIds } from './editor/blockActions';
import { createEmptyBlock, mergeDrawingBlockData, prepareInitialEditorContent, sanitizeInitialContent } from './editor/contentSanitizer';
import { noteSchema } from './editor/noteSchema';
import type { AnyBlock, AnyEditor, NoteMode } from './editor/types';

interface NoteEditorPageProps {
  note?: Note | null;
  groups?: ContentGroup[];
  defaultGroupId?: string | null;
  initialMode?: NoteMode;
  onCancel: () => void;
  onSave: (note: Note) => void;
}

const IMAGE_MIN_WIDTH = 96;
const IMAGE_FALLBACK_MAX_WIDTH = 1200;
const NOTE_LAYOUT_WIDTHS = [900, 1000, 1200] as const satisfies readonly NoteLayoutWidth[];
const DEFAULT_NOTE_LAYOUT_WIDTH: NoteLayoutWidth = 1000;

export function NoteEditorPage({ note, groups = [], defaultGroupId = null, initialMode, onCancel, onSave }: NoteEditorPageProps) {
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
    [note?.id],
  );

  const isReadMode = mode === 'read';

  useEffect(() => {
    setSelectedBlock(getCurrentBlock(editor));
    setEditorRevision((current) => current + 1);
  }, [editor]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      syncVisualListGroups(editor);
      clampImagePreviewWidths(editor);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editor, editorRevision, mode]);

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

      const block = findBlockById(editor.document as AnyBlock[], blockId);
      if (block) {
        setSelectedBlock(block);
      }
    }

    window.addEventListener(DRAWING_BLOCK_DIRTY_EVENT, handleDrawingDirty);
    window.addEventListener(DRAWING_BLOCK_SELECTED_EVENT, handleDrawingSelected);
    return () => {
      window.removeEventListener(DRAWING_BLOCK_DIRTY_EVENT, handleDrawingDirty);
      window.removeEventListener(DRAWING_BLOCK_SELECTED_EVENT, handleDrawingSelected);
    };
  }, [editor]);

  const refreshSelectedBlock = useCallback(() => {
    const block = getCurrentBlock(editor);
    setSelectedBlock(block);
  }, [editor]);

  function handleEditorChange() {
    clampImagePreviewWidths(editor);
    setDirty(true);
    setEditorRevision((current) => current + 1);
    if (selectedBlock) {
      const freshBlock = findBlockById(editor.document as AnyBlock[], selectedBlock.id);
      setSelectedBlock(freshBlock ?? getCurrentBlock(editor));
    }
  }

  async function saveNote() {
    const blocks = mergeDrawingBlockData(editor.document as AnyBlock[]);
    const plainText = editorContentToPlainText(blocks);
    const html = await editor.blocksToHTMLLossy(blocks as any);
    const timestamp = new Date().toISOString();
    const saved: Note = {
      id: note?.id ?? createId('note'),
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
      content: plainText || html,
      contentFormat: 'plain',
      editorContent: blocks,
      editorPlainText: plainText,
      editorHtml: html,
      schemaVersion: NOTE_SCHEMA_VERSION,
      layoutWidth,
    };

    setDirty(false);
    setShowLeaveDialog(false);
    setLastSavedLabel('только что');
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
    <section
      className={`note-editor-page${isReadMode ? ' read-mode' : ''}`}
      style={{ '--note-content-width': `${layoutWidth}px` } as CSSProperties}
    >
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
        <UnsavedChangesDialog
          onClose={() => setShowLeaveDialog(false)}
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

      <>
        {mode === 'edit' ? <QuickBlockToolbar onAddBlock={addBlock} /> : null}
        <div className={`note-editor-layout${isReadMode ? ' read-mode' : ''}`}>
          <div className="note-editor-main">
            {isReadMode ? (
              <ReadOnlyBlocks blocks={mergeDrawingBlockData(editor.document as AnyBlock[])} />
            ) : null}
            <div className={isReadMode ? 'note-live-editor-hidden' : undefined} aria-hidden={isReadMode}>
              <BlockNoteEditorShell
                editor={editor}
                readOnly={isReadMode}
                onChange={handleEditorChange}
                onSelectionChange={refreshSelectedBlock}
              />
            </div>
            <EditorStatusBar editor={editor} revision={editorRevision} lastSavedLabel={lastSavedLabel} />
          </div>
          {!isReadMode ? (
            <NotePropertiesPanel
              editor={editor}
              block={selectedBlock}
              onBlockChange={(block) => setSelectedBlock(block)}
              onDirty={() => setDirty(true)}
            />
          ) : null}
        </div>
      </>
    </section>
  );
}

function NoteTopBar({
  mode,
  dirty,
  lastSavedLabel,
  layoutWidth,
  onBack,
  onLayoutWidthChange,
  onModeChange,
  onSave,
}: {
  mode: NoteMode;
  dirty: boolean;
  lastSavedLabel: string;
  layoutWidth: NoteLayoutWidth;
  onBack: () => void;
  onLayoutWidthChange: (value: NoteLayoutWidth) => void;
  onModeChange: (mode: NoteMode) => void;
  onSave: () => void;
}) {
  return (
    <div className="note-topbar">
      <button className="button ghost note-topbar-back" type="button" onClick={onBack}>
        <ArrowLeft size={18} />
        Назад к заметкам
      </button>
      <div className="note-topbar-actions">
        <button className={`button ghost${mode === 'read' ? ' active' : ''}`} type="button" onClick={() => onModeChange('read')}>
          <BookOpen size={18} />
          Чтение
        </button>
        <button className={`button ghost${mode === 'edit' ? ' active' : ''}`} type="button" onClick={() => onModeChange('edit')}>
          <Brush size={18} />
          Визуальный редактор
        </button>
        <label className="note-layout-width-select">
          <span>Ширина</span>
          <select value={layoutWidth} onChange={(event) => onLayoutWidthChange(normalizeNoteLayoutWidth(Number(event.target.value)))}>
            {NOTE_LAYOUT_WIDTHS.map((width) => (
              <option value={width} key={width}>
                {width}px
              </option>
            ))}
          </select>
        </label>
        <button className="button accent note-save-button" type="button" onClick={onSave}>
          <Save size={18} />
          Сохранить
        </button>
        <span className={`note-save-status${dirty ? ' dirty' : ''}`}>{dirty ? 'Есть несохранённые изменения' : `Последнее сохранение: ${lastSavedLabel}`}</span>
      </div>
    </div>
  );
}

function UnsavedChangesDialog({
  onClose,
  onDiscard,
  onSave,
}: {
  onClose: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <ModalPortal>
    <div className="dialog-backdrop note-unsaved-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dialog note-unsaved-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-unsaved-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="note-unsaved-dialog-header">
          <div>
            <h3 id="note-unsaved-dialog-title">Есть несохранённые изменения</h3>
            <p>Сохранить заметку перед выходом или выйти без сохранения?</p>
          </div>
          <button className="icon-button ghost" type="button" aria-label="Закрыть" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="dialog-actions note-unsaved-dialog-actions">
          <button className="button ghost" type="button" onClick={onClose}>
            Остаться
          </button>
          <button className="button danger" type="button" onClick={onDiscard}>
            Выйти без сохранения
          </button>
          <button className="button accent" type="button" onClick={onSave}>
            <Save size={17} />
            Сохранить и выйти
          </button>
        </div>
      </section>
    </div>
    </ModalPortal>
  );
}

function ReadOnlyNoteHeader({ title, tags }: { title: string; tags: string[] }) {
  return (
    <div className="note-read-only-header">
      <h1>{title.trim() || 'Без названия'}</h1>
      {tags.length > 0 ? (
        <div className="note-tag-row read-only">
          <Tags size={17} />
          {tags.map((tag) => (
            <span className="note-chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NoteMetadata({
  tags,
  groups,
  groupId,
  tagInput,
  properties,
  onGroupChange,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onChangeProperty,
  onRemoveProperty,
}: {
  tags: string[];
  groups: ContentGroup[];
  groupId: string | null;
  tagInput: string;
  properties: NoteProperty[];
  onGroupChange: (value: string | null) => void;
  onTagInputChange: (value: string) => void;
  onAddTag: (value?: string) => void;
  onRemoveTag: (value: string) => void;
  onChangeProperty: (property: NoteProperty) => void;
  onRemoveProperty: (id: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="note-metadata">
      {groups.length > 0 ? (
        <label className="note-group-select">
          <span>{t('Group')}</span>
          <select value={groupId ?? ''} onChange={(event) => onGroupChange(event.target.value || null)}>
            <option value="">{t('No group')}</option>
            {groups.map((group) => (
              <option value={group.id} key={group.id}>
                {group.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="note-tag-row">
        <Tags size={17} />
        {tags.map((tag) => (
          <button className="note-chip removable" type="button" key={tag} onClick={() => onRemoveTag(tag)}>
            {tag}
            <X size={14} />
          </button>
        ))}
        <input
          className="note-tag-input"
          value={tagInput}
          placeholder="+ Добавить тег"
          onChange={(event) => onTagInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              onAddTag();
            }
          }}
          onBlur={() => onAddTag()}
        />
      </div>
      {properties.length > 0 ? (
        <div className="note-properties-row">
          {properties.map((property) => (
            <div className="note-property-chip" key={property.id}>
              <input
                value={property.name}
                aria-label="Название поля"
                onChange={(event) => onChangeProperty({ ...property, name: event.target.value })}
              />
              <PropertyValueInput property={property} onChange={onChangeProperty} />
              <button type="button" onClick={() => onRemoveProperty(property.id)} aria-label="Удалить поле">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PropertyValueInput({ property, onChange }: { property: NoteProperty; onChange: (property: NoteProperty) => void }) {
  if (property.type === 'checkbox') {
    return (
      <button
        className={`note-checkbox-chip${property.value ? ' active' : ''}`}
        type="button"
        onClick={() => onChange({ ...property, value: !property.value })}
      >
        {property.value ? 'Да' : 'Нет'}
      </button>
    );
  }
  return (
    <input
      type={property.type === 'number' ? 'number' : property.type === 'date' ? 'date' : property.type === 'url' ? 'url' : 'text'}
      value={String(property.value ?? '')}
      aria-label={property.name}
      onChange={(event) =>
        onChange({
          ...property,
          value: property.type === 'number' ? (event.target.value === '' ? '' : Number(event.target.value)) : event.target.value,
        })
      }
    />
  );
}

function QuickBlockToolbar({ onAddBlock }: { onAddBlock: (type: string) => void }) {
  const primaryItems = [
    ['paragraph', <Type size={17} />, 'Text'],
    ['list', <List size={17} />, 'List'],
    ['table', <Grid3X3 size={17} />, 'Table'],
    ['image', <ImageIcon size={17} />, 'Image'],
    ['codeBlock', <Code2 size={17} />, 'Code'],
  ] as const;
  const moreItems = [
    ['markdown', <Code2 size={16} />, 'Markdown'],
    ['quote', <Quote size={16} />, 'Quote'],
    ['toggle', <ChevronDown size={16} />, 'Toggle'],
    ['divider', <Minus size={17} />, 'Divider'],
    ['drawing', <Brush size={16} />, 'Drawing'],
    ['video', <Video size={16} />, 'Video'],
    ['audio', <Music size={16} />, 'Audio'],
    ['file', <FileIcon size={16} />, 'File'],
  ] as const;

  return (
    <div className="note-quick-toolbar">
      {primaryItems.map(([type, icon, label]) => (
        <button className="button ghost" type="button" key={type} onClick={() => onAddBlock(type)}>
          {icon}
          {label}
        </button>
      ))}
      <details className="note-more-blocks">
        <summary className="button ghost">
          <ChevronDown size={17} />
          More blocks
        </summary>
        <div className="note-more-blocks-menu">
          {moreItems.map(([type, icon, label]) => (
            <button type="button" key={type} onClick={() => onAddBlock(type)}>
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

function BlockNoteEditorShell({
  editor,
  readOnly,
  onChange,
  onSelectionChange,
}: {
  editor: AnyEditor;
  readOnly: boolean;
  onChange: () => void;
  onSelectionChange: () => void;
}) {
  function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (readOnly || event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target?.closest('.mymind-blocknote-editor')) {
      return;
    }

    const currentBlock = getCurrentBlock(editor);
    if (!currentBlock || BLOCKS_WITH_LIBRARY_ENTER.has(currentBlock.type)) {
      return;
    }

    if (!insertHardBreak(editor)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onChange();
  }

  return (
    <div className={`mymind-blocknote-shell${readOnly ? ' read-only' : ''}`} onKeyDownCapture={handleEditorKeyDown}>
      <BlockNoteView
        editor={editor}
        theme="dark"
        editable={!readOnly}
        formattingToolbar={false}
        linkToolbar={false}
        slashMenu={false}
        sideMenu={false}
        filePanel={!readOnly}
        tableHandles={!readOnly}
        emojiPicker={false}
        onChange={onChange}
        onSelectionChange={onSelectionChange}
      >
        {!readOnly ? (
          <>
            <CustomSlashMenu editor={editor} />
            <SideMenuController
              sideMenu={NoteBlockSideMenu}
              floatingUIOptions={{
                useFloatingOptions: { placement: 'bottom-start' },
                elementProps: { className: 'note-block-side-menu-popover' },
              }}
            />
          </>
        ) : null}
      </BlockNoteView>
    </div>
  );
}

function NoteBlockSideMenu(props: { dragHandleMenu?: FC }) {
  return <SideMenu {...props} dragHandleMenu={EmptyDragHandleMenu} />;
}

function EmptyDragHandleMenu() {
  return null;
}

function CustomSlashMenu({ editor }: { editor: AnyEditor }) {
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) =>
        filterSuggestionItems(
          [
            ...getDefaultReactSlashMenuItems(editor as any),
            {
              key: 'drawing' as any,
              title: 'Drawing',
              subtext: 'Sketch directly in the note',
              aliases: ['draw', 'canvas', 'sketch'],
              group: 'Basic blocks',
              icon: <Brush size={18} />,
              onItemClick: () => insertOrUpdateBlockForSlashMenu(editor as any, createEmptyBlock('drawing') as any),
            },
            {
              key: 'markdown' as any,
              title: 'Markdown',
              subtext: 'Write a markdown block',
              aliases: ['md', 'markdown'],
              group: 'Basic blocks',
              icon: <Code2 size={18} />,
              onItemClick: () => insertOrUpdateBlockForSlashMenu(editor as any, createEmptyBlock('markdown') as any),
            },
          ],
          query,
        )
      }
    />
  );
}

function NotePropertiesPanel({
  editor,
  block,
  onBlockChange,
  onDirty,
}: {
  editor: AnyEditor;
  block: AnyBlock | null;
  onBlockChange: (block: AnyBlock | null) => void;
  onDirty: () => void;
}) {
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTarget, setLinkTarget] = useState<{ from: number; to: number; text: string } | null>(null);

  if (!block) {
    return (
      <aside className="note-settings-panel">
        <div className="note-settings-header">
          <h3>Настройки блока</h3>
          <Settings2 size={18} />
        </div>
        <p className="muted-text">Выберите блок, чтобы настроить его внешний вид.</p>
      </aside>
    );
  }

  const currentBlock = block;

  function updateBlock(patch: Record<string, unknown>) {
    const currentProps = { ...(currentBlock.props as Record<string, unknown>) };
    if (currentBlock.type === 'drawing') {
      delete currentProps.drawingData;
    }

    editor.updateBlock(currentBlock, {
      props: {
        ...currentProps,
        ...patch,
      } as any,
    });

    const updated = findBlockById(editor.document as AnyBlock[], currentBlock.id);
    onBlockChange(updated ?? currentBlock);
    onDirty();
  }

  function duplicateBlock() {
    const cloned = stripBlockIds(JSON.parse(JSON.stringify(currentBlock)));

    editor.insertBlocks([cloned], currentBlock, 'after');
    onDirty();
  }

  function deleteBlock() {
    const selectedBlocks = editor.getSelection()?.blocks;
    const blocksToRemove = selectedBlocks && selectedBlocks.some((item) => item.id === currentBlock.id) ? selectedBlocks : [currentBlock];

    editor.removeBlocks(blocksToRemove);
    onBlockChange(getCurrentBlock(editor));
    onDirty();
  }

  function updateTableHeaders(patch: Record<string, unknown>) {
    editor.updateBlock(currentBlock, {
      content: {
        ...((currentBlock as any).content ?? {}),
        ...patch,
      },
    } as any);

    const updated = findBlockById(editor.document as AnyBlock[], currentBlock.id);
    onBlockChange(updated ?? currentBlock);
    onDirty();
  }

  const tableContent = (block as any).content ?? {};
  const tableHeadersEnabled = Boolean((editor as any).settings?.tables?.headers);
  const hasHeaderRow = Boolean(tableContent.headerRows);
  const hasHeaderColumn = Boolean(tableContent.headerCols);
  const activeStyles = editor.getActiveStyles() as Record<string, unknown>;
  const selectedBlocks = editor.getSelection()?.blocks ?? [currentBlock];
  const selectedListGroup =
    LIST_BLOCK_TYPES.has(currentBlock.type) && selectedBlocks.length <= 1
      ? getContiguousListGroup(editor.document as AnyBlock[], currentBlock.id)
      : selectedBlocks.filter((item) => LIST_BLOCK_TYPES.has(item.type));
  const selectedBlocksHaveContent = selectedBlocks.some((item) => item.content !== undefined);
  const currentTextAlignment = String((currentBlock.props as any).textAlignment ?? 'left');
  const blockTypeValue = getSidebarBlockTypeValue(block);
  const listMarkerValue = LIST_BLOCK_TYPES.has(block.type) ? block.type : 'bulletListItem';
  const togglePresentationValue =
    block.type === 'heading' && (block.props as any).isToggleable
      ? `heading-${String((block.props as any).level ?? 1)}`
      : 'toggleListItem';
  const imageMaxWidth = block.type === 'image' ? getImageBlockMaxWidth(block.id) : IMAGE_FALLBACK_MAX_WIDTH;
  const rawImageWidth = Number((block.props as any).previewWidth);
  const imageWidthValue = clampNumber(Number.isFinite(rawImageWidth) ? rawImageWidth : imageMaxWidth, IMAGE_MIN_WIDTH, imageMaxWidth);

  function preventToolbarBlur(event: MouseEvent) {
    event.preventDefault();
  }

  function toggleTextStyle(style: 'bold' | 'italic' | 'underline' | 'strike') {
    editor.focus();
    editor.toggleStyles({ [style]: true } as any);
    onDirty();
  }

  function setTextAlignment(textAlignment: 'left' | 'center' | 'right') {
    editor.focus();
    for (const item of selectedBlocks) {
      if ('textAlignment' in (item.props as Record<string, unknown>)) {
        editor.updateBlock(item, { props: { textAlignment } } as any);
      }
    }
    onBlockChange(findBlockById(editor.document as AnyBlock[], currentBlock.id) ?? currentBlock);
    onDirty();
  }

  function setBlockType(value: string) {
    const [type, level] = value.split('-');
    editor.focus();
    editor.transact(() => {
      for (const item of selectedBlocks) {
        const patch =
          value === 'list'
            ? { type: 'bulletListItem', props: getCommonBlockProps(item) }
            : value === 'toggle'
              ? { type: 'toggleListItem', props: getCommonBlockProps(item) }
              : value === 'markdown'
                ? { type: 'codeBlock', props: { ...getCommonBlockProps(item), language: 'markdown' } }
              : type === 'heading'
                ? { type: 'heading', props: { ...getCommonBlockProps(item), level: Number(level || 1), isToggleable: false } }
                : { type, props: getCommonBlockProps(item) };
        editor.updateBlock(item, patch as any);
      }
    });

    onBlockChange(findBlockById(editor.document as AnyBlock[], currentBlock.id) ?? getCurrentBlock(editor));
    onDirty();
  }

  function setListMarkerType(value: string) {
    const blocksToUpdate = selectedListGroup.length > 0 ? selectedListGroup : selectedBlocks;

    editor.focus();
    editor.transact(() => {
      for (const item of blocksToUpdate) {
        if (LIST_BLOCK_TYPES.has(item.type)) {
          editor.updateBlock(item, { type: value, props: getCommonBlockProps(item) } as any);
        }
      }
    });

    onBlockChange(findBlockById(editor.document as AnyBlock[], currentBlock.id) ?? getCurrentBlock(editor));
    onDirty();
  }

  function setTogglePresentation(value: string) {
    editor.focus();
    editor.transact(() => {
      for (const item of selectedBlocks) {
        if (item.type !== 'toggleListItem' && !(item.type === 'heading' && (item.props as any).isToggleable)) {
          continue;
        }

        if (value === 'toggleListItem') {
          editor.updateBlock(item, { type: 'toggleListItem', props: getCommonBlockProps(item) } as any);
          continue;
        }

        const [, level] = value.split('-');
        editor.updateBlock(item, {
          type: 'heading',
          props: {
            ...getCommonBlockProps(item),
            level: Number(level || 1),
            isToggleable: true,
          },
        } as any);
      }
    });

    onBlockChange(findBlockById(editor.document as AnyBlock[], currentBlock.id) ?? getCurrentBlock(editor));
    onDirty();
  }

  function captureLinkTarget() {
    const target = editor.transact((tr) => ({
      from: tr.selection.from,
      to: tr.selection.to,
      text: tr.doc.textBetween(tr.selection.from, tr.selection.to).trim(),
    }));

    setLinkTarget(target);
  }

  function applyLink() {
    const url = linkUrl.trim();
    if (!url || !linkTarget) {
      return;
    }

    editor.transact((tr) => {
      const linkMark = (editor as any).pmSchema.mark('link', { href: url });

      if (linkTarget.from === linkTarget.to || !linkTarget.text) {
        tr.insertText(url, linkTarget.from, linkTarget.to).addMark(linkTarget.from, linkTarget.from + url.length, linkMark);
        return;
      }

      tr.addMark(linkTarget.from, linkTarget.to, linkMark);
    });

    setLinkUrl('');
    setLinkTarget(null);
    onDirty();
  }

  function setImageWidth(value: number) {
    updateBlock({
      previewWidth: clampNumber(Math.round(value), IMAGE_MIN_WIDTH, getImageBlockMaxWidth(currentBlock.id)),
    });
  }

  return (
    <aside className="note-settings-panel">
      <div className="note-settings-header">
        <h3>Настройки блока</h3>
        <PanelRight size={18} />
      </div>
      {selectedBlocksHaveContent ? (
        <div className="note-settings-section note-drag-menu-section">
          <h4>Форматирование</h4>
          <label className="note-settings-input">
            Тип блока
            <select value={blockTypeValue} onChange={(event) => setBlockType(event.target.value)}>
              <option value="paragraph">Paragraph</option>
              <option value="list">List</option>
              <option value="toggle">Toggle</option>
              <option value="heading-1">Heading 1</option>
              <option value="heading-2">Heading 2</option>
              <option value="heading-3">Heading 3</option>
              <option value="quote">Quote</option>
              <option value="codeBlock">Code</option>
              <option value="markdown">Markdown</option>
            </select>
          </label>
          {LIST_BLOCK_TYPES.has(block.type) ? (
            <label className="note-settings-input">
              Marker type
              <select value={listMarkerValue} onChange={(event) => setListMarkerType(event.target.value)}>
                <option value="bulletListItem">Bullet</option>
                <option value="numberedListItem">Numbered</option>
                <option value="checkListItem">Checkbox</option>
              </select>
            </label>
          ) : null}
          {block.type === 'toggleListItem' || (block.type === 'heading' && (block.props as any).isToggleable) ? (
            <label className="note-settings-input">
              Toggle type
              <select value={togglePresentationValue} onChange={(event) => setTogglePresentation(event.target.value)}>
                <option value="toggleListItem">List toggle</option>
                {TOGGLE_HEADING_LEVELS.map((level) => (
                  <option value={`heading-${level}`} key={level}>
                    Heading toggle {level}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="note-sidebar-tool-grid">
            <button className={activeStyles.bold ? 'active' : ''} type="button" title="Bold" onMouseDown={preventToolbarBlur} onClick={() => toggleTextStyle('bold')}>
              <Bold size={16} />
            </button>
            <button className={activeStyles.italic ? 'active' : ''} type="button" title="Italic" onMouseDown={preventToolbarBlur} onClick={() => toggleTextStyle('italic')}>
              <Italic size={16} />
            </button>
            <button className={activeStyles.underline ? 'active' : ''} type="button" title="Underline" onMouseDown={preventToolbarBlur} onClick={() => toggleTextStyle('underline')}>
              <Underline size={16} />
            </button>
            <button className={activeStyles.strike ? 'active' : ''} type="button" title="Strike" onMouseDown={preventToolbarBlur} onClick={() => toggleTextStyle('strike')}>
              <Strikethrough size={16} />
            </button>
            <button className={currentTextAlignment === 'left' ? 'active' : ''} type="button" title="Align left" onMouseDown={preventToolbarBlur} onClick={() => setTextAlignment('left')}>
              <AlignLeft size={16} />
            </button>
            <button className={currentTextAlignment === 'center' ? 'active' : ''} type="button" title="Align center" onMouseDown={preventToolbarBlur} onClick={() => setTextAlignment('center')}>
              <AlignCenter size={16} />
            </button>
            <button className={currentTextAlignment === 'right' ? 'active' : ''} type="button" title="Align right" onMouseDown={preventToolbarBlur} onClick={() => setTextAlignment('right')}>
              <AlignRight size={16} />
            </button>
            <button type="button" title="Indent" onMouseDown={preventToolbarBlur} onClick={() => { editor.focus(); editor.nestBlock(); onDirty(); }}>
              <IndentIncrease size={16} />
            </button>
            <button type="button" title="Outdent" onMouseDown={preventToolbarBlur} onClick={() => { editor.focus(); editor.unnestBlock(); onDirty(); }}>
              <IndentDecrease size={16} />
            </button>
            <button type="button" title="Link" onMouseDown={preventToolbarBlur} onClick={captureLinkTarget}>
              <Link size={16} />
            </button>
          </div>
          {linkTarget ? (
            <div className="note-link-field">
              <input value={linkUrl} placeholder="https://example.com" onChange={(event) => setLinkUrl(event.target.value)} />
              <button className="button ghost" type="button" onClick={applyLink}>
                Применить
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="note-settings-section note-drag-menu-section">
        {supportsTextColor(block.type) || supportsBackgroundColor(block.type) ? (
          <div className="note-menu-group">
            {supportsTextColor(block.type) ? (
              <SettingColorRow
                label="Цвет текста"
                kind="text"
                value={String((block.props as any).textColor ?? 'default')}
                onChange={(value) => updateBlock({ textColor: value })}
              />
            ) : null}
            {supportsBackgroundColor(block.type) ? (
              <SettingColorRow
                label="Цвет фона"
                kind="background"
                value={String((block.props as any).backgroundColor ?? 'default')}
                onChange={(value) => updateBlock({ backgroundColor: value })}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {block.type === 'drawing' ? (
        <div className="note-settings-section note-drawing-settings-section">
          <h4>Drawing</h4>
          <div className="note-drawing-color-row" aria-label="Stroke color">
            {DRAWING_COLOR_PRESETS.map((color) => (
              <button
                className={`note-drawing-color-swatch${String((block.props as any).strokeColor ?? '#e8edf5') === color ? ' active' : ''}`}
                type="button"
                key={color}
                style={{ backgroundColor: color }}
                aria-label={color}
                onClick={() => updateBlock({ strokeColor: color })}
              />
            ))}
          </div>
          <label className="note-settings-input">
            Thickness
            <input
              type="range"
              min="1"
              max="16"
              step="1"
              value={Number((block.props as any).strokeWidth ?? 3)}
              onChange={(event) => updateBlock({ strokeWidth: Number(event.target.value) })}
            />
          </label>
          <div className="note-drawing-width-row">
            {DRAWING_WIDTH_PRESETS.map((width) => (
              <button
                className={Number((block.props as any).strokeWidth ?? 3) === width ? 'active' : ''}
                type="button"
                key={width}
                onClick={() => updateBlock({ strokeWidth: width })}
              >
                {width}px
              </button>
            ))}
          </div>
          <label className="note-settings-input">
            Height, px
            <input
              type="number"
              min="220"
              max="900"
              step="20"
              value={Number((block.props as any).canvasHeight ?? DEFAULT_DRAWING_HEIGHT)}
              onChange={(event) => updateBlock({ canvasHeight: clampNumber(Number(event.target.value), 220, 900) })}
            />
          </label>
          <input
            className="note-drawing-height-slider"
            type="range"
            min="220"
            max="900"
            step="20"
            value={Number((block.props as any).canvasHeight ?? DEFAULT_DRAWING_HEIGHT)}
            onChange={(event) => updateBlock({ canvasHeight: Number(event.target.value) })}
          />
        </div>
      ) : null}

      {block.type === 'codeBlock' ? (
        <label className="note-settings-input">
          Язык
          <input value={String((block.props as any).language ?? '')} onChange={(event) => updateBlock({ language: event.target.value })} />
        </label>
      ) : null}

      {block.type === 'image' ? (
        <>
          <label className="note-settings-input">
            Ширина, px
            <input
              type="number"
              min={IMAGE_MIN_WIDTH}
              max={imageMaxWidth}
              step="10"
              value={imageWidthValue}
              onChange={(event) => setImageWidth(Number(event.target.value))}
            />
          </label>
          <input
            className="note-image-width-slider"
            type="range"
            min={IMAGE_MIN_WIDTH}
            max={imageMaxWidth}
            step="10"
            value={imageWidthValue}
            onChange={(event) => setImageWidth(Number(event.target.value))}
          />
          <button className="button ghost compact-action full-width" type="button" onClick={() => setImageWidth(imageMaxWidth)}>
            По ширине блока
          </button>
          <SettingChoiceRow
            label="Выравнивание"
            value={String((block.props as any).textAlignment ?? 'left')}
            options={['left', 'center', 'right']}
            onChange={(value) => updateBlock({ textAlignment: value })}
          />
          <label className="note-settings-input">
            Подпись
            <input value={String((block.props as any).caption ?? '')} onChange={(event) => updateBlock({ caption: event.target.value })} />
          </label>
        </>
      ) : null}

      {block.type === 'table' && tableHeadersEnabled ? (
        <div className="note-settings-section note-drag-menu-section">
          <h4>Таблица</h4>
          <div className="note-menu-list">
            <button
              className={`note-menu-row${hasHeaderRow ? ' active' : ''}`}
              type="button"
              onClick={() => updateTableHeaders({ headerRows: hasHeaderRow ? undefined : 1 })}
            >
              Строка заголовка
            </button>
            <button
              className={`note-menu-row${hasHeaderColumn ? ' active' : ''}`}
              type="button"
              onClick={() => updateTableHeaders({ headerCols: hasHeaderColumn ? undefined : 1 })}
            >
              Колонка заголовка
            </button>
          </div>
        </div>
      ) : null}

      <div className="note-settings-section note-bottom-actions">
        <button className="button ghost compact-action" type="button" onClick={duplicateBlock}>
          <Copy size={17} />
          Дублировать
        </button>
        <button className="button danger compact-action" type="button" onClick={deleteBlock}>
          <Trash2 size={17} />
          Удалить
        </button>
      </div>
    </aside>
  );
}

function SettingColorRow({
  label,
  kind,
  value,
  onChange,
}: {
  label: string;
  kind: 'text' | 'background';
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <details className="note-color-details">
      <summary>
        <span>{label}</span>
        <span
          className="note-color-current"
          style={{ backgroundColor: resolveCssColor(value, kind) }}
          aria-label={colorLabel((COLOR_PRESETS.includes(value as BlockNoteColor) ? value : 'default') as BlockNoteColor)}
        >
          {kind === 'text' ? <span style={{ color: resolveCssColor(value, 'text') }}>A</span> : null}
        </span>
      </summary>
      <div className="note-color-row">
        {COLOR_PRESETS.map((color) => (
          <button
            className={`note-color-swatch${value === color ? ' active' : ''}`}
            type="button"
            key={color}
            style={{ backgroundColor: resolveCssColor(color, kind) }}
            aria-label={colorLabel(color)}
            onClick={() => onChange(color)}
          >
            {kind === 'text' ? <span style={{ color: resolveCssColor(color, 'text') }}>A</span> : null}
          </button>
        ))}
      </div>
    </details>
  );
}

function SettingChoiceRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="note-settings-section">
      <span className="note-settings-label">{label}</span>
      <div className="note-settings-choice-row">
        {options.map((option) => (
          <button className={value === option ? 'active' : ''} type="button" key={option} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function EditorStatusBar({ editor, revision, lastSavedLabel }: { editor: AnyEditor; revision: number; lastSavedLabel: string }) {
  void revision;
  const blocks = editor.document as AnyBlock[];
  const text = editorContentToPlainText(blocks);
  const visualBlocks = countVisualBlocks(blocks);
  return (
    <div className="note-editor-statusbar">
      <span>Слов: {text ? text.split(/\s+/).length : 0}</span>
      <span>Символов: {text.length}</span>
      <span>Блоков: {visualBlocks}</span>
      <span>Последнее сохранение: {lastSavedLabel}</span>
    </div>
  );
}

function syncVisualListGroups(editor: AnyEditor) {
  const root = document.querySelector('.mymind-blocknote-editor');
  if (!root) {
    return;
  }

  const blockOuters = Array.from(root.querySelectorAll<HTMLElement>('.bn-block-outer[data-id]'));
  const blockById = new Map((editor.document as AnyBlock[]).map((block, index) => [block.id, { block, index }]));

  for (const outer of blockOuters) {
    outer.classList.remove('note-list-group-item', 'note-list-group-continuation', 'note-list-group-has-next');

    const id = outer.dataset.id;
    const entry = id ? blockById.get(id) : undefined;
    if (!entry || !LIST_BLOCK_TYPES.has(entry.block.type)) {
      continue;
    }

    const blocks = editor.document as AnyBlock[];
    const previous = blocks[entry.index - 1];
    const next = blocks[entry.index + 1];
    const continuesPrevious = Boolean(previous && previous.type === entry.block.type);
    const hasNext = Boolean(next && next.type === entry.block.type);

    outer.classList.add('note-list-group-item');
    if (continuesPrevious) {
      outer.classList.add('note-list-group-continuation');
    }
    if (hasNext) {
      outer.classList.add('note-list-group-has-next');
    }
  }
}

function clampImagePreviewWidths(editor: AnyEditor) {
  const root = document.querySelector('.mymind-blocknote-editor');
  if (!root) {
    return;
  }

  for (const block of flattenBlocks(editor.document as AnyBlock[])) {
    if (block.type !== 'image') {
      continue;
    }

    const outer = root.querySelector<HTMLElement>(`.bn-block-outer[data-id="${cssEscape(block.id)}"]`);
    const blockNode = outer?.querySelector<HTMLElement>('.bn-block');
    const content = outer?.querySelector<HTMLElement>('.bn-block-content[data-content-type="image"]');
    const wrapper = content?.querySelector<HTMLElement>('.bn-file-block-content-wrapper');
    const maxWidth = getBlockMediaMaxWidth(root as HTMLElement, outer, blockNode, content);
    if (maxWidth <= 0) {
      continue;
    }

    const previewWidth = Number((block.props as any).previewWidth);
    const renderedWidth = Math.ceil(wrapper?.getBoundingClientRect().width ?? 0);
    const nextWidth = Number.isFinite(previewWidth) ? Math.min(previewWidth, maxWidth) : maxWidth;
    if ((Number.isFinite(previewWidth) && previewWidth <= maxWidth) && renderedWidth <= maxWidth + 1) {
      continue;
    }

    editor.updateBlock(block, {
      props: {
        ...(block.props as Record<string, unknown>),
        previewWidth: nextWidth,
      },
    } as any);
  }
}

function getBlockMediaMaxWidth(
  root: HTMLElement,
  outer?: HTMLElement | null,
  blockNode?: HTMLElement | null,
  content?: HTMLElement | null,
) {
  const widths = [root, outer, blockNode, content]
    .filter((element): element is HTMLElement => Boolean(element))
    .map((element) => Math.floor(element.getBoundingClientRect().width))
    .filter((width) => Number.isFinite(width) && width > 0);

  if (widths.length === 0) {
    return 0;
  }

  const horizontalPadding = content ? getHorizontalPadding(content) : 0;
  return Math.max(64, Math.floor(Math.min(...widths) - horizontalPadding));
}

function getImageBlockMaxWidth(blockId: string) {
  const root = document.querySelector<HTMLElement>('.mymind-blocknote-editor');
  if (!root) {
    return IMAGE_FALLBACK_MAX_WIDTH;
  }

  const outer = root.querySelector<HTMLElement>(`.bn-block-outer[data-id="${cssEscape(blockId)}"]`);
  const blockNode = outer?.querySelector<HTMLElement>('.bn-block');
  const content = outer?.querySelector<HTMLElement>('.bn-block-content[data-content-type="image"]');
  const maxWidth = getBlockMediaMaxWidth(root, outer, blockNode, content);
  return maxWidth > 0 ? Math.max(IMAGE_MIN_WIDTH, maxWidth) : IMAGE_FALLBACK_MAX_WIDTH;
}

function getHorizontalPadding(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  const left = Number.parseFloat(styles.paddingLeft) || 0;
  const right = Number.parseFloat(styles.paddingRight) || 0;
  return left + right;
}

function cssEscape(value: string) {
  return window.CSS?.escape ? window.CSS.escape(value) : value.replace(/["\\]/g, '\\$&');
}

function uploadFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось загрузить файл'));
    reader.readAsDataURL(file);
  });
}

function blockTypeLabel(type: string) {
  const labels: Record<string, string> = {
    paragraph: 'Текст',
    heading: 'Заголовок',
    bulletListItem: 'Маркированный список',
    numberedListItem: 'Нумерованный список',
    checkListItem: 'Чек-лист',
    quote: 'Цитата',
    codeBlock: 'Код',
    markdown: 'Markdown',
    divider: 'Разделитель',
    table: 'Таблица',
    image: 'Изображение',
    drawing: 'Доска для рисования',
    drawingSheet: 'Лист для рисования',
    callout: 'Подсказка',
  };
  return labels[type] ?? type;
}

function supportsTextColor(type: string) {
  return ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'quote', 'callout'].includes(type);
}

function getSidebarBlockTypeValue(block: AnyBlock) {
  if (block.type === 'codeBlock' && ['markdown', 'md'].includes(String((block.props as any).language ?? '').toLowerCase())) {
    return 'markdown';
  }

  if (LIST_BLOCK_TYPES.has(block.type)) {
    return 'list';
  }

  if (block.type === 'toggleListItem' || (block.type === 'heading' && (block.props as any).isToggleable)) {
    return 'toggle';
  }

  if (block.type === 'heading') {
    return `heading-${String((block.props as any).level ?? 1)}`;
  }

  return block.type;
}

function getCommonBlockProps(block: AnyBlock) {
  const props = block.props as Record<string, unknown>;
  return {
    textColor: props.textColor ?? 'default',
    backgroundColor: props.backgroundColor ?? 'default',
    textAlignment: props.textAlignment ?? 'left',
  };
}

function supportsBackgroundColor(type: string) {
  return ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'quote', 'callout', 'image'].includes(type);
}

function colorLabel(value: BlockNoteColor) {
  const labels: Record<BlockNoteColor, string> = {
    default: 'По умолчанию',
    gray: 'Серый',
    brown: 'Коричневый',
    red: 'Красный',
    orange: 'Оранжевый',
    yellow: 'Жёлтый',
    green: 'Зелёный',
    blue: 'Синий',
    purple: 'Фиолетовый',
    pink: 'Розовый',
  };
  return labels[value];
}

function resolveCssColor(value: unknown, kind: 'text' | 'background' = 'background') {
  if (!value || value === 'default') {
    return kind === 'text' ? 'var(--text)' : 'var(--surface-soft)';
  }

  if (typeof value === 'string' && COLOR_PRESETS.includes(value as BlockNoteColor)) {
    return `var(--bn-colors-highlights-${value}-${kind})`;
  }

  return String(value);
}

function normalizeNoteLayoutWidth(value: unknown): NoteLayoutWidth {
  const width = Number(value);
  return NOTE_LAYOUT_WIDTHS.includes(width as NoteLayoutWidth) ? (width as NoteLayoutWidth) : DEFAULT_NOTE_LAYOUT_WIDTH;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
