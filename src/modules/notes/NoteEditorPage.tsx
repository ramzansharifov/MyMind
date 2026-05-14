import { Bold, BookOpen, Code2, Edit3, Italic, Minus, Palette, Type, Underline } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BackButton, EditButton, SaveButton } from '../../shared/components/ActionButtons';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { formatDate } from '../../shared/utils/dateUtils';
import { joinCsv, splitCsv } from '../../shared/utils/formatters';
import { createId } from '../../shared/utils/idGenerator';
import { markdownToHtml, noteEditorHtml, notePlainText, noteReaderHtml } from './noteUtils';
import type { Note } from './types';

interface NoteEditorPageProps {
  note?: Note | null;
  onCancel: () => void;
  onSave: (note: Note) => void;
}

type NoteMode = 'read' | 'rich' | 'markdown';

const quickColors = ['#eef1f4', '#3aa997', '#7db4ff', '#e3b261', '#e77878', '#c69cff'];

export function NoteEditorPage({ note, onCancel, onSave }: NoteEditorPageProps) {
  const [mode, setMode] = useState<NoteMode>(note ? 'read' : 'rich');
  const [title, setTitle] = useState(note?.title ?? '');
  const [category, setCategory] = useState(note?.category ?? '');
  const [tags, setTags] = useState(joinCsv(note?.tags ?? []));
  const [ruleColor, setRuleColor] = useState('#3aa997');
  const [editorHtml, setEditorHtml] = useState(noteEditorHtml(note));
  const [markdownContent, setMarkdownContent] = useState(note?.contentFormat === 'markdown' ? note.content : note ? notePlainText(note) : '');
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false });
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (mode === 'rich' && editorRef.current && editorRef.current.innerHTML !== editorHtml) {
      editorRef.current.innerHTML = editorHtml;
    }
  }, [editorHtml, mode]);

  useEffect(() => {
    function handleSelectionChange() {
      updateActiveFormats();
    }

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  function saveSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current?.contains(selection.anchorNode)) {
      return;
    }
    selectionRef.current = selection.getRangeAt(0).cloneRange();
    updateActiveFormats();
  }

  function restoreSelection() {
    const range = selectionRef.current;
    const selection = window.getSelection();
    if (!range || !selection) {
      return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function applyCommand(command: string, value?: string) {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    saveSelection();
    updateActiveFormats();
  }

  function applyFontSize(value: string) {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand('fontSize', false, '4');
    const fonts = editorRef.current?.querySelectorAll('font[size="4"]');
    fonts?.forEach((font) => {
      const span = document.createElement('span');
      span.style.fontSize = `${value}px`;
      span.innerHTML = font.innerHTML;
      font.replaceWith(span);
    });
    saveSelection();
    updateActiveFormats();
  }

  function insertHorizontalRule() {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand(
      'insertHTML',
      false,
      `<hr style="border:0;border-top:2px solid ${ruleColor};margin:22px 0;" />`,
    );
    if (editorRef.current) {
      setEditorHtml(editorRef.current.innerHTML);
    }
    saveSelection();
  }

  function handleEditorInput() {
    if (editorRef.current) {
      setEditorHtml(editorRef.current.innerHTML);
    }
    updateActiveFormats();
  }

  function updateActiveFormats() {
    const selection = window.getSelection();
    if (!selection || !editorRef.current?.contains(selection.anchorNode)) {
      return;
    }
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  }

  function changeMode(nextMode: NoteMode) {
    if (mode === 'rich' && editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      setEditorHtml(currentHtml);
      if (nextMode === 'markdown') {
        setMarkdownContent(editorRef.current.innerText);
      }
    }
    if (mode === 'markdown' && nextMode === 'rich') {
      setEditorHtml(markdownToHtml(markdownContent));
    }
    setMode(nextMode);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    const isMarkdown = mode === 'markdown';
    onSave({
      id: note?.id ?? createId('note'),
      title: title.trim(),
      content: isMarkdown ? markdownContent : editorRef.current?.innerHTML ?? editorHtml,
      contentFormat: isMarkdown ? 'markdown' : 'html',
      category: category.trim(),
      tags: splitCsv(tags),
      pinned: note?.pinned ?? false,
      pinnedAt: note?.pinnedAt ?? null,
      createdAt: note?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  if (mode === 'read') {
    return (
      <section className="note-reader-page">
        <div className="note-reader-header">
          <BackButton label="Back to notes" onClick={onCancel} />
          <div className="note-mode-tabs">
            <EditButton label="Edit" onClick={() => changeMode('rich')} />
            <button className="button ghost" type="button" onClick={() => changeMode('markdown')}>
              <Code2 size={17} aria-hidden="true" />
              Markdown
            </button>
          </div>
        </div>
        <article className="note-reader">
          <div className="note-reader-title">
            <span className="panel-kicker">{t('Reading mode')}</span>
            <h1>{title || t('Untitled note')}</h1>
            <div className="chip-row">
              {category ? <span className="chip">{category}</span> : null}
              {note?.updatedAt ? <span className="chip">{formatDate(note.updatedAt)}</span> : null}
              {note?.contentFormat === 'markdown' ? <span className="chip">Markdown</span> : null}
              {splitCsv(tags).map((tag) => (
                <span className="chip" key={tag}>{tag}</span>
              ))}
            </div>
          </div>
          <div className="note-reader-content" dangerouslySetInnerHTML={{ __html: noteReaderHtml(note) }} />
        </article>
      </section>
    );
  }

  return (
    <section>
      <form className="note-editor-page" onSubmit={submit}>
        <div className="note-editor-header">
          <BackButton label="Back to notes" onClick={onCancel} />
          <div className="note-mode-tabs">
            <button className="button ghost" type="button" onClick={() => changeMode('read')}>
              <BookOpen size={17} aria-hidden="true" />
              {t('Reading')}
            </button>
            <button className={`button ${mode === 'rich' ? 'primary' : 'ghost'}`} type="button" onClick={() => changeMode('rich')}>
              <Edit3 size={17} aria-hidden="true" />
              {t('Visual editor')}
            </button>
            <button className={`button ${mode === 'markdown' ? 'primary' : 'ghost'}`} type="button" onClick={() => changeMode('markdown')}>
              <Code2 size={17} aria-hidden="true" />
              Markdown
            </button>
            <SaveButton label="Save note" />
          </div>
        </div>
        <input
          className="note-title-input"
          required
          placeholder={t('Note title')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <div className="note-meta-grid compact-note-meta-grid">
          <label>
            {t('Category')}
            <input value={category} onChange={(event) => setCategory(event.target.value)} />
          </label>
          <label>
            {t('Tags')}
            <input value={tags} onChange={(event) => setTags(event.target.value)} />
          </label>
        </div>
        {mode === 'rich' ? (
          <>
            <div className="note-editor-toolbar" aria-label={t('Editor toolbar')} onMouseDownCapture={saveSelection}>
              <button className={`icon-button ghost ${activeFormats.bold ? 'format-active' : ''}`} type="button" onClick={() => applyCommand('bold')} aria-label={t('Bold')}>
                <Bold size={17} aria-hidden="true" />
              </button>
              <button className={`icon-button ghost ${activeFormats.italic ? 'format-active' : ''}`} type="button" onClick={() => applyCommand('italic')} aria-label={t('Italic')}>
                <Italic size={17} aria-hidden="true" />
              </button>
              <button className={`icon-button ghost ${activeFormats.underline ? 'format-active' : ''}`} type="button" onClick={() => applyCommand('underline')} aria-label={t('Underline')}>
                <Underline size={17} aria-hidden="true" />
              </button>
              <label>
                <Type size={16} aria-hidden="true" />
                <select defaultValue="16" onChange={(event) => applyFontSize(event.target.value)}>
                  <option value="14">14</option>
                  <option value="16">16</option>
                  <option value="18">18</option>
                  <option value="22">22</option>
                  <option value="28">28</option>
                </select>
              </label>
              <div className="quick-color-row" aria-label={t('Quick colors')}>
                {quickColors.map((color) => (
                  <button
                    className="color-swatch"
                    type="button"
                    key={color}
                    style={{ backgroundColor: color }}
                    onClick={() => applyCommand('foreColor', color)}
                    aria-label={`${t('Text color')} ${color}`}
                  />
                ))}
              </div>
              <label>
                <Palette size={16} aria-hidden="true" />
                <input type="color" defaultValue="#eef1f4" onChange={(event) => applyCommand('foreColor', event.target.value)} />
              </label>
              <div className="note-rule-tool">
                <button className="button ghost" type="button" onClick={insertHorizontalRule}>
                  <Minus size={17} aria-hidden="true" />
                  <span>{t('Divider')}</span>
                </button>
                <div className="quick-color-row compact-color-row" aria-label={t('Divider color')}>
                  {quickColors.map((color) => (
                    <button
                      className={`color-swatch ${ruleColor === color ? 'active' : ''}`}
                      type="button"
                      key={color}
                      style={{ backgroundColor: color }}
                      onClick={() => setRuleColor(color)}
                      aria-label={`${t('Divider color')} ${color}`}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={ruleColor}
                  onChange={(event) => setRuleColor(event.target.value)}
                  aria-label={t('Divider color')}
                />
              </div>
            </div>
            <div
              className="rich-note-editor"
              contentEditable
              ref={editorRef}
              onInput={handleEditorInput}
              onKeyUp={saveSelection}
              onMouseUp={saveSelection}
              onBlur={saveSelection}
              suppressContentEditableWarning
            />
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
