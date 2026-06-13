import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { appModules, getModuleGroupIcon, type AppModuleDefinition } from '../app/moduleRegistry';
import { normalizeSidebarSettings } from '../app/appData';
import type { ModuleKey, SidebarModuleGroup, SidebarSettings } from '../types/common';
import { useI18n } from '../i18n/I18nProvider';
import { Tooltip } from './Tooltip';

type SidebarEntry =
  | { type: 'module'; module: AppModuleDefinition }
  | { type: 'group'; group: SidebarModuleGroup; modules: AppModuleDefinition[] };

interface SidebarProps {
  active: ModuleKey;
  isCollapsed: boolean;
  onNavigate: (key: ModuleKey) => void;
  onToggleCollapse: () => void;
  canToggleCollapse?: boolean;
  sidebarSettings: SidebarSettings;
  onSidebarSettingsChange: (settings: SidebarSettings) => void;
  reminderBadges?: Partial<Record<ModuleKey, number>>;
}

export function Sidebar({
  active,
  isCollapsed,
  onNavigate,
  onToggleCollapse,
  canToggleCollapse = true,
  sidebarSettings,
  onSidebarSettingsChange,
  reminderBadges,
}: SidebarProps) {
  const { t } = useI18n();
  const normalizedSettings = normalizeSidebarSettings(sidebarSettings);
  const entries = buildSidebarEntries(normalizedSettings);

  function toggleGroup(groupId: string) {
    onSidebarSettingsChange({
      ...normalizedSettings,
      groups: normalizedSettings.groups.map((group) => (group.id === groupId ? { ...group, isExpanded: !group.isExpanded } : group)),
    });
  }

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {canToggleCollapse ? (
        <Tooltip className="sidebar-collapse-tooltip" content={t(isCollapsed ? 'Expand sidebar' : 'Collapse sidebar')} position="bottom">
          <button
            className="sidebar-collapse-handle"
            type="button"
            aria-label={t(isCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
            onClick={onToggleCollapse}
          >
            {isCollapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
          </button>
        </Tooltip>
      ) : null}
      <nav>
        {entries.map((entry) =>
          entry.type === 'module' ? (
            <SidebarModuleButton
              key={entry.module.key}
              module={entry.module}
              active={active}
              isCollapsed={isCollapsed}
              reminderBadges={reminderBadges}
              onNavigate={onNavigate}
            />
          ) : (
            <SidebarGroupEntry
              key={entry.group.id}
              entry={entry}
              active={active}
              isCollapsed={isCollapsed}
              reminderBadges={reminderBadges}
              onNavigate={onNavigate}
              onToggle={() => toggleGroup(entry.group.id)}
            />
          ),
        )}
      </nav>
    </aside>
  );
}

function SidebarGroupEntry({
  entry,
  active,
  isCollapsed,
  reminderBadges,
  onNavigate,
  onToggle,
}: {
  entry: Extract<SidebarEntry, { type: 'group' }>;
  active: ModuleKey;
  isCollapsed: boolean;
  reminderBadges?: Partial<Record<ModuleKey, number>>;
  onNavigate: (key: ModuleKey) => void;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const GroupIcon = getModuleGroupIcon(entry.group.icon).icon;

  return (
    <div className="nav-group">
      <Tooltip content={t(entry.group.title)} disabled={!isCollapsed}>
        <button
          className={`nav-item nav-group-trigger ${entry.modules.some((module) => module.key === active) ? 'active group-active' : ''}`}
          type="button"
          aria-label={t(entry.group.title)}
          aria-expanded={entry.group.isExpanded}
          onClick={onToggle}
        >
          <GroupIcon size={18} aria-hidden="true" />
          <span>{t(entry.group.title)}</span>
          {entry.group.isExpanded ? (
            <ChevronDown className="nav-group-chevron" size={16} aria-hidden="true" />
          ) : (
            <ChevronRight className="nav-group-chevron" size={16} aria-hidden="true" />
          )}
        </button>
      </Tooltip>
      {entry.group.isExpanded && !isCollapsed ? (
        <div className="nav-group-items">
          {entry.modules.map((module) => (
            <SidebarModuleButton
              key={module.key}
              module={module}
              active={active}
              isCollapsed={false}
              reminderBadges={reminderBadges}
              onNavigate={onNavigate}
              nested
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SidebarModuleButton({
  module,
  active,
  isCollapsed,
  reminderBadges,
  onNavigate,
  nested = false,
}: {
  module: AppModuleDefinition;
  active: ModuleKey;
  isCollapsed: boolean;
  reminderBadges?: Partial<Record<ModuleKey, number>>;
  onNavigate: (key: ModuleKey) => void;
  nested?: boolean;
}) {
  const { t } = useI18n();
  const Icon = module.icon;
  const label = t(module.label);
  return (
    <Tooltip content={label} disabled={!isCollapsed}>
      <button
        className={`nav-item ${nested ? 'nav-subitem' : ''} ${active === module.key ? 'active' : ''}`}
        type="button"
        aria-label={label}
        onClick={() => onNavigate(module.key)}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{label}</span>
        {reminderBadges?.[module.key] ? <strong className="nav-badge">{reminderBadges[module.key]}</strong> : null}
      </button>
    </Tooltip>
  );
}

function buildSidebarEntries(settings: SidebarSettings): SidebarEntry[] {
  const hidden = new Set(settings.hiddenModules);
  const groupByModule = new Map<ModuleKey, SidebarModuleGroup>();
  for (const group of settings.groups) {
    for (const key of group.moduleKeys) {
      groupByModule.set(key, group);
    }
  }

  const renderedGroups = new Set<string>();
  const entries: SidebarEntry[] = [];
  for (const module of appModules) {
    if (hidden.has(module.key) && module.canHide) {
      continue;
    }

    const group = groupByModule.get(module.key);
    if (!group) {
      entries.push({ type: 'module', module });
      continue;
    }

    if (!group.isVisible || renderedGroups.has(group.id)) {
      continue;
    }

    const modules = appModules.filter((item) => group.moduleKeys.includes(item.key) && !(hidden.has(item.key) && item.canHide));
    if (modules.length > 0) {
      entries.push({ type: 'group', group, modules });
      renderedGroups.add(group.id);
    }
  }

  return entries;
}
