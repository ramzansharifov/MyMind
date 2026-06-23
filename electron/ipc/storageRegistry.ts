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
  | 'projects'
  | 'contacts'
  | 'health'
  | 'goals'
  | 'inventory'
  | 'app_settings';

export const collections = [
  'movies',
  'workouts',
  'todos',
  'finance',
  'habits',
  'calendar_events',
  'journal_entries',
  'notes',
  'templates',
  'projects',
  'contacts',
  'health',
  'goals',
  'inventory',
  'app_settings',
] as const satisfies readonly CollectionName[];

const collectionSet = new Set<string>(collections);

export const listCollections = new Set<CollectionName>([
  'movies',
  'calendar_events',
  'journal_entries',
  'templates',
  'projects',
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
  if (collectionName === 'notes') {
    return { items: [], groups: [] };
  }
  if (collectionName === 'templates') {
    return { items: [], groups: [] };
  }
  if (collectionName === 'contacts') {
    return { items: [], groups: [] };
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
  if (collectionSet.has(value)) {
    return value as CollectionName;
  }
  throw new Error(`Unknown storage collection: ${value}`);
}
