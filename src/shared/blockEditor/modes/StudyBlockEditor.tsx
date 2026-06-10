import {
  ArrowDown,
  ArrowUp,
  Code2,
  Columns3,
  Eye,
  GripVertical,
  Heading,
  Rows3,
  Sigma,
  Table2,
  Trash2,
  Type,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { CodeBlockEditor } from "../blocks/code/CodeBlockEditor";
import { HeadingBlockEditor } from "../blocks/heading/HeadingBlockEditor";
import { LatexPreview, MarkdownPreview, MarkupBlockEditor } from "../blocks/markup/MarkupBlock";
import { RichTextEditor } from "../blocks/richText/RichTextEditor";
import { createRichTextDocument } from "../blocks/richText/richTextCore";
import {
  createStudyCodeBlock,
  createStudyHeadingBlock,
  createStudyLatexBlock,
  createStudyMarkdownBlock,
  createStudyBlockDocument,
  createStudyTableBlock,
  createStudyTextBlock,
  normalizeStudyBlockDocument,
  type StudyBlockDocument,
  type StudyContentBlock,
  type StudyHeadingLevel,
  type StudyTableBlock,
} from "../core/blockCore";
import {
  TableBlockEditor,
  getCellRangeArea,
  getCellRangeBounds,
  type SelectedCell,
  type SelectedCellRange,
} from "../blocks/table/TableBlockEditor";
import {
  addTableColumn,
  addTableRow,
  removeTableColumn,
  removeTableRow,
  resizeTableColumn,
  resizeTableRow,
  updateTableCellStyle,
  type StudyTableData,
} from "../blocks/table/tableCore";
import { StudyReadTree } from "./readMode";

interface StudyBlockEditorProps {
  value: unknown;
  mode: "edit" | "read";
  onChange: (document: StudyBlockDocument, plainText: string) => void;
}

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

const HEADING_LEVEL_OPTIONS = [1, 2, 3, 4, 5] as const;

export function StudyBlockEditor({ value, mode, onChange }: StudyBlockEditorProps) {
  const document = useMemo(() => normalizeStudyBlockDocument(value), [value]);
  const [selectedRange, setSelectedRange] = useState<SelectedCellRange | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeTextEditorId, setActiveTextEditorId] = useState<string | null>(null);
  const [previewBlockIds, setPreviewBlockIds] = useState<Record<string, boolean>>({});
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
        : type === "heading"
          ? createStudyHeadingBlock()
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

  function toggleBlockPreview(blockId: string) {
    setPreviewBlockIds((current) => ({
      ...current,
      [blockId]: !current[blockId],
    }));
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
    return <StudyReadTree blocks={document.blocks} />;
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
              {block.type === "heading" ? (
                <label className="study-heading-level-control">
                  <span>Уровень</span>
                  <select
                    value={block.level}
                    onChange={(event) =>
                      updateBlock(block.id, (current) =>
                        current.type === "heading"
                          ? {
                            ...current,
                            level: Number(event.target.value) as StudyHeadingLevel,
                          }
                          : current,
                      )
                    }
                  >
                    {HEADING_LEVEL_OPTIONS.map((level) => (
                      <option value={level} key={level}>
                        H{level}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {isPreviewableBlock(block.type) ? (
                <button
                  className={`icon-button ${previewBlockIds[block.id] ? "active" : ""}`}
                  type="button"
                  onClick={() => toggleBlockPreview(block.id)}
                  aria-label="Предпросмотр блока"
                  title="Предпросмотр"
                >
                  <Eye size={16} />
                </button>
              ) : null}
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

            {block.type === "heading" ? (
              <HeadingBlockEditor
                block={block}
                onChange={(text) =>
                  updateBlock(block.id, (current) =>
                    current.type === "heading"
                      ? {
                        ...current,
                        text,
                      }
                      : current,
                  )
                }
              />
            ) : block.type === "text" ? (
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
                previewMode={Boolean(previewBlockIds[block.id])}
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
                previewMode={Boolean(previewBlockIds[block.id])}
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
                previewMode={Boolean(previewBlockIds[block.id])}
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
        <button className="button ghost" type="button" onClick={() => addBlock("heading")}>
          <Heading size={16} />
          Заголовок
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

function colorInputValue(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function isPreviewableBlock(type: StudyContentBlock["type"]) {
  return type === "markdown" || type === "latex" || type === "code";
}

function blockTypeLabel(type: StudyContentBlock["type"]) {
  if (type === "heading") return "Заголовок";
  if (type === "table") return "Таблица";
  if (type === "markdown") return "Markdown";
  if (type === "latex") return "LaTeX";
  if (type === "code") return "Code";
  return "Текст";
}
