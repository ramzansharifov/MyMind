import type { AppData } from '../app/appData';
import { isHiddenFromRegularLists, isTrashed } from './archiveUtils';

export type FlatCollectionKey =
  | 'movies'
  | 'todos'
  | 'habits'
  | 'financeTransactions'
  | 'calendarEvents'
  | 'journalEntries'
  | 'notes'
  | 'projects'
  | 'contacts'
  | 'goals'
  | 'inventory';

export interface FlatRecord {
  id: string;
  title: string;
  detail: string;
  module: string;
  collectionKey: FlatCollectionKey;
  updatedAt: string;
  createdAt: string;
  pinnedAt?: string | null;
  archivedAt?: string | null;
  trashedAt?: string | null;
  trashExpiresAt?: string | null;
}

type AnyFlatRecord = Record<string, unknown> & {
  id: string;
  createdAt: string;
  updatedAt: string;
  pinnedAt?: string | null;
  archivedAt?: string | null;
  trashedAt?: string | null;
  trashExpiresAt?: string | null;
};

const flatCollectionKeys: FlatCollectionKey[] = [
  'movies',
  'todos',
  'habits',
  'financeTransactions',
  'calendarEvents',
  'journalEntries',
  'notes',
  'projects',
  'contacts',
  'goals',
  'inventory',
];

const moduleLabels: Record<FlatCollectionKey, string> = {
  movies: 'Movies',
  todos: 'Todo',
  habits: 'Habits',
  financeTransactions: 'Finance',
  calendarEvents: 'Calendar',
  journalEntries: 'Diary',
  notes: 'Notes',
  projects: 'Projects',
  contacts: 'Contacts',
  goals: 'Goals',
  inventory: 'Inventory',
};

const titleKeys: Record<FlatCollectionKey, string[]> = {
  movies: ['title', 'originalTitle'],
  todos: ['title'],
  habits: ['title'],
  financeTransactions: ['title'],
  calendarEvents: ['title'],
  journalEntries: ['title'],
  notes: ['title'],
  projects: ['title'],
  contacts: ['name'],
  goals: ['title'],
  inventory: ['title'],
};

const detailKeys: Record<FlatCollectionKey, string[]> = {
  movies: ['notes', 'status'],
  todos: ['description', 'priority'],
  habits: ['description', 'category'],
  financeTransactions: ['sourceOrCategory', 'description'],
  calendarEvents: ['description', 'category'],
  journalEntries: ['content', 'mood'],
  notes: ['content', 'category'],
  projects: ['description', 'area'],
  contacts: ['relationship', 'notes'],
  goals: ['description', 'metric'],
  inventory: ['category', 'location', 'notes'],
};

export function cleanupExpiredTrash(data: AppData) {
  const now = Date.now();
  let removed = 0;
  const next = { ...data };

  for (const key of flatCollectionKeys) {
    const items = getFlatItems(data, key);
    const kept = items.filter((item) => {
      const shouldRemove = isTrashed(item) && item.trashExpiresAt && new Date(item.trashExpiresAt).getTime() <= now;
      if (shouldRemove) {
        removed += 1;
      }
      return !shouldRemove;
    });
    if (key === 'todos') {
      next.todos = { ...data.todos, items: kept as unknown as AppData['todos']['items'] };
    } else if (key === 'habits') {
      next.habits = { ...data.habits, habits: kept as unknown as AppData['habits']['habits'] };
    } else if (key === 'financeTransactions') {
      next.finance = { ...data.finance, transactions: kept as unknown as AppData['finance']['transactions'] };
    } else {
      next[key] = kept as never;
    }
  }

  return { data: next, removed };
}

export function buildRecordCenterRows(data: AppData): FlatRecord[] {
  return flatCollectionKeys
    .flatMap((key) =>
      getFlatItems(data, key)
        .filter((item) => !isHiddenFromRegularLists(item))
        .map((item) => ({
          id: item.id,
          title: getFirstText(item, titleKeys[key]) || 'Untitled',
          detail: getFirstText(item, detailKeys[key]),
          module: moduleLabels[key],
          collectionKey: key,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
          pinnedAt: item.pinnedAt ?? (item.pinned === true ? item.updatedAt : null),
          archivedAt: item.archivedAt,
          trashedAt: item.trashedAt,
          trashExpiresAt: item.trashExpiresAt,
        })),
    )
    .sort((a, b) => {
      const pinnedSort = Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt));
      if (pinnedSort !== 0) {
        return pinnedSort;
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

function getFlatItems(data: AppData, key: FlatCollectionKey): AnyFlatRecord[] {
  if (key === 'todos') {
    return data.todos.items as unknown as AnyFlatRecord[];
  }
  if (key === 'habits') {
    return data.habits.habits as unknown as AnyFlatRecord[];
  }
  if (key === 'financeTransactions') {
    return data.finance.transactions as unknown as AnyFlatRecord[];
  }
  return data[key] as unknown as AnyFlatRecord[];
}

function getFirstText(item: AnyFlatRecord, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return '';
}
