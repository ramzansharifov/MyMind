import { createRichTextDocument, richTextHtmlToPlainText, type RichTextDocument } from "../richText/richTextCore";

export type StudyTableHorizontalAlign = "left" | "center" | "right";
export type StudyTableVerticalAlign = "top" | "middle" | "bottom";
export type StudyTableFontWeight = "normal" | "bold";
export type StudyTableTemplate = "plain" | "comparison" | "plan" | "terms" | "formula";

export interface StudyTableCellStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  align: StudyTableHorizontalAlign;
  verticalAlign: StudyTableVerticalAlign;
  fontWeight: StudyTableFontWeight;
  borderWidth: number;
}

export interface StudyTableCell {
  id: string;
  content: RichTextDocument;
  style: StudyTableCellStyle;
  rowSpan: number;
  colSpan: number;
  mergedInto: string | null;
}

export interface StudyTableColumn {
  id: string;
  width: number;
}

export interface StudyTableRow {
  id: string;
  height: number;
  cells: StudyTableCell[];
}

export interface StudyTableSettings {
  schemaVersion: 1;
  hasHeaderRow: boolean;
  hasHeaderColumn: boolean;
  template: StudyTableTemplate;
}

export interface StudyTableRangeBounds {
  minRow: number;
  maxRow: number;
  minColumn: number;
  maxColumn: number;
}

export interface StudyTableData {
  columns: StudyTableColumn[];
  rows: StudyTableRow[];
  settings: StudyTableSettings;
}

const DEFAULT_COLUMN_WIDTH = 180;
const DEFAULT_ROW_HEIGHT = 46;
const MIN_COLUMN_WIDTH = 96;
const MIN_ROW_HEIGHT = 38;
const MAX_COLUMN_WIDTH = 520;
const MAX_ROW_HEIGHT = 420;

export const defaultCellStyle: StudyTableCellStyle = {
  backgroundColor: "transparent",
  borderColor: "rgba(148, 163, 184, 0.22)",
  textColor: "#e5e7eb",
  align: "left",
  verticalAlign: "top",
  fontWeight: "normal",
  borderWidth: 1,
};

export const defaultTableSettings: StudyTableSettings = {
  schemaVersion: 1,
  hasHeaderRow: false,
  hasHeaderColumn: false,
  template: "plain",
};

export function createStudyTable(rowCount = 3, columnCount = 3): StudyTableData {
  const columns = Array.from({ length: columnCount }, () => createTableColumn());

  return {
    columns,
    rows: Array.from({ length: rowCount }, () => createTableRow(columns.length)),
    settings: { ...defaultTableSettings },
  };
}

export function createTableColumn(width = DEFAULT_COLUMN_WIDTH): StudyTableColumn {
  return {
    id: createTableId("column"),
    width: clampColumnWidth(width),
  };
}

export function createTableRow(columnCount: number, height = DEFAULT_ROW_HEIGHT): StudyTableRow {
  return {
    id: createTableId("row"),
    height: clampRowHeight(height),
    cells: Array.from({ length: columnCount }, () => createTableCell()),
  };
}

export function createTableCell(): StudyTableCell {
  return {
    id: createTableId("cell"),
    content: createRichTextDocument(""),
    style: { ...defaultCellStyle },
    rowSpan: 1,
    colSpan: 1,
    mergedInto: null,
  };
}

export function normalizeStudyTable(value: unknown): StudyTableData {
  const source = (value ?? {}) as Partial<StudyTableData>;
  const rawColumns = Array.isArray(source.columns) ? source.columns : [];
  const rawRows = Array.isArray(source.rows) ? source.rows : [];
  const columnCount = Math.max(1, rawColumns.length || rawRows[0]?.cells?.length || 3);

  const columns = Array.from({ length: columnCount }, (_, index) => {
    const column = rawColumns[index];

    return {
      id: typeof column?.id === "string" ? column.id : createTableId("column"),
      width: clampColumnWidth(Number(column?.width) || DEFAULT_COLUMN_WIDTH),
    };
  });

  const rows =
    rawRows.length > 0
      ? rawRows.map((row) => normalizeTableRow(row, columns.length))
      : Array.from({ length: 3 }, () => createTableRow(columns.length));

  return sanitizeMergedCells({
    columns,
    rows,
    settings: normalizeTableSettings(source.settings),
  });
}

export function resizeTableColumn(table: StudyTableData, columnIndex: number, width: number): StudyTableData {
  return {
    ...table,
    columns: table.columns.map((column, index) =>
      index === columnIndex ? { ...column, width: clampColumnWidth(width) } : column,
    ),
  };
}

export function resizeTableRow(table: StudyTableData, rowIndex: number, height: number): StudyTableData {
  return {
    ...table,
    rows: table.rows.map((row, index) =>
      index === rowIndex ? { ...row, height: clampRowHeight(height) } : row,
    ),
  };
}

export function updateTableSettings(table: StudyTableData, settings: Partial<StudyTableSettings>): StudyTableData {
  return {
    ...table,
    settings: normalizeTableSettings({
      ...table.settings,
      ...settings,
    }),
  };
}

export function updateTableCellContent(
  table: StudyTableData,
  rowIndex: number,
  columnIndex: number,
  html: string,
  plainText: string,
): StudyTableData {
  return updateTableCell(table, rowIndex, columnIndex, (cell) => ({
    ...cell,
    content: createRichTextDocument(html, plainText),
  }));
}

export function updateTableCellStyle(
  table: StudyTableData,
  rowIndex: number,
  columnIndex: number,
  style: Partial<StudyTableCellStyle>,
): StudyTableData {
  return updateTableCell(table, rowIndex, columnIndex, (cell) => ({
    ...cell,
    style: {
      ...cell.style,
      ...sanitizeCellStyle(style),
    },
  }));
}

export function addTableRow(table: StudyTableData): StudyTableData {
  return insertTableRow(table, table.rows.length);
}

export function addTableColumn(table: StudyTableData): StudyTableData {
  return insertTableColumn(table, table.columns.length);
}

export function insertTableRow(table: StudyTableData, rowIndex: number): StudyTableData {
  const source = unmergeAllTableCells(table);
  const insertAt = clampIndex(rowIndex, 0, source.rows.length);

  return {
    ...source,
    rows: [...source.rows.slice(0, insertAt), createTableRow(source.columns.length), ...source.rows.slice(insertAt)],
  };
}

export function insertTableColumn(table: StudyTableData, columnIndex: number): StudyTableData {
  const source = unmergeAllTableCells(table);
  const insertAt = clampIndex(columnIndex, 0, source.columns.length);

  return {
    ...source,
    columns: [...source.columns.slice(0, insertAt), createTableColumn(), ...source.columns.slice(insertAt)],
    rows: source.rows.map((row) => ({
      ...row,
      cells: [...row.cells.slice(0, insertAt), createTableCell(), ...row.cells.slice(insertAt)],
    })),
  };
}

export function removeTableRow(table: StudyTableData, rowIndex: number): StudyTableData {
  return removeTableRows(table, [rowIndex]);
}

export function removeTableColumn(table: StudyTableData, columnIndex: number): StudyTableData {
  return removeTableColumns(table, [columnIndex]);
}

export function removeTableRows(table: StudyTableData, rowIndexes: number[]): StudyTableData {
  if (table.rows.length <= 1) return table;

  const source = unmergeAllTableCells(table);
  const indexes = new Set(rowIndexes.filter((index) => index >= 0 && index < source.rows.length));
  const rows = source.rows.filter((_, index) => !indexes.has(index));

  return {
    ...source,
    rows: rows.length > 0 ? rows : [createTableRow(source.columns.length)],
  };
}

export function removeTableColumns(table: StudyTableData, columnIndexes: number[]): StudyTableData {
  if (table.columns.length <= 1) return table;

  const source = unmergeAllTableCells(table);
  const indexes = new Set(columnIndexes.filter((index) => index >= 0 && index < source.columns.length));
  const columns = source.columns.filter((_, index) => !indexes.has(index));

  if (columns.length === 0) return source;

  return {
    ...source,
    columns,
    rows: source.rows.map((row) => ({
      ...row,
      cells: row.cells.filter((_, index) => !indexes.has(index)),
    })),
  };
}

export function clearTableCellContents(table: StudyTableData, bounds: StudyTableRangeBounds): StudyTableData {
  return updateTableRange(table, bounds, (cell) => ({
    ...cell,
    content: createRichTextDocument(""),
  }));
}

export function clearTableCellStyles(table: StudyTableData, bounds: StudyTableRangeBounds): StudyTableData {
  return updateTableRange(table, bounds, (cell) => ({
    ...cell,
    style: { ...defaultCellStyle },
  }));
}

export function equalizeTableColumns(table: StudyTableData, bounds?: StudyTableRangeBounds): StudyTableData {
  const minColumn = bounds?.minColumn ?? 0;
  const maxColumn = bounds?.maxColumn ?? table.columns.length - 1;
  const selectedIndexes = table.columns
    .map((_, index) => index)
    .filter((index) => index >= minColumn && index <= maxColumn);

  if (selectedIndexes.length === 0) return table;

  const average = Math.round(
    selectedIndexes.reduce((sum, index) => sum + (table.columns[index]?.width ?? DEFAULT_COLUMN_WIDTH), 0) /
      selectedIndexes.length,
  );

  return {
    ...table,
    columns: table.columns.map((column, index) =>
      selectedIndexes.includes(index) ? { ...column, width: clampColumnWidth(average) } : column,
    ),
  };
}

export function autoFitTableColumns(table: StudyTableData, bounds?: StudyTableRangeBounds): StudyTableData {
  const minColumn = bounds?.minColumn ?? 0;
  const maxColumn = bounds?.maxColumn ?? table.columns.length - 1;

  return {
    ...table,
    columns: table.columns.map((column, columnIndex) => {
      if (columnIndex < minColumn || columnIndex > maxColumn) return column;

      const maxTextLength = table.rows.reduce((max, row) => {
        const cell = row.cells[columnIndex];
        if (!cell || cell.mergedInto) return max;

        return Math.max(max, longestLineLength(cellText(cell)));
      }, 0);

      return {
        ...column,
        width: clampColumnWidth(Math.max(MIN_COLUMN_WIDTH, 68 + maxTextLength * 7)),
      };
    }),
  };
}

export function autoFitTableRows(table: StudyTableData, bounds?: StudyTableRangeBounds): StudyTableData {
  const minRow = bounds?.minRow ?? 0;
  const maxRow = bounds?.maxRow ?? table.rows.length - 1;

  return {
    ...table,
    rows: table.rows.map((row, rowIndex) => {
      if (rowIndex < minRow || rowIndex > maxRow) return row;

      const estimatedHeight = row.cells.reduce((max, cell, columnIndex) => {
        if (cell.mergedInto) return max;

        const width = table.columns[columnIndex]?.width ?? DEFAULT_COLUMN_WIDTH;
        const text = cellText(cell);
        const visualLines = text
          .split(/\r?\n/)
          .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / Math.max(14, Math.floor(width / 8)))), 0);

        return Math.max(max, 18 + visualLines * 22);
      }, MIN_ROW_HEIGHT);

      return {
        ...row,
        height: clampRowHeight(estimatedHeight),
      };
    }),
  };
}

export function mergeTableRange(table: StudyTableData, bounds: StudyTableRangeBounds): StudyTableData {
  const safeBounds = clampBounds(table, bounds);

  if (!safeBounds || (safeBounds.minRow === safeBounds.maxRow && safeBounds.minColumn === safeBounds.maxColumn)) {
    return table;
  }

  const source = unmergeTableRange(table, safeBounds);
  const anchor = source.rows[safeBounds.minRow]?.cells[safeBounds.minColumn];
  if (!anchor) return table;

  return {
    ...source,
    rows: source.rows.map((row, rowIndex) => ({
      ...row,
      cells: row.cells.map((cell, columnIndex) => {
        const inRange =
          rowIndex >= safeBounds.minRow &&
          rowIndex <= safeBounds.maxRow &&
          columnIndex >= safeBounds.minColumn &&
          columnIndex <= safeBounds.maxColumn;

        if (!inRange) return cell;

        if (rowIndex === safeBounds.minRow && columnIndex === safeBounds.minColumn) {
          return {
            ...cell,
            rowSpan: safeBounds.maxRow - safeBounds.minRow + 1,
            colSpan: safeBounds.maxColumn - safeBounds.minColumn + 1,
            mergedInto: null,
          };
        }

        return {
          ...cell,
          rowSpan: 1,
          colSpan: 1,
          mergedInto: anchor.id,
        };
      }),
    })),
  };
}

export function unmergeTableRange(table: StudyTableData, bounds: StudyTableRangeBounds): StudyTableData {
  const safeBounds = clampBounds(table, bounds);
  if (!safeBounds) return table;

  const anchorIds = new Set<string>();

  table.rows.forEach((row, rowIndex) => {
    row.cells.forEach((cell, columnIndex) => {
      if (
        rowIndex < safeBounds.minRow ||
        rowIndex > safeBounds.maxRow ||
        columnIndex < safeBounds.minColumn ||
        columnIndex > safeBounds.maxColumn
      ) {
        return;
      }

      if (cell.mergedInto) anchorIds.add(cell.mergedInto);
      if (cell.rowSpan > 1 || cell.colSpan > 1) anchorIds.add(cell.id);
    });
  });

  if (anchorIds.size === 0) return table;

  return {
    ...table,
    rows: table.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) =>
        anchorIds.has(cell.id) || (cell.mergedInto && anchorIds.has(cell.mergedInto))
          ? {
              ...cell,
              rowSpan: 1,
              colSpan: 1,
              mergedInto: null,
            }
          : cell,
      ),
    })),
  };
}

export function unmergeAllTableCells(table: StudyTableData): StudyTableData {
  return {
    ...table,
    rows: table.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => ({
        ...cell,
        rowSpan: 1,
        colSpan: 1,
        mergedInto: null,
      })),
    })),
  };
}

export function applyTableTemplate(table: StudyTableData, template: StudyTableTemplate): StudyTableData {
  const withSettings = updateTableSettings(table, {
    template,
    hasHeaderRow: template !== "plain",
    hasHeaderColumn: template === "terms" || template === "comparison",
  });

  return {
    ...withSettings,
    rows: withSettings.rows.map((row, rowIndex) => ({
      ...row,
      cells: row.cells.map((cell, columnIndex) => ({
        ...cell,
        style: templateCellStyle(template, rowIndex, columnIndex),
      })),
    })),
  };
}

export function tableRangeToTsv(table: StudyTableData, bounds: StudyTableRangeBounds) {
  const safeBounds = clampBounds(table, bounds);
  if (!safeBounds) return "";

  const lines: string[] = [];

  for (let rowIndex = safeBounds.minRow; rowIndex <= safeBounds.maxRow; rowIndex += 1) {
    const values: string[] = [];

    for (let columnIndex = safeBounds.minColumn; columnIndex <= safeBounds.maxColumn; columnIndex += 1) {
      const cell = table.rows[rowIndex]?.cells[columnIndex];
      values.push(cell && !cell.mergedInto ? escapeTsv(cellText(cell)) : "");
    }

    lines.push(values.join("\t"));
  }

  return lines.join("\n");
}

export function pasteTableText(table: StudyTableData, startRowIndex: number, startColumnIndex: number, text: string): StudyTableData {
  const values = parseTableText(text);
  if (values.length === 0) return table;

  let nextTable = unmergeAllTableCells(table);
  const requiredRowCount = startRowIndex + values.length;
  const requiredColumnCount = startColumnIndex + Math.max(...values.map((row) => row.length));

  while (nextTable.rows.length < requiredRowCount) {
    nextTable = addTableRow(nextTable);
  }

  while (nextTable.columns.length < requiredColumnCount) {
    nextTable = addTableColumn(nextTable);
  }

  values.forEach((row, rowOffset) => {
    row.forEach((value, columnOffset) => {
      nextTable = updateTableCellContent(
        nextTable,
        startRowIndex + rowOffset,
        startColumnIndex + columnOffset,
        value,
        value,
      );
    });
  });

  return nextTable;
}

export function tableToPlainText(table: StudyTableData) {
  return table.rows
    .map((row) =>
      row.cells
        .map((cell) => (cell.mergedInto ? "" : cellText(cell)))
        .filter(Boolean)
        .join(" | "),
    )
    .filter(Boolean)
    .join("\n");
}

function normalizeTableSettings(value: unknown): StudyTableSettings {
  const source = (value ?? {}) as Partial<StudyTableSettings>;

  return {
    schemaVersion: 1,
    hasHeaderRow: Boolean(source.hasHeaderRow),
    hasHeaderColumn: Boolean(source.hasHeaderColumn),
    template: normalizeTemplate(source.template),
  };
}

function normalizeTableRow(value: unknown, columnCount: number): StudyTableRow {
  const source = (value ?? {}) as Partial<StudyTableRow>;
  const rawCells = Array.isArray(source.cells) ? source.cells : [];
  const rawHeight = Number(source.height) || DEFAULT_ROW_HEIGHT;
  const height = rawHeight === 92 ? DEFAULT_ROW_HEIGHT : rawHeight;

  return {
    id: typeof source.id === "string" ? source.id : createTableId("row"),
    height: clampRowHeight(height),
    cells: Array.from({ length: columnCount }, (_, index) => normalizeTableCell(rawCells[index])),
  };
}

function normalizeTableCell(value: unknown): StudyTableCell {
  const source = (value ?? {}) as Partial<StudyTableCell>;

  return {
    id: typeof source.id === "string" ? source.id : createTableId("cell"),
    content: createRichTextDocument(source.content),
    style: {
      ...defaultCellStyle,
      ...sanitizeCellStyle(source.style ?? {}),
    },
    rowSpan: Math.max(1, Math.round(Number(source.rowSpan) || 1)),
    colSpan: Math.max(1, Math.round(Number(source.colSpan) || 1)),
    mergedInto: typeof source.mergedInto === "string" ? source.mergedInto : null,
  };
}

function updateTableCell(
  table: StudyTableData,
  rowIndex: number,
  columnIndex: number,
  update: (cell: StudyTableCell) => StudyTableCell,
): StudyTableData {
  const target = table.rows[rowIndex]?.cells[columnIndex];
  if (!target) return table;

  const anchorPosition = target.mergedInto ? findCellById(table, target.mergedInto) : { rowIndex, columnIndex };
  if (!anchorPosition) return table;

  return {
    ...table,
    rows: table.rows.map((row, currentRowIndex) =>
      currentRowIndex === anchorPosition.rowIndex
        ? {
            ...row,
            cells: row.cells.map((cell, currentColumnIndex) =>
              currentColumnIndex === anchorPosition.columnIndex ? update(cell) : cell,
            ),
          }
        : row,
    ),
  };
}

function updateTableRange(
  table: StudyTableData,
  bounds: StudyTableRangeBounds,
  update: (cell: StudyTableCell) => StudyTableCell,
) {
  const safeBounds = clampBounds(table, bounds);
  if (!safeBounds) return table;

  return {
    ...table,
    rows: table.rows.map((row, rowIndex) => ({
      ...row,
      cells: row.cells.map((cell, columnIndex) =>
        rowIndex >= safeBounds.minRow &&
        rowIndex <= safeBounds.maxRow &&
        columnIndex >= safeBounds.minColumn &&
        columnIndex <= safeBounds.maxColumn
          ? update(cell)
          : cell,
      ),
    })),
  };
}

function sanitizeMergedCells(table: StudyTableData): StudyTableData {
  const ids = new Set(table.rows.flatMap((row) => row.cells.map((cell) => cell.id)));

  return {
    ...table,
    rows: table.rows.map((row, rowIndex) => ({
      ...row,
      cells: row.cells.map((cell, columnIndex) => {
        const maxRowSpan = table.rows.length - rowIndex;
        const maxColSpan = table.columns.length - columnIndex;

        return {
          ...cell,
          rowSpan: cell.mergedInto ? 1 : Math.max(1, Math.min(maxRowSpan, Math.round(cell.rowSpan || 1))),
          colSpan: cell.mergedInto ? 1 : Math.max(1, Math.min(maxColSpan, Math.round(cell.colSpan || 1))),
          mergedInto: cell.mergedInto && ids.has(cell.mergedInto) && cell.mergedInto !== cell.id ? cell.mergedInto : null,
        };
      }),
    })),
  };
}

function sanitizeCellStyle(style: Partial<StudyTableCellStyle>): StudyTableCellStyle {
  return {
    backgroundColor: safeColor(style.backgroundColor, defaultCellStyle.backgroundColor),
    borderColor: safeColor(style.borderColor, defaultCellStyle.borderColor),
    textColor: safeColor(style.textColor, defaultCellStyle.textColor),
    align: normalizeHorizontalAlign(style.align),
    verticalAlign: normalizeVerticalAlign(style.verticalAlign),
    fontWeight: style.fontWeight === "bold" ? "bold" : "normal",
    borderWidth: clampBorderWidth(style.borderWidth),
  };
}

function templateCellStyle(template: StudyTableTemplate, rowIndex: number, columnIndex: number): StudyTableCellStyle {
  const isHeaderRow = rowIndex === 0 && template !== "plain";
  const isHeaderColumn = columnIndex === 0 && (template === "terms" || template === "comparison");

  if (template === "plain") return { ...defaultCellStyle };

  if (template === "formula") {
    return {
      ...defaultCellStyle,
      backgroundColor: isHeaderRow ? "rgba(72, 190, 171, 0.16)" : "rgba(15, 23, 42, 0.3)",
      borderColor: "rgba(72, 190, 171, 0.34)",
      align: columnIndex === 0 ? "left" : "center",
      fontWeight: isHeaderRow ? "bold" : "normal",
    };
  }

  if (template === "plan") {
    return {
      ...defaultCellStyle,
      backgroundColor: isHeaderRow ? "rgba(72, 190, 171, 0.16)" : "transparent",
      borderColor: "rgba(148, 163, 184, 0.28)",
      fontWeight: isHeaderRow ? "bold" : "normal",
    };
  }

  return {
    ...defaultCellStyle,
    backgroundColor:
      isHeaderRow || isHeaderColumn
        ? "rgba(72, 190, 171, 0.16)"
        : rowIndex % 2 === 0
          ? "rgba(148, 163, 184, 0.04)"
          : "transparent",
    borderColor: "rgba(72, 190, 171, 0.28)",
    fontWeight: isHeaderRow || isHeaderColumn ? "bold" : "normal",
  };
}

function parseTableText(text: string) {
  const source = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd();
  if (!source) return [];

  if (source.includes("\t")) {
    return source.split("\n").map((line) => line.split("\t"));
  }

  return parseCsv(source);
}

function parseCsv(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(value);
      value = "";
      continue;
    }

    if (char === "\n" && !quoted) {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  rows.push(row);
  return rows;
}

function escapeTsv(value: string) {
  return value.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

function clampBounds(table: StudyTableData, bounds: StudyTableRangeBounds): StudyTableRangeBounds | null {
  if (table.rows.length === 0 || table.columns.length === 0) return null;

  return {
    minRow: clampIndex(Math.min(bounds.minRow, bounds.maxRow), 0, table.rows.length - 1),
    maxRow: clampIndex(Math.max(bounds.minRow, bounds.maxRow), 0, table.rows.length - 1),
    minColumn: clampIndex(Math.min(bounds.minColumn, bounds.maxColumn), 0, table.columns.length - 1),
    maxColumn: clampIndex(Math.max(bounds.minColumn, bounds.maxColumn), 0, table.columns.length - 1),
  };
}

function cellText(cell: StudyTableCell) {
  return richTextHtmlToPlainText(cell.content);
}

function longestLineLength(value: string) {
  return value.split(/\r?\n/).reduce((max, line) => Math.max(max, line.length), 0);
}

function findCellById(table: StudyTableData, cellId: string) {
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const columnIndex = table.rows[rowIndex].cells.findIndex((cell) => cell.id === cellId);
    if (columnIndex >= 0) return { rowIndex, columnIndex };
  }

  return null;
}

function normalizeTemplate(value: unknown): StudyTableTemplate {
  if (value === "comparison" || value === "plan" || value === "terms" || value === "formula") return value;
  return "plain";
}

function normalizeHorizontalAlign(value: unknown): StudyTableHorizontalAlign {
  if (value === "center" || value === "right") return value;
  return "left";
}

function normalizeVerticalAlign(value: unknown): StudyTableVerticalAlign {
  if (value === "middle" || value === "bottom") return value;
  return "top";
}

function safeColor(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const color = value.trim();

  if (color === "transparent") return color;
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
  if (/^rgba?\([\d\s.,%]+\)$/i.test(color)) return color;

  return fallback;
}

function clampColumnWidth(width: number) {
  return Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, Math.round(width)));
}

function clampRowHeight(height: number) {
  return Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, Math.round(height)));
}

function clampBorderWidth(value: unknown) {
  const width = Number(value);
  if (!Number.isFinite(width)) return defaultCellStyle.borderWidth;
  return Math.max(1, Math.min(4, Math.round(width)));
}

function clampIndex(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function createTableId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
