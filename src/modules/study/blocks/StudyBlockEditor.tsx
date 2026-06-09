import {
  ArrowDown,
  ArrowUp,
  Code2,
  Columns3,
  GripVertical,
  Rows3,
  Sigma,
  Table2,
  Trash2,
  Type,
} from "lucide-react";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import "highlight.js/styles/github-dark.css";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RichTextEditor, RichTextViewer } from "../richText/RichTextEditor";
import { createRichTextDocument } from "../richText/richTextCore";
import {
  createStudyCodeBlock,
  createStudyLatexBlock,
  createStudyMarkdownBlock,
  createStudyBlockDocument,
  createStudyTableBlock,
  createStudyTextBlock,
  normalizeStudyBlockDocument,
  type StudyBlockDocument,
  type StudyCodeBlock,
  type StudyContentBlock,
  type StudyTableBlock,
} from "./blockCore";
import {
  addTableColumn,
  addTableRow,
  removeTableColumn,
  removeTableRow,
  resizeTableColumn,
  resizeTableRow,
  updateTableCellContent,
  updateTableCellStyle,
  type StudyTableData,
} from "./tableCore";

interface StudyBlockEditorProps {
  value: unknown;
  mode: "edit" | "read";
  onChange: (document: StudyBlockDocument, plainText: string) => void;
}

type SelectedCell = {
  blockId: string;
  rowIndex: number;
  columnIndex: number;
};

type SelectedCellRange = {
  blockId: string;
  anchorRowIndex: number;
  anchorColumnIndex: number;
  focusRowIndex: number;
  focusColumnIndex: number;
};

type DragState =
  | {
      type: "column";
      blockId: string;
      columnIndex: number;
      startX: number;
      startWidth: number;
    }
  | {
      type: "row";
      blockId: string;
      rowIndex: number;
      startY: number;
      startHeight: number;
    };

const CODE_LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "tsx", label: "TSX" },
  { value: "jsx", label: "JSX" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "python", label: "Python" },
  { value: "bash", label: "Bash" },
  { value: "sql", label: "SQL" },
  { value: "markdown", label: "Markdown" },
];

const HIGHLIGHT_LANGUAGES = [
  ["bash", bash],
  ["css", css],
  ["html", xml],
  ["javascript", javascript],
  ["jsx", typescript],
  ["json", json],
  ["markdown", markdown],
  ["python", python],
  ["sql", sql],
  ["tsx", typescript],
  ["typescript", typescript],
] as const;

HIGHLIGHT_LANGUAGES.forEach(([name, language]) => {
  if (!hljs.getLanguage(name)) {
    hljs.registerLanguage(name, language);
  }
});

export function StudyBlockEditor({ value, mode, onChange }: StudyBlockEditorProps) {
  const document = useMemo(() => normalizeStudyBlockDocument(value), [value]);
  const [selectedRange, setSelectedRange] = useState<SelectedCellRange | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeTextEditorId, setActiveTextEditorId] = useState<string | null>(null);
  const [textToolbarTarget, setTextToolbarTarget] = useState<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const isSelectingCellsRef = useRef(false);

  useEffect(() => {
    function stopSelecting() {
      isSelectingCellsRef.current = false;
    }

    window.addEventListener("mouseup", stopSelecting);

    return () => {
      window.removeEventListener("mouseup", stopSelecting);
    };
  }, []);

  function emitBlocks(blocks: StudyContentBlock[]) {
    const nextDocument = createStudyBlockDocument(blocks);
    onChange(nextDocument, nextDocument.plainText);
  }

  function updateBlock(blockId: string, update: (block: StudyContentBlock) => StudyContentBlock) {
    emitBlocks(document.blocks.map((block) => (block.id === blockId ? update(block) : block)));
  }

  function addBlock(type: StudyContentBlock["type"], afterId?: string) {
    const block =
      type === "table"
        ? createStudyTableBlock()
        : type === "markdown"
          ? createStudyMarkdownBlock()
          : type === "latex"
            ? createStudyLatexBlock()
            : type === "code"
              ? createStudyCodeBlock()
              : createStudyTextBlock();
    const index = afterId ? document.blocks.findIndex((item) => item.id === afterId) : document.blocks.length - 1;
    const insertAt = index >= 0 ? index + 1 : document.blocks.length;

    emitBlocks([...document.blocks.slice(0, insertAt), block, ...document.blocks.slice(insertAt)]);
    setActiveBlockId(block.id);
    setActiveTextEditorId(type === "text" ? `text:${block.id}` : null);
  }

  function removeBlock(blockId: string) {
    if (document.blocks.length <= 1) {
      emitBlocks([createStudyTextBlock()]);
      return;
    }

    emitBlocks(document.blocks.filter((block) => block.id !== blockId));
    setActiveBlockId(null);
    setActiveTextEditorId(null);
    setSelectedRange(null);
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    const index = document.blocks.findIndex((block) => block.id === blockId);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= document.blocks.length) return;

    const blocks = [...document.blocks];
    const [block] = blocks.splice(index, 1);
    blocks.splice(nextIndex, 0, block);
    emitBlocks(blocks);
  }

  function updateTable(blockId: string, table: StudyTableData) {
    updateBlock(blockId, (block) => (block.type === "table" ? { ...block, table } : block));
  }

  function handleColumnResizeStart(
    event: PointerEvent<HTMLButtonElement>,
    block: StudyTableBlock,
    columnIndex: number,
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      type: "column",
      blockId: block.id,
      columnIndex,
      startX: event.clientX,
      startWidth: block.table.columns[columnIndex]?.width ?? 180,
    };
  }

  function handleRowResizeStart(
    event: PointerEvent<HTMLButtonElement>,
    block: StudyTableBlock,
    rowIndex: number,
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      type: "row",
      blockId: block.id,
      rowIndex,
      startY: event.clientY,
      startHeight: block.table.rows[rowIndex]?.height ?? 92,
    };
  }

  function handleResizeMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    const block = document.blocks.find((item): item is StudyTableBlock => item.id === drag.blockId && item.type === "table");
    if (!block) return;

    if (drag.type === "column") {
      updateTable(block.id, resizeTableColumn(block.table, drag.columnIndex, drag.startWidth + event.clientX - drag.startX));
      return;
    }

    updateTable(block.id, resizeTableRow(block.table, drag.rowIndex, drag.startHeight + event.clientY - drag.startY));
  }

  function handleResizeEnd(event: PointerEvent<HTMLButtonElement>) {
    if (dragRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
  }

  function handleCellSelectionStart(event: MouseEvent<HTMLDivElement>, cell: SelectedCell) {
    if (event.button !== 0) return;

    isSelectingCellsRef.current = true;
    setActiveBlockId(cell.blockId);
    setActiveTextEditorId(`cell:${cell.blockId}:${cell.rowIndex}:${cell.columnIndex}`);
    setSelectedRange({
      blockId: cell.blockId,
      anchorRowIndex: cell.rowIndex,
      anchorColumnIndex: cell.columnIndex,
      focusRowIndex: cell.rowIndex,
      focusColumnIndex: cell.columnIndex,
    });
  }

  function handleCellSelectionExtend(cell: SelectedCell) {
    if (!isSelectingCellsRef.current) return;

    setSelectedRange((range) => {
      if (!range || range.blockId !== cell.blockId) {
        return {
          blockId: cell.blockId,
          anchorRowIndex: cell.rowIndex,
          anchorColumnIndex: cell.columnIndex,
          focusRowIndex: cell.rowIndex,
          focusColumnIndex: cell.columnIndex,
        };
      }

      return {
        ...range,
        focusRowIndex: cell.rowIndex,
        focusColumnIndex: cell.columnIndex,
      };
    });
  }

  const selectedTableBlock = selectedRange
    ? document.blocks.find((block): block is StudyTableBlock => block.id === selectedRange.blockId && block.type === "table")
    : null;
  const selectedTableCell = selectedTableBlock
    ? selectedTableBlock.table.rows[selectedRange?.focusRowIndex ?? -1]?.cells[selectedRange?.focusColumnIndex ?? -1] ?? null
    : null;
  const activeBlock = document.blocks.find((block) => block.id === activeBlockId) ?? null;
  const activeTableBlock = selectedTableBlock ?? (activeBlock?.type === "table" ? activeBlock : null);
  const selectedCellCount = selectedRange ? getCellRangeArea(selectedRange) : 0;

  function updateSelectedCellStyle(style: Parameters<typeof updateTableCellStyle>[3]) {
    if (!selectedRange || !selectedTableBlock) return;

    const bounds = getCellRangeBounds(selectedRange);
    let nextTable = selectedTableBlock.table;

    for (let rowIndex = bounds.minRow; rowIndex <= bounds.maxRow; rowIndex += 1) {
      for (let columnIndex = bounds.minColumn; columnIndex <= bounds.maxColumn; columnIndex += 1) {
        nextTable = updateTableCellStyle(nextTable, rowIndex, columnIndex, style);
      }
    }

    updateTable(selectedTableBlock.id, nextTable);
  }

  if (mode === "read") {
    return (
      <div className="study-block-reader">
        {document.blocks.map((block) => (
          <BlockReader key={block.id} block={block} />
        ))}
      </div>
    );
  }

  return (
    <div className="study-block-editor">
      <div className="study-block-sticky-header">
        <div className="study-block-header-row">
          <div className="study-block-header-group study-block-header-toolbar-group">
            <span className="study-block-header-label">Текст</span>
            <div className="study-block-toolbar-slot" ref={setTextToolbarTarget}>
              {!activeTextEditorId ? <span className="muted-text">Выбери текстовый блок или ячейку</span> : null}
            </div>
          </div>
        </div>

        {activeTableBlock ? (
          <div className="study-block-header-row">
            <div className="study-block-header-group">
              <span className="study-block-header-label">Таблица</span>
              <button className="button ghost" type="button" onClick={() => updateTable(activeTableBlock.id, addTableRow(activeTableBlock.table))}>
                <Rows3 size={16} />
                Строка
              </button>
              <button className="button ghost" type="button" onClick={() => updateTable(activeTableBlock.id, addTableColumn(activeTableBlock.table))}>
                <Columns3 size={16} />
                Колонка
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={() => updateTable(activeTableBlock.id, removeTableRow(activeTableBlock.table, activeTableBlock.table.rows.length - 1))}
              >
                Убрать строку
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={() => updateTable(activeTableBlock.id, removeTableColumn(activeTableBlock.table, activeTableBlock.table.columns.length - 1))}
              >
                Убрать колонку
              </button>
            </div>
          </div>
        ) : null}

        {selectedTableBlock && selectedTableCell && selectedRange ? (
          <div className="study-block-header-row">
            <div className="study-cell-settings">
              <strong>Ячейки: {selectedCellCount}</strong>
              <label>
                Фон
                <input
                  type="color"
                  value={colorInputValue(selectedTableCell.style.backgroundColor, "#0f172a")}
                  onChange={(event) =>
                    updateSelectedCellStyle({
                      backgroundColor: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Текст
                <input
                  type="color"
                  value={colorInputValue(selectedTableCell.style.textColor, "#e5e7eb")}
                  onChange={(event) =>
                    updateSelectedCellStyle({
                      textColor: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Граница
                <input
                  type="color"
                  value={colorInputValue(selectedTableCell.style.borderColor, "#334155")}
                  onChange={(event) =>
                    updateSelectedCellStyle({
                      borderColor: event.target.value,
                    })
                  }
                />
              </label>
            </div>
          </div>
        ) : null}
      </div>

      <div className="study-block-list">
        {document.blocks.map((block, index) => (
          <section
            className={`study-content-block ${activeBlockId === block.id ? "active" : ""}`}
            key={block.id}
            onMouseDown={() => setActiveBlockId(block.id)}
          >
            <div className="study-block-controls">
              <GripVertical size={16} />
              <span>{blockTypeLabel(block.type)}</span>
              <button
                className="icon-button"
                type="button"
                onClick={() => moveBlock(block.id, -1)}
                disabled={index === 0}
                aria-label="Переместить блок вверх"
              >
                <ArrowUp size={16} />
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => moveBlock(block.id, 1)}
                disabled={index === document.blocks.length - 1}
                aria-label="Переместить блок вниз"
              >
                <ArrowDown size={16} />
              </button>
              <button
                className="icon-button danger"
                type="button"
                onClick={() => removeBlock(block.id)}
                aria-label="Удалить блок"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {block.type === "text" ? (
              <RichTextEditor
                value={block.content}
                showToolbar={activeTextEditorId === `text:${block.id}` && Boolean(textToolbarTarget)}
                toolbarTarget={textToolbarTarget}
                onEditorFocus={() => {
                  setActiveBlockId(block.id);
                  setActiveTextEditorId(`text:${block.id}`);
                  setSelectedRange(null);
                }}
                onChange={(html, plainText) =>
                  updateBlock(block.id, (current) =>
                    current.type === "text"
                      ? {
                          ...current,
                          content: createRichTextDocument(html, plainText),
                        }
                      : current,
                  )
                }
              />
            ) : block.type === "table" ? (
              <TableBlockEditor
                block={block}
                selectedRange={selectedRange}
                activeTextEditorId={activeTextEditorId}
                toolbarTarget={textToolbarTarget}
                onSelectCellStart={handleCellSelectionStart}
                onExtendSelection={handleCellSelectionExtend}
                onActivateTextEditor={(editorId) => {
                  setActiveBlockId(block.id);
                  setActiveTextEditorId(editorId);
                }}
                onChangeTable={(table) => updateTable(block.id, table)}
                onColumnResizeStart={handleColumnResizeStart}
                onRowResizeStart={handleRowResizeStart}
                onResizeMove={handleResizeMove}
                onResizeEnd={handleResizeEnd}
              />
            ) : block.type === "markdown" ? (
              <MarkupBlockEditor
                label="Markdown"
                value={block.source}
                placeholder="# Заголовок&#10;&#10;- пункт списка&#10;- **важный** текст"
                preview={<MarkdownPreview source={block.source} />}
                onChange={(source) =>
                  updateBlock(block.id, (current) =>
                    current.type === "markdown"
                      ? {
                          ...current,
                          source,
                        }
                      : current,
                  )
                }
              />
            ) : block.type === "latex" ? (
              <MarkupBlockEditor
                label="LaTeX"
                value={block.source}
                placeholder="E = mc^2"
                preview={<LatexPreview source={block.source} displayMode={block.displayMode} />}
                onChange={(source) =>
                  updateBlock(block.id, (current) =>
                    current.type === "latex"
                      ? {
                          ...current,
                          source,
                        }
                      : current,
                  )
                }
              />
            ) : (
              <CodeBlockEditor
                block={block}
                onChangeSource={(source) =>
                  updateBlock(block.id, (current) =>
                    current.type === "code"
                      ? {
                          ...current,
                          source,
                        }
                      : current,
                  )
                }
                onChangeLanguage={(language) =>
                  updateBlock(block.id, (current) =>
                    current.type === "code"
                      ? {
                          ...current,
                          language,
                        }
                      : current,
                  )
                }
              />
            )}
          </section>
        ))}
      </div>

      <div className="study-block-add-bar">
        <span className="study-block-header-label">Добавить блок</span>
        <button className="button ghost" type="button" onClick={() => addBlock("text")}>
          <Type size={16} />
          Текст
        </button>
        <button className="button ghost" type="button" onClick={() => addBlock("table")}>
          <Table2 size={16} />
          Таблица
        </button>
        <button className="button ghost" type="button" onClick={() => addBlock("markdown")}>
          <Code2 size={16} />
          Markdown
        </button>
        <button className="button ghost" type="button" onClick={() => addBlock("latex")}>
          <Sigma size={16} />
          LaTeX
        </button>
        <button className="button ghost" type="button" onClick={() => addBlock("code")}>
          <Code2 size={16} />
          Code
        </button>
      </div>

    </div>
  );
}

function TableBlockEditor({
  block,
  selectedRange,
  activeTextEditorId,
  toolbarTarget,
  onSelectCellStart,
  onExtendSelection,
  onActivateTextEditor,
  onChangeTable,
  onColumnResizeStart,
  onRowResizeStart,
  onResizeMove,
  onResizeEnd,
}: {
  block: StudyTableBlock;
  selectedRange: SelectedCellRange | null;
  activeTextEditorId: string | null;
  toolbarTarget: HTMLDivElement | null;
  onSelectCellStart: (event: MouseEvent<HTMLDivElement>, cell: SelectedCell) => void;
  onExtendSelection: (cell: SelectedCell) => void;
  onActivateTextEditor: (editorId: string) => void;
  onChangeTable: (table: StudyTableData) => void;
  onColumnResizeStart: (event: PointerEvent<HTMLButtonElement>, block: StudyTableBlock, columnIndex: number) => void;
  onRowResizeStart: (event: PointerEvent<HTMLButtonElement>, block: StudyTableBlock, rowIndex: number) => void;
  onResizeMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onResizeEnd: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="study-table-block">
      <div className="study-table-scroll">
        <div
          className="study-table-grid"
          style={{
            gridTemplateColumns: block.table.columns.map((column) => `${column.width}px`).join(" "),
          }}
        >
          {block.table.columns.map((column, columnIndex) => (
            <div className="study-table-column-header" style={{ width: column.width }} key={column.id}>
              <span>{columnIndex + 1}</span>
              <button
                className="study-table-column-resizer"
                type="button"
                aria-label="Изменить ширину колонки"
                onPointerDown={(event) => onColumnResizeStart(event, block, columnIndex)}
                onPointerMove={onResizeMove}
                onPointerUp={onResizeEnd}
                onPointerCancel={onResizeEnd}
              />
            </div>
          ))}

          {block.table.rows.map((row, rowIndex) =>
            row.cells.map((cell, columnIndex) => {
              const isSelected = isCellInSelectedRange(selectedRange, block.id, rowIndex, columnIndex);
              const editorId = `cell:${block.id}:${rowIndex}:${columnIndex}`;
              const isFocused =
                selectedRange?.blockId === block.id &&
                selectedRange.focusRowIndex === rowIndex &&
                selectedRange.focusColumnIndex === columnIndex;

              return (
                <div
                  className={`study-table-cell ${isSelected ? "selected" : ""}`}
                  style={{
                    minHeight: row.height,
                    backgroundColor: cell.style.backgroundColor,
                    borderColor: cell.style.borderColor,
                    color: cell.style.textColor,
                  }}
                  key={cell.id}
                  onMouseDown={(event) => onSelectCellStart(event, { blockId: block.id, rowIndex, columnIndex })}
                  onMouseEnter={() => onExtendSelection({ blockId: block.id, rowIndex, columnIndex })}
                >
                  <RichTextEditor
                    value={cell.content}
                    compact
                    showToolbar={isFocused && activeTextEditorId === editorId && Boolean(toolbarTarget)}
                    toolbarTarget={toolbarTarget}
                    onEditorFocus={() => onActivateTextEditor(editorId)}
                    className="study-table-cell-editor"
                    placeholder=""
                    onChange={(html, plainText) =>
                      onChangeTable(updateTableCellContent(block.table, rowIndex, columnIndex, html, plainText))
                    }
                  />
                  <button
                    className="study-table-cell-column-resizer"
                    type="button"
                    aria-label="Изменить ширину колонки"
                    onPointerDown={(event) => onColumnResizeStart(event, block, columnIndex)}
                    onPointerMove={onResizeMove}
                    onPointerUp={onResizeEnd}
                    onPointerCancel={onResizeEnd}
                  />
                  <button
                    className="study-table-row-resizer"
                    type="button"
                    aria-label="Изменить высоту строки"
                    onPointerDown={(event) => onRowResizeStart(event, block, rowIndex)}
                    onPointerMove={onResizeMove}
                    onPointerUp={onResizeEnd}
                    onPointerCancel={onResizeEnd}
                  />
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}

function MarkupBlockEditor({
  label,
  value,
  placeholder,
  preview,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  preview: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <div className="study-markup-block">
      <label className="study-markup-source">
        <span>{label}</span>
        <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      </label>
      <div className="study-markup-preview">{preview}</div>
    </div>
  );
}

function MarkdownPreview({ source }: { source: string }) {
  if (!source.trim()) {
    return <p className="muted-text">Markdown пуст.</p>;
  }

  return (
    <div className="study-markdown-preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}

function LatexPreview({ source, displayMode }: { source: string; displayMode: boolean }) {
  const html = useMemo(() => {
    if (!source.trim()) return "";

    try {
      return katex.renderToString(source, {
        displayMode,
        output: "html",
        throwOnError: false,
        strict: false,
        trust: false,
      });
    } catch (error) {
      return `<span class="study-latex-error">${escapeHtml(error instanceof Error ? error.message : "LaTeX error")}</span>`;
    }
  }, [displayMode, source]);

  if (!html) {
    return <p className="muted-text">LaTeX пуст.</p>;
  }

  return <div className="study-latex-preview" dangerouslySetInnerHTML={{ __html: html }} />;
}

function CodeBlockEditor({
  block,
  onChangeSource,
  onChangeLanguage,
}: {
  block: StudyCodeBlock;
  onChangeSource: (source: string) => void;
  onChangeLanguage: (language: string) => void;
}) {
  return (
    <div className="study-code-block">
      <label className="study-code-source">
        <span>Code</span>
        <textarea
          value={block.source}
          placeholder={'function hello() {\n  return "world";\n}'}
          spellCheck={false}
          onChange={(event) => onChangeSource(event.target.value)}
        />
      </label>

      <div className="study-code-preview-panel">
        <label className="study-code-language">
          <span>Language</span>
          <select value={block.language || "auto"} onChange={(event) => onChangeLanguage(event.target.value)}>
            {CODE_LANGUAGE_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <CodePreview source={block.source} language={block.language} />
      </div>
    </div>
  );
}

function CodePreview({ source, language }: { source: string; language: string }) {
  const html = useMemo(() => {
    if (!source.trim()) return "";

    try {
      if (language && language !== "auto" && hljs.getLanguage(language)) {
        return hljs.highlight(source, {
          language,
          ignoreIllegals: true,
        }).value;
      }

      return hljs.highlightAuto(source).value;
    } catch {
      return escapeHtml(source);
    }
  }, [language, source]);

  if (!html) {
    return <p className="muted-text">Code is empty.</p>;
  }

  return (
    <pre className="study-code-preview">
      <code
        className={`hljs ${language && language !== "auto" ? `language-${language}` : ""}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </pre>
  );
}

function BlockReader({ block }: { block: StudyContentBlock }) {
  if (block.type === "text") {
    return (
      <section className="study-read-block">
        <RichTextViewer value={block.content} />
      </section>
    );
  }

  if (block.type === "markdown") {
    return (
      <section className="study-read-block">
        <MarkdownPreview source={block.source} />
      </section>
    );
  }

  if (block.type === "latex") {
    return (
      <section className="study-read-block">
        <LatexPreview source={block.source} displayMode={block.displayMode} />
      </section>
    );
  }

  if (block.type === "code") {
    return (
      <section className="study-read-block">
        <CodePreview source={block.source} language={block.language} />
      </section>
    );
  }

  return (
    <section className="study-read-block">
      <div
        className="study-table-grid study-table-grid-readonly"
        style={{
          gridTemplateColumns: block.table.columns.map((column) => `${column.width}px`).join(" "),
        }}
      >
        {block.table.rows.flatMap((row) =>
          row.cells.map((cell) => (
            <div
              className="study-table-cell readonly"
              style={{
                minHeight: row.height,
                backgroundColor: cell.style.backgroundColor,
                borderColor: cell.style.borderColor,
                color: cell.style.textColor,
              }}
              key={cell.id}
            >
              <RichTextViewer value={cell.content} fallback="" />
            </div>
          )),
        )}
      </div>
    </section>
  );
}

function colorInputValue(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function blockTypeLabel(type: StudyContentBlock["type"]) {
  if (type === "table") return "Таблица";
  if (type === "markdown") return "Markdown";
  if (type === "latex") return "LaTeX";
  if (type === "code") return "Code";
  return "Текст";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCellRangeBounds(range: SelectedCellRange) {
  return {
    minRow: Math.min(range.anchorRowIndex, range.focusRowIndex),
    maxRow: Math.max(range.anchorRowIndex, range.focusRowIndex),
    minColumn: Math.min(range.anchorColumnIndex, range.focusColumnIndex),
    maxColumn: Math.max(range.anchorColumnIndex, range.focusColumnIndex),
  };
}

function getCellRangeArea(range: SelectedCellRange) {
  const bounds = getCellRangeBounds(range);
  return (bounds.maxRow - bounds.minRow + 1) * (bounds.maxColumn - bounds.minColumn + 1);
}

function isCellInSelectedRange(
  range: SelectedCellRange | null,
  blockId: string,
  rowIndex: number,
  columnIndex: number,
) {
  if (!range || range.blockId !== blockId) return false;

  const bounds = getCellRangeBounds(range);

  return (
    rowIndex >= bounds.minRow &&
    rowIndex <= bounds.maxRow &&
    columnIndex >= bounds.minColumn &&
    columnIndex <= bounds.maxColumn
  );
}
