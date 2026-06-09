import { createRichTextDocument, richTextHtmlToPlainText, type RichTextDocument } from "../richText/richTextCore";

export interface StudyTableCellStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

export interface StudyTableCell {
  id: string;
  content: RichTextDocument;
  style: StudyTableCellStyle;
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

export interface StudyTableData {
  columns: StudyTableColumn[];
  rows: StudyTableRow[];
}

const DEFAULT_COLUMN_WIDTH = 180;
const DEFAULT_ROW_HEIGHT = 92;
const MIN_COLUMN_WIDTH = 96;
const MIN_ROW_HEIGHT = 56;

export const defaultCellStyle: StudyTableCellStyle = {
  backgroundColor: "transparent",
  borderColor: "rgba(148, 163, 184, 0.22)",
  textColor: "#e5e7eb",
};

export function createStudyTable(rowCount = 3, columnCount = 3): StudyTableData {
  const columns = Array.from({ length: columnCount }, () => createTableColumn());

  return {
    columns,
    rows: Array.from({ length: rowCount }, () => createTableRow(columns.length)),
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

  return { columns, rows };
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
  return {
    ...table,
    rows: [...table.rows, createTableRow(table.columns.length)],
  };
}

export function addTableColumn(table: StudyTableData): StudyTableData {
  return {
    columns: [...table.columns, createTableColumn()],
    rows: table.rows.map((row) => ({
      ...row,
      cells: [...row.cells, createTableCell()],
    })),
  };
}

export function removeTableRow(table: StudyTableData, rowIndex: number): StudyTableData {
  if (table.rows.length <= 1) return table;

  return {
    ...table,
    rows: table.rows.filter((_, index) => index !== rowIndex),
  };
}

export function removeTableColumn(table: StudyTableData, columnIndex: number): StudyTableData {
  if (table.columns.length <= 1) return table;

  return {
    columns: table.columns.filter((_, index) => index !== columnIndex),
    rows: table.rows.map((row) => ({
      ...row,
      cells: row.cells.filter((_, index) => index !== columnIndex),
    })),
  };
}

export function tableToPlainText(table: StudyTableData) {
  return table.rows
    .map((row) =>
      row.cells
        .map((cell) => richTextHtmlToPlainText(cell.content))
        .filter(Boolean)
        .join(" | "),
    )
    .filter(Boolean)
    .join("\n");
}

function normalizeTableRow(value: unknown, columnCount: number): StudyTableRow {
  const source = (value ?? {}) as Partial<StudyTableRow>;
  const rawCells = Array.isArray(source.cells) ? source.cells : [];

  return {
    id: typeof source.id === "string" ? source.id : createTableId("row"),
    height: clampRowHeight(Number(source.height) || DEFAULT_ROW_HEIGHT),
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
  };
}

function updateTableCell(
  table: StudyTableData,
  rowIndex: number,
  columnIndex: number,
  update: (cell: StudyTableCell) => StudyTableCell,
): StudyTableData {
  return {
    ...table,
    rows: table.rows.map((row, currentRowIndex) =>
      currentRowIndex === rowIndex
        ? {
            ...row,
            cells: row.cells.map((cell, currentColumnIndex) =>
              currentColumnIndex === columnIndex ? update(cell) : cell,
            ),
          }
        : row,
    ),
  };
}

function sanitizeCellStyle(style: Partial<StudyTableCellStyle>) {
  return {
    backgroundColor: safeColor(style.backgroundColor, defaultCellStyle.backgroundColor),
    borderColor: safeColor(style.borderColor, defaultCellStyle.borderColor),
    textColor: safeColor(style.textColor, defaultCellStyle.textColor),
  };
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
  return Math.max(MIN_COLUMN_WIDTH, Math.min(520, Math.round(width)));
}

function clampRowHeight(height: number) {
  return Math.max(MIN_ROW_HEIGHT, Math.min(420, Math.round(height)));
}

function createTableId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
