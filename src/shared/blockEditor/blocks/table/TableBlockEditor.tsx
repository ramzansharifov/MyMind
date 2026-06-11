import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { StudyTableBlock } from "../../core/blockCore";
import { RichTextEditor } from "../richText/RichTextEditor";
import {
  autoFitTableColumns,
  autoFitTableRows,
  clearTableCellContents,
  clearTableCellStyles,
  equalizeTableColumns,
  insertTableColumn,
  insertTableRow,
  mergeTableRange,
  pasteTableText,
  removeTableColumns,
  removeTableRows,
  tableRangeToTsv,
  unmergeTableRange,
  updateTableCellContent,
  type StudyTableData,
  type StudyTableRangeBounds,
} from "./tableCore";

export type SelectedCell = {
  blockId: string;
  rowIndex: number;
  columnIndex: number;
};

export type SelectedCellRange = {
  blockId: string;
  anchorRowIndex: number;
  anchorColumnIndex: number;
  focusRowIndex: number;
  focusColumnIndex: number;
};

type TableMenuTarget =
  | {
      kind: "cell";
      rowIndex: number;
      columnIndex: number;
      x: number;
      y: number;
    }
  | {
      kind: "row";
      rowIndex: number;
      x: number;
      y: number;
    }
  | {
      kind: "column";
      columnIndex: number;
      x: number;
      y: number;
    };

interface TableBlockEditorProps {
  block: StudyTableBlock;
  selectedRange: SelectedCellRange | null;
  activeTextEditorId: string | null;
  toolbarTarget: HTMLDivElement | null;
  onSelectCellStart: (event: MouseEvent<HTMLDivElement>, cell: SelectedCell) => void;
  onExtendSelection: (cell: SelectedCell) => void;
  onSelectRange: (range: SelectedCellRange) => void;
  onSelectCell: (cell: SelectedCell, extend?: boolean) => void;
  onActivateTextEditor: (editorId: string) => void;
  onExitTextEditor: () => void;
  onChangeTable: (table: StudyTableData) => void;
  onColumnResizeStart: (event: PointerEvent<HTMLButtonElement>, block: StudyTableBlock, columnIndex: number) => void;
  onRowResizeStart: (event: PointerEvent<HTMLButtonElement>, block: StudyTableBlock, rowIndex: number) => void;
  onResizeMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onResizeEnd: (event: PointerEvent<HTMLButtonElement>) => void;
}

export function TableBlockEditor({
  block,
  selectedRange,
  activeTextEditorId,
  toolbarTarget,
  onSelectCellStart,
  onExtendSelection,
  onSelectRange,
  onSelectCell,
  onActivateTextEditor,
  onExitTextEditor,
  onChangeTable,
  onColumnResizeStart,
  onRowResizeStart,
  onResizeMove,
  onResizeEnd,
}: TableBlockEditorProps) {
  const [menuTarget, setMenuTarget] = useState<TableMenuTarget | null>(null);
  const cellRefs = useRef(new Map<string, HTMLDivElement>());
  const selectedBounds = selectedRange?.blockId === block.id ? getCellRangeBounds(selectedRange) : null;
  const focusRowIndex = selectedRange?.blockId === block.id ? selectedRange.focusRowIndex : 0;
  const focusColumnIndex = selectedRange?.blockId === block.id ? selectedRange.focusColumnIndex : 0;

  useEffect(() => {
    if (!menuTarget) return;

    function closeMenu() {
      setMenuTarget(null);
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [menuTarget]);

  function setCellRef(rowIndex: number, columnIndex: number, element: HTMLDivElement | null) {
    const key = cellKey(rowIndex, columnIndex);

    if (!element) {
      cellRefs.current.delete(key);
      return;
    }

    cellRefs.current.set(key, element);
  }

  function focusCell(rowIndex: number, columnIndex: number) {
    requestAnimationFrame(() => {
      cellRefs.current.get(cellKey(rowIndex, columnIndex))?.focus();
    });
  }

  function focusCellEditor(rowIndex: number, columnIndex: number) {
    requestAnimationFrame(() => {
      const editor = cellRefs.current
        .get(cellKey(rowIndex, columnIndex))
        ?.querySelector<HTMLElement>('[contenteditable="true"]');

      editor?.focus();
    });
  }

  function selectRow(event: MouseEvent, rowIndex: number) {
    event.preventDefault();
    onSelectRange({
      blockId: block.id,
      anchorRowIndex: rowIndex,
      focusRowIndex: rowIndex,
      anchorColumnIndex: 0,
      focusColumnIndex: block.table.columns.length - 1,
    });
    focusCell(rowIndex, 0);
  }

  function selectColumn(event: MouseEvent, columnIndex: number) {
    event.preventDefault();
    onSelectRange({
      blockId: block.id,
      anchorRowIndex: 0,
      focusRowIndex: block.table.rows.length - 1,
      anchorColumnIndex: columnIndex,
      focusColumnIndex: columnIndex,
    });
    focusCell(0, columnIndex);
  }

  function openCellMenu(event: MouseEvent, rowIndex: number, columnIndex: number) {
    event.preventDefault();
    if (!isCellInSelectedRange(selectedRange, block.id, rowIndex, columnIndex)) {
      onSelectCell({ blockId: block.id, rowIndex, columnIndex });
    }
    setMenuTarget({ kind: "cell", rowIndex, columnIndex, x: event.clientX, y: event.clientY });
  }

  function openRowMenu(event: MouseEvent, rowIndex: number) {
    selectRow(event, rowIndex);
    setMenuTarget({ kind: "row", rowIndex, x: event.clientX, y: event.clientY });
  }

  function openColumnMenu(event: MouseEvent, columnIndex: number) {
    selectColumn(event, columnIndex);
    setMenuTarget({ kind: "column", columnIndex, x: event.clientX, y: event.clientY });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;

    if (target?.isContentEditable) {
      if (event.key === "Escape") {
        event.preventDefault();
        onExitTextEditor();
        focusCell(focusRowIndex, focusColumnIndex);
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      const tsv = selectedBounds ? tableRangeToTsv(block.table, selectedBounds) : "";
      if (tsv) void navigator.clipboard?.writeText(tsv);
      return;
    }

    const maxRow = block.table.rows.length - 1;
    const maxColumn = block.table.columns.length - 1;
    let nextRow = focusRowIndex;
    let nextColumn = focusColumnIndex;

    if (event.key === "ArrowUp") nextRow = Math.max(0, focusRowIndex - 1);
    else if (event.key === "ArrowDown") nextRow = Math.min(maxRow, focusRowIndex + 1);
    else if (event.key === "ArrowLeft") nextColumn = Math.max(0, focusColumnIndex - 1);
    else if (event.key === "ArrowRight") nextColumn = Math.min(maxColumn, focusColumnIndex + 1);
    else if (event.key === "Tab") {
      event.preventDefault();
      const direction = event.shiftKey ? -1 : 1;
      const flatIndex = focusRowIndex * block.table.columns.length + focusColumnIndex + direction;
      const boundedIndex = Math.max(0, Math.min(block.table.rows.length * block.table.columns.length - 1, flatIndex));
      nextRow = Math.floor(boundedIndex / block.table.columns.length);
      nextColumn = boundedIndex % block.table.columns.length;
    } else if (event.key === "Enter") {
      event.preventDefault();
      const editorId = `cell:${block.id}:${focusRowIndex}:${focusColumnIndex}`;
      onActivateTextEditor(editorId);
      focusCellEditor(focusRowIndex, focusColumnIndex);
      return;
    } else if (event.key === "Escape") {
      event.preventDefault();
      onExitTextEditor();
      return;
    } else {
      return;
    }

    event.preventDefault();
    onSelectCell({ blockId: block.id, rowIndex: nextRow, columnIndex: nextColumn }, event.shiftKey);
    focusCell(nextRow, nextColumn);
  }

  function handleCopy(event: ClipboardEvent<HTMLDivElement>) {
    if (!selectedBounds) return;

    event.preventDefault();
    event.clipboardData.setData("text/plain", tableRangeToTsv(block.table, selectedBounds));
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (target?.isContentEditable) return;

    const text = event.clipboardData.getData("text/plain");
    if (!text.trim()) return;

    event.preventDefault();
    onChangeTable(pasteTableText(block.table, focusRowIndex, focusColumnIndex, text));
  }

  function updateBySelectedRange(update: (table: StudyTableData, bounds: StudyTableRangeBounds) => StudyTableData) {
    const bounds = selectedBounds ?? {
      minRow: focusRowIndex,
      maxRow: focusRowIndex,
      minColumn: focusColumnIndex,
      maxColumn: focusColumnIndex,
    };

    onChangeTable(update(block.table, bounds));
    setMenuTarget(null);
  }

  function applyMenuTable(table: StudyTableData) {
    onChangeTable(table);
    setMenuTarget(null);
  }

  function selectedRowIndexes() {
    const bounds = selectedBounds;
    if (!bounds) return menuTarget?.kind === "row" ? [menuTarget.rowIndex] : [focusRowIndex];

    return Array.from({ length: bounds.maxRow - bounds.minRow + 1 }, (_, index) => bounds.minRow + index);
  }

  function selectedColumnIndexes() {
    const bounds = selectedBounds;
    if (!bounds) return menuTarget?.kind === "column" ? [menuTarget.columnIndex] : [focusColumnIndex];

    return Array.from({ length: bounds.maxColumn - bounds.minColumn + 1 }, (_, index) => bounds.minColumn + index);
  }

  return (
    <div className="study-table-block">
      <div className="study-table-scroll">
        <div
          className="study-table-grid"
          style={{
            gridTemplateColumns: `42px ${block.table.columns.map((column) => `${column.width}px`).join(" ")}`,
            gridTemplateRows: `34px ${block.table.rows.map((row) => `${row.height}px`).join(" ")}`,
          }}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onCopy={handleCopy}
          onPaste={handlePaste}
        >
          <div className="study-table-corner" style={{ gridColumn: 1, gridRow: 1 }} />

          {block.table.columns.map((column, columnIndex) => (
            <div
              className={`study-table-column-header ${selectedBounds && columnIndex >= selectedBounds.minColumn && columnIndex <= selectedBounds.maxColumn ? "selected" : ""}`}
              style={{ gridColumn: columnIndex + 2, gridRow: 1 }}
              key={column.id}
              onMouseDown={(event) => selectColumn(event, columnIndex)}
              onContextMenu={(event) => openColumnMenu(event, columnIndex)}
            >
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

          {block.table.rows.map((row, rowIndex) => (
            <div
              className={`study-table-row-header ${selectedBounds && rowIndex >= selectedBounds.minRow && rowIndex <= selectedBounds.maxRow ? "selected" : ""}`}
              style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
              key={row.id}
              onMouseDown={(event) => selectRow(event, rowIndex)}
              onContextMenu={(event) => openRowMenu(event, rowIndex)}
            >
              <span>{rowIndex + 1}</span>
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
          ))}

          {block.table.rows.flatMap((row, rowIndex) =>
            row.cells.map((cell, columnIndex) => {
              if (cell.mergedInto) return null;

              const isSelected = isCellInSelectedRange(selectedRange, block.id, rowIndex, columnIndex, cell.rowSpan, cell.colSpan);
              const editorId = `cell:${block.id}:${rowIndex}:${columnIndex}`;
              const isFocused =
                selectedRange?.blockId === block.id &&
                selectedRange.focusRowIndex === rowIndex &&
                selectedRange.focusColumnIndex === columnIndex;
              const isHeaderRow = block.table.settings.hasHeaderRow && rowIndex === 0;
              const isHeaderColumn = block.table.settings.hasHeaderColumn && columnIndex === 0;

              return (
                <div
                  className={`study-table-cell ${isSelected ? "selected" : ""} ${isHeaderRow ? "header-row" : ""} ${isHeaderColumn ? "header-column" : ""}`}
                  style={{
                    gridColumn: `${columnIndex + 2} / span ${cell.colSpan}`,
                    gridRow: `${rowIndex + 2} / span ${cell.rowSpan}`,
                    backgroundColor: cell.style.backgroundColor,
                    borderColor: cell.style.borderColor,
                    borderWidth: cell.style.borderWidth,
                    color: cell.style.textColor,
                    textAlign: cell.style.align,
                    alignItems: verticalAlignToFlex(cell.style.verticalAlign),
                    fontWeight: cell.style.fontWeight,
                  }}
                  key={cell.id}
                  tabIndex={isFocused ? 0 : -1}
                  ref={(element) => setCellRef(rowIndex, columnIndex, element)}
                  onMouseDown={(event) => {
                    event.currentTarget.focus();
                    onSelectCellStart(event, { blockId: block.id, rowIndex, columnIndex });
                  }}
                  onMouseEnter={() => onExtendSelection({ blockId: block.id, rowIndex, columnIndex })}
                  onContextMenu={(event) => openCellMenu(event, rowIndex, columnIndex)}
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
                    className="study-table-cell-row-resizer"
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

      {menuTarget ? (
        <div
          className="study-table-context-menu"
          style={{ left: Math.min(menuTarget.x, window.innerWidth - 240), top: Math.min(menuTarget.y, window.innerHeight - 320) }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={() => updateBySelectedRange((table) => insertTableRow(table, selectedBounds?.minRow ?? focusRowIndex))}>
            Строка выше
          </button>
          <button type="button" onClick={() => updateBySelectedRange((table) => insertTableRow(table, (selectedBounds?.maxRow ?? focusRowIndex) + 1))}>
            Строка ниже
          </button>
          <button type="button" onClick={() => updateBySelectedRange((table) => insertTableColumn(table, selectedBounds?.minColumn ?? focusColumnIndex))}>
            Колонка слева
          </button>
          <button type="button" onClick={() => updateBySelectedRange((table) => insertTableColumn(table, (selectedBounds?.maxColumn ?? focusColumnIndex) + 1))}>
            Колонка справа
          </button>
          <span />
          <button type="button" onClick={() => applyMenuTable(removeTableRows(block.table, selectedRowIndexes()))}>
            Удалить строки
          </button>
          <button type="button" onClick={() => applyMenuTable(removeTableColumns(block.table, selectedColumnIndexes()))}>
            Удалить колонки
          </button>
          <span />
          <button type="button" onClick={() => updateBySelectedRange(clearTableCellContents)}>
            Очистить содержимое
          </button>
          <button type="button" onClick={() => updateBySelectedRange(clearTableCellStyles)}>
            Очистить стиль
          </button>
          <button type="button" onClick={() => updateBySelectedRange(mergeTableRange)}>
            Объединить
          </button>
          <button type="button" onClick={() => updateBySelectedRange(unmergeTableRange)}>
            Разъединить
          </button>
          <span />
          <button type="button" onClick={() => updateBySelectedRange(equalizeTableColumns)}>
            Выровнять ширину
          </button>
          <button type="button" onClick={() => updateBySelectedRange(autoFitTableColumns)}>
            Автоширина
          </button>
          <button type="button" onClick={() => updateBySelectedRange(autoFitTableRows)}>
            Автовысота
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function getCellRangeBounds(range: SelectedCellRange) {
  return {
    minRow: Math.min(range.anchorRowIndex, range.focusRowIndex),
    maxRow: Math.max(range.anchorRowIndex, range.focusRowIndex),
    minColumn: Math.min(range.anchorColumnIndex, range.focusColumnIndex),
    maxColumn: Math.max(range.anchorColumnIndex, range.focusColumnIndex),
  };
}

export function getCellRangeArea(range: SelectedCellRange) {
  const bounds = getCellRangeBounds(range);
  return (bounds.maxRow - bounds.minRow + 1) * (bounds.maxColumn - bounds.minColumn + 1);
}

function isCellInSelectedRange(
  range: SelectedCellRange | null,
  blockId: string,
  rowIndex: number,
  columnIndex: number,
  rowSpan = 1,
  colSpan = 1,
) {
  if (!range || range.blockId !== blockId) return false;

  const bounds = getCellRangeBounds(range);
  const cellMaxRow = rowIndex + rowSpan - 1;
  const cellMaxColumn = columnIndex + colSpan - 1;

  return (
    rowIndex <= bounds.maxRow &&
    cellMaxRow >= bounds.minRow &&
    columnIndex <= bounds.maxColumn &&
    cellMaxColumn >= bounds.minColumn
  );
}

function verticalAlignToFlex(value: string) {
  if (value === "middle") return "center";
  if (value === "bottom") return "flex-end";
  return "flex-start";
}

function cellKey(rowIndex: number, columnIndex: number) {
  return `${rowIndex}:${columnIndex}`;
}
