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
  Utensils,
  UserRound,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { ModuleGroupIconKey, ModuleKey } from '../types/common';

type LucideComponent = ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>;

export interface AppModuleDefinition {
  key: ModuleKey;
  label: string;
  labelKey: string;
  icon: LucideComponent;
  canHide: boolean;
  canGroup: boolean;
}

export const appModules: AppModuleDefinition[] = [
  { key: 'dashboard', label: 'Dashboard', labelKey: 'modules.dashboard', icon: Home, canHide: false, canGroup: false },
  { key: 'movies', label: 'Movies', labelKey: 'modules.movies', icon: Film, canHide: true, canGroup: true },
  { key: 'workouts', label: 'Workouts', labelKey: 'modules.workouts', icon: Dumbbell, canHide: true, canGroup: true },
  { key: 'nutrition', label: 'Nutrition', labelKey: 'modules.nutrition', icon: Utensils, canHide: true, canGroup: true },
  { key: 'todos', label: 'Todo', labelKey: 'modules.todos', icon: CheckSquare, canHide: true, canGroup: true },
  { key: 'finance', label: 'Finance', labelKey: 'modules.finance', icon: Landmark, canHide: true, canGroup: true },
  { key: 'habits', label: 'Habits', labelKey: 'modules.habits', icon: Activity, canHide: true, canGroup: true },
  { key: 'calendar', label: 'Calendar', labelKey: 'modules.calendar', icon: CalendarHeart, canHide: true, canGroup: true },
  { key: 'journal', label: 'Diary', labelKey: 'modules.journal', icon: BookOpen, canHide: true, canGroup: true },
  { key: 'notes', label: 'Notes', labelKey: 'modules.notes', icon: Lightbulb, canHide: true, canGroup: true },
  { key: 'templates', label: 'Templates', labelKey: 'modules.templates', icon: TextQuote, canHide: true, canGroup: true },
  { key: 'study', label: 'Обучение', labelKey: 'modules.study', icon: GraduationCap, canHide: true, canGroup: true },
  { key: 'boards', label: 'Boards', labelKey: 'modules.boards', icon: PencilRuler, canHide: true, canGroup: true },
  { key: 'projects', label: 'Projects', labelKey: 'modules.projects', icon: Clapperboard, canHide: true, canGroup: true },
  { key: 'contacts', label: 'Contacts', labelKey: 'modules.contacts', icon: Contact, canHide: true, canGroup: true },
  { key: 'health', label: 'Health', labelKey: 'modules.health', icon: HeartPulse, canHide: true, canGroup: true },
  { key: 'goals', label: 'Goals', labelKey: 'modules.goals', icon: Flag, canHide: true, canGroup: true },
  { key: 'inventory', label: 'Inventory', labelKey: 'modules.inventory', icon: Package, canHide: true, canGroup: true },
  { key: 'settings', label: 'Settings', labelKey: 'modules.settings', icon: Settings, canHide: false, canGroup: false },
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

export function getModuleDisplayLabel(module: AppModuleDefinition, translate: (value: string) => string) {
  const translatedLabel = translate(module.labelKey);
  return translatedLabel === module.labelKey ? translate(module.label) : translatedLabel;
}

export function getModuleGroupIcon(key: ModuleGroupIconKey | undefined) {
  return moduleGroupIconDefinitions.get(key ?? 'folder') ?? moduleGroupIcons[0];
}
