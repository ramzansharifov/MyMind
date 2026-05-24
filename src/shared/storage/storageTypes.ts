import type { CalendarEvent } from '../../modules/calendar/types';
import type { FinanceData } from '../../modules/finance/types';
import type { HabitData } from '../../modules/habits/types';
import type { JournalEntry } from '../../modules/journal/types';
import type { Movie } from '../../modules/movies/types';
import type { Note } from '../../modules/notes/types';
import type { Contact } from '../../modules/contacts/types';
import type { Goal } from '../../modules/goals/types';
import type { HealthData } from '../../modules/health/types';
import type { InventoryItem } from '../../modules/inventory/types';
import type { Project } from '../../modules/projects/types';
import type { TextTemplate } from '../../modules/templates/types';
import type { TodoData } from '../../modules/todos/types';
import type { WorkoutData } from '../../modules/workouts/types';
import type { AppSettings } from '../types/common';

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

export interface CollectionMap {
  movies: Movie[];
  workouts: WorkoutData;
  todos: TodoData;
  finance: FinanceData;
  habits: HabitData;
  calendar_events: CalendarEvent[];
  journal_entries: JournalEntry[];
  notes: Note[];
  templates: TextTemplate[];
  projects: Project[];
  contacts: Contact[];
  health: HealthData;
  goals: Goal[];
  inventory: InventoryItem[];
  app_settings: AppSettings;
}

export interface StorageApi {
  getAll<K extends CollectionName>(collectionName: K): Promise<CollectionMap[K]>;
  saveAll<K extends CollectionName>(collectionName: K, items: CollectionMap[K]): Promise<CollectionMap[K]>;
  add<T extends { id: string }>(collectionName: CollectionName, item: T): Promise<T>;
  update<T extends { id: string }>(collectionName: CollectionName, item: T): Promise<T>;
  delete(collectionName: CollectionName, id: string): Promise<boolean>;
  getDataDirectory(): Promise<string>;
  openDataDirectory(): Promise<string>;
  exportBackup(): Promise<string>;
  importBackup(): Promise<string | null>;
  exportBackupFile(): Promise<string | null>;
  importBackupFile(): Promise<string | null>;
  exportCollection(collectionName: CollectionName): Promise<string | null>;
  importCollection(collectionName: CollectionName): Promise<string | null>;
  scheduleReminders(reminders: Array<{ id: string; title: string; body: string; at: string }>): Promise<boolean>;
}

declare global {
  interface Window {
    mymind: {
      storage: StorageApi;
    };
  }
}
