import { type MouseEvent, type PointerEvent } from "react";
import type { StudyTableBlock } from "../../core/blockCore";
import { RichTextEditor } from "../richText/RichTextEditor";
import { updateTableCellContent, type StudyTableData } from "./tableCore";

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

interface TableBlockEditorProps {
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
}

export function TableBlockEditor({
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
}: TableBlockEditorProps) {
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
