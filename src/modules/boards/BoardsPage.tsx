import { Folder, Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Tooltip } from '../../shared/components/Tooltip';
import { cn } from '../../shared/utils/classNames';
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
    <section>
      <header className="mb-[22px] flex items-start justify-between gap-6 max-[760px]:flex-col">
        <div>
          <h1 className="text-[34px] font-extrabold text-app-text">Доски</h1>
          <p className="mt-1.5 max-w-[720px] text-app-muted">Модуль досок очищен от прежней библиотеки и готов к новой реализации.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={primaryButtonClass} type="button" onClick={() => createNewBoard()}>
            <Plus size={18} />
            Новая доска
          </button>
        </div>
      </header>

      <div className="grid grid-cols-[280px_minmax(0,1fr)] items-start gap-[18px] max-[980px]:grid-cols-1">
        <aside className="grid content-start gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-app-accent-strong">Library</span>
              <strong className="block text-base text-app-text">{safeData.boards.length} boards</strong>
            </div>
            <Tooltip content="Создать доску">
              <button className={iconButtonClass} type="button" onClick={() => createNewBoard()}>
                <Plus size={18} />
              </button>
            </Tooltip>
          </div>

          <div className="inline-flex items-center gap-2 rounded-panel border border-app-border bg-app-surface-soft px-3 py-2 text-sm font-bold text-app-accent-strong">
            <Folder size={16} />
            Обучение
          </div>

          <div className="grid gap-2">
            {safeData.boards.length === 0 ? (
              <div className="grid gap-1 rounded-panel border border-dashed border-app-border bg-app-surface-soft p-4 text-sm text-app-muted">
                <strong className="text-app-text">Досок пока нет</strong>
                <span>Создай запись, чтобы сохранить метаданные для будущей доски.</span>
              </div>
            ) : safeData.boards.map((board) => (
              <button
                className={cn(boardListItemClass, board.id === activeBoard?.id && boardListItemActiveClass)}
                key={board.id}
                type="button"
                onClick={() => selectBoard(board)}
                onDoubleClick={() => renameBoard(board)}
              >
                <span className="min-w-0 truncate">{board.title}</span>
                <small className="text-xs text-app-muted">{new Date(board.updatedAt).toLocaleDateString()}</small>
              </button>
            ))}
          </div>
        </aside>

        <main className="min-w-0 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel">
          {activeBoard ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--line-soft)] pb-3">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-app-accent-strong">Board</span>
                  <h2 className="text-xl font-extrabold text-app-text">{activeBoard.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip content="Удалить доску">
                    <button className={dangerIconButtonClass} type="button" onClick={() => deleteBoard(activeBoard)}>
                      <Trash2 size={18} />
                    </button>
                  </Tooltip>
                </div>
              </div>
              <div className="grid min-h-[420px] place-items-center rounded-panel border border-dashed border-app-border bg-app-surface-soft p-6 text-center">
                <div className="max-w-[560px]">
                  <strong className="text-lg text-app-text">Редактор досок будет реализован с нуля</strong>
                  <p className="mt-2 text-app-muted">Сейчас сохраняются только сущности досок и их связь с другими модулями. Старый canvas-движок удалён.</p>
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-[420px] place-items-center gap-3 text-center">
              <strong className="text-lg text-app-text">Выбери или создай доску</strong>
              <button className={primaryButtonClass} type="button" onClick={() => createNewBoard()}>
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

const primaryButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_72%,var(--border))] bg-[var(--button-bg-primary)] px-3.5 py-2.5 text-sm font-bold text-app-accent-strong transition-colors hover:border-[color-mix(in_srgb,var(--accent)_86%,var(--border))] hover:bg-[var(--button-bg-primary-hover)]';

const iconButtonClass =
  'grid h-icon min-h-icon w-icon place-items-center rounded-control border border-[color-mix(in_srgb,var(--accent)_62%,var(--border))] bg-[var(--button-bg-primary)] text-app-accent-strong transition-colors hover:border-[color-mix(in_srgb,var(--accent)_86%,var(--border))] hover:bg-[var(--button-bg-primary-hover)]';

const dangerIconButtonClass =
  'grid h-icon min-h-icon w-icon place-items-center rounded-control border border-[color-mix(in_srgb,var(--danger)_72%,var(--border))] bg-[var(--button-bg-danger)] text-app-danger transition-colors hover:border-[color-mix(in_srgb,var(--danger)_88%,var(--border))] hover:bg-[var(--button-bg-danger-hover)]';

const boardListItemClass =
  'grid gap-0.5 rounded-panel border border-app-border bg-app-surface-soft px-3 py-2.5 text-left text-sm font-bold text-app-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:bg-app-surface-strong';

const boardListItemActiveClass =
  'border-[color-mix(in_srgb,var(--accent)_66%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] text-app-accent-strong';
