import type {
  StudyTableCellSpan,
  StudyTableCellStyle,
} from "../types";

export interface SelectedCell {
  rowIndex: number;
  columnIndex: number;
}

export interface TableCellRange {
  startRowIndex: number;
  startColumnIndex: number;
  endRowIndex: number;
  endColumnIndex: number;
}

export type CellStyleMap = Record<string, StudyTableCellStyle>;
export type CellSpanMap = Record<string, StudyTableCellSpan>;

export const DEFAULT_COLUMN_WIDTH = 180;
export const MIN_COLUMN_WIDTH = 80;
export const MAX_COLUMN_WIDTH = 600;

export function getCellKey(rowIndex: number, columnIndex: number): string {
  return `${rowIndex}:${columnIndex}`;
}

export function parseCellKey(key: string): SelectedCell | null {
  const [row, column] = key.split(":").map(Number);

  if (!Number.isInteger(row) || !Number.isInteger(column)) {
    return null;
  }

  return {
    rowIndex: row,
    columnIndex: column,
  };
}

export function normalizeRows(rows: string[][]): string[][] {
  const safeRows =
    rows.length > 0
      ? rows
      : [
          ["", ""],
          ["", ""],
        ];
  const maxColumns = Math.max(1, ...safeRows.map((row) => row.length));

  return safeRows.map((row) => [
    ...row,
    ...Array.from({ length: maxColumns - row.length }, () => ""),
  ]);
}

export function normalizeColumnWidths(
  columnWidths: number[] | undefined,
  columnCount: number,
): number[] {
  return Array.from({ length: columnCount }, (_, index) => {
    const width = columnWidths?.[index] ?? DEFAULT_COLUMN_WIDTH;

    return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width));
  });
}

export function normalizeRange(range: TableCellRange): TableCellRange {
  return {
    startRowIndex: Math.min(range.startRowIndex, range.endRowIndex),
    endRowIndex: Math.max(range.startRowIndex, range.endRowIndex),
    startColumnIndex: Math.min(range.startColumnIndex, range.endColumnIndex),
    endColumnIndex: Math.max(range.startColumnIndex, range.endColumnIndex),
  };
}

export function createRangeFromCell(cell: SelectedCell): TableCellRange {
  return {
    startRowIndex: cell.rowIndex,
    startColumnIndex: cell.columnIndex,
    endRowIndex: cell.rowIndex,
    endColumnIndex: cell.columnIndex,
  };
}

export function getCellsInRange(range: TableCellRange): SelectedCell[] {
  const normalizedRange = normalizeRange(range);
  const cells: SelectedCell[] = [];

  for (
    let rowIndex = normalizedRange.startRowIndex;
    rowIndex <= normalizedRange.endRowIndex;
    rowIndex += 1
  ) {
    for (
      let columnIndex = normalizedRange.startColumnIndex;
      columnIndex <= normalizedRange.endColumnIndex;
      columnIndex += 1
    ) {
      cells.push({
        rowIndex,
        columnIndex,
      });
    }
  }

  return cells;
}

export function isSingleCellRange(range: TableCellRange): boolean {
  const normalizedRange = normalizeRange(range);

  return (
    normalizedRange.startRowIndex === normalizedRange.endRowIndex &&
    normalizedRange.startColumnIndex === normalizedRange.endColumnIndex
  );
}

export function isEmptyCellStyle(style: StudyTableCellStyle): boolean {
  return Object.values(style).every((value) => !value);
}

export function cleanCellSpans(spans: CellSpanMap): CellSpanMap | undefined {
  const nextSpans: CellSpanMap = {};

  Object.entries(spans).forEach(([key, span]) => {
    const rowSpan = Math.max(1, Math.round(span.rowSpan ?? 1));
    const colSpan = Math.max(1, Math.round(span.colSpan ?? 1));
    const hidden = Boolean(span.hidden);

    if (!hidden && rowSpan <= 1 && colSpan <= 1) {
      return;
    }

    nextSpans[key] = {
      ...(rowSpan > 1 ? { rowSpan } : {}),
      ...(colSpan > 1 ? { colSpan } : {}),
      ...(hidden ? { hidden } : {}),
    };
  });

  return Object.keys(nextSpans).length > 0 ? nextSpans : undefined;
}

export function cleanMergeBackups(
  backups: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> | undefined {
  return Object.keys(backups).length > 0 ? backups : undefined;
}

export function stripHtml(value: string): string {
  if (!value) {
    return "";
  }

  const element = document.createElement("div");
  element.innerHTML = value;

  return element.textContent || element.innerText || "";
}

export function escapeCsvCell(value: string): string {
  const cleanValue = stripHtml(value);

  if (
    cleanValue.indexOf(",") !== -1 ||
    cleanValue.indexOf('"') !== -1 ||
    cleanValue.indexOf("\n") !== -1
  ) {
    return '"' + cleanValue.split('"').join('""') + '"';
  }

  return cleanValue;
}

export function isProbablyTableText(value: string): boolean {
  const cleanValue = value.replace(/\r/g, "");

  if (!cleanValue.trim()) {
    return false;
  }

  if (cleanValue.indexOf("\t") !== -1) {
    return true;
  }

  const lines = cleanValue.split("\n").filter((line) => line.trim().length > 0);

  return lines.length > 1;
}

export function parseClipboardTableText(value: string): string[][] {
  const cleanValue = value.replace(/\r/g, "");
  const lines = cleanValue.split("\n");

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.map((line) => line.split("\t"));
}

export function createEmptyRow(columnCount: number): string[] {
  return Array.from({ length: columnCount }, () => "");
}

export function combineCellContents(contents: string[]): string {
  return contents
    .map((content) => content.trim())
    .filter(Boolean)
    .join("<br>");
}

export function transformCellStyles(
  styles: CellStyleMap,
  mapper: (
    rowIndex: number,
    columnIndex: number,
    style: StudyTableCellStyle,
  ) => { rowIndex: number; columnIndex: number; style: StudyTableCellStyle } | null,
): CellStyleMap {
  const nextStyles: CellStyleMap = {};

  Object.entries(styles).forEach(([key, style]) => {
    const parsed = parseCellKey(key);

    if (!parsed) {
      return;
    }

    const next = mapper(parsed.rowIndex, parsed.columnIndex, style);

    if (!next || isEmptyCellStyle(next.style)) {
      return;
    }

    nextStyles[getCellKey(next.rowIndex, next.columnIndex)] = next.style;
  });

  return nextStyles;
}
