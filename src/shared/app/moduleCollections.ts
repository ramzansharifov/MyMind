import type { ModuleKey } from '../types/common';
import { dataCollections, type AppCollectionName } from './collectionRegistry';

export const moduleCollections: Record<ModuleKey, AppCollectionName[]> = {
  dashboard: dataCollections,
  movies: ['movies'],
  workouts: ['workouts'],
  nutrition: ['workouts'],
  todos: ['todos'],
  finance: ['finance'],
  habits: ['habits'],
  calendar: ['calendar_events'],
  journal: ['journal_entries'],
  notes: ['notes'],
  templates: ['templates'],
  study: ['study', 'boards'],
  boards: ['boards'],
  projects: ['projects'],
  contacts: ['contacts'],
  health: ['health'],
  goals: ['goals'],
  inventory: ['inventory'],
  settings: dataCollections,
};

export function getModuleCollections(moduleKey: ModuleKey): AppCollectionName[] {
  return moduleCollections[moduleKey] ?? [moduleKey as AppCollectionName];
}
