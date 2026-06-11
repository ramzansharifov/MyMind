import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ClipboardPaste,
  Columns3,
  Copy,
  Eraser,
  Folder,
  Merge,
  Plus,
  Rows3,
  Split,
  Table2,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import {
  TableBlockEditor,
  addTableColumn,
  addTableRow,
  applyTableTemplate,
  autoFitTableColumns,
  autoFitTableRows,
  clearTableCellContents,
  clearTableCellStyles,
  equalizeTableColumns,
  getCellRangeArea,
  getCellRangeBounds,
  insertTableColumn,
  insertTableRow,
  mergeTableRange,
  pasteTableText,
  removeTableColumn,
  removeTableColumns,
  removeTableRow,
  removeTableRows,
  resizeTableColumn,
  resizeTableRow,
  tableRangeToTsv,
  unmergeTableRange,
  updateTableCellStyle,
  updateTableSettings,
  type SelectedCell,
  type SelectedCellRange,
  type StudyTableData,
  type StudyTableRangeBounds,
  type StudyTableTemplate,
  type TableEditorBlock,
} from '../../shared/blockEditor';
import { createTableItem, normalizeTablesData, nowIso, updateTableData, upsertTable } from './tablesUtils';
import type { TableItem, TablesData } from './types';
import { STUDY_TABLES_FOLDER_ID } from './types';

interface TablesPageProps {
  data: TablesData;
  onChange: (data: TablesData) => void;
}

type DragState =
  | {
      type: 'column';
      blockId: string;
      columnIndex: number;
      startX: number;
      startWidth: number;
    }
  | {
      type: 'row';
      blockId: string;
      rowIndex: number;
      startY: number;
      startHeight: number;
    };

export function TablesPage({ data, onChange }: TablesPageProps) {
  const safeData = useMemo(() => normalizeTablesData(data), [data]);
  const studyFolder = safeData.folders.find((folder) => folder.id === STUDY_TABLES_FOLDER_ID) ?? safeData.folders[0] ?? null;
  const studyTables = safeData.tables.filter((table) => table.folderId === STUDY_TABLES_FOLDER_ID);
  const activeTable = safeData.tables.find((table) => table.id === safeData.activeTableId) ?? studyTables[0] ?? safeData.tables[0] ?? null;

  const [selectedRange, setSelectedRange] = useState<SelectedCellRange | null>(null);
  const [activeTextEditorId, setActiveTextEditorId] = useState<string | null>(null);
  const [textToolbarTarget, setTextToolbarTarget] = useState<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const isSelectingCellsRef = useRef(false);

  useEffect(() => {
    function stopSelecting() {
      isSelectingCellsRef.current = false;
    }

    window.addEventListener('mouseup', stopSelecting);

    return () => {
      window.removeEventListener('mouseup', stopSelecting);
    };
  }, []);

  function updateTables(nextData: TablesData) {
    onChange(normalizeTablesData(nextData));
  }

  function createNewTable() {
    const table = createTableItem(`Таблица ${safeData.tables.length + 1}`, STUDY_TABLES_FOLDER_ID);
    updateTables(upsertTable(safeData, table));
    setSelectedRange(null);
    setActiveTextEditorId(null);
  }

  function selectTable(table: TableItem) {
    updateTables({
      ...safeData,
      activeTableId: table.id,
    });
    setSelectedRange(null);
    setActiveTextEditorId(null);
  }

  function renameTable(table: TableItem, title: string) {
    updateTables({
      ...safeData,
      tables: safeData.tables.map((item) =>
        item.id === table.id
          ? {
              ...item,
              title: title || 'Без названия',
              updatedAt: nowIso(),
            }
          : item,
      ),
    });
  }

  function deleteTable(table: TableItem) {
    if (!window.confirm(`Удалить таблицу "${table.title}"?`)) return;

    const tables = safeData.tables.filter((item) => item.id !== table.id);
    updateTables({
      ...safeData,
      activeTableId: safeData.activeTableId === table.id ? tables[0]?.id ?? null : safeData.activeTableId,
      tables,
    });
    setSelectedRange(null);
    setActiveTextEditorId(null);
  }

  function updateTable(tableId: string, table: StudyTableData) {
    updateTables(updateTableData(safeData, tableId, table));
  }

  function handleColumnResizeStart(event: PointerEvent<HTMLButtonElement>, block: TableEditorBlock, columnIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      type: 'column',
      blockId: block.id,
      columnIndex,
      startX: event.clientX,
      startWidth: block.table.columns[columnIndex]?.width ?? 180,
    };
  }

  function handleRowResizeStart(event: PointerEvent<HTMLButtonElement>, block: TableEditorBlock, rowIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      type: 'row',
      blockId: block.id,
      rowIndex,
      startY: event.clientY,
      startHeight: block.table.rows[rowIndex]?.height ?? 46,
    };
  }

  function handleResizeMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    const tableItem = safeData.tables.find((item) => item.id === drag.blockId);
    if (!tableItem) return;

    if (drag.type === 'column') {
      updateTable(tableItem.id, resizeTableColumn(tableItem.table, drag.columnIndex, drag.startWidth + event.clientX - drag.startX));
      return;
    }

    updateTable(tableItem.id, resizeTableRow(tableItem.table, drag.rowIndex, drag.startHeight + event.clientY - drag.startY));
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
    selectTableCell(cell, event.shiftKey);
  }

  function selectTableCell(cell: SelectedCell, extend = false) {
    setActiveTextEditorId(null);

    setSelectedRange((range) => {
      if (extend && range?.blockId === cell.blockId) {
        return {
          ...range,
          focusRowIndex: cell.rowIndex,
          focusColumnIndex: cell.columnIndex,
        };
      }

      return {
        blockId: cell.blockId,
        anchorRowIndex: cell.rowIndex,
        anchorColumnIndex: cell.columnIndex,
        focusRowIndex: cell.rowIndex,
        focusColumnIndex: cell.columnIndex,
      };
    });
  }

  function selectTableRange(range: SelectedCellRange) {
    setActiveTextEditorId(null);
    setSelectedRange(range);
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

  const selectedTable = selectedRange ? safeData.tables.find((table) => table.id === selectedRange.blockId) ?? null : null;
  const selectedTableCell = selectedTable
    ? selectedTable.table.rows[selectedRange?.focusRowIndex ?? -1]?.cells[selectedRange?.focusColumnIndex ?? -1] ?? null
    : null;
  const toolbarTable = selectedTable ?? activeTable;
  const selectedCellCount = selectedRange ? getCellRangeArea(selectedRange) : 0;

  function updateSelectedCellStyle(style: Parameters<typeof updateTableCellStyle>[3]) {
    if (!selectedRange || !selectedTable) return;

    const bounds = getCellRangeBounds(selectedRange);
    let nextTable = selectedTable.table;

    for (let rowIndex = bounds.minRow; rowIndex <= bounds.maxRow; rowIndex += 1) {
      for (let columnIndex = bounds.minColumn; columnIndex <= bounds.maxColumn; columnIndex += 1) {
        nextTable = updateTableCellStyle(nextTable, rowIndex, columnIndex, style);
      }
    }

    updateTable(selectedTable.id, nextTable);
  }

  function updateSelectedTableRange(update: (table: StudyTableData, bounds: StudyTableRangeBounds) => StudyTableData) {
    if (!selectedRange || !selectedTable) return;

    updateTable(selectedTable.id, update(selectedTable.table, getCellRangeBounds(selectedRange)));
  }

  function selectedRowIndexes() {
    if (!selectedRange) return [];
    const bounds = getCellRangeBounds(selectedRange);
    return Array.from({ length: bounds.maxRow - bounds.minRow + 1 }, (_, index) => bounds.minRow + index);
  }

  function selectedColumnIndexes() {
    if (!selectedRange) return [];
    const bounds = getCellRangeBounds(selectedRange);
    return Array.from({ length: bounds.maxColumn - bounds.minColumn + 1 }, (_, index) => bounds.minColumn + index);
  }

  async function copySelectedTableRange() {
    if (!selectedRange || !selectedTable) return;
    await navigator.clipboard?.writeText(tableRangeToTsv(selectedTable.table, getCellRangeBounds(selectedRange)));
  }

  async function pasteIntoSelectedTableRange() {
    if (!selectedRange || !selectedTable) return;
    const text = await navigator.clipboard?.readText();
    if (!text?.trim()) return;

    updateTable(selectedTable.id, pasteTableText(selectedTable.table, selectedRange.focusRowIndex, selectedRange.focusColumnIndex, text));
  }

  return (
    <section className="tables-page page">
      <header className="page-header">
        <div>
          <h1>Таблицы</h1>
          <p>Отдельное рабочее пространство для таблиц, связанных с материалами обучения.</p>
        </div>
        <div className="page-actions">
          <button className="button primary" type="button" onClick={createNewTable}>
            <Plus size={18} />
            Новая таблица
          </button>
        </div>
      </header>

      <div className="tables-layout">
        <aside className="tables-sidebar">
          <div className="tables-sidebar-head">
            <div>
              <span className="eyebrow">Library</span>
              <strong>{safeData.tables.length} таблиц</strong>
            </div>
            <button className="icon-button" type="button" onClick={createNewTable} aria-label="Создать таблицу" title="Создать таблицу">
              <Plus size={18} />
            </button>
          </div>

          <div className="tables-folder-label">
            <Folder size={16} />
            {studyFolder?.title ?? 'Обучение'}
          </div>

          <div className="tables-list">
            {studyTables.length === 0 ? (
              <div className="tables-empty">
                <strong>Таблиц пока нет</strong>
                <span>Добавь таблицу из материала обучения или создай её здесь.</span>
              </div>
            ) : (
              studyTables.map((table) => (
                <button
                  className={`tables-list-item ${table.id === activeTable?.id ? 'active' : ''}`}
                  key={table.id}
                  type="button"
                  onClick={() => selectTable(table)}
                  onDoubleClick={() => {
                    const title = window.prompt('Название таблицы', table.title)?.trim();
                    if (title) renameTable(table, title);
                  }}
                >
                  <Table2 size={16} />
                  <span>{table.title}</span>
                  <small>{new Date(table.updatedAt).toLocaleDateString()}</small>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="tables-main">
          {activeTable ? (
            <>
              <div className="tables-toolbar">
                <div className="tables-title-group">
                  <span className="eyebrow">Table</span>
                  <input
                    className="tables-title-input"
                    value={activeTable.title}
                    onChange={(event) => renameTable(activeTable, event.target.value)}
                    aria-label="Название таблицы"
                  />
                </div>
                <button className="icon-button danger" type="button" onClick={() => deleteTable(activeTable)} aria-label="Удалить таблицу" title="Удалить таблицу">
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="tables-editor-toolbar study-block-sticky-header">
                <div className="study-block-header-row">
                  <div className="study-block-header-group study-block-header-toolbar-group">
                    <span className="study-block-header-label">Текст</span>
                    <div className="study-block-toolbar-slot" ref={setTextToolbarTarget}>
                      {!activeTextEditorId ? <span className="muted-text">Выбери ячейку</span> : null}
                    </div>
                  </div>
                </div>

                {toolbarTable ? (
                  <div className="study-block-header-row">
                    <div className="study-block-header-group">
                      <span className="study-block-header-label">Таблица</span>
                      <button className="button ghost" type="button" onClick={() => updateTable(toolbarTable.id, addTableRow(toolbarTable.table))}>
                        <Rows3 size={16} />
                        Строка
                      </button>
                      <button className="button ghost" type="button" onClick={() => updateTable(toolbarTable.id, addTableColumn(toolbarTable.table))}>
                        <Columns3 size={16} />
                        Колонка
                      </button>
                      {selectedRange && selectedTable?.id === toolbarTable.id ? (
                        <>
                          <button className="button ghost" type="button" onClick={() => updateSelectedTableRange((table, bounds) => insertTableRow(table, bounds.minRow))}>
                            Строка выше
                          </button>
                          <button className="button ghost" type="button" onClick={() => updateSelectedTableRange((table, bounds) => insertTableColumn(table, bounds.minColumn))}>
                            Колонка слева
                          </button>
                          <button className="button ghost" type="button" onClick={() => updateTable(toolbarTable.id, removeTableRows(toolbarTable.table, selectedRowIndexes()))}>
                            Убрать строки
                          </button>
                          <button className="button ghost" type="button" onClick={() => updateTable(toolbarTable.id, removeTableColumns(toolbarTable.table, selectedColumnIndexes()))}>
                            Убрать колонки
                          </button>
                          <button className="icon-button" type="button" onClick={() => void copySelectedTableRange()} aria-label="Копировать диапазон" title="Копировать">
                            <Copy size={16} />
                          </button>
                          <button className="icon-button" type="button" onClick={() => void pasteIntoSelectedTableRange()} aria-label="Вставить в диапазон" title="Вставить">
                            <ClipboardPaste size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="button ghost" type="button" onClick={() => updateTable(toolbarTable.id, removeTableRow(toolbarTable.table, toolbarTable.table.rows.length - 1))}>
                            Убрать строку
                          </button>
                          <button className="button ghost" type="button" onClick={() => updateTable(toolbarTable.id, removeTableColumn(toolbarTable.table, toolbarTable.table.columns.length - 1))}>
                            Убрать колонку
                          </button>
                        </>
                      )}
                    </div>

                    <div className="study-block-header-group">
                      <span className="study-block-header-label">Вид</span>
                      <label className="study-table-setting">
                        <input
                          type="checkbox"
                          checked={toolbarTable.table.settings.hasHeaderRow}
                          onChange={(event) => updateTable(toolbarTable.id, updateTableSettings(toolbarTable.table, { hasHeaderRow: event.target.checked }))}
                        />
                        Шапка
                      </label>
                      <label className="study-table-setting">
                        <input
                          type="checkbox"
                          checked={toolbarTable.table.settings.hasHeaderColumn}
                          onChange={(event) => updateTable(toolbarTable.id, updateTableSettings(toolbarTable.table, { hasHeaderColumn: event.target.checked }))}
                        />
                        Первая колонка
                      </label>
                      <label className="study-table-template">
                        <span>Шаблон</span>
                        <select
                          value={toolbarTable.table.settings.template}
                          onChange={(event) => updateTable(toolbarTable.id, applyTableTemplate(toolbarTable.table, event.target.value as StudyTableTemplate))}
                        >
                          <option value="plain">Обычная</option>
                          <option value="comparison">Сравнение</option>
                          <option value="plan">План</option>
                          <option value="terms">Термины</option>
                          <option value="formula">Формулы</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ) : null}

                {selectedTable && selectedTableCell && selectedRange ? (
                  <div className="study-block-header-row">
                    <div className="study-cell-settings">
                      <strong>Ячейки: {selectedCellCount}</strong>
                      <label>
                        Фон
                        <input
                          type="color"
                          value={colorInputValue(selectedTableCell.style.backgroundColor, '#0f172a')}
                          onChange={(event) => updateSelectedCellStyle({ backgroundColor: event.target.value })}
                        />
                      </label>
                      <label>
                        Текст
                        <input
                          type="color"
                          value={colorInputValue(selectedTableCell.style.textColor, '#e5e7eb')}
                          onChange={(event) => updateSelectedCellStyle({ textColor: event.target.value })}
                        />
                      </label>
                      <label>
                        Граница
                        <input
                          type="color"
                          value={colorInputValue(selectedTableCell.style.borderColor, '#334155')}
                          onChange={(event) => updateSelectedCellStyle({ borderColor: event.target.value })}
                        />
                      </label>
                      <button className={`icon-button ${selectedTableCell.style.align === 'left' ? 'active' : ''}`} type="button" onClick={() => updateSelectedCellStyle({ align: 'left' })} aria-label="Выровнять влево">
                        <AlignLeft size={16} />
                      </button>
                      <button className={`icon-button ${selectedTableCell.style.align === 'center' ? 'active' : ''}`} type="button" onClick={() => updateSelectedCellStyle({ align: 'center' })} aria-label="Выровнять по центру">
                        <AlignCenter size={16} />
                      </button>
                      <button className={`icon-button ${selectedTableCell.style.align === 'right' ? 'active' : ''}`} type="button" onClick={() => updateSelectedCellStyle({ align: 'right' })} aria-label="Выровнять вправо">
                        <AlignRight size={16} />
                      </button>
                      <button
                        className={`icon-button ${selectedTableCell.style.fontWeight === 'bold' ? 'active' : ''}`}
                        type="button"
                        onClick={() => updateSelectedCellStyle({ fontWeight: selectedTableCell.style.fontWeight === 'bold' ? 'normal' : 'bold' })}
                        aria-label="Жирный текст"
                      >
                        <Bold size={16} />
                      </button>
                      <label>
                        Вертикаль
                        <select
                          value={selectedTableCell.style.verticalAlign}
                          onChange={(event) => updateSelectedCellStyle({ verticalAlign: event.target.value as 'top' | 'middle' | 'bottom' })}
                        >
                          <option value="top">Верх</option>
                          <option value="middle">Центр</option>
                          <option value="bottom">Низ</option>
                        </select>
                      </label>
                      <label>
                        Толщина
                        <input
                          type="number"
                          min={1}
                          max={4}
                          value={selectedTableCell.style.borderWidth}
                          onChange={(event) => updateSelectedCellStyle({ borderWidth: Number(event.target.value) })}
                        />
                      </label>
                      <button className="icon-button" type="button" onClick={() => updateSelectedTableRange(clearTableCellContents)} aria-label="Очистить содержимое" title="Очистить содержимое">
                        <Eraser size={16} />
                      </button>
                      <button className="button ghost" type="button" onClick={() => updateSelectedTableRange(clearTableCellStyles)}>
                        Сброс стиля
                      </button>
                      <button className="icon-button" type="button" onClick={() => updateSelectedTableRange(mergeTableRange)} aria-label="Объединить" title="Объединить">
                        <Merge size={16} />
                      </button>
                      <button className="icon-button" type="button" onClick={() => updateSelectedTableRange(unmergeTableRange)} aria-label="Разъединить" title="Разъединить">
                        <Split size={16} />
                      </button>
                      <button className="button ghost" type="button" onClick={() => updateSelectedTableRange(equalizeTableColumns)}>
                        Ровная ширина
                      </button>
                      <button className="button ghost" type="button" onClick={() => updateSelectedTableRange(autoFitTableColumns)}>
                        Автоширина
                      </button>
                      <button className="button ghost" type="button" onClick={() => updateSelectedTableRange(autoFitTableRows)}>
                        Автовысота
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="tables-canvas">
                <TableBlockEditor
                  block={activeTable}
                  selectedRange={selectedRange}
                  activeTextEditorId={activeTextEditorId}
                  toolbarTarget={textToolbarTarget}
                  onSelectCellStart={handleCellSelectionStart}
                  onExtendSelection={handleCellSelectionExtend}
                  onSelectRange={selectTableRange}
                  onSelectCell={selectTableCell}
                  onActivateTextEditor={(editorId) => setActiveTextEditorId(editorId)}
                  onExitTextEditor={() => setActiveTextEditorId(null)}
                  onChangeTable={(table) => updateTable(activeTable.id, table)}
                  onColumnResizeStart={handleColumnResizeStart}
                  onRowResizeStart={handleRowResizeStart}
                  onResizeMove={handleResizeMove}
                  onResizeEnd={handleResizeEnd}
                />
              </div>
            </>
          ) : (
            <div className="tables-empty-state">
              <Table2 size={34} />
              <strong>Выбери или создай таблицу</strong>
              <button className="button primary" type="button" onClick={createNewTable}>
                <Plus size={18} />
                Создать таблицу
              </button>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}

function colorInputValue(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}
