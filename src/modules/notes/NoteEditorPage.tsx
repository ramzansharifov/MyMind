import { Bold, BookOpen, Code2, Edit3, FilePlus2, Italic, Minus, Palette, Trash2, Type, Underline } from 'lucide-react';
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
type SheetRatio = '1:1' | '4:3' | '16:9' | '3:4' | 'A4';
type ToolbarTab = 'text' | 'color' | 'divider' | 'sheet';

const quickColors = ['#eef1f4', '#3aa997', '#7db4ff', '#e3b261', '#e77878', '#c69cff'];
const sheetRatios: Array<{ id: SheetRatio; label: string; width: number; height: number }> = [
  { id: '1:1', label: '1:1', width: 900, height: 900 },
  { id: '4:3', label: '4:3', width: 960, height: 720 },
  { id: '16:9', label: '16:9', width: 1120, height: 630 },
  { id: '3:4', label: '3:4', width: 720, height: 960 },
  { id: 'A4', label: 'A4', width: 794, height: 1123 },
];
const toolbarTabs: Array<{ id: ToolbarTab; label: string }> = [
  { id: 'text', label: 'Text' },
  { id: 'color', label: 'Text color' },
  { id: 'divider', label: 'Divider' },
  { id: 'sheet', label: 'Drawing sheet' },
];

export function NoteEditorPage({ note, onCancel, onSave }: NoteEditorPageProps) {
  const [mode, setMode] = useState<NoteMode>(note ? 'read' : 'rich');
  const [title, setTitle] = useState(note?.title ?? '');
  const [category, setCategory] = useState(note?.category ?? '');
  const [tags, setTags] = useState(joinCsv(note?.tags ?? []));
  const [ruleColor, setRuleColor] = useState('#3aa997');
  const [drawingColor, setDrawingColor] = useState('#3aa997');
  const [drawingStrokeWidth, setDrawingStrokeWidth] = useState(5);
  const [sheetRatio, setSheetRatio] = useState<SheetRatio>('4:3');
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [toolbarTab, setToolbarTab] = useState<ToolbarTab>('text');
  const [editorHtml, setEditorHtml] = useState(noteEditorHtml(note));
  const [markdownContent, setMarkdownContent] = useState(note?.contentFormat === 'markdown' ? note.content : note ? notePlainText(note) : '');
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false });
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const drawingSheetsRef = useRef<WeakSet<SVGSVGElement>>(new WeakSet());
  const drawingColorRef = useRef(drawingColor);
  const drawingStrokeWidthRef = useRef(drawingStrokeWidth);
  const { t } = useI18n();

  useEffect(() => {
    if (mode === 'rich' && editorRef.current && editorRef.current.innerHTML !== editorHtml) {
      editorRef.current.innerHTML = editorHtml;
    }
  }, [editorHtml, mode]);

  useEffect(() => {
    if (mode === 'rich') {
      initializeDrawingSheets();
    }
  }, [editorHtml, mode]);

  useEffect(() => {
    drawingColorRef.current = drawingColor;
  }, [drawingColor]);

  useEffect(() => {
    drawingStrokeWidthRef.current = drawingStrokeWidth;
  }, [drawingStrokeWidth]);

  useEffect(() => {
    syncDrawingSheetSelection();
  }, [selectedSheetId]);

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

  function insertDrawingSheet() {
    const ratio = sheetRatios.find((item) => item.id === sheetRatio) ?? sheetRatios[1];
    const sheetId = createId('sheet');
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand(
      'insertHTML',
      false,
      `<figure class="note-drawing-block" contenteditable="false" style="aspect-ratio:${ratio.width}/${ratio.height};"><svg class="note-drawing-sheet" data-sheet-id="${sheetId}" data-ratio="${ratio.id}" width="${ratio.width}" height="${ratio.height}" viewBox="0 0 ${ratio.width} ${ratio.height}" style="aspect-ratio:${ratio.width}/${ratio.height};" role="img" aria-label="Drawing sheet"><rect class="note-drawing-page" x="0" y="0" width="${ratio.width}" height="${ratio.height}" rx="10"></rect></svg></figure><p><br></p>`,
    );
    setSelectedSheetId(sheetId);
    if (editorRef.current) {
      setEditorHtml(editorRef.current.innerHTML);
    }
    window.setTimeout(initializeDrawingSheets, 0);
    saveSelection();
  }

  function initializeDrawingSheets() {
    const sheets = editorRef.current?.querySelectorAll<SVGSVGElement>('.note-drawing-sheet');
    sheets?.forEach((sheet) => {
      if (!sheet.dataset.sheetId) {
        sheet.dataset.sheetId = createId('sheet');
      }
      applySheetAspectRatio(sheet);
      sheet.classList.toggle('is-selected', Boolean(selectedSheetId) && sheet.dataset.sheetId === selectedSheetId);
      if (drawingSheetsRef.current.has(sheet)) {
        return;
      }
      drawingSheetsRef.current.add(sheet);
      let path: SVGPathElement | null = null;
      const getPoint = (event: PointerEvent) => {
        const point = sheet.createSVGPoint();
        const matrix = sheet.getScreenCTM();
        point.x = event.clientX;
        point.y = event.clientY;
        return matrix ? point.matrixTransform(matrix.inverse()) : point;
      };
      const startDrawing = (event: PointerEvent) => {
        event.preventDefault();
        selectDrawingSheet(sheet);
        sheet.setPointerCapture(event.pointerId);
        const point = getPoint(event);
        path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', drawingColorRef.current);
        path.setAttribute('stroke-width', String(drawingStrokeWidthRef.current));
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        sheet.appendChild(path);
      };
      const draw = (event: PointerEvent) => {
        if (!path) {
          return;
        }
        event.preventDefault();
        const point = getPoint(event);
        path.setAttribute('d', `${path.getAttribute('d')} L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`);
      };
      const stopDrawing = (event: PointerEvent) => {
        if (!path) {
          return;
        }
        path = null;
        sheet.releasePointerCapture(event.pointerId);
        if (editorRef.current) {
          setEditorHtml(editorRef.current.innerHTML);
        }
      };
      sheet.addEventListener('pointerdown', startDrawing);
      sheet.addEventListener('pointermove', draw);
      sheet.addEventListener('pointerup', stopDrawing);
      sheet.addEventListener('pointercancel', stopDrawing);
    });
  }

  function selectDrawingSheet(sheet: SVGSVGElement) {
    const id = sheet.dataset.sheetId ?? createId('sheet');
    sheet.dataset.sheetId = id;
    setSelectedSheetId(id);
    syncDrawingSheetSelection(id);
  }

  function removeSelectedSheet() {
    if (!selectedSheetId || !editorRef.current) {
      return;
    }
    const sheet = Array.from(editorRef.current.querySelectorAll<SVGSVGElement>('.note-drawing-sheet')).find((item) => item.dataset.sheetId === selectedSheetId);
    sheet?.closest('.note-drawing-block')?.remove();
    setSelectedSheetId('');
    setEditorHtml(editorRef.current.innerHTML);
    saveSelection();
  }

  function syncDrawingSheetSelection(nextSelectedId = selectedSheetId) {
    editorRef.current?.querySelectorAll<SVGSVGElement>('.note-drawing-sheet').forEach((sheet) => {
      sheet.classList.toggle('is-selected', Boolean(nextSelectedId) && sheet.dataset.sheetId === nextSelectedId);
    });
  }

  function applySheetAspectRatio(sheet: SVGSVGElement) {
    const ratio = sheetRatios.find((item) => item.id === sheet.dataset.ratio);
    if (!ratio) {
      return;
    }
    sheet.setAttribute('width', String(ratio.width));
    sheet.setAttribute('height', String(ratio.height));
    sheet.style.aspectRatio = `${ratio.width} / ${ratio.height}`;
    const block = sheet.closest<HTMLElement>('.note-drawing-block');
    if (block) {
      block.style.aspectRatio = `${ratio.width} / ${ratio.height}`;
    }
  }

  function cleanRichEditorHtml() {
    editorRef.current?.querySelectorAll('.note-drawing-sheet.is-selected').forEach((item) => item.classList.remove('is-selected'));
    return editorRef.current?.innerHTML ?? editorHtml;
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
      content: isMarkdown ? markdownContent : cleanRichEditorHtml(),
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
              <div className="note-toolbar-tabs" role="tablist" aria-label={t('Editor tools')}>
                {toolbarTabs.map((tab) => (
                  <button
                    className={`note-toolbar-tab${toolbarTab === tab.id ? ' active' : ''}`}
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={toolbarTab === tab.id}
                    onClick={() => setToolbarTab(tab.id)}
                  >
                    {t(tab.label)}
                  </button>
                ))}
              </div>
              <div className="note-toolbar-panel">
                {toolbarTab === 'text' ? (
                <div className="note-toolbar-row">
                  <button className={`icon-button ghost ${activeFormats.bold ? 'format-active' : ''}`} type="button" onClick={() => applyCommand('bold')} aria-label={t('Bold')}>
                    <Bold size={17} aria-hidden="true" />
                  </button>
                  <button className={`icon-button ghost ${activeFormats.italic ? 'format-active' : ''}`} type="button" onClick={() => applyCommand('italic')} aria-label={t('Italic')}>
                    <Italic size={17} aria-hidden="true" />
                  </button>
                  <button className={`icon-button ghost ${activeFormats.underline ? 'format-active' : ''}`} type="button" onClick={() => applyCommand('underline')} aria-label={t('Underline')}>
                    <Underline size={17} aria-hidden="true" />
                  </button>
                  <label className="note-select-control">
                    <Type size={16} aria-hidden="true" />
                    <select defaultValue="16" onChange={(event) => applyFontSize(event.target.value)}>
                      <option value="14">14</option>
                      <option value="16">16</option>
                      <option value="18">18</option>
                      <option value="22">22</option>
                      <option value="28">28</option>
                    </select>
                  </label>
                </div>
                ) : null}
                {toolbarTab === 'color' ? (
                <div className="note-toolbar-row">
                  <div className="quick-color-row" aria-label={t('Quick colors')}>
                    {quickColors.map((color) => (
                      <button className="color-swatch" type="button" key={color} style={{ backgroundColor: color }} onClick={() => applyCommand('foreColor', color)} aria-label={`${t('Text color')} ${color}`} />
                    ))}
                  </div>
                  <label className="note-color-input">
                    <Palette size={16} aria-hidden="true" />
                    <input type="color" defaultValue="#eef1f4" onChange={(event) => applyCommand('foreColor', event.target.value)} />
                  </label>
                </div>
                ) : null}
                {toolbarTab === 'divider' ? (
                <div className="note-toolbar-row">
                  <button className="button ghost" type="button" onClick={insertHorizontalRule}>
                    <Minus size={17} aria-hidden="true" />
                    <span>{t('Divider')}</span>
                  </button>
                  <div className="quick-color-row compact-color-row" aria-label={t('Divider color')}>
                    {quickColors.map((color) => (
                      <button className={`color-swatch ${ruleColor === color ? 'active' : ''}`} type="button" key={color} style={{ backgroundColor: color }} onClick={() => setRuleColor(color)} aria-label={`${t('Divider color')} ${color}`} />
                    ))}
                  </div>
                  <label className="note-color-input">
                    <Palette size={16} aria-hidden="true" />
                    <input type="color" value={ruleColor} onChange={(event) => setRuleColor(event.target.value)} aria-label={t('Divider color')} />
                  </label>
                </div>
                ) : null}
                {toolbarTab === 'sheet' ? (
                <div className="note-toolbar-row">
                  <div className="note-ratio-row" aria-label={t('Sheet ratio')}>
                    {sheetRatios.map((ratio) => (
                      <button className={`filter-chip${sheetRatio === ratio.id ? ' active' : ''}`} type="button" key={ratio.id} onClick={() => setSheetRatio(ratio.id)}>
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                  <div className="quick-color-row compact-color-row" aria-label={t('Drawing color')}>
                    {quickColors.map((color) => (
                      <button className={`color-swatch ${drawingColor === color ? 'active' : ''}`} type="button" key={color} style={{ backgroundColor: color }} onClick={() => setDrawingColor(color)} aria-label={`${t('Drawing color')} ${color}`} />
                    ))}
                  </div>
                  <label className="note-color-input">
                    <Palette size={16} aria-hidden="true" />
                    <input type="color" value={drawingColor} onChange={(event) => setDrawingColor(event.target.value)} aria-label={t('Drawing color')} />
                  </label>
                  <label className="note-stroke-control">
                    <span>{t('Line width')}</span>
                    <input type="range" min="2" max="16" value={drawingStrokeWidth} onChange={(event) => setDrawingStrokeWidth(Number(event.target.value))} />
                    <strong>{drawingStrokeWidth}</strong>
                  </label>
                  <button className="button ghost" type="button" onClick={insertDrawingSheet}>
                    <FilePlus2 size={17} aria-hidden="true" />
                    <span>{t('Add sheet')}</span>
                  </button>
                  <button className="button danger" type="button" disabled={!selectedSheetId} onClick={removeSelectedSheet}>
                    <Trash2 size={17} aria-hidden="true" />
                    <span>{t('Delete sheet')}</span>
                  </button>
                </div>
                ) : null}
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
