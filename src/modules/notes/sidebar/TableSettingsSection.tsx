interface TableSettingsSectionProps {
  hasHeaderRow: boolean;
  hasHeaderColumn: boolean;
  onUpdateTableHeaders: (patch: Record<string, unknown>) => void;
}

export function TableSettingsSection({ hasHeaderRow, hasHeaderColumn, onUpdateTableHeaders }: TableSettingsSectionProps) {
  return (
    <div className="note-settings-section note-drag-menu-section">
      <h4>Таблица</h4>
      <div className="note-menu-list">
        <button className={`note-menu-row${hasHeaderRow ? ' active' : ''}`} type="button" onClick={() => onUpdateTableHeaders({ headerRows: hasHeaderRow ? undefined : 1 })}>
          Строка заголовка
        </button>
        <button className={`note-menu-row${hasHeaderColumn ? ' active' : ''}`} type="button" onClick={() => onUpdateTableHeaders({ headerCols: hasHeaderColumn ? undefined : 1 })}>
          Колонка заголовка
        </button>
      </div>
    </div>
  );
}
