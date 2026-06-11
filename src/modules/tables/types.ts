import type { BaseEntity } from '../../shared/types/common';
import type { StudyTableData } from '../../shared/blockEditor';

export const STUDY_TABLES_FOLDER_ID = 'tables-folder-study';

export interface TableFolder extends BaseEntity {
  title: string;
  parentId: string | null;
  order: number;
  systemKey?: 'study';
}

export interface TableItem extends BaseEntity {
  title: string;
  folderId: string | null;
  table: StudyTableData;
}

export interface TablesData {
  activeTableId: string | null;
  folders: TableFolder[];
  tables: TableItem[];
}
