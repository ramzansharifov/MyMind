import { appModules, moduleGroupIconDefinitions } from './moduleRegistry';
import type { AppSettings, ModuleGroupIconKey, ModuleKey, SidebarSettings } from '../types/common';

export function createDefaultSettings(): AppSettings {
  const timestamp = new Date().toISOString();
  return {
    themeMode: 'system',
    language: 'en',
    dataDirectory: '',
    currency: 'USD',
    uiDensity: 'comfortable',
    accentColor: 'teal',
    startModule: 'dashboard',
    sidebar: createDefaultSidebarSettings(),
    seedDataCreated: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createDefaultSidebarSettings(): SidebarSettings {
  return {
    hiddenModules: [],
    groups: [],
  };
}

export function normalizeSettings(settings: AppSettings): AppSettings {
  const startModule = appModules.some((module) => module.key === settings.startModule) ? settings.startModule : 'dashboard';

  return {
    ...createDefaultSettings(),
    ...settings,
    startModule,
    sidebar: normalizeSidebarSettings(settings.sidebar),
  };
}

export function normalizeSidebarSettings(settings: SidebarSettings | undefined): SidebarSettings {
  const hideableModules = new Set(appModules.filter((module) => module.canHide).map((module) => module.key));
  const groupableModules = new Set(appModules.filter((module) => module.canGroup).map((module) => module.key));
  const usedModuleKeys = new Set<ModuleKey>();
  return {
    hiddenModules: Array.from(new Set(settings?.hiddenModules ?? [])).filter((key) => hideableModules.has(key)),
    groups: (settings?.groups ?? []).map((group) => {
      const moduleKeys = Array.from(new Set(group.moduleKeys ?? [])).filter((key) => {
        if (!groupableModules.has(key) || usedModuleKeys.has(key)) {
          return false;
        }
        usedModuleKeys.add(key);
        return true;
      });
      const icon = (group as Partial<{ icon: ModuleGroupIconKey }>).icon;
      return {
        id: group.id,
        title: group.title || 'New group',
        icon: icon && moduleGroupIconDefinitions.has(icon) ? icon : 'folder',
        moduleKeys,
        isVisible: group.isVisible ?? true,
        isExpanded: group.isExpanded ?? true,
      };
    }),
  };
}
