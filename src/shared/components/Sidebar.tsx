import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { appModules, getModuleGroupIcon, type AppModuleDefinition } from '../app/moduleRegistry';
import { normalizeSidebarSettings } from '../app/appData';
import type { ModuleKey, SidebarModuleGroup, SidebarSettings } from '../types/common';
import { useI18n } from '../i18n/I18nProvider';

type SidebarEntry =
  | { type: 'module'; module: AppModuleDefinition }
  | { type: 'group'; group: SidebarModuleGroup; modules: AppModuleDefinition[] };

interface SidebarProps {
  active: ModuleKey;
  isCollapsed: boolean;
  onNavigate: (key: ModuleKey) => void;
  onToggleCollapse: () => void;
  sidebarSettings: SidebarSettings;
  onSidebarSettingsChange: (settings: SidebarSettings) => void;
  reminderBadges?: Partial<Record<ModuleKey, number>>;
}

export function Sidebar({
  active,
  isCollapsed,
  onNavigate,
  onToggleCollapse,
  sidebarSettings,
  onSidebarSettingsChange,
  reminderBadges,
}: SidebarProps) {
  const { t } = useI18n();
  const ToggleIcon = isCollapsed ? PanelLeftOpen : PanelLeftClose;
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
      <div className="brand">
        <span className="brand-mark">M</span>
        <div className="brand-copy">
          <strong>MyMind</strong>
          <small>{t('Personal OS')}</small>
        </div>
        <button
          className="sidebar-toggle"
          type="button"
          title={t(isCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          aria-label={t(isCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          onClick={onToggleCollapse}
        >
          <ToggleIcon size={18} aria-hidden="true" />
        </button>
      </div>
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
      <button
        className={`nav-item nav-group-trigger ${entry.modules.some((module) => module.key === active) ? 'active group-active' : ''}`}
        type="button"
        title={isCollapsed ? t(entry.group.title) : undefined}
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
    <button
      className={`nav-item ${nested ? 'nav-subitem' : ''} ${active === module.key ? 'active' : ''}`}
      type="button"
      title={isCollapsed ? label : undefined}
      aria-label={label}
      onClick={() => onNavigate(module.key)}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      {reminderBadges?.[module.key] ? <strong className="nav-badge">{reminderBadges[module.key]}</strong> : null}
    </button>
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
