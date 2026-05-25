import type { CalendarEvent } from '../../modules/calendar/types';
import type { FinanceData } from '../../modules/finance/types';
import type { HabitData } from '../../modules/habits/types';
import type { JournalData } from '../../modules/journal/types';
import type { Movie } from '../../modules/movies/types';
import type { NotesData } from '../../modules/notes/types';
import type { Note, NoteAsset, NoteDraft, NoteIndexItem, NoteSearchIndexItem } from '../../modules/notes/types';
import type { ContactsData } from '../../modules/contacts/types';
import type { Goal } from '../../modules/goals/types';
import type { HealthData } from '../../modules/health/types';
import type { InventoryItem } from '../../modules/inventory/types';
import type { Project } from '../../modules/projects/types';
import type { TemplatesData } from '../../modules/templates/types';
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
  journal_entries: JournalData;
  notes: NotesData;
  templates: TemplatesData;
  projects: Project[];
  contacts: ContactsData;
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

export interface FileSystemApi {
  getPathForFile(file: unknown): string;
  saveAsset(payload: { name: string; data: ArrayBuffer }): Promise<string>;
  listAssets(): Promise<Array<{ path: string; url: string; sizeBytes: number }>>;
  getAssetInfo(url: string): Promise<{ url: string; exists: boolean; sizeBytes: number }>;
}

export interface NotesStorageApi {
  listIndex(): Promise<NoteIndexItem[]>;
  listSearchIndex(): Promise<NoteSearchIndexItem[]>;
  get(noteId: string): Promise<Note | null>;
  save(note: Note): Promise<Note>;
  patchMetadata(noteId: string, patch: Partial<Note>): Promise<Note | null>;
  patchManyMetadata(noteIds: string[], patch: Partial<Note>): Promise<boolean>;
  delete(noteId: string): Promise<boolean>;
  saveDraft(noteId: string, editorContent: unknown): Promise<NoteDraft>;
  getDraft(noteId: string): Promise<NoteDraft | null>;
  deleteDraft(noteId: string): Promise<boolean>;
  saveAsset(payload: { noteId: string; name: string; mimeType: string; data: ArrayBuffer }): Promise<NoteAsset & { url: string }>;
  listAssets(noteId: string): Promise<Array<NoteAsset & { url: string; exists: boolean }>>;
  getAssetInfo(noteId: string, assetId: string): Promise<(NoteAsset & { url: string; exists: boolean }) | null>;
  deleteAsset(noteId: string, assetId: string): Promise<boolean>;
  cleanupUnusedAssets(noteId: string): Promise<{ deleted: NoteAsset[]; kept: NoteAsset[]; totalSizeBytes: number }>;
  generateHtml(noteId: string): Promise<string>;
  getCachedHtml(noteId: string): Promise<string | null>;
  invalidateHtmlCache(noteId: string): Promise<boolean>;
}

declare global {
  interface Window {
    mymind: {
      storage: StorageApi;
      files?: FileSystemApi;
      notes?: NotesStorageApi;
    };
  }
}
