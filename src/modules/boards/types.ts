import type { BaseEntity } from '../../shared/types/common';

export const STUDY_BOARDS_FOLDER_ID = 'boards-folder-study';

export interface BoardFolder extends BaseEntity {
  title: string;
  parentId: string | null;
  order: number;
  systemKey?: 'study';
}

export interface BoardItem extends BaseEntity {
  title: string;
  folderId: string | null;
  snapshot: unknown | null;
}

export interface BoardsData {
  activeBoardId: string | null;
  folders: BoardFolder[];
  boards: BoardItem[];
}
