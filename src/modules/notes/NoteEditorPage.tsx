import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  BookOpen,
  CheckSquare,
  Code2,
  Edit3,
  FilePlus2,
  GripVertical,
  Highlighter,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  MoreHorizontal,
  Palette,
  Plus,
  Quote,
  Redo2,
  Save,
  Sparkles,
  Strikethrough,
  Table2,
  Trash2,
  Type,
  Underline,
  Undo2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { BackButton, EditButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate } from '../../shared/utils/dateUtils';
import { joinCsv, splitCsv } from '../../shared/utils/formatters';
import { createId } from '../../shared/utils/idGenerator';
import { escapeHtml, markdownToHtml, noteEditorHtml, notePlainText, noteReaderHtml, stripHtml } from './noteUtils';
import type { Note } from './types';

interface NoteEditorPageProps {
  note?: Note | null;
  onCancel: () => void;
  onSave: (note: Note) => void;
}

type NoteMode = 'read' | 'rich' | 'markdown';
type BlockType = 'text' | 'checklist' | 'divider' | 'drawing' | 'table' | 'image' | 'code' | 'quote' | 'callout';
type ToolbarTab = 'text' | 'checklist' | 'divider' | 'drawing' | 'table' | 'image' | 'code' | 'quote' | 'callout' | 'more';
type MenuState = { kind: 'bottom' } | { kind: 'after' | 'replace'; id: string };

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface EditorBlockData {
  id: string;
  type: BlockType;
  content: string;
  items?: ChecklistItem[];
  tableRows?: string[][];
  meta?: Record<string, string | boolean>;
  settings: BlockSettings;
}

interface BlockSettings {
  textColor: string;
  backgroundColor: string;
  width: 'default' | 'wide' | 'full';
  padding: 's' | 'm' | 'l' | 'xl';
  radius: 'none' | 's' | 'm' | 'l' | 'xl';
  shadow: boolean;
  border: boolean;
  pinned: boolean;
  checkboxStyle: 'circle' | 'square';
  checkedColor: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  lineThickness: number;
  lineColor: string;
  sheetSize: '1:1' | '4:3' | '16:9' | 'A4' | 'custom';
  sheetBackground: string;
  grid: boolean;
  gridSize: number;
  penColor: string;
  lineWidth: number;
  headerRow: boolean;
  stripedRows: boolean;
  borderColor: string;
  cellBackground: string;
  cellPadding: 's' | 'm' | 'l';
  imageFit: 'contain' | 'cover';
  imageAlignment: 'left' | 'center' | 'right';
  caption: boolean;
  language: string;
  codeTheme: 'dark' | 'darker' | 'contrast';
  lineNumbers: boolean;
  wrapLines: boolean;
  quoteStyle: 'line' | 'card' | 'minimal';
  accentColor: string;
  showAuthor: boolean;
  calloutType: 'info' | 'warning' | 'success' | 'idea' | 'danger';
}

const defaultBlockSettings: BlockSettings = {
  textColor: '#eef1f4',
  backgroundColor: 'transparent',
  width: 'default',
  padding: 'm',
  radius: 'm',
  shadow: false,
  border: true,
  pinned: false,
  checkboxStyle: 'circle',
  checkedColor: '#5cc59d',
  lineStyle: 'solid',
  lineThickness: 1,
  lineColor: '#3aa997',
  sheetSize: '16:9',
  sheetBackground: '#151922',
  grid: true,
  gridSize: 18,
  penColor: '#3aa997',
  lineWidth: 3,
  headerRow: false,
  stripedRows: false,
  borderColor: '#2a3340',
  cellBackground: 'transparent',
  cellPadding: 'm',
  imageFit: 'contain',
  imageAlignment: 'center',
  caption: false,
  language: 'plain text',
  codeTheme: 'dark',
  lineNumbers: false,
  wrapLines: true,
  quoteStyle: 'line',
  accentColor: '#b17aff',
  showAuthor: false,
  calloutType: 'info',
};

const toolbarTabs: Array<{ id: ToolbarTab; label: string; icon: ReactNode; inserts?: BlockType }> = [
  { id: 'text', label: 'Text', icon: <Type size={16} aria-hidden="true" />, inserts: 'text' },
  { id: 'checklist', label: 'Checklist', icon: <CheckSquare size={16} aria-hidden="true" />, inserts: 'checklist' },
  { id: 'divider', label: 'Divider', icon: <Minus size={16} aria-hidden="true" />, inserts: 'divider' },
  { id: 'drawing', label: 'Drawing sheet', icon: <FilePlus2 size={16} aria-hidden="true" />, inserts: 'drawing' },
  { id: 'table', label: 'Table', icon: <Table2 size={16} aria-hidden="true" />, inserts: 'table' },
  { id: 'image', label: 'Image', icon: <Image size={16} aria-hidden="true" />, inserts: 'image' },
  { id: 'code', label: 'Code', icon: <Code2 size={16} aria-hidden="true" />, inserts: 'code' },
  { id: 'quote', label: 'Quote', icon: <Quote size={16} aria-hidden="true" />, inserts: 'quote' },
  { id: 'callout', label: 'Callout', icon: <Sparkles size={16} aria-hidden="true" />, inserts: 'callout' },
  { id: 'more', label: 'More', icon: <MoreHorizontal size={16} aria-hidden="true" /> },
];

const blockTypeOptions: Array<{ type: BlockType; label: string; icon: ReactNode }> = [
  { type: 'text', label: 'Text', icon: <Type size={15} aria-hidden="true" /> },
  { type: 'checklist', label: 'Checklist', icon: <CheckSquare size={15} aria-hidden="true" /> },
  { type: 'divider', label: 'Divider', icon: <Minus size={15} aria-hidden="true" /> },
  { type: 'drawing', label: 'Drawing sheet', icon: <FilePlus2 size={15} aria-hidden="true" /> },
  { type: 'table', label: 'Table', icon: <Table2 size={15} aria-hidden="true" /> },
  { type: 'image', label: 'Image', icon: <Image size={15} aria-hidden="true" /> },
  { type: 'code', label: 'Code', icon: <Code2 size={15} aria-hidden="true" /> },
  { type: 'quote', label: 'Quote', icon: <Quote size={15} aria-hidden="true" /> },
  { type: 'callout', label: 'Callout', icon: <Sparkles size={15} aria-hidden="true" /> },
];

const propertyOptions = ['Статус', 'Приоритет', 'Дата', 'Предмет', 'Источник', 'Ссылка', 'Чекбокс', 'Текстовое поле'];

export function NoteEditorPage({ note, onCancel, onSave }: NoteEditorPageProps) {
  const [mode, setMode] = useState<NoteMode>(note ? 'read' : 'rich');
  const [title, setTitle] = useState(note?.title ?? '');
  const [category, setCategory] = useState(note?.category ?? '');
  const [tags, setTags] = useState(joinCsv(note?.tags ?? []));
  const [extraFields, setExtraFields] = useState<string[]>([]);
  const [fieldMenuOpen, setFieldMenuOpen] = useState(false);
  const [blocks, setBlocks] = useState<EditorBlockData[]>(() => initialBlocks(note));
  const [markdownContent, setMarkdownContent] = useState(note?.contentFormat === 'markdown' ? note.content : note ? notePlainText(note) : '');
  const [activeBlockId, setActiveBlockId] = useState('');
  const [toolbarTab, setToolbarTab] = useState<ToolbarTab>('text');
  const [fontSizeValue, setFontSizeValue] = useState('16');
  const [blockMenu, setBlockMenu] = useState<MenuState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeBlock = blocks.find((block) => block.id === activeBlockId);
  const editorStats = useMemo(() => getEditorStats(blocks), [blocks]);
  const { t } = useI18n();
  const selectionRef = useRef<Range | null>(null);

  useEffect(() => {
    if (activeBlockId && !blocks.some((block) => block.id === activeBlockId)) {
      setActiveBlockId(blocks[0]?.id ?? '');
    }
  }, [activeBlockId, blocks]);

  function changeMode(nextMode: NoteMode) {
    if (mode === 'rich' && nextMode === 'markdown') {
      setMarkdownContent(stripHtml(blocksToHtml(blocks)));
    }
    if (mode === 'markdown' && nextMode === 'rich') {
      setBlocks(markdownContent.trim() ? [createBlock('text', markdownToHtml(markdownContent))] : []);
      setActiveBlockId('');
    }
    setMode(nextMode);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    saveNote();
  }

  function saveNote() {
    const timestamp = new Date().toISOString();
    const isMarkdown = mode === 'markdown';
    onSave({
      id: note?.id ?? createId('note'),
      title: title.trim(),
      content: isMarkdown ? markdownContent : blocksToHtml(blocks),
      contentFormat: isMarkdown ? 'markdown' : 'html',
      category: category.trim(),
      tags: splitCsv(tags),
      pinned: note?.pinned ?? false,
      pinnedAt: note?.pinnedAt ?? null,
      createdAt: note?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  function updateBlock(id: string, patch: Partial<EditorBlockData>) {
    setBlocks((current) => current.map((block) => (block.id === id ? { ...block, ...patch } : block)));
  }

  function updateBlockSettings(id: string, patch: Partial<BlockSettings>) {
    setBlocks((current) => current.map((block) => (block.id === id ? { ...block, settings: { ...block.settings, ...patch } } : block)));
  }

  function addBlock(type: BlockType, afterId = activeBlockId) {
    const nextBlock = createBlock(type);
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === afterId);
      if (index < 0) {
        return [...current, nextBlock];
      }
      return [...current.slice(0, index + 1), nextBlock, ...current.slice(index + 1)];
    });
    setActiveBlockId(nextBlock.id);
    setBlockMenu(null);
    setSettingsOpen(true);
  }

  function replaceBlock(id: string, type: BlockType) {
    const nextBlock = createBlock(type);
    setBlocks((current) => current.map((block) => (block.id === id ? { ...nextBlock, id, settings: { ...block.settings } } : block)));
    setActiveBlockId(id);
    setBlockMenu(null);
    setSettingsOpen(true);
  }

  function changeBlockType(id: string, type: BlockType) {
    setBlocks((current) => current.map((block) => {
      if (block.id !== id || block.type === type) {
        return block;
      }
      const text = blockToPlainText(block);
      const nextBlock = createBlock(type);
      return {
        ...nextBlock,
        id,
        content: ['text', 'code', 'quote', 'callout'].includes(type) ? (type === 'text' ? escapeHtml(text) : text) : nextBlock.content,
        items: type === 'checklist' ? [{ id: createId('check'), text, checked: false }] : nextBlock.items,
        settings: { ...nextBlock.settings, ...block.settings },
      };
    }));
    setActiveBlockId(id);
    setSettingsOpen(true);
  }

  function deleteBlock(id: string) {
    setBlocks((current) => current.filter((block) => block.id !== id));
    setActiveBlockId((current) => (current === id ? '' : current));
    setSettingsOpen(false);
  }

  function moveBlock(id: string, targetId: string) {
    if (id === targetId) {
      return;
    }
    setBlocks((current) => {
      const fromIndex = current.findIndex((block) => block.id === id);
      const toIndex = current.findIndex((block) => block.id === targetId);
      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }
      const next = [...current];
      const [movedBlock] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedBlock);
      return next;
    });
  }

  function rememberSelection() {
    const selection = window.getSelection();
    const editorRoot = document.querySelector('.block-editor-shell');
    if (!selection || selection.rangeCount === 0 || !editorRoot || !selection.anchorNode || !editorRoot.contains(selection.anchorNode)) {
      return;
    }
    selectionRef.current = selection.getRangeAt(0).cloneRange();
  }

  function restoreSelection() {
    const selection = window.getSelection();
    if (!selection || !selectionRef.current) {
      return;
    }
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  }

  function applyCommand(command: string, value?: string) {
    restoreSelection();
    document.execCommand(command, false, value);
    rememberSelection();
  }

  function createLink() {
    const url = window.prompt(t('Link URL'));
    if (url?.trim()) {
      applyCommand('createLink', url.trim());
    }
  }

  function applyFontSize(value: string) {
    const nextSize = Number.parseInt(value, 10);
    if (!Number.isFinite(nextSize) || nextSize < 8 || nextSize > 96) {
      return;
    }
    restoreSelection();
    document.execCommand('fontSize', false, '4');
    document.querySelectorAll('.block-editor-shell font[size="4"]').forEach((font) => {
      const span = document.createElement('span');
      span.style.fontSize = `${nextSize}px`;
      span.innerHTML = font.innerHTML;
      font.replaceWith(span);
    });
    rememberSelection();
  }

  function handleMenuAdd(type: BlockType) {
    if (!blockMenu || blockMenu.kind === 'bottom') {
      addBlock(type, blocks[blocks.length - 1]?.id);
      return;
    }
    if (blockMenu.kind === 'replace') {
      replaceBlock(blockMenu.id, type);
      return;
    }
    addBlock(type, blockMenu.id);
  }

  if (mode === 'read') {
    const readerNote: Note = {
      id: note?.id ?? 'draft',
      title,
      content: blocksToHtml(blocks),
      contentFormat: 'html',
      category,
      tags: splitCsv(tags),
      pinned: note?.pinned ?? false,
      pinnedAt: note?.pinnedAt ?? null,
      createdAt: note?.createdAt ?? new Date().toISOString(),
      updatedAt: note?.updatedAt ?? new Date().toISOString(),
    };
    return (
      <section className="note-reader-page">
        <NoteTopBar mode={mode} onCancel={onCancel} onModeChange={changeMode} onSaveClick={saveNote} />
        <article className="note-reader">
          <div className="note-reader-title">
            <span className="panel-kicker">{t('Reading mode')}</span>
            <h1>{title || t('Untitled note')}</h1>
            <div className="chip-row">
              {category ? <span className="chip">{category}</span> : null}
              {note?.updatedAt ? <span className="chip">{formatDate(note.updatedAt)}</span> : null}
              {splitCsv(tags).map((tag) => (
                <span className="chip" key={tag}>{tag}</span>
              ))}
            </div>
          </div>
          {blocks.length > 0 ? (
            <div className="note-reader-content" dangerouslySetInnerHTML={{ __html: noteReaderHtml(readerNote) }} />
          ) : (
            <div className="note-reader-empty">{t('This note is empty.')}</div>
          )}
        </article>
      </section>
    );
  }

  return (
    <section>
      <form className="note-editor-page modern-note-editor-page" onSubmit={submit}>
        <NoteTopBar mode={mode} onCancel={onCancel} onModeChange={changeMode} />
        <NoteMetadata
          category={category}
          extraFields={extraFields}
          fieldMenuOpen={fieldMenuOpen}
          tags={tags}
          title={title}
          onAddField={(field) => {
            setExtraFields((current) => (current.includes(field) ? current : [...current, field]));
            setFieldMenuOpen(false);
          }}
          onCategoryChange={setCategory}
          onFieldMenuChange={setFieldMenuOpen}
          onTagsChange={setTags}
          onTitleChange={setTitle}
        />
        {mode === 'rich' ? (
          <>
            <FormattingToolbar
              activeTab={toolbarTab}
              fontSizeValue={fontSizeValue}
              onAddBlock={(type) => addBlock(type)}
              onCommand={applyCommand}
              onCreateLink={createLink}
              onFontSizeChange={(value) => {
                setFontSizeValue(value);
                applyFontSize(value);
              }}
              onOpenMore={() => setBlockMenu({ kind: 'bottom' })}
              onTabChange={setToolbarTab}
            />
            <div className="note-workbench">
              <BlockEditor
                activeBlockId={activeBlockId}
                blocks={blocks}
                blockMenu={blockMenu}
                onAddBlock={handleMenuAdd}
                onBlockMenuChange={setBlockMenu}
                onMoveBlock={moveBlock}
                onRememberSelection={rememberSelection}
                onSelectBlock={(id) => {
                  setActiveBlockId(id);
                  setSettingsOpen(true);
                }}
                onUpdateBlock={updateBlock}
              />
              <BlockSettingsPanel
                block={activeBlock}
                isOpen={settingsOpen}
                onChangeBlockType={changeBlockType}
                onClose={() => setSettingsOpen(false)}
                onDeleteBlock={deleteBlock}
                onUpdateBlock={updateBlock}
                onUpdateSettings={updateBlockSettings}
              />
            </div>
            <EditorStatusBar stats={editorStats} />
          </>
        ) : (
          <textarea
            className="markdown-note-editor"
            value={markdownContent}
            onChange={(event) => setMarkdownContent(event.target.value)}
            placeholder="# Markdown"
          />
        )}
      </form>
    </section>
  );
}

function NoteTopBar({
  mode,
  onCancel,
  onModeChange,
  onSaveClick,
}: {
  mode: NoteMode;
  onCancel: () => void;
  onModeChange: (mode: NoteMode) => void;
  onSaveClick?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="note-editor-header modern-note-topbar">
      <BackButton label="Назад к заметкам" onClick={onCancel} />
      <div className="note-topbar-actions">
        <div className="note-mode-tabs">
          <button className={`button ${mode === 'read' ? 'primary' : 'ghost'}`} type="button" onClick={() => onModeChange('read')}>
            <BookOpen size={17} aria-hidden="true" />
            {t('Reading')}
          </button>
          <button className={`button ${mode === 'rich' ? 'primary' : 'ghost'}`} type="button" onClick={() => onModeChange('rich')}>
            <Edit3 size={17} aria-hidden="true" />
            {t('Visual editor')}
          </button>
          <button className={`button ${mode === 'markdown' ? 'primary' : 'ghost'}`} type="button" onClick={() => onModeChange('markdown')}>
            <Code2 size={17} aria-hidden="true" />
            Markdown
          </button>
          <button
            className="button primary"
            type={onSaveClick ? 'button' : 'submit'}
            onMouseDown={() => {
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
              }
            }}
            onClick={onSaveClick}
          >
            <Save size={17} aria-hidden="true" />
            {t('Save')}
          </button>
        </div>
        <span className="note-autosave-status">{t('Last save')}: {t('just now')} <span aria-hidden="true">✓</span></span>
      </div>
    </div>
  );
}

function NoteMetadata({
  category,
  extraFields,
  fieldMenuOpen,
  tags,
  title,
  onAddField,
  onCategoryChange,
  onFieldMenuChange,
  onTagsChange,
  onTitleChange,
}: {
  category: string;
  extraFields: string[];
  fieldMenuOpen: boolean;
  tags: string;
  title: string;
  onAddField: (field: string) => void;
  onCategoryChange: (value: string) => void;
  onFieldMenuChange: (value: boolean) => void;
  onTagsChange: (value: string) => void;
  onTitleChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const tagItems = splitCsv(tags);
  return (
    <div className="note-title-zone">
      <input className="note-title-input" required placeholder={t('Note title')} value={title} onChange={(event) => onTitleChange(event.target.value)} />
      <div className="note-property-row">
        <label className="note-property-chip note-property-input-chip">
          <span>{category || t('Category')}</span>
          <input value={category} onChange={(event) => onCategoryChange(event.target.value)} placeholder={t('Category')} />
        </label>
        {tagItems.map((tag) => (
          <span className="note-meta-badge" key={tag}>{tag}</span>
        ))}
        <label className="note-property-chip note-property-input-chip">
          <span>+</span>
          <input value={tags} onChange={(event) => onTagsChange(event.target.value)} placeholder={t('Add tag')} />
        </label>
        {extraFields.map((field) => (
          <span className="note-meta-badge muted" key={field}>{field}</span>
        ))}
        <div className="note-field-menu-wrap">
          <button className="button ghost" type="button" onClick={() => onFieldMenuChange(!fieldMenuOpen)}>
            <Plus size={16} aria-hidden="true" />
            {t('Add field')}
          </button>
          {fieldMenuOpen ? (
            <div className="note-field-menu">
              {propertyOptions.map((field) => (
                <button key={field} type="button" onClick={() => onAddField(field)}>{field}</button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FormattingToolbar({
  activeTab,
  fontSizeValue,
  onAddBlock,
  onCommand,
  onCreateLink,
  onFontSizeChange,
  onOpenMore,
  onTabChange,
}: {
  activeTab: ToolbarTab;
  fontSizeValue: string;
  onAddBlock: (type: BlockType) => void;
  onCommand: (command: string, value?: string) => void;
  onCreateLink: () => void;
  onFontSizeChange: (value: string) => void;
  onOpenMore: () => void;
  onTabChange: (tab: ToolbarTab) => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="note-editor-toolbar modern-note-toolbar"
      aria-label={t('Editor toolbar')}
      onMouseDown={(event) => {
        if ((event.target as HTMLElement).closest('button')) {
          event.preventDefault();
        }
      }}
    >
      <div className="note-toolbar-tabs modern-note-tool-tabs" role="tablist" aria-label={t('Add blocks')}>
        {toolbarTabs.map((tab) => (
          <button
            className={`note-toolbar-tab${activeTab === tab.id ? ' active' : ''}`}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => {
              onTabChange(tab.id);
              if (tab.id === 'more') {
                onOpenMore();
              } else if (tab.inserts) {
                onAddBlock(tab.inserts);
              }
            }}
          >
            {tab.icon}
            <span>{t(tab.label)}</span>
          </button>
        ))}
      </div>
      <div className="note-toolbar-row modern-note-format-row">
        <button className="note-format-select" type="button" onClick={() => onCommand('formatBlock', 'P')}>{t('Normal text')}</button>
        <button className="note-format-select" type="button" onClick={() => onCommand('formatBlock', 'H1')}>H1</button>
        <button className="note-format-select" type="button" onClick={() => onCommand('formatBlock', 'H2')}>H2</button>
        <button className="note-format-select" type="button" onClick={() => onCommand('formatBlock', 'H3')}>H3</button>
        <label className="note-inline-field">
          <Type size={15} aria-hidden="true" />
          <input
            aria-label={t('Font size')}
            inputMode="numeric"
            min="8"
            max="96"
            type="number"
            value={fontSizeValue}
            onChange={(event) => onFontSizeChange(event.target.value)}
          />
        </label>
        <button className="icon-button ghost" type="button" onClick={() => onCommand('bold')} aria-label={t('Bold')}><Bold size={16} /></button>
        <button className="icon-button ghost" type="button" onClick={() => onCommand('italic')} aria-label={t('Italic')}><Italic size={16} /></button>
        <button className="icon-button ghost" type="button" onClick={() => onCommand('underline')} aria-label={t('Underline')}><Underline size={16} /></button>
        <button className="icon-button ghost" type="button" onClick={() => onCommand('strikeThrough')} aria-label={t('Strike')}><Strikethrough size={16} /></button>
        <ColorButton icon={<Palette size={15} />} label="Text color" onChange={(value) => onCommand('foreColor', value)} />
        <ColorButton icon={<Highlighter size={15} />} label="Highlight color" onChange={(value) => onCommand('hiliteColor', value)} />
        <button className="icon-button ghost" type="button" onClick={() => onCommand('justifyLeft')} aria-label={t('Align left')}><AlignLeft size={16} /></button>
        <button className="icon-button ghost" type="button" onClick={() => onCommand('justifyCenter')} aria-label={t('Align center')}><AlignCenter size={16} /></button>
        <button className="icon-button ghost" type="button" onClick={() => onCommand('justifyRight')} aria-label={t('Align right')}><AlignRight size={16} /></button>
        <button className="icon-button ghost" type="button" onClick={() => onCommand('insertUnorderedList')} aria-label={t('Bullet list')}><List size={16} /></button>
        <button className="icon-button ghost" type="button" onClick={() => onCommand('insertOrderedList')} aria-label={t('Numbered list')}><ListOrdered size={16} /></button>
        <button className="icon-button ghost" type="button" onClick={() => onAddBlock('checklist')} aria-label={t('Checklist')}><CheckSquare size={16} /></button>
        <button className="icon-button ghost" type="button" onClick={onCreateLink} aria-label={t('Link')}><Link size={16} /></button>
        <button className="icon-button ghost" type="button" onClick={() => onCommand('formatBlock', 'PRE')} aria-label={t('Inline code')}><Code2 size={16} /></button>
        <button className="icon-button ghost" type="button" onClick={() => onCommand('undo')} aria-label={t('Undo')}><Undo2 size={16} /></button>
        <button className="icon-button ghost" type="button" onClick={() => onCommand('redo')} aria-label={t('Redo')}><Redo2 size={16} /></button>
      </div>
    </div>
  );
}

function ColorButton({ icon, label, onChange }: { icon: ReactNode; label: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  return (
    <label className="note-color-button" aria-label={t(label)}>
      {icon}
      <input type="color" defaultValue="#eef1f4" onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function BlockEditor({
  activeBlockId,
  blocks,
  blockMenu,
  onAddBlock,
  onBlockMenuChange,
  onMoveBlock,
  onRememberSelection,
  onSelectBlock,
  onUpdateBlock,
}: {
  activeBlockId: string;
  blocks: EditorBlockData[];
  blockMenu: MenuState | null;
  onAddBlock: (type: BlockType) => void;
  onBlockMenuChange: (state: MenuState | null) => void;
  onMoveBlock: (id: string, targetId: string) => void;
  onRememberSelection: () => void;
  onSelectBlock: (id: string) => void;
  onUpdateBlock: (id: string, patch: Partial<EditorBlockData>) => void;
}) {
  const { t } = useI18n();
  return (
    <main
      className="block-editor-shell"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === '/' && blocks.length === 0) {
          event.preventDefault();
          onBlockMenuChange({ kind: 'bottom' });
        }
      }}
      onKeyUp={onRememberSelection}
      onMouseUp={onRememberSelection}
    >
      {blocks.length === 0 ? (
        <div className="block-editor-empty-state">
          <strong>Начните писать заметку...</strong>
          <span>Нажмите / или +, чтобы добавить блок</span>
          <div className="note-add-block-wrap">
            <button className="note-add-block-main" type="button" onClick={() => onBlockMenuChange(blockMenu?.kind === 'bottom' ? null : { kind: 'bottom' })}>
              <Plus size={17} aria-hidden="true" />
              {t('Add block')}
            </button>
            {blockMenu?.kind === 'bottom' ? <BlockInsertMenu onAdd={onAddBlock} /> : null}
          </div>
        </div>
      ) : (
        <>
          <div className="block-editor-list">
            {blocks.map((block) => (
              <EditorBlock
                block={block}
                isActive={activeBlockId === block.id}
                isMenuOpen={blockMenu?.kind !== 'bottom' && blockMenu?.id === block.id}
                key={block.id}
                menuKind={blockMenu?.kind}
                onAddBlock={onAddBlock}
                onMenuChange={onBlockMenuChange}
                onMoveBlock={onMoveBlock}
                onSelect={onSelectBlock}
                onUpdate={onUpdateBlock}
              />
            ))}
          </div>
          <div className="note-add-block-wrap">
            <button className="note-add-block-main" type="button" onClick={() => onBlockMenuChange(blockMenu?.kind === 'bottom' ? null : { kind: 'bottom' })}>
              <Plus size={17} aria-hidden="true" />
              {t('Add block')}
            </button>
            {blockMenu?.kind === 'bottom' ? <BlockInsertMenu onAdd={onAddBlock} /> : null}
          </div>
        </>
      )}
    </main>
  );
}

function EditorBlock({
  block,
  isActive,
  isMenuOpen,
  menuKind,
  onAddBlock,
  onMenuChange,
  onMoveBlock,
  onSelect,
  onUpdate,
}: {
  block: EditorBlockData;
  isActive: boolean;
  isMenuOpen: boolean;
  menuKind?: MenuState['kind'];
  onAddBlock: (type: BlockType) => void;
  onMenuChange: (state: MenuState | null) => void;
  onMoveBlock: (id: string, targetId: string) => void;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<EditorBlockData>) => void;
}) {
  return (
    <article
      className={`editor-block editor-block-${block.type}${isActive ? ' active' : ''}`}
      data-width={block.settings.width}
      data-padding={block.settings.padding}
      data-radius={block.settings.radius}
      data-shadow={block.settings.shadow ? 'on' : 'off'}
      data-border={block.settings.border ? 'on' : 'off'}
      style={{
        color: block.settings.textColor,
        background: block.settings.backgroundColor === 'transparent' ? undefined : block.settings.backgroundColor,
      }}
      onClick={() => onSelect(block.id)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        const draggedId = event.dataTransfer.getData('text/plain');
        if (draggedId) {
          onMoveBlock(draggedId, block.id);
        }
      }}
    >
      <div className="editor-block-controls">
        <span
          className="block-drag-handle"
          draggable
          aria-label="Drag block"
          title="Перетаскивание блока"
          onDragStart={(event) => {
            event.dataTransfer.setData('text/plain', block.id);
            event.dataTransfer.effectAllowed = 'move';
          }}
        >
          <GripVertical size={16} aria-hidden="true" />
        </span>
        <button className="block-side-button" type="button" aria-label="Add block below" onClick={(event) => { event.stopPropagation(); onMenuChange(isMenuOpen ? null : { kind: 'after', id: block.id }); }}>
          <Plus size={16} />
        </button>
      </div>
      {isMenuOpen ? <BlockInsertMenu onAdd={onAddBlock} variant={menuKind} /> : null}
      <BlockContent
        block={block}
        onSlash={() => onMenuChange({ kind: 'replace', id: block.id })}
        onUpdate={onUpdate}
      />
    </article>
  );
}

function BlockContent({
  block,
  onSlash,
  onUpdate,
}: {
  block: EditorBlockData;
  onSlash: () => void;
  onUpdate: (id: string, patch: Partial<EditorBlockData>) => void;
}) {
  if (block.type === 'checklist') {
    const items = block.items ?? [];
    return (
      <div className={`block-checklist checkbox-${block.settings.checkboxStyle}`}>
        {items.map((item, index) => (
          <label className={item.checked ? 'checked' : ''} key={item.id} style={{ '--checked-color': block.settings.checkedColor } as CSSProperties}>
            <input
              checked={item.checked}
              type="checkbox"
              onChange={(event) => onUpdate(block.id, { items: items.map((current) => (current.id === item.id ? { ...current, checked: event.target.checked } : current)) })}
            />
            <span
              contentEditable
              data-placeholder="Новый пункт..."
              onBlur={(event) => onUpdate(block.id, { items: items.map((current) => (current.id === item.id ? { ...current, text: event.currentTarget.textContent ?? '' } : current)) })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const currentText = event.currentTarget.textContent ?? '';
                  const updatedItems = items.map((current) => (current.id === item.id ? { ...current, text: currentText } : current));
                  onUpdate(block.id, { items: [...updatedItems.slice(0, index + 1), { id: createId('check'), text: '', checked: false }, ...updatedItems.slice(index + 1)] });
                }
                if (event.key === 'Backspace' && !(event.currentTarget.textContent ?? '').trim() && items.length > 1) {
                  event.preventDefault();
                  onUpdate(block.id, { items: items.filter((current) => current.id !== item.id) });
                }
                if (event.key === '/' && !(event.currentTarget.textContent ?? '').trim()) {
                  event.preventDefault();
                  onSlash();
                }
              }}
              suppressContentEditableWarning
            >
              {item.text}
            </span>
          </label>
        ))}
        <button className="block-add-line" type="button" onClick={() => onUpdate(block.id, { items: [...items, { id: createId('check'), text: '', checked: false }] })}>
          <Plus size={15} aria-hidden="true" />
          Добавить пункт
        </button>
      </div>
    );
  }

  if (block.type === 'divider') {
    return (
      <hr
        className="block-divider"
        style={{
          borderTopColor: block.settings.lineColor,
          borderTopStyle: block.settings.lineStyle,
          borderTopWidth: block.settings.lineThickness,
        }}
      />
    );
  }

  if (block.type === 'drawing') {
    return (
      <div
        className={`block-drawing-sheet${block.settings.grid ? ' grid-on' : ''}`}
        data-size={block.settings.sheetSize}
        style={{
          '--sheet-bg': block.settings.sheetBackground,
          '--grid-size': `${block.settings.gridSize}px`,
        } as CSSProperties}
      />
    );
  }

  if (block.type === 'table') {
    const rows = block.tableRows?.length ? block.tableRows : emptyTableRows();
    return (
      <div className="block-table-wrap">
        <table
          className={`block-table${block.settings.stripedRows ? ' striped' : ''}`}
          style={{
            '--table-border': block.settings.borderColor,
            '--cell-bg': block.settings.cellBackground,
          } as CSSProperties}
        >
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${block.id}-${rowIndex}`}>
                {row.map((cell, cellIndex) => {
                  const Cell = block.settings.headerRow && rowIndex === 0 ? 'th' : 'td';
                  return (
                    <Cell
                      contentEditable
                      data-padding={block.settings.cellPadding}
                      key={`${block.id}-${rowIndex}-${cellIndex}`}
                      onBlur={(event) => {
                        const tableRows = rows.map((currentRow) => [...currentRow]);
                        tableRows[rowIndex][cellIndex] = event.currentTarget.textContent ?? '';
                        onUpdate(block.id, { tableRows });
                      }}
                      suppressContentEditableWarning
                    >
                      {cell}
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="block-table-actions">
          <button type="button" onClick={() => onUpdate(block.id, { tableRows: [...rows, new Array(rows[0]?.length || 2).fill('')] })}>+ строка</button>
          <button type="button" onClick={() => onUpdate(block.id, { tableRows: rows.length > 1 ? rows.slice(0, -1) : rows })}>- строка</button>
          <button type="button" onClick={() => onUpdate(block.id, { tableRows: rows.map((row) => [...row, '']) })}>+ колонка</button>
          <button type="button" onClick={() => onUpdate(block.id, { tableRows: rows[0]?.length > 1 ? rows.map((row) => row.slice(0, -1)) : rows })}>- колонка</button>
        </div>
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <figure className={`block-image-placeholder align-${block.settings.imageAlignment}`} data-fit={block.settings.imageFit}>
        {block.content ? <img alt={String(block.meta?.caption || 'Note image')} src={block.content} /> : <Image size={30} />}
        <label className="button ghost">
          <input
            accept="image/*"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              const reader = new FileReader();
              reader.onload = () => onUpdate(block.id, { content: String(reader.result ?? '') });
              reader.readAsDataURL(file);
            }}
          />
          {block.content ? 'Заменить изображение' : 'Загрузить изображение'}
        </label>
        {block.settings.caption ? (
          <figcaption
            contentEditable
            data-placeholder="Подпись..."
            onBlur={(event) => onUpdate(block.id, { meta: { ...block.meta, caption: event.currentTarget.textContent ?? '' } })}
            suppressContentEditableWarning
          >
            {String(block.meta?.caption ?? '')}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (block.type === 'code') {
    return (
      <pre className={`block-code code-${block.settings.codeTheme}${block.settings.wrapLines ? ' wrap' : ''}`}>
        {block.settings.lineNumbers ? <span className="code-line-number">1</span> : null}
        <code
          contentEditable
          data-placeholder="Введите код..."
          onBlur={(event) => onUpdate(block.id, { content: event.currentTarget.textContent ?? '' })}
          onKeyDown={(event) => {
            if (event.key === '/' && !(event.currentTarget.textContent ?? '').trim()) {
              event.preventDefault();
              onSlash();
            }
          }}
          suppressContentEditableWarning
        >
          {block.content}
        </code>
      </pre>
    );
  }

  if (block.type === 'quote') {
    return (
      <blockquote className={`block-quote quote-${block.settings.quoteStyle}`} style={{ '--quote-accent': block.settings.accentColor } as CSSProperties}>
        <span
          contentEditable
          data-placeholder="Введите цитату..."
          onBlur={(event) => onUpdate(block.id, { content: event.currentTarget.textContent ?? '' })}
          onKeyDown={(event) => {
            if (event.key === '/' && !(event.currentTarget.textContent ?? '').trim()) {
              event.preventDefault();
              onSlash();
            }
          }}
          suppressContentEditableWarning
        >
          {block.content}
        </span>
        {block.settings.showAuthor ? (
          <cite
            contentEditable
            data-placeholder="Автор..."
            onBlur={(event) => onUpdate(block.id, { meta: { ...block.meta, author: event.currentTarget.textContent ?? '' } })}
            suppressContentEditableWarning
          >
            {String(block.meta?.author ?? '')}
          </cite>
        ) : null}
      </blockquote>
    );
  }

  if (block.type === 'callout') {
    return (
      <div className={`block-callout callout-${block.settings.calloutType}`} style={{ '--callout-accent': block.settings.accentColor } as CSSProperties}>
        <Sparkles size={18} />
        <div>
          <strong
            contentEditable
            data-placeholder="Заголовок..."
            onBlur={(event) => onUpdate(block.id, { meta: { ...block.meta, title: event.currentTarget.textContent ?? '' } })}
            suppressContentEditableWarning
          >
            {String(block.meta?.title ?? '')}
          </strong>
          <span
            contentEditable
            data-placeholder="Введите текст..."
            onBlur={(event) => onUpdate(block.id, { content: event.currentTarget.textContent ?? '' })}
            onKeyDown={(event) => {
              if (event.key === '/' && !(event.currentTarget.textContent ?? '').trim()) {
                event.preventDefault();
                onSlash();
              }
            }}
            suppressContentEditableWarning
          >
            {block.content}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="block-text-content"
      contentEditable
      data-placeholder="Введите текст..."
      dangerouslySetInnerHTML={{ __html: block.content }}
      onBlur={(event) => onUpdate(block.id, { content: event.currentTarget.innerHTML })}
      onKeyDown={(event) => {
        if (event.key === '/' && !stripHtml(event.currentTarget.innerHTML)) {
          event.preventDefault();
          onSlash();
        }
      }}
      suppressContentEditableWarning
    />
  );
}

function BlockInsertMenu({ onAdd, variant }: { onAdd: (type: BlockType) => void; variant?: MenuState['kind'] }) {
  const { t } = useI18n();
  return (
    <div className="block-insert-menu" data-variant={variant ?? 'bottom'}>
      {blockTypeOptions.map((option) => (
        <button key={option.type} type="button" onClick={() => onAdd(option.type)}>
          <span>{option.icon}</span>
          <strong>{t(option.label)}</strong>
          <small>{t(blockDescription(option.type))}</small>
        </button>
      ))}
      <button type="button" onClick={() => window.alert('Расширенная библиотека блоков будет добавлена позже.')}>
        <span><MoreHorizontal size={16} /></span>
        <strong>{t('More blocks')}</strong>
        <small>{t('Open extended block library')}</small>
      </button>
    </div>
  );
}

function BlockSettingsPanel({
  block,
  isOpen,
  onChangeBlockType,
  onClose,
  onDeleteBlock,
  onUpdateBlock,
  onUpdateSettings,
}: {
  block?: EditorBlockData;
  isOpen: boolean;
  onChangeBlockType: (id: string, type: BlockType) => void;
  onClose: () => void;
  onDeleteBlock: (id: string) => void;
  onUpdateBlock: (id: string, patch: Partial<EditorBlockData>) => void;
  onUpdateSettings: (id: string, patch: Partial<BlockSettings>) => void;
}) {
  const { t } = useI18n();
  if (!block) {
    return (
      <aside className={`block-settings-panel empty${isOpen ? ' open' : ''}`}>
        <div className="block-settings-header">
          <h2>{t('Block settings')}</h2>
          <button className="icon-button ghost" type="button" onClick={onClose} aria-label={t('Close')}><X size={18} /></button>
        </div>
        <p>Выберите блок, чтобы настроить его внешний вид.</p>
      </aside>
    );
  }

  const rows = block.tableRows?.length || 2;
  const columns = block.tableRows?.[0]?.length || 2;

  return (
    <aside className={`block-settings-panel${isOpen ? ' open' : ''}`}>
      <div className="block-settings-header">
        <h2>{t('Block settings')}</h2>
        <button className="icon-button ghost" type="button" onClick={onClose} aria-label={t('Close')}><X size={18} /></button>
      </div>
      <div className="settings-group">
        <h3>{t('Block type')}</h3>
        <div className="block-type-grid">
          {blockTypeOptions.map((option) => (
            <button className={block.type === option.type ? 'active' : ''} key={option.type} type="button" onClick={() => onChangeBlockType(block.id, option.type)}>
              {option.icon}
              {t(option.label)}
            </button>
          ))}
        </div>
      </div>
      <TypeSpecificSettings block={block} columns={columns} rows={rows} onUpdateBlock={onUpdateBlock} onUpdateSettings={onUpdateSettings} />
      <div className="settings-group">
        <h3>{t('Appearance')}</h3>
        <ColorSetting label="Text color" value={safeColorValue(block.settings.textColor)} onChange={(value) => onUpdateSettings(block.id, { textColor: value })} />
        <ColorSetting label="Background color" value={safeColorValue(block.settings.backgroundColor)} onChange={(value) => onUpdateSettings(block.id, { backgroundColor: value })} />
        <SegmentedSetting label="Block width" value={block.settings.width} options={['default', 'wide', 'full']} onChange={(value) => onUpdateSettings(block.id, { width: value as BlockSettings['width'] })} />
        <SegmentedSetting label="Inner padding" value={block.settings.padding} options={['s', 'm', 'l', 'xl']} onChange={(value) => onUpdateSettings(block.id, { padding: value as BlockSettings['padding'] })} />
        <SegmentedSetting label="Radius" value={block.settings.radius} options={['none', 's', 'm', 'l', 'xl']} onChange={(value) => onUpdateSettings(block.id, { radius: value as BlockSettings['radius'] })} />
        <ToggleSetting label="Shadow" value={block.settings.shadow} onChange={(value) => onUpdateSettings(block.id, { shadow: value })} />
        <ToggleSetting label="Show border" value={block.settings.border} onChange={(value) => onUpdateSettings(block.id, { border: value })} />
        <ToggleSetting label="Pin block" value={block.settings.pinned} onChange={(value) => onUpdateSettings(block.id, { pinned: value })} />
      </div>
      <button className="button danger block-delete-button" type="button" onClick={() => onDeleteBlock(block.id)}>
        <Trash2 size={16} />
        {t('Delete block')}
      </button>
    </aside>
  );
}

function TypeSpecificSettings({
  block,
  columns,
  rows,
  onUpdateBlock,
  onUpdateSettings,
}: {
  block: EditorBlockData;
  columns: number;
  rows: number;
  onUpdateBlock: (id: string, patch: Partial<EditorBlockData>) => void;
  onUpdateSettings: (id: string, patch: Partial<BlockSettings>) => void;
}) {
  if (block.type === 'checklist') {
    return (
      <div className="settings-group">
        <h3>Checklist</h3>
        <SegmentedSetting label="Checkbox style" value={block.settings.checkboxStyle} options={['circle', 'square']} onChange={(value) => onUpdateSettings(block.id, { checkboxStyle: value as BlockSettings['checkboxStyle'] })} />
        <ColorSetting label="Checked color" value={safeColorValue(block.settings.checkedColor)} onChange={(value) => onUpdateSettings(block.id, { checkedColor: value })} />
      </div>
    );
  }
  if (block.type === 'divider') {
    return (
      <div className="settings-group">
        <h3>Divider</h3>
        <SegmentedSetting label="Line style" value={block.settings.lineStyle} options={['solid', 'dashed', 'dotted']} onChange={(value) => onUpdateSettings(block.id, { lineStyle: value as BlockSettings['lineStyle'] })} />
        <NumberSetting label="Line thickness" value={block.settings.lineThickness} min={1} max={8} onChange={(value) => onUpdateSettings(block.id, { lineThickness: value })} />
        <ColorSetting label="Line color" value={safeColorValue(block.settings.lineColor)} onChange={(value) => onUpdateSettings(block.id, { lineColor: value })} />
      </div>
    );
  }
  if (block.type === 'drawing') {
    return (
      <div className="settings-group">
        <h3>Drawing sheet</h3>
        <SegmentedSetting label="Sheet size" value={block.settings.sheetSize} options={['1:1', '4:3', '16:9', 'A4']} onChange={(value) => onUpdateSettings(block.id, { sheetSize: value as BlockSettings['sheetSize'] })} />
        <ColorSetting label="Sheet background" value={safeColorValue(block.settings.sheetBackground)} onChange={(value) => onUpdateSettings(block.id, { sheetBackground: value })} />
        <ToggleSetting label="Grid" value={block.settings.grid} onChange={(value) => onUpdateSettings(block.id, { grid: value })} />
        <NumberSetting label="Grid size" value={block.settings.gridSize} min={8} max={48} onChange={(value) => onUpdateSettings(block.id, { gridSize: value })} />
        <ColorSetting label="Pen color" value={safeColorValue(block.settings.penColor)} onChange={(value) => onUpdateSettings(block.id, { penColor: value })} />
        <NumberSetting label="Line width" value={block.settings.lineWidth} min={1} max={16} onChange={(value) => onUpdateSettings(block.id, { lineWidth: value })} />
      </div>
    );
  }
  if (block.type === 'table') {
    return (
      <div className="settings-group">
        <h3>Table</h3>
        <ReadonlyStat label="Rows" value={rows} />
        <ReadonlyStat label="Columns" value={columns} />
        <ToggleSetting label="Header row" value={block.settings.headerRow} onChange={(value) => onUpdateSettings(block.id, { headerRow: value })} />
        <ToggleSetting label="Striped rows" value={block.settings.stripedRows} onChange={(value) => onUpdateSettings(block.id, { stripedRows: value })} />
        <ColorSetting label="Border color" value={safeColorValue(block.settings.borderColor)} onChange={(value) => onUpdateSettings(block.id, { borderColor: value })} />
        <ColorSetting label="Cell background" value={safeColorValue(block.settings.cellBackground)} onChange={(value) => onUpdateSettings(block.id, { cellBackground: value })} />
        <SegmentedSetting label="Cell padding" value={block.settings.cellPadding} options={['s', 'm', 'l']} onChange={(value) => onUpdateSettings(block.id, { cellPadding: value as BlockSettings['cellPadding'] })} />
      </div>
    );
  }
  if (block.type === 'image') {
    return (
      <div className="settings-group">
        <h3>Image</h3>
        <SegmentedSetting label="Image fit" value={block.settings.imageFit} options={['contain', 'cover']} onChange={(value) => onUpdateSettings(block.id, { imageFit: value as BlockSettings['imageFit'] })} />
        <SegmentedSetting label="Alignment" value={block.settings.imageAlignment} options={['left', 'center', 'right']} onChange={(value) => onUpdateSettings(block.id, { imageAlignment: value as BlockSettings['imageAlignment'] })} />
        <ToggleSetting label="Caption" value={block.settings.caption} onChange={(value) => onUpdateSettings(block.id, { caption: value })} />
      </div>
    );
  }
  if (block.type === 'code') {
    return (
      <div className="settings-group">
        <h3>Code</h3>
        <TextSetting label="Language" value={block.settings.language} onChange={(value) => onUpdateSettings(block.id, { language: value })} />
        <SegmentedSetting label="Theme" value={block.settings.codeTheme} options={['dark', 'darker', 'contrast']} onChange={(value) => onUpdateSettings(block.id, { codeTheme: value as BlockSettings['codeTheme'] })} />
        <ToggleSetting label="Line numbers" value={block.settings.lineNumbers} onChange={(value) => onUpdateSettings(block.id, { lineNumbers: value })} />
        <ToggleSetting label="Wrap lines" value={block.settings.wrapLines} onChange={(value) => onUpdateSettings(block.id, { wrapLines: value })} />
      </div>
    );
  }
  if (block.type === 'quote') {
    return (
      <div className="settings-group">
        <h3>Quote</h3>
        <SegmentedSetting label="Quote style" value={block.settings.quoteStyle} options={['line', 'card', 'minimal']} onChange={(value) => onUpdateSettings(block.id, { quoteStyle: value as BlockSettings['quoteStyle'] })} />
        <ColorSetting label="Accent color" value={safeColorValue(block.settings.accentColor)} onChange={(value) => onUpdateSettings(block.id, { accentColor: value })} />
        <ToggleSetting label="Show author" value={block.settings.showAuthor} onChange={(value) => onUpdateSettings(block.id, { showAuthor: value })} />
      </div>
    );
  }
  if (block.type === 'callout') {
    return (
      <div className="settings-group">
        <h3>Callout</h3>
        <SegmentedSetting label="Callout type" value={block.settings.calloutType} options={['info', 'warning', 'success', 'idea', 'danger']} onChange={(value) => onUpdateSettings(block.id, { calloutType: value as BlockSettings['calloutType'] })} />
        <ColorSetting label="Accent color" value={safeColorValue(block.settings.accentColor)} onChange={(value) => onUpdateSettings(block.id, { accentColor: value })} />
      </div>
    );
  }
  return (
    <div className="settings-group">
      <h3>Text</h3>
      <button className="button ghost" type="button" onClick={() => onUpdateBlock(block.id, { type: 'checklist', items: [{ id: createId('check'), text: stripHtml(block.content), checked: false }], content: '' })}>
        <CheckSquare size={16} />
        Convert to checklist
      </button>
    </div>
  );
}

function ColorSetting({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  return (
    <label className="block-setting-row">
      <span>{t(label)}</span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextSetting({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  return (
    <label className="block-setting-row stacked">
      <span>{t(label)}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberSetting({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  const { t } = useI18n();
  return (
    <label className="block-setting-row">
      <span>{t(label)}</span>
      <input min={min} max={max} type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function ReadonlyStat({ label, value }: { label: string; value: number }) {
  const { t } = useI18n();
  return (
    <div className="block-setting-row">
      <span>{t(label)}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SegmentedSetting({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="block-setting-row stacked">
      <span>{t(label)}</span>
      <div className="block-segmented-control">
        {options.map((option) => (
          <button className={value === option ? 'active' : ''} key={option} type="button" onClick={() => onChange(option)}>{option}</button>
        ))}
      </div>
    </div>
  );
}

function ToggleSetting({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  const { t } = useI18n();
  return (
    <label className={`block-setting-row block-toggle-row${value ? ' checked' : ''}`}>
      <span>{t(label)}</span>
      <input checked={value} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
      <span className="note-custom-check" aria-hidden="true" />
    </label>
  );
}

function EditorStatusBar({ stats }: { stats: { words: number; chars: number; blocks: number } }) {
  const { t } = useI18n();
  return (
    <div className="editor-status-bar">
      <span>{t('Words')}: {stats.words}</span>
      <span>{t('Characters')}: {stats.chars}</span>
      <span>{t('Blocks')}: {stats.blocks}</span>
      <span>{t('Last save')}: {t('just now')}</span>
      <strong>{t('Draft saved')} ✓</strong>
    </div>
  );
}

function blockToPlainText(block: EditorBlockData) {
  if (block.type === 'checklist') {
    return (block.items ?? []).map((item) => item.text).filter(Boolean).join('\n');
  }
  if (block.type === 'table') {
    return (block.tableRows ?? []).map((row) => row.join('\t')).join('\n');
  }
  if (block.type === 'text') {
    return stripHtml(block.content);
  }
  const metaText = [String(block.meta?.title ?? ''), String(block.meta?.author ?? ''), String(block.meta?.caption ?? '')].filter(Boolean).join(' ');
  return [block.content, metaText].filter(Boolean).join(' ').trim();
}

function initialBlocks(note?: Note | null): EditorBlockData[] {
  if (!note?.content) {
    return [];
  }
  const serializedBlocks = readSerializedBlocks(note.content);
  if (serializedBlocks.length > 0) {
    return serializedBlocks;
  }
  return [createBlock('text', noteEditorHtml(note))];
}

function readSerializedBlocks(content: string): EditorBlockData[] {
  const match = /<!--mymind-blocks:([\s\S]*?)-->/.exec(content);
  if (!match) {
    return [];
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as Array<Partial<EditorBlockData>>;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((block): block is Partial<EditorBlockData> & { id: string; type: BlockType } => Boolean(block.id && block.type && blockTypeOptions.some((option) => option.type === block.type)))
      .map((block) => ({
        id: block.id,
        type: block.type,
        content: typeof block.content === 'string' ? block.content : '',
        items: block.type === 'checklist' ? normalizeChecklistItems(block.items) : undefined,
        tableRows: block.type === 'table' ? normalizeTableRows(block.tableRows) : undefined,
        meta: block.meta && typeof block.meta === 'object' ? block.meta : block.type === 'callout' || block.type === 'quote' || block.type === 'image' ? {} : undefined,
        settings: { ...defaultBlockSettings, ...(block.settings ?? {}) },
      }));
  } catch {
    return [];
  }
}

function normalizeChecklistItems(items: EditorBlockData['items']) {
  if (!Array.isArray(items) || items.length === 0) {
    return [{ id: createId('check'), text: '', checked: false }];
  }
  return items.map((item) => ({
    id: item.id || createId('check'),
    text: item.text ?? '',
    checked: Boolean(item.checked),
  }));
}

function normalizeTableRows(rows: EditorBlockData['tableRows']) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return emptyTableRows();
  }
  const normalized = rows.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : ['', '']));
  const width = Math.max(1, ...normalized.map((row) => row.length));
  return normalized.map((row) => [...row, ...new Array(width - row.length).fill('')]);
}

function createBlock(type: BlockType, content = ''): EditorBlockData {
  return {
    id: createId('block'),
    type,
    content,
    items: type === 'checklist' ? [{ id: createId('check'), text: '', checked: false }] : undefined,
    tableRows: type === 'table' ? emptyTableRows() : undefined,
    meta: type === 'callout' || type === 'quote' || type === 'image' ? {} : undefined,
    settings: { ...defaultBlockSettings },
  };
}

function emptyTableRows(rows = 2, columns = 2) {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => ''));
}

function blocksToHtml(blocks: EditorBlockData[]) {
  const html = renderBlocksHtml(blocks);
  if (blocks.length === 0) {
    return html;
  }
  return `<!--mymind-blocks:${encodeURIComponent(JSON.stringify(blocks))}-->${html}`;
}

function renderBlocksHtml(blocks: EditorBlockData[]) {
  return blocks.map((block) => {
    const style = blockStyleToString(block.settings);
    if (block.type === 'text') {
      return `<section class="note-saved-block" style="${style}">${block.content || ''}</section>`;
    }
    if (block.type === 'checklist') {
      return `<section class="note-saved-block" style="${style}"><ul>${(block.items ?? []).map((item) => `<li data-checked="${item.checked}">${item.checked ? '✓' : '○'} ${escapeHtml(item.text)}</li>`).join('')}</ul></section>`;
    }
    if (block.type === 'divider') {
      return `<hr style="border:0;border-top:${block.settings.lineThickness}px ${block.settings.lineStyle} ${block.settings.lineColor};" />`;
    }
    if (block.type === 'table') {
      const rows = block.tableRows ?? emptyTableRows();
      return `<table><tbody>${rows.map((row, rowIndex) => `<tr>${row.map((cell) => block.settings.headerRow && rowIndex === 0 ? `<th>${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    if (block.type === 'drawing') {
      return `<figure class="note-drawing-block" style="${style}"></figure>`;
    }
    if (block.type === 'image') {
      return block.content ? `<figure style="${style}"><img src="${escapeHtml(block.content)}" alt="${escapeHtml(String(block.meta?.caption ?? ''))}" />${block.settings.caption ? `<figcaption>${escapeHtml(String(block.meta?.caption ?? ''))}</figcaption>` : ''}</figure>` : '';
    }
    if (block.type === 'code') {
      return `<pre style="${style}"><code>${escapeHtml(block.content)}</code></pre>`;
    }
    if (block.type === 'quote') {
      return `<blockquote style="${style}">${escapeHtml(block.content)}${block.settings.showAuthor ? `<cite>${escapeHtml(String(block.meta?.author ?? ''))}</cite>` : ''}</blockquote>`;
    }
    return `<aside style="${style}"><strong>${escapeHtml(String(block.meta?.title ?? ''))}</strong><p>${escapeHtml(block.content)}</p></aside>`;
  }).join('');
}

function blockStyleToString(settings: BlockSettings) {
  return [
    `color:${settings.textColor}`,
    settings.backgroundColor !== 'transparent' ? `background:${settings.backgroundColor}` : '',
    `border-radius:${{ none: 0, s: 6, m: 10, l: 14, xl: 20 }[settings.radius]}px`,
  ].filter(Boolean).join(';');
}

function getEditorStats(blocks: EditorBlockData[]) {
  const text = stripHtml(blocksToHtml(blocks));
  return {
    words: text ? text.split(/\s+/).filter(Boolean).length : 0,
    chars: text.length,
    blocks: blocks.length,
  };
}

function blockDescription(type: BlockType) {
  const descriptions: Record<BlockType, string> = {
    text: 'Обычный текстовый блок',
    checklist: 'Список задач внутри заметки',
    divider: 'Линия-разделитель',
    drawing: 'Пустой лист для схемы',
    table: 'Пустая таблица',
    image: 'Зона загрузки изображения',
    code: 'Блок кода',
    quote: 'Цитата или мысль',
    callout: 'Подсказка или важный блок',
  };
  return descriptions[type];
}

function safeColorValue(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#151922';
}
