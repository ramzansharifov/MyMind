import type { StudyBlock, StudyTableBlock } from '../../types';

interface StudyTableEditorProps {
  block: StudyTableBlock;
  onChange: (update: (block: StudyBlock) => StudyBlock) => void;
}

export function StudyTableEditor({ block, onChange }: StudyTableEditorProps) {
  function updateCell(rowIndex: number, cellIndex: number, value: string) {
    onChange((item) => {
      const table = item as StudyTableBlock;
      const rows = table.rows.map((row, currentRow) =>
        currentRow === rowIndex ? row.map((cell, currentCell) => (currentCell === cellIndex ? value : cell)) : row,
      );
      return { ...table, rows };
    });
  }

  return (
    <div className="study-table-editor">
      <div className="study-table-toolbar">
        <button
          className="button ghost"
          type="button"
          onClick={() =>
            onChange((item) => {
              const table = item as StudyTableBlock;
              return { ...table, rows: [...table.rows, new Array(table.rows[0]?.length || 2).fill('')] };
            })
          }
        >
          Row
        </button>
        <button
          className="button ghost"
          type="button"
          onClick={() => onChange((item) => ({ ...(item as StudyTableBlock), rows: (item as StudyTableBlock).rows.map((row) => [...row, '']) }))}
        >
          Column
        </button>
      </div>
      <div className="study-table-wrap">
        <table className="study-table">
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>
                    <input value={cell} onChange={(event) => updateCell(rowIndex, cellIndex, event.target.value)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
