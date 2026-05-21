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
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FC, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { BlockNoteSchema, defaultBlockSpecs, filterSuggestionItems, insertOrUpdateBlockForSlashMenu, type Block, type BlockNoteEditor, type PartialBlock } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import { getDefaultReactSlashMenuItems, SideMenu, SideMenuController, SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { createId } from '../../shared/utils/idGenerator';
import { DRAWING_BLOCK_DIRTY_EVENT, DRAWING_BLOCK_SELECTED_EVENT, drawingBlockSpec, getCurrentDrawingData } from './blocks/drawing';
import { editorContentToPlainText, getNoteEditorContent, NOTE_SCHEMA_VERSION } from './noteUtils';
import type { Note, NoteProperty } from './types';

interface NoteEditorPageProps {
  note?: Note | null;
  initialMode?: NoteMode;
  onCancel: () => void;
  onSave: (note: Note) => void;
}

type NoteMode = 'read' | 'edit' | 'markdown';
type AnyEditor = BlockNoteEditor<any, any, any>;
type AnyBlock = Block<any, any, any>;
type AnyPartialBlock = PartialBlock<any, any, any>;

const LIST_BLOCK_TYPE_NAMES = ['bulletListItem', 'numberedListItem', 'checkListItem'];
const BLOCKS_WITH_LIBRARY_ENTER = new Set([...LIST_BLOCK_TYPE_NAMES, 'toggleListItem']);

const noteBlockSpecs = Object.fromEntries(
  Object.entries(defaultBlockSpecs).map(([name, spec]) => {
    if ((spec as any).config?.content !== 'inline' || name === 'codeBlock' || BLOCKS_WITH_LIBRARY_ENTER.has(name)) {
      return [name, spec];
    }

    return [
      name,
      {
        ...(spec as any),
        implementation: {
          ...(spec as any).implementation,
          meta: {
            ...((spec as any).implementation?.meta ?? {}),
            hardBreakShortcut: 'enter',
          },
        },
      },
    ];
  }),
) as typeof defaultBlockSpecs;

const noteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...noteBlockSpecs,
    drawing: drawingBlockSpec(),
  },
});

const EMPTY_DOCUMENT: AnyPartialBlock[] = [{ type: 'paragraph' } as any];
const COLOR_PRESETS = ['default', 'gray', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'] as const;
type BlockNoteColor = (typeof COLOR_PRESETS)[number];
const DRAWING_COLOR_PRESETS = ['#e8edf5', '#f6c6c6', '#ffd8a8', '#f7e08c', '#a8e6cf', '#9ed9d5', '#b8c7ff', '#d6b4f4'] as const;
const DRAWING_WIDTH_PRESETS = [2, 3, 5, 8, 12] as const;
const DEFAULT_DRAWING_HEIGHT = 420;
const SUPPORTED_BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'quote',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'toggleListItem',
  'divider',
  'table',
  'image',
  'video',
  'audio',
  'file',
  'codeBlock',
  'drawing',
]);
const LIST_BLOCK_TYPES = new Set(LIST_BLOCK_TYPE_NAMES);
const TOGGLE_HEADING_LEVELS = [1, 2, 3] as const;

export function NoteEditorPage({ note, initialMode, onCancel, onSave }: NoteEditorPageProps) {
  const initialContent = useMemo(() => sanitizeInitialContent(getNoteEditorContent(note)), [note?.id]);
  const [mode, setMode] = useState<NoteMode>(initialMode ?? (note ? 'read' : 'edit'));
  const [title, setTitle] = useState(note?.title ?? '');
  const [category, setCategory] = useState(note?.category ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [properties, setProperties] = useState<NoteProperty[]>(note?.properties ?? []);
  const [selectedBlock, setSelectedBlock] = useState<AnyBlock | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedLabel, setLastSavedLabel] = useState(note?.updatedAt ? 'загружено' : 'новая заметка');
  const [markdownText, setMarkdownText] = useState('');
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
    const frame = window.requestAnimationFrame(() => syncVisualListGroups(editor));
    return () => window.cancelAnimationFrame(frame);
  }, [editor, editorRevision, mode]);

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
      tags,
      properties,
      assets: note?.assets ?? [],
      content: plainText || html,
      contentFormat: 'plain',
      editorContent: blocks,
      editorPlainText: plainText,
      editorHtml: html,
      schemaVersion: NOTE_SCHEMA_VERSION,
    };

    setDirty(false);
    setLastSavedLabel('только что');
    onSave(saved);
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

  async function openMarkdownMode() {
    const markdown = await editor.blocksToMarkdownLossy(editor.document as any);
    setMarkdownText(markdown);
    setMode('markdown');
  }

  async function importMarkdown() {
    const confirmed = window.confirm('Импорт Markdown заменит текущее содержимое заметки. Продолжить?');
    if (!confirmed) {
      return;
    }
    const parsed = await editor.tryParseMarkdownToBlocks(markdownText);

    editor.replaceBlocks(
      editor.document as AnyBlock[],
      parsed.length > 0 ? parsed : [{ type: 'paragraph', content: markdownText } as any],
    );
    setDirty(true);
    setEditorRevision((current) => current + 1);
    setMode('edit');
  }

  return (
    <section className="note-editor-page">
      <NoteTopBar
        mode={mode}
        dirty={dirty}
        lastSavedLabel={lastSavedLabel}
        onBack={onCancel}
        onModeChange={(nextMode) => {
          if (nextMode === 'markdown') {
            void openMarkdownMode();
            return;
          }

          setMode(nextMode);
        }}
        onSave={() => void saveNote()}
      />

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
          tagInput={tagInput}
          properties={properties}
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

      {mode === 'markdown' ? (
        <MarkdownImportExportPanel value={markdownText} onChange={setMarkdownText} onImport={() => void importMarkdown()} onBack={() => setMode('edit')} />
      ) : (
        <>
          {mode === 'edit' ? <QuickBlockToolbar onAddBlock={addBlock} /> : null}
          <div className={`note-editor-layout${isReadMode ? ' read-mode' : ''}`}>
            <div className="note-editor-main">
              {isReadMode ? (
                <ReadOnlyBlocks blocks={mergeDrawingBlockData(editor.document as AnyBlock[])} />
              ) : (
                <BlockNoteEditorShell
                  editor={editor}
                  readOnly={false}
                  onChange={handleEditorChange}
                  onSelectionChange={refreshSelectedBlock}
                />
              )}
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
      )}
    </section>
  );
}

function NoteTopBar({
  mode,
  dirty,
  lastSavedLabel,
  onBack,
  onModeChange,
  onSave,
}: {
  mode: NoteMode;
  dirty: boolean;
  lastSavedLabel: string;
  onBack: () => void;
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
        <button className={`button ghost${mode === 'markdown' ? ' active' : ''}`} type="button" onClick={() => onModeChange('markdown')}>
          <Code2 size={18} />
          Markdown
        </button>
        <button className="button accent note-save-button" type="button" onClick={onSave}>
          <Save size={18} />
          Сохранить
        </button>
        <span className={`note-save-status${dirty ? ' dirty' : ''}`}>{dirty ? 'Есть несохранённые изменения' : `Последнее сохранение: ${lastSavedLabel}`}</span>
      </div>
    </div>
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

function ReadOnlyBlocks({ blocks }: { blocks: AnyBlock[] }) {
  return (
    <div className="note-read-content">
      {renderReadOnlyBlocks(blocks)}
    </div>
  );
}

function renderReadOnlyBlocks(blocks: AnyBlock[]) {
  const output = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];

    if (block.type === 'bulletListItem' || block.type === 'numberedListItem' || block.type === 'checkListItem') {
      const group = [];
      const listType = block.type;
      while (index < blocks.length && blocks[index].type === listType) {
        group.push(blocks[index]);
        index += 1;
      }

      const ListTag = listType === 'numberedListItem' ? 'ol' : 'ul';
      output.push(
        <ListTag className={`note-read-list ${listType}`} key={block.id}>
          {group.map((item) => (
            <li key={item.id}>
              {listType === 'checkListItem' ? <input type="checkbox" checked={Boolean((item.props as any).checked)} readOnly /> : null}
              <span>{renderInlineContent(item.content)}</span>
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    output.push(renderReadOnlyBlock(block));
    index += 1;
  }

  return output;
}

function renderReadOnlyBlock(block: AnyBlock): ReactNode {
  const children = Array.isArray(block.children) && block.children.length > 0 ? <div className="note-read-children">{renderReadOnlyBlocks(block.children as AnyBlock[])}</div> : null;

  if (block.type === 'heading') {
    const level = Math.min(3, Math.max(1, Number((block.props as any).level ?? 1)));
    const HeadingTag = `h${level + 1}` as 'h2' | 'h3' | 'h4';
    return (
      <section className="note-read-block" key={block.id}>
        <HeadingTag>{renderInlineContent(block.content)}</HeadingTag>
        {children}
      </section>
    );
  }

  if (block.type === 'quote') {
    return (
      <blockquote className="note-read-block note-read-quote" key={block.id}>
        {renderInlineContent(block.content)}
        {children}
      </blockquote>
    );
  }

  if (block.type === 'codeBlock') {
    return (
      <pre className="note-read-block note-read-code" key={block.id}>
        <code>{inlineContentToSafeString(block.content)}</code>
      </pre>
    );
  }

  if (block.type === 'divider') {
    return <hr className="note-read-divider" key={block.id} />;
  }

  if (block.type === 'table') {
    return <ReadOnlyTable block={block} key={block.id} />;
  }

  if (block.type === 'image') {
    const url = String((block.props as any).url ?? '');
    return (
      <figure className="note-read-block note-read-media" key={block.id}>
        {url ? <img src={url} alt={String((block.props as any).caption ?? 'Image')} /> : <div className="note-read-empty">Image</div>}
        {(block.props as any).caption ? <figcaption>{String((block.props as any).caption)}</figcaption> : null}
      </figure>
    );
  }

  if (block.type === 'drawing') {
    const drawingData = getCurrentDrawingData(block.id, String((block.props as any).drawingData ?? ''));
    const canvasHeight = clampNumber(Number((block.props as any).canvasHeight ?? DEFAULT_DRAWING_HEIGHT), 220, 900);
    return (
      <div className="note-read-block note-read-drawing" key={block.id} style={{ '--note-drawing-height': `${canvasHeight}px` } as CSSProperties}>
        {isValidDrawingData(drawingData) ? <img src={drawingData} alt="Drawing" /> : <div className="note-read-empty">No drawing yet</div>}
      </div>
    );
  }

  return (
    <div className="note-read-block" key={block.id}>
      <p>{renderInlineContent(block.content)}</p>
      {children}
    </div>
  );
}

function ReadOnlyTable({ block }: { block: AnyBlock }) {
  const rows = Array.isArray((block as any).content?.rows) ? (block as any).content.rows : [];
  return (
    <div className="note-read-block note-read-table-wrap">
      <table className="note-read-table">
        <tbody>
          {rows.map((row: any, rowIndex: number) => (
            <tr key={rowIndex}>
              {(row.cells ?? []).map((cell: unknown, cellIndex: number) => (
                <td key={cellIndex}>{renderInlineContent(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderInlineContent(content: unknown): ReactNode {
  if (!content) {
    return null;
  }

  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return inlineContentToSafeString(content);
  }

  return content.map((item, index) => renderInlineItem(item, index));
}

function renderInlineItem(item: unknown, index: number): ReactNode {
  if (!item || typeof item !== 'object') {
    return String(item ?? '');
  }

  const value = item as Record<string, any>;
  if (value.type === 'link') {
    return (
      <a href={String(value.href ?? '#')} key={index} target="_blank" rel="noreferrer">
        {renderInlineContent(value.content)}
      </a>
    );
  }

  const text = typeof value.text === 'string' ? value.text : inlineContentToSafeString(value.content);
  const styles = value.styles ?? {};
  let node: ReactNode = text;

  if (styles.bold) node = <strong>{node}</strong>;
  if (styles.italic) node = <em>{node}</em>;
  if (styles.underline) node = <u>{node}</u>;
  if (styles.strike) node = <s>{node}</s>;

  return <span key={index}>{node}</span>;
}

function isValidDrawingData(value: string) {
  return value.startsWith('data:image/png;base64,') || value.startsWith('data:image/webp;base64,') || value.startsWith('data:image/jpeg;base64,');
}

function NoteMetadata({
  tags,
  tagInput,
  properties,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onChangeProperty,
  onRemoveProperty,
}: {
  tags: string[];
  tagInput: string;
  properties: NoteProperty[];
  onTagInputChange: (value: string) => void;
  onAddTag: (value?: string) => void;
  onRemoveTag: (value: string) => void;
  onChangeProperty: (property: NoteProperty) => void;
  onRemoveProperty: (id: string) => void;
}) {
  return (
    <div className="note-metadata">
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
    const currentProps = currentBlock.props as Record<string, unknown>;
    const preservedDrawingData =
      currentBlock.type === 'drawing'
        ? { drawingData: getCurrentDrawingData(currentBlock.id, String((currentBlock.props as any).drawingData ?? '')) }
        : {};

    editor.updateBlock(currentBlock, {
      props: {
        ...currentProps,
        ...preservedDrawingData,
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
  const selectedBlocksHaveContent = selectedBlocks.some((item) => item.content !== undefined);
  const currentTextAlignment = String((currentBlock.props as any).textAlignment ?? 'left');
  const blockTypeValue = getSidebarBlockTypeValue(block);
  const listMarkerValue = LIST_BLOCK_TYPES.has(block.type) ? block.type : 'bulletListItem';
  const togglePresentationValue =
    block.type === 'heading' && (block.props as any).isToggleable
      ? `heading-${String((block.props as any).level ?? 1)}`
      : 'toggleListItem';

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
    editor.focus();
    editor.transact(() => {
      for (const item of selectedBlocks) {
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

function MarkdownImportExportPanel({
  value,
  onChange,
  onImport,
  onBack,
}: {
  value: string;
  onChange: (value: string) => void;
  onImport: () => void;
  onBack: () => void;
}) {
  return (
    <div className="note-markdown-panel">
      <div>
        <h3>Markdown import / export</h3>
        <p className="muted-text">Markdown удобен для обмена текстом, но сложные блоки, изображения и рисунки могут быть преобразованы в обычный текст.</p>
      </div>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      <div className="note-markdown-actions">
        <button className="button ghost" type="button" onClick={onBack}>
          Вернуться к редактору
        </button>
        <button className="button accent" type="button" onClick={onImport}>
          Импортировать Markdown
        </button>
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

function countVisualBlocks(blocks: AnyBlock[]) {
  let count = 0;
  let previousType = '';

  for (const block of blocks) {
    const isContinuation = LIST_BLOCK_TYPES.has(block.type) && block.type === previousType;
    if (!isContinuation) {
      count += 1;
    }
    previousType = block.type;
  }

  return count;
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

function mergeDrawingBlockData(blocks: AnyBlock[]): AnyBlock[] {
  return blocks.map((block) => {
    const nextBlock = {
      ...block,
      props:
        block.type === 'drawing'
          ? {
              ...(block.props as Record<string, unknown>),
              drawingData: getCurrentDrawingData(block.id, String((block.props as any).drawingData ?? '')),
            }
          : block.props,
    } as AnyBlock;

    if (Array.isArray(block.children) && block.children.length > 0) {
      nextBlock.children = mergeDrawingBlockData(block.children as AnyBlock[]) as any;
    }

    return nextBlock;
  });
}

function sanitizeInitialContent(content: unknown): AnyPartialBlock[] {
  if (!Array.isArray(content) || content.length === 0) {
    return EMPTY_DOCUMENT;
  }

  const safeBlocks = content
    .map((block) => sanitizeBlock(block))
    .filter(Boolean) as AnyPartialBlock[];

  return safeBlocks.length > 0 ? safeBlocks : EMPTY_DOCUMENT;
}

function sanitizeBlock(block: unknown): AnyPartialBlock | null {
  if (!block || typeof block !== 'object') {
    return null;
  }

  const source = block as Record<string, unknown>;
  const type = typeof source.type === 'string' ? source.type : 'paragraph';

  if (!SUPPORTED_BLOCK_TYPES.has(type)) {
    return {
      type: 'paragraph',
      content: inlineContentToSafeString(source.content),
    } as any;
  }

  const sanitized: Record<string, unknown> = {
    type,
  };

  if ('content' in source && source.content !== '') {
    sanitized.content = source.content;
  }

  if (source.props && typeof source.props === 'object') {
    sanitized.props = source.props;
  }

  if (Array.isArray(source.children)) {
    sanitized.children = source.children
      .map((child) => sanitizeBlock(child))
      .filter(Boolean);
  }

  return sanitized as AnyPartialBlock;
}

function inlineContentToSafeString(content: unknown): string {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map(inlineContentToSafeString).join('');
  }

  if (typeof content === 'object') {
    const value = content as Record<string, unknown>;

    if (typeof value.text === 'string') {
      return value.text;
    }

    if (Array.isArray(value.content)) {
      return value.content.map(inlineContentToSafeString).join('');
    }
  }

  return '';
}

function createEmptyBlock(type: string): AnyPartialBlock {
  if (type === 'list') {
    return { type: 'bulletListItem' } as any;
  }
  if (type === 'toggle') {
    return { type: 'toggleListItem' } as any;
  }
  if (type === 'table') {
    return {
      type: 'table',
      content: {
        type: 'tableContent',
        rows: [
          { cells: [[], []] },
          { cells: [[], []] },
        ],
      },
    } as any;
  }
  if (type === 'image') {
    return { type: 'image' } as any;
  }
  if (type === 'divider') {
    return { type: 'divider' } as any;
  }
  if (type === 'drawing') {
    return { type: 'drawing', props: { drawingData: '', strokeColor: '#e8edf5', strokeWidth: 3, canvasHeight: DEFAULT_DRAWING_HEIGHT } } as any;
  }
  return { type } as any;
}

function insertBlock(editor: AnyEditor, block: AnyPartialBlock) {
  const reference = getCurrentBlock(editor) ?? editor.document[editor.document.length - 1];
  if (reference) {
    editor.insertBlocks([block], reference, 'after');
    return;
  }
  editor.replaceBlocks(editor.document as AnyBlock[], [block]);
}

function insertHardBreak(editor: AnyEditor) {
  const currentBlock = getCurrentBlock(editor);
  if (!currentBlock || currentBlock.content === undefined) {
    return false;
  }

  try {
    editor.focus();
    editor.transact((tr) => {
      const marks =
        tr.storedMarks ??
        tr.selection.$head
          .marks()
          .filter((mark: any) => (editor as any).extensionManager?.splittableMarks?.includes(mark.type.name));

      tr.replaceSelectionWith(tr.doc.type.schema.nodes.hardBreak.create()).ensureMarks(marks);
    });
    return true;
  } catch {
    return false;
  }
}

function getCurrentBlock(editor: AnyEditor): AnyBlock | null {
  try {
    return editor.getTextCursorPosition().block as AnyBlock;
  } catch {
    return (editor.document[0] as AnyBlock | undefined) ?? null;
  }
}

function findBlockById(blocks: AnyBlock[], id: string): AnyBlock | null {
  for (const block of blocks) {
    if (block.id === id) {
      return block;
    }
    const child = findBlockById((block.children ?? []) as AnyBlock[], id);
    if (child) {
      return child;
    }
  }
  return null;
}

function stripBlockIds(block: AnyPartialBlock): AnyPartialBlock {
  if (!block || typeof block !== 'object') {
    return block;
  }
  const cloned = { ...block } as Record<string, unknown>;
  delete cloned.id;
  if (Array.isArray(cloned.children)) {
    cloned.children = cloned.children.map((child) => stripBlockIds(child as AnyPartialBlock));
  }
  return cloned as AnyPartialBlock;
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

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
