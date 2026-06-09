import { Folder, Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Tooltip } from '../../shared/components/Tooltip';
import { createBoard, normalizeBoardsData, nowIso, upsertBoard } from './boardsUtils';
import type { BoardItem, BoardsData } from './types';
import { STUDY_BOARDS_FOLDER_ID } from './types';

interface BoardsPageProps {
  data: BoardsData;
  onChange: (data: BoardsData) => void;
}

export function BoardsPage({ data, onChange }: BoardsPageProps) {
  const safeData = useMemo(() => normalizeBoardsData(data), [data]);
  const activeBoard = safeData.boards.find((board) => board.id === safeData.activeBoardId) ?? safeData.boards[0] ?? null;

  function createNewBoard(folderId: string | null = STUDY_BOARDS_FOLDER_ID) {
    const title = `Board ${safeData.boards.length + 1}`;
    const board = createBoard(title, folderId);
    onChange(upsertBoard(safeData, board));
  }

  function selectBoard(board: BoardItem) {
    onChange(normalizeBoardsData({ ...safeData, activeBoardId: board.id }));
  }

  function renameBoard(board: BoardItem) {
    const title = window.prompt('Название доски', board.title)?.trim();
    if (!title) return;
    onChange(normalizeBoardsData({
      ...safeData,
      boards: safeData.boards.map((item) => (item.id === board.id ? { ...item, title, updatedAt: nowIso() } : item)),
    }));
  }

  function deleteBoard(board: BoardItem) {
    if (!window.confirm(`Удалить доску "${board.title}"?`)) return;
    const boards = safeData.boards.filter((item) => item.id !== board.id);
    onChange(normalizeBoardsData({
      ...safeData,
      activeBoardId: safeData.activeBoardId === board.id ? boards[0]?.id ?? null : safeData.activeBoardId,
      boards,
    }));
  }

  return (
    <section className="boards-page page">
      <header className="page-header">
        <div>
          <h1>Доски</h1>
          <p>Модуль досок очищен от прежней библиотеки и готов к новой реализации.</p>
        </div>
        <div className="page-actions">
          <button className="button primary" type="button" onClick={() => createNewBoard()}>
            <Plus size={18} />
            Новая доска
          </button>
        </div>
      </header>

      <div className="boards-layout">
        <aside className="boards-sidebar">
          <div className="boards-sidebar-head">
            <div>
              <span className="eyebrow">Library</span>
              <strong>{safeData.boards.length} boards</strong>
            </div>
            <Tooltip content="Создать доску">
              <button className="icon-button" type="button" onClick={() => createNewBoard()}>
                <Plus size={18} />
              </button>
            </Tooltip>
          </div>

          <div className="boards-folder-label">
            <Folder size={16} />
            Обучение
          </div>

          <div className="boards-list">
            {safeData.boards.length === 0 ? (
              <div className="boards-empty">
                <strong>Досок пока нет</strong>
                <span>Создай запись, чтобы сохранить метаданные для будущей доски.</span>
              </div>
            ) : safeData.boards.map((board) => (
              <button
                className={`boards-list-item ${board.id === activeBoard?.id ? 'active' : ''}`}
                key={board.id}
                type="button"
                onClick={() => selectBoard(board)}
                onDoubleClick={() => renameBoard(board)}
              >
                <span>{board.title}</span>
                <small>{new Date(board.updatedAt).toLocaleDateString()}</small>
              </button>
            ))}
          </div>
        </aside>

        <main className="boards-main">
          {activeBoard ? (
            <>
              <div className="boards-toolbar">
                <div>
                  <span className="eyebrow">Board</span>
                  <h2>{activeBoard.title}</h2>
                </div>
                <div className="boards-toolbar-actions">
                  <Tooltip content="Удалить доску">
                    <button className="icon-button danger" type="button" onClick={() => deleteBoard(activeBoard)}>
                      <Trash2 size={18} />
                    </button>
                  </Tooltip>
                </div>
              </div>
              <div className="boards-canvas boards-placeholder">
                <div>
                  <strong>Редактор досок будет реализован с нуля</strong>
                  <p>Сейчас сохраняются только сущности досок и их связь с другими модулями. Старый canvas-движок удалён.</p>
                </div>
              </div>
            </>
          ) : (
            <div className="boards-empty-state">
              <strong>Выбери или создай доску</strong>
              <button className="button primary" type="button" onClick={() => createNewBoard()}>
                <Plus size={18} />
                Создать доску
              </button>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
