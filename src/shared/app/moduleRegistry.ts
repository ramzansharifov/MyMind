import {
  Activity,
  Archive,
  BookOpen,
  BriefcaseBusiness,
  CalendarHeart,
  CheckSquare,
  Clapperboard,
  Contact,
  Dumbbell,
  Film,
  Flag,
  Folder,
  HeartPulse,
  Home,
  Landmark,
  Lightbulb,
  Package,
  PencilRuler,
  Settings,
  Sparkles,
  TextQuote,
  GraduationCap,
  UserRound,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { ModuleGroupIconKey, ModuleKey } from '../types/common';

type LucideComponent = ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>;

export interface AppModuleDefinition {
  key: ModuleKey;
  label: string;
  icon: LucideComponent;
  canHide: boolean;
  canGroup: boolean;
}

export const appModules: AppModuleDefinition[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Home, canHide: false, canGroup: false },
  { key: 'movies', label: 'Movies', icon: Film, canHide: true, canGroup: true },
  { key: 'workouts', label: 'Workouts', icon: Dumbbell, canHide: true, canGroup: true },
  { key: 'todos', label: 'Todo', icon: CheckSquare, canHide: true, canGroup: true },
  { key: 'finance', label: 'Finance', icon: Landmark, canHide: true, canGroup: true },
  { key: 'habits', label: 'Habits', icon: Activity, canHide: true, canGroup: true },
  { key: 'calendar', label: 'Calendar', icon: CalendarHeart, canHide: true, canGroup: true },
  { key: 'journal', label: 'Diary', icon: BookOpen, canHide: true, canGroup: true },
  { key: 'notes', label: 'Notes', icon: Lightbulb, canHide: true, canGroup: true },
  { key: 'templates', label: 'Templates', icon: TextQuote, canHide: true, canGroup: true },
  { key: 'study', label: 'Обучение', icon: GraduationCap, canHide: true, canGroup: true },
  { key: 'boards', label: 'Boards', icon: PencilRuler, canHide: true, canGroup: true },
  { key: 'projects', label: 'Projects', icon: Clapperboard, canHide: true, canGroup: true },
  { key: 'contacts', label: 'Contacts', icon: Contact, canHide: true, canGroup: true },
  { key: 'health', label: 'Health', icon: HeartPulse, canHide: true, canGroup: true },
  { key: 'goals', label: 'Goals', icon: Flag, canHide: true, canGroup: true },
  { key: 'inventory', label: 'Inventory', icon: Package, canHide: true, canGroup: true },
  { key: 'settings', label: 'Settings', icon: Settings, canHide: false, canGroup: false },
];

export const moduleDefinitions = new Map(appModules.map((module) => [module.key, module]));

export const moduleGroupIcons: Array<{ key: ModuleGroupIconKey; label: string; icon: LucideComponent }> = [
  { key: 'folder', label: 'Folder', icon: Folder },
  { key: 'personal', label: 'Personal', icon: UserRound },
  { key: 'work', label: 'Work', icon: BriefcaseBusiness },
  { key: 'creative', label: 'Creative', icon: Sparkles },
  { key: 'wellness', label: 'Wellness', icon: HeartPulse },
  { key: 'archive', label: 'Archive', icon: Archive },
];

export const moduleGroupIconDefinitions = new Map(moduleGroupIcons.map((item) => [item.key, item]));

export function getModuleDefinition(key: ModuleKey) {
  return moduleDefinitions.get(key);
}

export function getModuleGroupIcon(key: ModuleGroupIconKey | undefined) {
  return moduleGroupIconDefinitions.get(key ?? 'folder') ?? moduleGroupIcons[0];
}
