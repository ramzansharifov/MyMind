import { createStudyTable, normalizeStudyTable, type StudyTableData } from '../../shared/blockEditor';
import type { TableFolder, TableItem, TablesData } from './types';
import { STUDY_TABLES_FOLDER_ID } from './types';

export const emptyTablesData: TablesData = {
  activeTableId: null,
  folders: [createStudyTablesFolder()],
  tables: [],
};

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createStudyTablesFolder(): TableFolder {
  const timestamp = nowIso();

  return {
    id: STUDY_TABLES_FOLDER_ID,
    title: 'Обучение',
    parentId: null,
    order: 0,
    systemKey: 'study',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createTableItem(title = 'Новая таблица', folderId: string | null = STUDY_TABLES_FOLDER_ID, table?: unknown): TableItem {
  const timestamp = nowIso();

  return {
    id: createId('table'),
    title,
    folderId,
    table: normalizeStudyTable(table ?? createStudyTable()),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function normalizeTablesData(value: unknown): TablesData {
  const source = (value ?? {}) as Partial<TablesData>;
  const timestamp = nowIso();
  const folders = Array.isArray(source.folders)
    ? source.folders.map((folder, index) => ({
        id: folder.id || createId('table-folder'),
        title: folder.title || 'Новая папка',
        parentId: folder.parentId ?? null,
        order: Number.isFinite(folder.order) ? folder.order : index,
        systemKey: folder.systemKey === 'study' ? 'study' as const : undefined,
        createdAt: folder.createdAt ?? timestamp,
        updatedAt: folder.updatedAt ?? folder.createdAt ?? timestamp,
      }))
    : [];

  const withStudyFolder = ensureStudyTablesFolder({
    activeTableId: null,
    folders,
    tables: [],
  }).folders;
  const folderIds = new Set(withStudyFolder.map((folder) => folder.id));
  const tables = Array.isArray(source.tables)
    ? source.tables.map((table) => ({
        id: table.id || createId('table'),
        title: table.title || 'Новая таблица',
        folderId: table.folderId && folderIds.has(table.folderId) ? table.folderId : STUDY_TABLES_FOLDER_ID,
        table: normalizeStudyTable(table.table),
        createdAt: table.createdAt ?? timestamp,
        updatedAt: table.updatedAt ?? table.createdAt ?? timestamp,
      }))
    : [];
  const activeTableId =
    source.activeTableId && tables.some((table) => table.id === source.activeTableId)
      ? source.activeTableId
      : tables[0]?.id ?? null;

  return ensureStudyTablesFolder({
    activeTableId,
    folders: withStudyFolder,
    tables,
  });
}

export function ensureStudyTablesFolder(data: TablesData): TablesData {
  if (data.folders.some((folder) => folder.id === STUDY_TABLES_FOLDER_ID)) {
    return data;
  }

  return {
    ...data,
    folders: [createStudyTablesFolder(), ...data.folders],
  };
}

export function upsertTable(data: TablesData, table: TableItem): TablesData {
  const timestamp = nowIso();
  const exists = data.tables.some((item) => item.id === table.id);
  const nextTable = { ...table, table: normalizeStudyTable(table.table), updatedAt: timestamp };

  return normalizeTablesData({
    ...data,
    activeTableId: nextTable.id,
    tables: exists
      ? data.tables.map((item) => (item.id === nextTable.id ? nextTable : item))
      : [nextTable, ...data.tables],
  });
}

export function updateTableData(data: TablesData, tableId: string, table: StudyTableData): TablesData {
  const timestamp = nowIso();

  return normalizeTablesData({
    ...data,
    tables: data.tables.map((item) =>
      item.id === tableId
        ? {
            ...item,
            table: normalizeStudyTable(table),
            updatedAt: timestamp,
          }
        : item,
    ),
  });
}
