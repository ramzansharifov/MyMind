import type { CollectionName } from '../storage/storageTypes';

export type AppCollectionName = Exclude<CollectionName, 'app_settings'>;

export const dataCollections: AppCollectionName[] = [
  'movies',
  'workouts',
  'todos',
  'finance',
  'habits',
  'calendar_events',
  'journal_entries',
  'notes',
  'templates',
  'study',
  'boards',
  'projects',
  'contacts',
  'health',
  'goals',
  'inventory',
];

export const reminderCollections: AppCollectionName[] = ['todos', 'habits', 'calendar_events'];
