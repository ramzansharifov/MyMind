import type { BoardFolder, BoardItem, BoardsData } from './types';
import { STUDY_BOARDS_FOLDER_ID } from './types';

export const emptyBoardsData: BoardsData = {
  activeBoardId: null,
  folders: [createStudyBoardsFolder()],
  boards: [],
};

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createStudyBoardsFolder(): BoardFolder {
  const timestamp = nowIso();
  return {
    id: STUDY_BOARDS_FOLDER_ID,
    title: '\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435',
    parentId: null,
    order: 0,
    systemKey: 'study',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createBoard(title = 'New board', folderId: string | null = STUDY_BOARDS_FOLDER_ID): BoardItem {
  const timestamp = nowIso();
  return {
    id: createId('board'),
    title,
    folderId,
    snapshot: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function normalizeBoardsData(value: unknown): BoardsData {
  const source = (value ?? {}) as Partial<BoardsData>;
  const timestamp = nowIso();
  const folders = Array.isArray(source.folders)
    ? source.folders.map((folder, index) => ({
      id: folder.id || createId('board-folder'),
      title: folder.title || 'New folder',
      parentId: folder.parentId ?? null,
      order: Number.isFinite(folder.order) ? folder.order : index,
      systemKey: folder.systemKey === 'study' ? 'study' as const : undefined,
      createdAt: folder.createdAt ?? timestamp,
      updatedAt: folder.updatedAt ?? folder.createdAt ?? timestamp,
    }))
    : [];

  const withStudyFolder = ensureStudyBoardsFolder({
    activeBoardId: null,
    folders,
    boards: [],
  }).folders;
  const folderIds = new Set(withStudyFolder.map((folder) => folder.id));
  const boards = Array.isArray(source.boards)
    ? source.boards.map((board) => ({
      id: board.id || createId('board'),
      title: board.title || 'New board',
      folderId: board.folderId && folderIds.has(board.folderId) ? board.folderId : null,
      snapshot: board.snapshot ?? null,
      createdAt: board.createdAt ?? timestamp,
      updatedAt: board.updatedAt ?? board.createdAt ?? timestamp,
    }))
    : [];
  const activeBoardId = source.activeBoardId && boards.some((board) => board.id === source.activeBoardId)
    ? source.activeBoardId
    : boards[0]?.id ?? null;

  return ensureStudyBoardsFolder({
    activeBoardId,
    folders: withStudyFolder,
    boards,
  });
}

export function ensureStudyBoardsFolder(data: BoardsData): BoardsData {
  if (data.folders.some((folder) => folder.id === STUDY_BOARDS_FOLDER_ID)) {
    return data;
  }

  return {
    ...data,
    folders: [createStudyBoardsFolder(), ...data.folders],
  };
}

export function upsertBoard(data: BoardsData, board: BoardItem): BoardsData {
  const timestamp = nowIso();
  const exists = data.boards.some((item) => item.id === board.id);
  const nextBoard = { ...board, updatedAt: timestamp };
  return normalizeBoardsData({
    ...data,
    activeBoardId: nextBoard.id,
    boards: exists
      ? data.boards.map((item) => (item.id === nextBoard.id ? nextBoard : item))
      : [nextBoard, ...data.boards],
  });
}

export function updateBoardSnapshot(data: BoardsData, boardId: string, snapshot: unknown): BoardsData {
  const timestamp = nowIso();
  return normalizeBoardsData({
    ...data,
    boards: data.boards.map((board) => (
      board.id === boardId ? { ...board, snapshot, updatedAt: timestamp } : board
    )),
  });
}

