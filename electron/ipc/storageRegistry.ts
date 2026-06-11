export type CollectionName =
  | 'movies'
  | 'workouts'
  | 'todos'
  | 'finance'
  | 'habits'
  | 'calendar_events'
  | 'journal_entries'
  | 'notes'
  | 'templates'
  | 'study'
  | 'boards'
  | 'tables'
  | 'projects'
  | 'contacts'
  | 'health'
  | 'goals'
  | 'inventory'
  | 'app_settings';

export const collectionFiles: Record<CollectionName, string> = {
  movies: 'movies.json',
  workouts: 'workouts.json',
  todos: 'todos.json',
  finance: 'finance.json',
  habits: 'habits.json',
  calendar_events: 'calendar_events.json',
  journal_entries: 'journal_entries.json',
  notes: 'notes.json',
  templates: 'templates.json',
  study: 'study.json',
  boards: 'boards.json',
  tables: 'tables.json',
  projects: 'projects.json',
  contacts: 'contacts.json',
  health: 'health.json',
  goals: 'goals.json',
  inventory: 'inventory.json',
  app_settings: 'app_settings.json',
};

export const listCollections = new Set<CollectionName>([
  'movies',
  'todos',
  'calendar_events',
  'journal_entries',
  'notes',
  'templates',
  'study',
  'boards',
  'projects',
  'contacts',
  'goals',
  'inventory',
]);

export function nowIso() {
  return new Date().toISOString();
}

export function defaultValue(collectionName: CollectionName, dataDirectory: string) {
  if (collectionName === 'workouts') {
    return { exercises: [], exerciseGroups: [], plans: [], sessions: [], startingPosition: null, progressRecords: [], nutritionEntries: [] };
  }
  if (collectionName === 'todos') {
    return { items: [], groups: [] };
  }
  if (collectionName === 'finance') {
    return { startingBalance: 0, startedAt: null, transactions: [], savingsGoals: [], tags: [] };
  }
  if (collectionName === 'habits') {
    return { habits: [], logs: [] };
  }
  if (collectionName === 'health') {
    return { entries: [], metrics: [] };
  }
  if (collectionName === 'study') {
    return { selectedNodeId: null, nodes: [] };
  }
  if (collectionName === 'boards') {
    return { boards: [], folders: [] };
  }
  if (collectionName === 'tables') {
    return { activeTableId: null, folders: [], tables: [] };
  }
  if (collectionName === 'app_settings') {
    return {
      themeMode: 'system',
      language: 'en',
      dataDirectory,
      currency: 'USD',
      uiDensity: 'comfortable',
      accentColor: 'teal',
      startModule: 'dashboard',
      sidebar: { hiddenModules: [], groups: [] },
      seedDataCreated: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }
  return [];
}

export function assertCollectionName(value: string): CollectionName {
  if (value in collectionFiles) {
    return value as CollectionName;
  }
  throw new Error(`Unknown storage collection: ${value}`);
}
