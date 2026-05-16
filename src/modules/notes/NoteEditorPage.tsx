import {
  ArrowLeft,
  BookOpen,
  Brush,
  CheckSquare,
  Code2,
  Copy,
  FileText,
  Grid3X3,
  Image as ImageIcon,
  ListTodo,
  MessageSquareQuote,
  Minus,
  PanelRight,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Tags,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { useCallback, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
  type Block,
  type BlockNoteEditor,
  type PartialBlock,
} from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import { createReactBlockSpec, getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import { Tldraw, TldrawImage, type TLEditorSnapshot } from 'tldraw';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import 'tldraw/tldraw.css';
import { createId } from '../../shared/utils/idGenerator';
import { editorContentToPlainText, getNoteEditorContent, NOTE_SCHEMA_VERSION } from './noteUtils';
import type { Note, NoteProperty, NotePropertyType } from './types';

interface NoteEditorPageProps {
  note?: Note | null;
  onCancel: () => void;
  onSave: (note: Note) => void;
}

type NoteMode = 'read' | 'edit' | 'markdown';
type AnyEditor = BlockNoteEditor<any, any, any>;
type AnyBlock = Block<any, any, any>;
type AnyPartialBlock = PartialBlock<any, any, any>;

const EMPTY_DOCUMENT: AnyPartialBlock[] = [{ type: 'paragraph', content: '' }];
const COLOR_PRESETS = ['default', '#f8fafc', '#4db6a8', '#7aa2ff', '#f0c36a', '#ef7d78', '#b884f4'];
const DRAWING_ASPECT_RATIOS = ['1:1', '4:3', '16:9', 'A4'] as const;

const DrawingSheetBlock = createReactBlockSpec(
  {
    type: 'drawingSheet',
    propSchema: {
      snapshot: { default: '' },
      aspectRatio: { default: '16:9', values: ['1:1', '4:3', '16:9', 'A4'] },
      grid: { default: true },
      penColor: { default: '#4db6a8' },
      lineWidth: { default: 3, values: [1, 2, 3, 4, 6, 8] },
    },
    content: 'none',
  },
  {
    render: DrawingBlock,
    toExternalHTML: DrawingBlockPreview,
  },
);

const CalloutBlock = createReactBlockSpec(
  {
    type: 'callout',
    propSchema: {
      kind: { default: 'info', values: ['info', 'warning', 'success', 'idea', 'danger'] },
      textColor: { default: 'default' },
      backgroundColor: { default: 'default' },
      accentColor: { default: '#b884f4' },
    },
    content: 'inline',
  },
  {
    render: (props) => (
      <div
        className={`note-callout-block note-callout-${props.block.props.kind}`}
        style={{
          color: resolveCssColor(props.block.props.textColor),
          backgroundColor: resolveCssColor(props.block.props.backgroundColor),
          borderLeftColor: props.block.props.accentColor,
        }}
      >
        <Sparkles size={18} />
        <div ref={props.contentRef} className="note-callout-content" />
      </div>
    ),
    toExternalHTML: (props) => (
      <aside
        className={`note-callout-block note-callout-${props.block.props.kind}`}
        style={{
          color: resolveCssColor(props.block.props.textColor),
          backgroundColor: resolveCssColor(props.block.props.backgroundColor),
          borderLeftColor: props.block.props.accentColor,
        }}
      >
        <div ref={props.contentRef} />
      </aside>
    ),
  },
);

const noteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    drawingSheet: DrawingSheetBlock(),
    callout: CalloutBlock(),
  },
});

export function NoteEditorPage({ note, onCancel, onSave }: NoteEditorPageProps) {
  const initialContent = useMemo(() => sanitizeInitialContent(getNoteEditorContent(note)), [note?.id]);
  const [mode, setMode] = useState<NoteMode>('edit');
  const [title, setTitle] = useState(note?.title ?? '');
  const [category, setCategory] = useState(note?.category ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [properties, setProperties] = useState<NoteProperty[]>(note?.properties ?? []);
  const [selectedBlock, setSelectedBlock] = useState<AnyBlock | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedLabel, setLastSavedLabel] = useState(note?.updatedAt ? 'загружено' : 'новая заметка');
  const [markdownText, setMarkdownText] = useState('');

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

  const refreshSelectedBlock = useCallback(() => {
    const block = getCurrentBlock(editor);
    setSelectedBlock(block);
  }, [editor]);

  function handleEditorChange() {
    setDirty(true);
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
          category={category}
          tags={tags}
          tagInput={tagInput}
          properties={properties}
          onCategoryChange={(value) => {
            setCategory(value);
            setDirty(true);
          }}
          onTagInputChange={setTagInput}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onAddProperty={(type) => {
            setProperties((current) => [...current, createEmptyProperty(type)]);
            setDirty(true);
          }}
          onChangeProperty={(property) => {
            setProperties((current) => current.map((item) => (item.id === property.id ? property : item)));
            setDirty(true);
          }}
          onRemoveProperty={(id) => {
            setProperties((current) => current.filter((item) => item.id !== id));
            setDirty(true);
          }}
        />
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
              <EditorStatusBar editor={editor} lastSavedLabel={lastSavedLabel} />
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

function NoteMetadata({
  category,
  tags,
  tagInput,
  properties,
  onCategoryChange,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onAddProperty,
  onChangeProperty,
  onRemoveProperty,
}: {
  category: string;
  tags: string[];
  tagInput: string;
  properties: NoteProperty[];
  onCategoryChange: (value: string) => void;
  onTagInputChange: (value: string) => void;
  onAddTag: (value?: string) => void;
  onRemoveTag: (value: string) => void;
  onAddProperty: (type: NotePropertyType) => void;
  onChangeProperty: (property: NoteProperty) => void;
  onRemoveProperty: (id: string) => void;
}) {
  const [propertyMenuOpen, setPropertyMenuOpen] = useState(false);

  return (
    <div className="note-metadata">
      <label className="note-chip-input">
        <span>Категория</span>
        <input value={category} placeholder="Категория" onChange={(event) => onCategoryChange(event.target.value)} />
      </label>
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
      <div className="note-property-menu-wrap">
        <button className="button ghost" type="button" onClick={() => setPropertyMenuOpen((current) => !current)}>
          <Plus size={18} />
          Добавить поле
        </button>
        {propertyMenuOpen ? (
          <div className="note-property-menu">
            {(['text', 'number', 'date', 'select', 'multiSelect', 'checkbox', 'url'] as NotePropertyType[]).map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => {
                  onAddProperty(type);
                  setPropertyMenuOpen(false);
                }}
              >
                {propertyTypeLabel(type)}
              </button>
            ))}
          </div>
        ) : null}
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
      onChange={(event) => onChange({ ...property, value: property.type === 'number' ? Number(event.target.value) : event.target.value })}
    />
  );
}

function QuickBlockToolbar({ onAddBlock }: { onAddBlock: (type: string) => void }) {
  const items = [
    ['paragraph', <Type size={17} />, 'Text'],
    ['checkListItem', <CheckSquare size={17} />, 'Checklist'],
    ['divider', <Minus size={17} />, 'Разделитель'],
    ['drawingSheet', <Brush size={17} />, 'Drawing sheet'],
    ['table', <Grid3X3 size={17} />, 'Table'],
    ['image', <ImageIcon size={17} />, 'Image'],
    ['codeBlock', <Code2 size={17} />, 'Code'],
    ['quote', <MessageSquareQuote size={17} />, 'Quote'],
    ['callout', <Sparkles size={17} />, 'Callout'],
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
          [
            ...getDefaultReactSlashMenuItems(editor as any),
            {
              title: 'Drawing sheet',
              subtext: 'Пустой лист для рисунка или схемы',
              onItemClick: () =>
                insertOrUpdateBlockForSlashMenu(editor, {
                  type: 'drawingSheet',
                  props: {
                    snapshot: '',
                    aspectRatio: '16:9',
                    grid: true,
                    penColor: '#4db6a8',
                    lineWidth: 3,
                  },
                } as any),
              aliases: ['drawing', 'draw', 'canvas', 'лист', 'рисунок'],
              group: 'Media',
              icon: <Brush size={18} />,
            },
            {
              title: 'Callout',
              subtext: 'Выделенная подсказка или идея',
              onItemClick: () =>
                insertOrUpdateBlockForSlashMenu(editor, {
                  type: 'callout',
                  content: '',
                  props: {
                    kind: 'info',
                    accentColor: '#b884f4',
                  },
                } as any),
              aliases: ['callout', 'note', 'idea', 'подсказка'],
              group: 'Basic blocks',
              icon: <Sparkles size={18} />,
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
    const cloned = JSON.parse(JSON.stringify(currentBlock));
    delete cloned.id;

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

      {block.type === 'drawingSheet' ? (
        <>
          <SettingChoiceRow
            label="Соотношение сторон"
            value={String((block.props as any).aspectRatio ?? '16:9')}
            options={[...DRAWING_ASPECT_RATIOS]}
            onChange={(value) => updateBlock({ aspectRatio: value })}
          />
          <SettingColorRow label="Цвет ручки" value={String((block.props as any).penColor ?? '#4db6a8')} onChange={(value) => updateBlock({ penColor: value })} />
          <SettingChoiceRow
            label="Толщина линии"
            value={String((block.props as any).lineWidth ?? 3)}
            options={['1', '2', '3', '4', '6', '8']}
            onChange={(value) => updateBlock({ lineWidth: Number(value) })}
          />
          <label className="note-settings-toggle">
            <input
              type="checkbox"
              checked={Boolean((block.props as any).grid)}
              onChange={(event) => updateBlock({ grid: event.target.checked })}
            />
            Сетка
          </label>
          <button className="button danger ghost" type="button" onClick={() => updateBlock({ snapshot: '' })}>
            Очистить лист
          </button>
        </>
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

      {block.type === 'callout' ? (
        <>
          <SettingChoiceRow
            label="Тип подсказки"
            value={String((block.props as any).kind ?? 'info')}
            options={['info', 'warning', 'success', 'idea', 'danger']}
            onChange={(value) => updateBlock({ kind: value })}
          />
          <SettingColorRow label="Акцент" value={String((block.props as any).accentColor ?? '#b884f4')} onChange={(value) => updateBlock({ accentColor: value })} />
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

function EditorStatusBar({ editor, lastSavedLabel }: { editor: AnyEditor; lastSavedLabel: string }) {
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

function DrawingBlock(props: any) {
  const snapshot = parseSnapshot(props.block.props.snapshot);
  const isEditable = props.editor.isEditable;

  if (!isEditable) {
    return (
      <div className={`note-drawing-block ratio-${ratioClass(props.block.props.aspectRatio)}${props.block.props.grid ? ' has-grid' : ''}`}>
        {snapshot ? <TldrawImage snapshot={snapshot as any} darkMode /> : <div className="note-drawing-empty">Пустой лист</div>}
      </div>
    );
  }

  return (
    <div className={`note-drawing-block ratio-${ratioClass(props.block.props.aspectRatio)}${props.block.props.grid ? ' has-grid' : ''}`}>
      <Tldraw
        snapshot={snapshot as any}
        onMount={(tlEditor) => {
          const anyEditor = tlEditor as any;
          anyEditor.setCurrentTool?.('draw');
          anyEditor.setStyleForNextShapes?.('color', props.block.props.penColor);
          anyEditor.setStyleForNextShapes?.('dash', 'draw');
          let timer: number | undefined;
          const saveSnapshot = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
              const nextSnapshot = JSON.stringify(anyEditor.getSnapshot());
              props.editor.updateBlock(props.block, {
                props: {
                  ...props.block.props,
                  snapshot: nextSnapshot,
                },
              });
            }, 500);
          };
          const unsubscribe = anyEditor.store?.listen?.(saveSnapshot, { source: 'user', scope: 'document' });
          return () => {
            window.clearTimeout(timer);
            unsubscribe?.();
          };
        }}
      />
    </div>
  );
}

function DrawingBlockPreview(props: any) {
  const snapshot = parseSnapshot(props.block.props.snapshot);
  return (
    <div className={`note-drawing-block ratio-${ratioClass(props.block.props.aspectRatio)}${props.block.props.grid ? ' has-grid' : ''}`}>
      {snapshot ? <TldrawImage snapshot={snapshot as any} darkMode /> : <div className="note-drawing-empty">Пустой лист</div>}
    </div>
  );
}

function sanitizeInitialContent(content: unknown): AnyPartialBlock[] {
  if (!Array.isArray(content) || content.length === 0) {
    return EMPTY_DOCUMENT;
  }
  return content as AnyPartialBlock[];
}

function createEmptyBlock(type: string): AnyPartialBlock {
  if (type === 'drawingSheet') {
    return { type: 'drawingSheet', props: { snapshot: '', aspectRatio: '16:9', grid: true, penColor: '#4db6a8', lineWidth: 3 } } as any;
  }
  if (type === 'callout') {
    return { type: 'callout', content: '', props: { kind: 'info', accentColor: '#b884f4' } } as any;
  }
  if (type === 'table') {
    return {
      type: 'table',
      content: {
        type: 'tableContent',
        rows: [
          { cells: ['', ''] },
          { cells: ['', ''] },
        ],
      },
    } as any;
  }
  if (type === 'image') {
    return { type: 'image' } as any;
  }
  return { type, content: '' } as any;
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

function uploadFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось загрузить файл'));
    reader.readAsDataURL(file);
  });
}

function createEmptyProperty(type: NotePropertyType): NoteProperty {
  return {
    id: createId('note_property'),
    name: propertyTypeLabel(type),
    type,
    value: type === 'checkbox' ? false : '',
  };
}

function propertyTypeLabel(type: NotePropertyType) {
  const labels: Record<NotePropertyType, string> = {
    text: 'Текст',
    number: 'Число',
    date: 'Дата',
    select: 'Выбор',
    multiSelect: 'Мультивыбор',
    checkbox: 'Чекбокс',
    url: 'Ссылка',
  };
  return labels[type];
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

function parseSnapshot(value: unknown): TLEditorSnapshot | null {
  if (!value || typeof value !== 'string') {
    return null;
  }
  try {
    return JSON.parse(value) as TLEditorSnapshot;
  } catch {
    return null;
  }
}

function ratioClass(value: unknown) {
  return String(value ?? '16:9').replace(':', '-').toLowerCase();
}
