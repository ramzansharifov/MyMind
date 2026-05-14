import type { Language } from '../i18n/translations';

export type ThemeMode = 'light' | 'dark' | 'system';
export type UiDensity = 'comfortable' | 'compact';
export type AccentColor = 'teal' | 'blue' | 'violet' | 'amber';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  trashedAt?: string | null;
  trashExpiresAt?: string | null;
  statusBeforeArchive?: string | null;
  statusBeforeTrash?: string | null;
  pinnedAt?: string | null;
}

export interface AppSettings {
  themeMode: ThemeMode;
  language: Language;
  dataDirectory: string;
  currency: string;
  uiDensity: UiDensity;
  accentColor: AccentColor;
  startModule: ModuleKey;
  seedDataCreated: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ModuleKey =
  | 'dashboard'
  | 'movies'
  | 'workouts'
  | 'todos'
  | 'finance'
  | 'habits'
  | 'calendar'
  | 'journal'
  | 'notes'
  | 'projects'
  | 'contacts'
  | 'health'
  | 'goals'
  | 'inventory'
  | 'settings';
