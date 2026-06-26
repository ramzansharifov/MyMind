import { FileText, Folder } from 'lucide-react';
import { useMemo } from 'react';
import { AddButton, DeleteButton } from '../../shared/components/ActionButtons';
import { LibrarySidebar } from '../../shared/components/LibrarySidebar';
import { ModulePageShell } from '../../shared/components/ModulePageShell';
import { cn } from '../../shared/utils/classNames';
import { createBoard, normalizeBoardsData, nowIso, upsertBoard } from './boardsUtils';
import type { BoardItem, BoardsData } from './types';
import { STUDY_BOARDS_FOLDER_ID } from './types';

interface BoardsPageProps {
  data: BoardsData;
  onChange: (data: BoardsData) => void;
}

const text = {
  boards: '\u0414\u043e\u0441\u043a\u0438',
  pageSubtitle:
    '\u041c\u043e\u0434\u0443\u043b\u044c \u0434\u043e\u0441\u043e\u043a \u043e\u0447\u0438\u0449\u0435\u043d \u043e\u0442 \u043f\u0440\u0435\u0436\u043d\u0435\u0439 \u0431\u0438\u0431\u043b\u0438\u043e\u0442\u0435\u043a\u0438 \u0438 \u0433\u043e\u0442\u043e\u0432 \u043a \u043d\u043e\u0432\u043e\u0439 \u0440\u0435\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u0438.',
  newBoard: '\u041d\u043e\u0432\u0430\u044f \u0434\u043e\u0441\u043a\u0430',
  createBoard: '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0434\u043e\u0441\u043a\u0443',
  library: '\u0411\u0438\u0431\u043b\u0438\u043e\u0442\u0435\u043a\u0430',
  structure: '\u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430',
  study: '\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435',
  emptyTitle: '\u0414\u043e\u0441\u043e\u043a \u043f\u043e\u043a\u0430 \u043d\u0435\u0442',
  emptyMessage:
    '\u0421\u043e\u0437\u0434\u0430\u0439 \u0437\u0430\u043f\u0438\u0441\u044c, \u0447\u0442\u043e\u0431\u044b \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043c\u0435\u0442\u0430\u0434\u0430\u043d\u043d\u044b\u0435 \u0434\u043b\u044f \u0431\u0443\u0434\u0443\u0449\u0435\u0439 \u0434\u043e\u0441\u043a\u0438.',
  board: '\u0414\u043e\u0441\u043a\u0430',
  renamePrompt: '\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0434\u043e\u0441\u043a\u0438',
  confirmDeleteTitle: '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0434\u043e\u0441\u043a\u0443?',
  confirmDeleteMessage: '\u042d\u0442\u043e \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043d\u0435\u043b\u044c\u0437\u044f \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c.',
  editorPlaceholder:
    '\u0420\u0435\u0434\u0430\u043a\u0442\u043e\u0440 \u0434\u043e\u0441\u043e\u043a \u0431\u0443\u0434\u0435\u0442 \u0440\u0435\u0430\u043b\u0438\u0437\u043e\u0432\u0430\u043d \u0441 \u043d\u0443\u043b\u044f',
  editorDescription:
    '\u0421\u0435\u0439\u0447\u0430\u0441 \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u044e\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0441\u0443\u0449\u043d\u043e\u0441\u0442\u0438 \u0434\u043e\u0441\u043e\u043a \u0438 \u0438\u0445 \u0441\u0432\u044f\u0437\u044c \u0441 \u0434\u0440\u0443\u0433\u0438\u043c\u0438 \u043c\u043e\u0434\u0443\u043b\u044f\u043c\u0438. \u0421\u0442\u0430\u0440\u044b\u0439 canvas-\u0434\u0432\u0438\u0436\u043e\u043a \u0443\u0434\u0430\u043b\u0451\u043d.',
  selectOrCreate: '\u0412\u044b\u0431\u0435\u0440\u0438 \u0438\u043b\u0438 \u0441\u043e\u0437\u0434\u0430\u0439 \u0434\u043e\u0441\u043a\u0443',
};

export function BoardsPage({ data, onChange }: BoardsPageProps) {
  const safeData = useMemo(() => normalizeBoardsData(data), [data]);
  const activeBoard = safeData.boards.find((board) => board.id === safeData.activeBoardId) ?? safeData.boards[0] ?? null;

  function createNewBoard(folderId: string | null = STUDY_BOARDS_FOLDER_ID) {
    const title = `${text.board} ${safeData.boards.length + 1}`;
    const board = createBoard(title, folderId);
    onChange(upsertBoard(safeData, board));
  }

  function selectBoard(board: BoardItem) {
    onChange(normalizeBoardsData({ ...safeData, activeBoardId: board.id }));
  }

  function renameBoard(board: BoardItem) {
    const title = window.prompt(text.renamePrompt, board.title)?.trim();
    if (!title) return;
    onChange(normalizeBoardsData({
      ...safeData,
      boards: safeData.boards.map((item) => (item.id === board.id ? { ...item, title, updatedAt: nowIso() } : item)),
    }));
  }

  function deleteBoard(board: BoardItem) {
    const boards = safeData.boards.filter((item) => item.id !== board.id);
    onChange(normalizeBoardsData({
      ...safeData,
      activeBoardId: safeData.activeBoardId === board.id ? boards[0]?.id ?? null : safeData.activeBoardId,
      boards,
    }));
  }

  return (
    <ModulePageShell
      title={text.boards}
      subtitle={text.pageSubtitle}
      actions={<AddButton label={text.newBoard} onClick={() => createNewBoard()} />}
    >
      <div className="grid grid-cols-[280px_minmax(0,1fr)] items-start gap-[18px] max-[980px]:grid-cols-1">
        <LibrarySidebar
          eyebrow={text.library}
          title={text.boards}
          actions={<AddButton iconOnly label={text.createBoard} onClick={() => createNewBoard()} />}
          stats={[{ id: 'boards', label: text.boards, value: safeData.boards.length, icon: <FileText size={14} aria-hidden="true" /> }]}
          sectionLabel={text.structure}
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-panel border border-app-border bg-app-surface-soft px-3 py-2 text-sm font-bold text-app-accent-strong">
            <Folder size={16} aria-hidden="true" />
            {text.study}
          </div>

          <div className="grid gap-2">
            {safeData.boards.length === 0 ? (
              <div className="grid gap-1 rounded-panel border border-dashed border-app-border bg-app-surface-soft p-4 text-sm text-app-muted">
                <strong className="text-app-text">{text.emptyTitle}</strong>
                <span>{text.emptyMessage}</span>
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
        </LibrarySidebar>

        <main className="min-w-0 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel">
          {activeBoard ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--line-soft)] pb-3">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-app-accent-strong">{text.board}</span>
                  <h2 className="text-xl font-extrabold text-app-text">{activeBoard.title}</h2>
                </div>
                <DeleteButton
                  onConfirm={() => deleteBoard(activeBoard)}
                  confirmTitle={text.confirmDeleteTitle}
                  confirmMessage={text.confirmDeleteMessage}
                />
              </div>
              <div className="grid min-h-[420px] place-items-center rounded-panel border border-dashed border-app-border bg-app-surface-soft p-6 text-center">
                <div className="max-w-[560px]">
                  <strong className="text-lg text-app-text">{text.editorPlaceholder}</strong>
                  <p className="mt-2 text-app-muted">{text.editorDescription}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-[420px] place-items-center gap-3 text-center">
              <strong className="text-lg text-app-text">{text.selectOrCreate}</strong>
              <AddButton label={text.createBoard} onClick={() => createNewBoard()} />
            </div>
          )}
        </main>
      </div>
    </ModulePageShell>
  );
}

const boardListItemClass =
  'grid gap-0.5 rounded-panel border border-app-border bg-app-surface-soft px-3 py-2.5 text-left text-sm font-bold text-app-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] hover:bg-app-surface-strong';

const boardListItemActiveClass =
  'border-[color-mix(in_srgb,var(--accent)_66%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] text-app-accent-strong';
