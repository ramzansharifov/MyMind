import {
  ArrowLeft,
  BookOpen,
  Brush,
  CheckSquare,
  Code2,
  Copy,
  Grid3X3,
  Image as ImageIcon,
  PanelRight,
  Save,
  Settings2,
  Tags,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BlockNoteSchema, defaultBlockSpecs, filterSuggestionItems, type Block, type BlockNoteEditor, type PartialBlock } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import { getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { createId } from '../../shared/utils/idGenerator';
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

const noteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
  },
});

const EMPTY_DOCUMENT: AnyPartialBlock[] = [{ type: 'paragraph' } as any];
const COLOR_PRESETS = ['default', '#f8fafc', '#4db6a8', '#7aa2ff', '#f0c36a', '#ef7d78', '#b884f4'];
const SUPPORTED_BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'table',
  'image',
  'video',
  'audio',
  'file',
  'codeBlock',
]);

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
    const blocks = editor.document as AnyBlock[];
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
              <BlockNoteEditorShell
                editor={editor}
                readOnly={isReadMode}
                onChange={handleEditorChange}
                onSelectionChange={refreshSelectedBlock}
              />
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
  const items = [
    ['paragraph', <Type size={17} />, 'Text'],
    ['checkListItem', <CheckSquare size={17} />, 'Checklist'],
    ['table', <Grid3X3 size={17} />, 'Table'],
    ['image', <ImageIcon size={17} />, 'Image'],
    ['codeBlock', <Code2 size={17} />, 'Code'],
  ] as const;

  return (
    <div className="note-quick-toolbar">
      {items.map(([type, icon, label]) => (
        <button className="button ghost" type="button" key={type} onClick={() => onAddBlock(type)}>
          {icon}
          {label}
        </button>
      ))}
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
  return (
    <div className={`mymind-blocknote-shell${readOnly ? ' read-only' : ''}`}>
      <BlockNoteView
        editor={editor}
        theme="dark"
        editable={!readOnly}
        formattingToolbar={!readOnly}
        linkToolbar={!readOnly}
        slashMenu={false}
        sideMenu={!readOnly}
        filePanel={!readOnly}
        tableHandles={!readOnly}
        emojiPicker={false}
        onChange={onChange}
        onSelectionChange={onSelectionChange}
      >
        {!readOnly ? <CustomSlashMenu editor={editor} /> : null}
      </BlockNoteView>
    </div>
  );
}

function CustomSlashMenu({ editor }: { editor: AnyEditor }) {
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) =>
        filterSuggestionItems(
          getDefaultReactSlashMenuItems(editor as any),
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
    editor.updateBlock(currentBlock, {
      props: {
        ...(currentBlock.props as Record<string, unknown>),
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
    editor.removeBlocks([currentBlock]);
    onBlockChange(getCurrentBlock(editor));
    onDirty();
  }

  return (
    <aside className="note-settings-panel">
      <div className="note-settings-header">
        <h3>Настройки блока</h3>
        <PanelRight size={18} />
      </div>
      <div className="note-settings-section">
        <strong>{blockTypeLabel(block.type)}</strong>
      </div>

      {supportsTextColor(block.type) ? (
        <SettingColorRow label="Цвет текста" value={String((block.props as any).textColor ?? 'default')} onChange={(value) => updateBlock({ textColor: value })} />
      ) : null}

      {supportsBackgroundColor(block.type) ? (
        <SettingColorRow
          label="Цвет фона"
          value={String((block.props as any).backgroundColor ?? 'default')}
          onChange={(value) => updateBlock({ backgroundColor: value })}
        />
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

      <div className="note-settings-section">
        <h4>Действия</h4>
        <button className="button ghost full-width" type="button" onClick={duplicateBlock}>
          <Copy size={17} />
          Дублировать
        </button>
        <button className="button danger full-width" type="button" onClick={deleteBlock}>
          <Trash2 size={17} />
          Удалить блок
        </button>
      </div>
    </aside>
  );
}

function SettingColorRow({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="note-settings-section">
      <span className="note-settings-label">{label}</span>
      <div className="note-color-row">
        {COLOR_PRESETS.map((color) => (
          <button
            className={`note-color-swatch${value === color ? ' active' : ''}`}
            type="button"
            key={color}
            style={{ backgroundColor: resolveCssColor(color) }}
            aria-label={color === 'default' ? 'По умолчанию' : color}
            onClick={() => onChange(color)}
          />
        ))}
        <input type="color" value={value === 'default' ? '#f8fafc' : value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
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
  return (
    <div className="note-editor-statusbar">
      <span>Слов: {text ? text.split(/\s+/).length : 0}</span>
      <span>Символов: {text.length}</span>
      <span>Блоков: {blocks.length}</span>
      <span>Последнее сохранение: {lastSavedLabel}</span>
    </div>
  );
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
    drawingSheet: 'Лист для рисования',
    callout: 'Подсказка',
  };
  return labels[type] ?? type;
}

function supportsTextColor(type: string) {
  return ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'quote', 'callout'].includes(type);
}

function supportsBackgroundColor(type: string) {
  return ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'quote', 'callout', 'image'].includes(type);
}

function resolveCssColor(value: unknown) {
  if (!value || value === 'default') {
    return undefined;
  }
  return String(value);
}
