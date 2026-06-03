import {
  useEffect,
  useMemo,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type CSSProperties,
} from "react";
import type {
  StudyNode,
  StudyTableCellSpan,
  StudyTableCellStyle,
  StudyTableBlock,
  StudyBlock,
} from "../../types";
import {
  RichTextEditor,
  type RichTextActiveMarks,
  type RichTextCommand,
} from "./StudyRichTextEditor";
import {
  emitTableSelectionChanged,
  listenTableCommand,
  type TableCellRange,
} from "../../utils/tableEvents";
import { showAppWarning } from "../../utils/appNotice";
import {
  DEFAULT_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  cleanCellSpans,
  cleanMergeBackups,
  combineCellContents,
  createEmptyRow,
  createRangeFromCell,
  escapeCsvCell,
  getCellKey,
  getCellsInRange,
  isEmptyCellStyle,
  isProbablyTableText,
  isSingleCellRange,
  normalizeColumnWidths,
  normalizeRange,
  normalizeRows,
  parseCellKey,
  parseClipboardTableText,
  transformCellStyles,
  type CellSpanMap,
  type CellStyleMap,
  type SelectedCell,
} from "../../utils/tableCore";


interface StudyTableEditorProps {
  block: StudyTableBlock;
  nodes: StudyNode[];
  editable: boolean;
  formatCommand?: RichTextCommand | null;
  onChange: (update: (block: StudyBlock) => StudyBlock) => void;
  onOpenNode: (nodeId: string) => void;
  onRichTextMarksChange?: (marks: RichTextActiveMarks) => void;
  onActiveRichTextEditorChange?: (editorId: string) => void;
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], {
    type: mimeType,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

export function StudyTableEditor({
  block,
  nodes,
  editable,
  formatCommand,
  onChange,
  onOpenNode,
  onRichTextMarksChange,
  onActiveRichTextEditorChange,
}: StudyTableEditorProps) {
  const [selectedRange, setSelectedRange] = useState<TableCellRange | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<SelectedCell | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const rows = useMemo(() => normalizeRows(block.rows), [block.rows]);
  const columnCount = Math.max(1, rows[0]?.length ?? 1);
  const columnWidths = useMemo(
    () => normalizeColumnWidths(block.columnWidths, columnCount),
    [block.columnWidths, columnCount]
  );

  const cellStyles = block.cellStyles ?? {};
  const cellSpans = block.cellSpans ?? {};
  const cellMergeBackups = block.cellMergeBackups ?? {};

  const activeRange = selectedRange ? normalizeRange(selectedRange) : null;
  const activeCell: SelectedCell | null = activeRange
    ? {
        rowIndex: activeRange.startRowIndex,
        columnIndex: activeRange.startColumnIndex,
      }
    : null;

  function getCellEditorId(rowIndex: number, columnIndex: number): string {
    return `${block.id}:cell:${rowIndex}:${columnIndex}`;
  }

  function getCellStyle(rowIndex: number, columnIndex: number): StudyTableCellStyle {
    return cellStyles[getCellKey(rowIndex, columnIndex)] ?? {};
  }

  function getCellSpan(rowIndex: number, columnIndex: number): Required<StudyTableCellSpan> {
    const rawSpan = cellSpans[getCellKey(rowIndex, columnIndex)] ?? {};

    return {
      rowSpan: Math.max(1, rawSpan.rowSpan ?? 1),
      colSpan: Math.max(1, rawSpan.colSpan ?? 1),
      hidden: Boolean(rawSpan.hidden),
    };
  }

  function updateBlock(
    nextRows: string[][],
    nextColumnWidths = columnWidths,
    nextCellStyles = cellStyles,
    nextCellSpans = cellSpans,
    nextCellMergeBackups = cellMergeBackups
  ) {
    onChange(() => ({
      ...block,
      rows: nextRows,
      columnWidths: nextColumnWidths,
      cellStyles: Object.keys(nextCellStyles).length > 0 ? nextCellStyles : undefined,
      cellSpans: cleanCellSpans(nextCellSpans),
      cellMergeBackups: cleanMergeBackups(nextCellMergeBackups),
    }));
  }

  function emitCurrentSelection(range: TableCellRange | null = selectedRange) {
    if (!range) {
      emitTableSelectionChanged(null);
      return;
    }

    const normalizedRange = normalizeRange(range);
    const rowIndex = normalizedRange.startRowIndex;
    const columnIndex = normalizedRange.startColumnIndex;

    emitTableSelectionChanged({
      blockId: block.id,
      rowIndex,
      columnIndex,
      rowCount: rows.length,
      columnCount,
      columnWidth: columnWidths[columnIndex] ?? DEFAULT_COLUMN_WIDTH,
      cellStyle: getCellStyle(rowIndex, columnIndex),
      cellSpan: getCellSpan(rowIndex, columnIndex),
      selectedRange: normalizedRange,
    });
  }

  function setRangeFromCells(anchor: SelectedCell, target: SelectedCell) {
    const nextRange = normalizeRange({
      startRowIndex: anchor.rowIndex,
      startColumnIndex: anchor.columnIndex,
      endRowIndex: target.rowIndex,
      endColumnIndex: target.columnIndex,
    });

    setSelectedRange(nextRange);
    emitCurrentSelection(nextRange);
  }

  function selectSingleCell(rowIndex: number, columnIndex: number) {
    const span = getCellSpan(rowIndex, columnIndex);

    if (span.hidden) {
      return;
    }

    const cell = {
      rowIndex,
      columnIndex,
    };

    const nextRange = createRangeFromCell(cell);

    setSelectionAnchor(cell);
    setSelectedRange(nextRange);
    emitCurrentSelection(nextRange);
  }

  function beginRangeSelection(rowIndex: number, columnIndex: number, shiftKey: boolean) {
    const span = getCellSpan(rowIndex, columnIndex);

    if (span.hidden) {
      return;
    }

    const cell = {
      rowIndex,
      columnIndex,
    };

    if (shiftKey && selectionAnchor) {
      setRangeFromCells(selectionAnchor, cell);
      return;
    }

    setSelectionAnchor(cell);
    setIsSelecting(true);
    setRangeFromCells(cell, cell);
  }

  function updateRangeSelection(rowIndex: number, columnIndex: number) {
    if (!isSelecting || !selectionAnchor) {
      return;
    }

    const span = getCellSpan(rowIndex, columnIndex);

    if (span.hidden) {
      return;
    }

    setRangeFromCells(selectionAnchor, {
      rowIndex,
      columnIndex,
    });
  }

  function requireRange(): TableCellRange | null {
    if (!activeRange) {
      showAppWarning("Cells not selected", "First select one or more table cells.");
      return null;
    }

    return activeRange;
  }

  function updateCell(rowIndex: number, columnIndex: number, value: string) {
    const nextRows = rows.map((row, currentRowIndex) =>
      currentRowIndex === rowIndex
        ? row.map((cell, currentColumnIndex) =>
            currentColumnIndex === columnIndex ? value : cell
          )
        : row
    );

    updateBlock(nextRows);
  }

  function updateSelectedCellStyle(patch: StudyTableCellStyle) {
    const range = requireRange();

    if (!range) {
      return;
    }

    const nextCellStyles: CellStyleMap = {
      ...cellStyles,
    };

    getCellsInRange(range).forEach((cell) => {
      const span = getCellSpan(cell.rowIndex, cell.columnIndex);

      if (span.hidden) {
        return;
      }

      const key = getCellKey(cell.rowIndex, cell.columnIndex);
      const currentStyle = nextCellStyles[key] ?? {};
      const nextStyle: StudyTableCellStyle = {
        ...currentStyle,
        ...patch,
      };

      Object.entries(nextStyle).forEach(([styleKey, value]) => {
        if (!value) {
          delete nextStyle[styleKey as keyof StudyTableCellStyle];
        }
      });

      if (isEmptyCellStyle(nextStyle)) {
        delete nextCellStyles[key];
      } else {
        nextCellStyles[key] = nextStyle;
      }
    });

    updateBlock(rows, columnWidths, nextCellStyles, cellSpans, cellMergeBackups);
    window.setTimeout(() => emitCurrentSelection(range), 0);
  }

  function clearSelectedCellStyle() {
    const range = requireRange();

    if (!range) {
      return;
    }

    const nextCellStyles = {
      ...cellStyles,
    };

    getCellsInRange(range).forEach((cell) => {
      delete nextCellStyles[getCellKey(cell.rowIndex, cell.columnIndex)];
    });

    updateBlock(rows, columnWidths, nextCellStyles, cellSpans, cellMergeBackups);
    window.setTimeout(() => emitCurrentSelection(range), 0);
  }

  function mergeSelectedCells() {
    const range = requireRange();

    if (!range || isSingleCellRange(range)) {
      showAppWarning("Range selection required", "To merge, select at least two cells.");
      return;
    }

    const selectedCells = getCellsInRange(range);

    const hasMergedCellInside = selectedCells.some((cell) => {
      const span = getCellSpan(cell.rowIndex, cell.columnIndex);

      return span.hidden || span.rowSpan > 1 || span.colSpan > 1;
    });

    if (hasMergedCellInside) {
      showAppWarning("Cannot merge", "There are already merged cells in the selection. Split them first.");
      return;
    }

    const masterKey = getCellKey(range.startRowIndex, range.startColumnIndex);
    const backup: Record<string, string> = {};
    const contents: string[] = [];

    selectedCells.forEach((cell) => {
      const key = getCellKey(cell.rowIndex, cell.columnIndex);
      const content = rows[cell.rowIndex]?.[cell.columnIndex] ?? "";

      backup[key] = content;
      contents.push(content);
    });

    const nextRows = rows.map((row) => [...row]);
    nextRows[range.startRowIndex][range.startColumnIndex] = combineCellContents(contents);

    const nextCellSpans: CellSpanMap = {
      ...cellSpans,
      [masterKey]: {
        rowSpan: range.endRowIndex - range.startRowIndex + 1,
        colSpan: range.endColumnIndex - range.startColumnIndex + 1,
      },
    };

    selectedCells.forEach((cell) => {
      const key = getCellKey(cell.rowIndex, cell.columnIndex);

      if (key !== masterKey) {
        nextCellSpans[key] = {
          hidden: true,
        };
      }
    });

    const nextBackups: Record<string, Record<string, string>> = {
      ...cellMergeBackups,
      [masterKey]: backup,
    };

    updateBlock(nextRows, columnWidths, cellStyles, nextCellSpans, nextBackups);

    const nextRange = createRangeFromCell({
      rowIndex: range.startRowIndex,
      columnIndex: range.startColumnIndex,
    });

    setSelectionAnchor({
      rowIndex: range.startRowIndex,
      columnIndex: range.startColumnIndex,
    });
    setSelectedRange(nextRange);

    window.setTimeout(() => emitCurrentSelection(nextRange), 0);
  }

  function splitSelectedCells() {
    const range = requireRange();

    if (!range) {
      return;
    }

    const nextRows = rows.map((row) => [...row]);
    const nextCellSpans: CellSpanMap = {
      ...cellSpans,
    };
    const nextBackups: Record<string, Record<string, string>> = {
      ...cellMergeBackups,
    };

    let splitCount = 0;

    getCellsInRange(range).forEach((cell) => {
      const key = getCellKey(cell.rowIndex, cell.columnIndex);
      const span = getCellSpan(cell.rowIndex, cell.columnIndex);

      if (span.hidden || (span.rowSpan <= 1 && span.colSpan <= 1)) {
        return;
      }

      const backup = nextBackups[key];

      if (backup) {
        Object.entries(backup).forEach(([cellKey, content]) => {
          const parsed = parseCellKey(cellKey);

          if (!parsed) {
            return;
          }

          if (nextRows[parsed.rowIndex]?.[parsed.columnIndex] !== undefined) {
            nextRows[parsed.rowIndex][parsed.columnIndex] = content;
          }
        });
      }

      for (let rowOffset = 0; rowOffset < span.rowSpan; rowOffset += 1) {
        for (let columnOffset = 0; columnOffset < span.colSpan; columnOffset += 1) {
          delete nextCellSpans[getCellKey(cell.rowIndex + rowOffset, cell.columnIndex + columnOffset)];
        }
      }

      delete nextBackups[key];
      splitCount += 1;
    });

    if (splitCount === 0) {
      showAppWarning("Nothing to split", "There are no merged cells in the selection.");
      return;
    }

    updateBlock(nextRows, columnWidths, cellStyles, nextCellSpans, nextBackups);
    window.setTimeout(() => emitCurrentSelection(range), 0);
  }

  function pasteTableTextAt(
    startRowIndex: number,
    startColumnIndex: number,
    clipboardText: string
  ) {
    const matrix = parseClipboardTableText(clipboardText);

    if (matrix.length === 0) {
      return;
    }

    const matrixColumnCount = Math.max(1, ...matrix.map((row) => row.length));
    const nextRowCount = Math.max(rows.length, startRowIndex + matrix.length);
    const nextColumnCount = Math.max(columnCount, startColumnIndex + matrixColumnCount);

    const nextRows = Array.from({ length: nextRowCount }, (_, rowIndex) => {
      const sourceRow = rows[rowIndex] ?? createEmptyRow(columnCount);

      return [
        ...sourceRow,
        ...Array.from({ length: nextColumnCount - sourceRow.length }, () => ""),
      ];
    });

    matrix.forEach((matrixRow, matrixRowIndex) => {
      matrixRow.forEach((cellValue, matrixColumnIndex) => {
        const targetRowIndex = startRowIndex + matrixRowIndex;
        const targetColumnIndex = startColumnIndex + matrixColumnIndex;

        nextRows[targetRowIndex][targetColumnIndex] = cellValue;
      });
    });

    const nextColumnWidths = normalizeColumnWidths(columnWidths, nextColumnCount);

    updateBlock(nextRows, nextColumnWidths, cellStyles, {}, {});

    const nextSelectedCell = {
      rowIndex: Math.min(nextRowCount - 1, startRowIndex + matrix.length - 1),
      columnIndex: Math.min(nextColumnCount - 1, startColumnIndex + matrixColumnCount - 1),
    };

    const nextRange = createRangeFromCell(nextSelectedCell);

    setSelectionAnchor(nextSelectedCell);
    setSelectedRange(nextRange);

    window.setTimeout(() => emitCurrentSelection(nextRange), 0);
  }

  function handleCellPaste(
    event: ReactClipboardEvent<HTMLElement>,
    rowIndex: number,
    columnIndex: number
  ) {
    if (!editable) {
      return;
    }

    const clipboardText = event.clipboardData.getData("text/plain");

    if (!isProbablyTableText(clipboardText)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    pasteTableTextAt(rowIndex, columnIndex, clipboardText);
  }

  function addRowAt(index: number) {
    if (!activeCell) {
      showAppWarning("Cell not selected", "First select a table cell.");
      return;
    }

    const safeIndex = Math.max(0, Math.min(rows.length, index));
    const emptyRow = createEmptyRow(columnCount);

    const nextCellStyles = transformCellStyles(cellStyles, (rowIndex, columnIndex, style) => ({
      rowIndex: rowIndex >= safeIndex ? rowIndex + 1 : rowIndex,
      columnIndex,
      style,
    }));

    updateBlock(
      [...rows.slice(0, safeIndex), emptyRow, ...rows.slice(safeIndex)],
      columnWidths,
      nextCellStyles,
      {},
      {}
    );

    const nextCell = {
      rowIndex: safeIndex,
      columnIndex: activeCell.columnIndex,
    };

    const nextRange = createRangeFromCell(nextCell);

    setSelectionAnchor(nextCell);
    setSelectedRange(nextRange);
    window.setTimeout(() => emitCurrentSelection(nextRange), 0);
  }

  function addColumnAt(index: number) {
    if (!activeCell) {
      showAppWarning("Cell not selected", "First select a table cell.");
      return;
    }

    const safeIndex = Math.max(0, Math.min(columnCount, index));

    const nextRows = rows.map((row) => [
      ...row.slice(0, safeIndex),
      "",
      ...row.slice(safeIndex),
    ]);

    const nextColumnWidths = [
      ...columnWidths.slice(0, safeIndex),
      DEFAULT_COLUMN_WIDTH,
      ...columnWidths.slice(safeIndex),
    ];

    const nextCellStyles = transformCellStyles(cellStyles, (rowIndex, columnIndex, style) => ({
      rowIndex,
      columnIndex: columnIndex >= safeIndex ? columnIndex + 1 : columnIndex,
      style,
    }));

    updateBlock(nextRows, nextColumnWidths, nextCellStyles, {}, {});

    const nextCell = {
      rowIndex: activeCell.rowIndex,
      columnIndex: safeIndex,
    };

    const nextRange = createRangeFromCell(nextCell);

    setSelectionAnchor(nextCell);
    setSelectedRange(nextRange);
    window.setTimeout(() => emitCurrentSelection(nextRange), 0);
  }

  function removeRow(rowIndex: number) {
    if (rows.length <= 1) {
      return;
    }

    const nextRows = rows.filter((_, index) => index !== rowIndex);

    const nextCellStyles = transformCellStyles(cellStyles, (styleRowIndex, columnIndex, style) => {
      if (styleRowIndex === rowIndex) {
        return null;
      }

      return {
        rowIndex: styleRowIndex > rowIndex ? styleRowIndex - 1 : styleRowIndex,
        columnIndex,
        style,
      };
    });

    updateBlock(nextRows, columnWidths, nextCellStyles, {}, {});

    const nextCell = {
      rowIndex: Math.max(0, Math.min(rowIndex, nextRows.length - 1)),
      columnIndex: activeCell?.columnIndex ?? 0,
    };

    const nextRange = createRangeFromCell(nextCell);

    setSelectionAnchor(nextCell);
    setSelectedRange(nextRange);
    window.setTimeout(() => emitCurrentSelection(nextRange), 0);
  }

  function removeColumn(columnIndex: number) {
    if (columnCount <= 1) {
      return;
    }

    const nextRows = rows.map((row) => row.filter((_, index) => index !== columnIndex));
    const nextColumnWidths = columnWidths.filter((_, index) => index !== columnIndex);

    const nextCellStyles = transformCellStyles(cellStyles, (rowIndex, styleColumnIndex, style) => {
      if (styleColumnIndex === columnIndex) {
        return null;
      }

      return {
        rowIndex,
        columnIndex: styleColumnIndex > columnIndex ? styleColumnIndex - 1 : styleColumnIndex,
        style,
      };
    });

    updateBlock(nextRows, nextColumnWidths, nextCellStyles, {}, {});

    const nextCell = {
      rowIndex: activeCell?.rowIndex ?? 0,
      columnIndex: Math.max(0, Math.min(columnIndex, nextColumnWidths.length - 1)),
    };

    const nextRange = createRangeFromCell(nextCell);

    setSelectionAnchor(nextCell);
    setSelectedRange(nextRange);
    window.setTimeout(() => emitCurrentSelection(nextRange), 0);
  }

  function moveRow(rowIndex: number, direction: -1 | 1) {
    const targetIndex = rowIndex + direction;

    if (targetIndex < 0 || targetIndex >= rows.length) {
      return;
    }

    const nextRows = [...rows];
    const current = nextRows[rowIndex];

    nextRows[rowIndex] = nextRows[targetIndex];
    nextRows[targetIndex] = current;

    const nextCellStyles = transformCellStyles(cellStyles, (styleRowIndex, columnIndex, style) => {
      if (styleRowIndex === rowIndex) {
        return {
          rowIndex: targetIndex,
          columnIndex,
          style,
        };
      }

      if (styleRowIndex === targetIndex) {
        return {
          rowIndex,
          columnIndex,
          style,
        };
      }

      return {
        rowIndex: styleRowIndex,
        columnIndex,
        style,
      };
    });

    updateBlock(nextRows, columnWidths, nextCellStyles, {}, {});

    const nextCell = {
      rowIndex: targetIndex,
      columnIndex: activeCell?.columnIndex ?? 0,
    };

    const nextRange = createRangeFromCell(nextCell);

    setSelectionAnchor(nextCell);
    setSelectedRange(nextRange);
    window.setTimeout(() => emitCurrentSelection(nextRange), 0);
  }

  function setColumnWidth(columnIndex: number, width: number) {
    const safeWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width));

    const nextColumnWidths = columnWidths.map((currentWidth, index) =>
      index === columnIndex ? safeWidth : currentWidth
    );

    updateBlock(rows, nextColumnWidths, cellStyles, cellSpans, cellMergeBackups);

    if (activeRange) {
      window.setTimeout(() => emitCurrentSelection(activeRange), 0);
    }
  }

  function exportCsv() {
    const csv = rows
      .map((row) => row.map(escapeCsvCell).join(","))
      .join("\n");

    downloadTextFile("table.csv", csv, "text/csv;charset=utf-8");
  }

  function isCellSelected(rowIndex: number, columnIndex: number): boolean {
    if (!activeRange) {
      return false;
    }

    return (
      rowIndex >= activeRange.startRowIndex &&
      rowIndex <= activeRange.endRowIndex &&
      columnIndex >= activeRange.startColumnIndex &&
      columnIndex <= activeRange.endColumnIndex
    );
  }

  useEffect(() => {
    function stopSelection() {
      setIsSelecting(false);
    }

    window.addEventListener("mouseup", stopSelection);

    return () => {
      window.removeEventListener("mouseup", stopSelection);
    };
  }, []);

  useEffect(() => {
    if (!editable || !activeRange) {
      return;
    }

    emitCurrentSelection(activeRange);
  }, [editable, activeRange, rows.length, columnCount, columnWidths, cellStyles, cellSpans]);

  useEffect(() => {
    return listenTableCommand(block.id, (command) => {
      if (command.type === "exportCsv") {
        exportCsv();
        return;
      }

      if (command.type === "toggleHeader") {
        onChange(() => ({
          ...block,
          rows,
          columnWidths,
          cellStyles,
          cellSpans,
          cellMergeBackups,
          hasHeader: !block.hasHeader,
        }));
        return;
      }

      if (command.type === "mergeSelectedCells") {
        mergeSelectedCells();
        return;
      }

      if (command.type === "splitSelectedCells") {
        splitSelectedCells();
        return;
      }

      if (command.type === "setColumnWidth" && typeof command.value === "number") {
        if (activeCell) {
          setColumnWidth(activeCell.columnIndex, command.value);
        }

        return;
      }

      if (command.type === "setCellBackgroundColor" && typeof command.value === "string") {
        updateSelectedCellStyle({
          backgroundColor: command.value,
        });
        return;
      }

      if (command.type === "setCellTextColor" && typeof command.value === "string") {
        updateSelectedCellStyle({
          textColor: command.value,
        });
        return;
      }

      if (command.type === "setCellTextAlign" && typeof command.value === "string") {
        updateSelectedCellStyle({
          textAlign: command.value as StudyTableCellStyle["textAlign"],
        });
        return;
      }

      if (command.type === "setCellVerticalAlign" && typeof command.value === "string") {
        updateSelectedCellStyle({
          verticalAlign: command.value as StudyTableCellStyle["verticalAlign"],
        });
        return;
      }

      if (command.type === "clearCellStyle") {
        clearSelectedCellStyle();
        return;
      }

      if (!activeCell) {
        showAppWarning("Cell not selected", "First select a table cell.");
        return;
      }

      if (command.type === "addRowAbove") {
        addRowAt(activeCell.rowIndex);
      }

      if (command.type === "addRowBelow") {
        addRowAt(activeCell.rowIndex + 1);
      }

      if (command.type === "deleteRow") {
        removeRow(activeCell.rowIndex);
      }

      if (command.type === "addColumnLeft") {
        addColumnAt(activeCell.columnIndex);
      }

      if (command.type === "addColumnRight") {
        addColumnAt(activeCell.columnIndex + 1);
      }

      if (command.type === "deleteColumn") {
        removeColumn(activeCell.columnIndex);
      }

      if (command.type === "moveRowUp") {
        moveRow(activeCell.rowIndex, -1);
      }

      if (command.type === "moveRowDown") {
        moveRow(activeCell.rowIndex, 1);
      }
    });
  }, [
    block,
    rows,
    columnWidths,
    cellStyles,
    cellSpans,
    cellMergeBackups,
    activeRange,
    activeCell,
  ]);

  return (
    <div className="study-table-container">
      {editable && (
        <div className="study-table-hint">
          Click cell — select one. Shift + click or corner square — select range.
        </div>
      )}

      <div className="study-table-wrap">
        <table className="study-table">
          <colgroup>
            {Array.from({ length: columnCount }, (_, columnIndex) => (
              <col
                key={columnIndex}
                style={{
                  width: columnWidths[columnIndex],
                  minWidth: columnWidths[columnIndex],
                }}
              />
            ))}
          </colgroup>

          <tbody>
            {rows.map((row, rowIndex) => {
              const isHeader = block.hasHeader && rowIndex === 0;

              return (
                <tr key={rowIndex} className={isHeader ? "study-table-row-header" : ""}>
                  {row.map((cell, columnIndex) => {
                    const span = getCellSpan(rowIndex, columnIndex);

                    if (span.hidden) {
                      return null;
                    }

                    const CellTag = isHeader ? "th" : "td";
                    const isSelected = isCellSelected(rowIndex, columnIndex);
                    const cellStyle = getCellStyle(rowIndex, columnIndex);

                    const inlineCellStyle: CSSProperties = {
                      width: columnWidths[columnIndex],
                      minWidth: columnWidths[columnIndex],
                      backgroundColor:
                        cellStyle.backgroundColor ?? (isHeader ? "var(--bg-subtle)" : undefined),
                      color: cellStyle.textColor,
                      textAlign: cellStyle.textAlign,
                      verticalAlign: cellStyle.verticalAlign,
                    };

                    return (
                      <CellTag
                        key={columnIndex}
                        rowSpan={span.rowSpan > 1 ? span.rowSpan : undefined}
                        colSpan={span.colSpan > 1 ? span.colSpan : undefined}
                        onMouseDown={(event) => {
                          if (event.button !== 0) {
                            return;
                          }

                          if (event.shiftKey) {
                            event.preventDefault();
                            beginRangeSelection(rowIndex, columnIndex, true);
                            return;
                          }

                          selectSingleCell(rowIndex, columnIndex);
                        }}
                        onMouseEnter={() => updateRangeSelection(rowIndex, columnIndex)}
                        onPasteCapture={(event) =>
                          handleCellPaste(event, rowIndex, columnIndex)
                        }
                        className={[
                          "study-table-cell",
                          isSelected ? "selected" : "",
                        ].join(" ")}
                        style={inlineCellStyle}
                      >
                        {editable && (
                          <button
                            type="button"
                            aria-label="Select cell range"
                            title="Drag to select range"
                            className="study-table-cell-selector"
                            onMouseDown={(event) => {
                              if (event.button !== 0) {
                                return;
                              }

                              event.preventDefault();
                              event.stopPropagation();
                              beginRangeSelection(rowIndex, columnIndex, event.shiftKey);
                            }}
                          />
                        )}

                        <div className="study-table-rich-cell">
                          <RichTextEditor
                            editorId={getCellEditorId(rowIndex, columnIndex)}
                            value={cell}
                            nodes={nodes}
                            editable={editable}
                            formatCommand={formatCommand}
                            onChange={(nextValue) =>
                              updateCell(rowIndex, columnIndex, nextValue)
                            }
                            onOpenNode={onOpenNode}
                            onActiveMarksChange={onRichTextMarksChange}
                            onActiveEditorChange={onActiveRichTextEditorChange}
                          />
                        </div>
                      </CellTag>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
