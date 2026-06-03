import type { Language } from '../i18n/translations';

export type ThemeMode = 'light' | 'dark' | 'system';
export type UiDensity = 'comfortable' | 'compact';
export type AccentColor = 'teal' | 'blue' | 'violet' | 'amber';
export type ModuleGroupIconKey = 'folder' | 'personal' | 'work' | 'creative' | 'wellness' | 'archive';

export interface SidebarModuleGroup {
  id: string;
  title: string;
  icon: ModuleGroupIconKey;
  moduleKeys: ModuleKey[];
  isVisible: boolean;
  isExpanded: boolean;
}

export interface SidebarSettings {
  hiddenModules: ModuleKey[];
  groups: SidebarModuleGroup[];
}

export interface ContentGroup {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupedContentData<TItem> {
  items: TItem[];
  groups: ContentGroup[];
}

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
  sidebar: SidebarSettings;
  seedDataCreated: boolean;
  createdAt: string;
  updatedAt: string;
  weatherCity?: {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
  } | null;
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
  | 'templates'
  | 'study'
  | 'projects'
  | 'contacts'
  | 'health'
  | 'goals'
  | 'inventory'
  | 'settings';
