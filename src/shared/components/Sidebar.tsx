import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { appModules, getModuleGroupIcon, type AppModuleDefinition } from '../app/moduleRegistry';
import { normalizeSidebarSettings } from '../app/appData';
import type { ModuleKey, SidebarModuleGroup, SidebarSettings } from '../types/common';
import { useI18n } from '../i18n/I18nProvider';
import { Tooltip } from './Tooltip';
import { cn } from '../utils/classNames';

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
    <aside
      className={cn(
        'group/sidebar relative z-20 min-w-0 overflow-visible border-r border-[var(--glass-border)]',
        'bg-[linear-gradient(180deg,var(--glass-highlight),transparent_34%),color-mix(in_srgb,var(--glass-surface-strong)_90%,black_10%)]',
        '[backdrop-filter:var(--glass-blur)] shadow-[inset_-1px_0_0_color-mix(in_srgb,white_4%,transparent)]',
        'px-3.5 py-[22px] transition-[padding] duration-200 ease-out',
        "after:absolute after:bottom-0 after:right-[-12px] after:top-0 after:w-6 after:content-['']",
        isCollapsed && 'px-3',
      )}
    >
      {canToggleCollapse ? (
        <div className="absolute right-0 top-1/2 z-[30] h-[30px] w-[30px] translate-x-1/2 -translate-y-1/2">
          <Tooltip
            content={t(isCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
            position="bottom"
          >
            <button
              className={cn(
                'pointer-events-none grid h-[30px] w-[30px] place-items-center rounded-full',
                'border border-[color-mix(in_srgb,var(--accent)_38%,var(--glass-border))]',
                'bg-[color-mix(in_srgb,var(--glass-surface-strong)_94%,black_6%)] text-app-accent-strong opacity-0 shadow-[0_12px_24px_var(--shadow)]',
                'transition-[opacity,background,border-color] duration-150 ease-out',
                'hover:border-[color-mix(in_srgb,var(--accent)_64%,var(--glass-border))] hover:bg-[color-mix(in_srgb,var(--accent)_18%,var(--glass-surface-strong))]',
                'focus-visible:pointer-events-auto focus-visible:opacity-100',
                'group-hover/sidebar:pointer-events-auto group-hover/sidebar:opacity-100',
              )}
              type="button"
              aria-label={t(isCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
              onClick={onToggleCollapse}
            >
              {isCollapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
            </button>
          </Tooltip>
        </div>
      ) : null}
      <SidebarLogo isCollapsed={isCollapsed} />
      <nav className="grid gap-1.5">
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

function SidebarLogo({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className="mb-5" aria-label="MyMind">
      <div
        className={cn(
          'flex h-12 items-center gap-3 rounded-panel px-1.5 text-app-text',
          isCollapsed && 'justify-center px-0',
        )}
      >
        <span
          className={cn(
            'relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px]',
            'border border-[color-mix(in_srgb,var(--accent)_44%,var(--glass-border))]',
            'bg-[radial-gradient(circle_at_32%_24%,color-mix(in_srgb,var(--accent-strong)_46%,white_8%),transparent_34%),linear-gradient(145deg,color-mix(in_srgb,var(--accent)_26%,var(--surface-strong)),color-mix(in_srgb,var(--glass-surface-strong)_92%,black_8%))]',
            'text-app-accent-strong shadow-[0_14px_34px_color-mix(in_srgb,var(--accent-glow)_70%,transparent),inset_0_1px_0_var(--glass-highlight)]',
          )}
          aria-hidden="true"
        >
          <svg className="h-6 w-6" viewBox="0 0 28 28" fill="none">
            <path
              d="M6.5 19.5V8.5L14 16L21.5 8.5V19.5"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9.5 8.5H6.5M21.5 8.5H18.5"
              stroke="color-mix(in_srgb,var(--accent-strong)_54%,white)"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <circle cx="14" cy="16" r="1.9" fill="currentColor" />
          </svg>
        </span>

        <span className={cn('grid min-w-0 transition-opacity duration-200', isCollapsed && 'hidden opacity-0')}>
          <strong className="truncate text-lg font-extrabold leading-tight text-app-text">MyMind</strong>
          <small className="truncate text-xs font-bold uppercase tracking-[0.12em] text-app-accent-strong">
            Personal OS
          </small>
        </span>
      </div>

      <div className="mt-5 h-px border-t border-[var(--glass-border)]" />
    </div>
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
    <div className="grid gap-1">
      <Tooltip content={t(entry.group.title)} disabled={!isCollapsed}>
        <button
          className={sidebarItemClass({
            active: entry.modules.some((module) => module.key === active),
            collapsed: isCollapsed,
          })}
          type="button"
          aria-label={t(entry.group.title)}
          aria-expanded={entry.group.isExpanded}
          onClick={onToggle}
        >
          <GroupIcon size={18} aria-hidden="true" />
          <span className={cn('min-w-0 overflow-hidden text-ellipsis whitespace-nowrap', isCollapsed && 'hidden')}>{t(entry.group.title)}</span>
          {entry.group.isExpanded ? (
            <ChevronDown className={cn('ml-auto', isCollapsed && 'hidden')} size={16} aria-hidden="true" />
          ) : (
            <ChevronRight className={cn('ml-auto', isCollapsed && 'hidden')} size={16} aria-hidden="true" />
          )}
        </button>
      </Tooltip>
      {entry.group.isExpanded && !isCollapsed ? (
        <div className="grid gap-1 pl-3">
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
        className={sidebarItemClass({ active: active === module.key, collapsed: isCollapsed, nested })}
        type="button"
        aria-label={label}
        onClick={() => onNavigate(module.key)}
      >
        <span className={cn('grid shrink-0 place-items-center transition-colors group-hover/nav:text-app-accent-strong', active === module.key ? 'text-app-accent-strong' : 'text-app-muted')}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className={cn('min-w-0 overflow-hidden text-ellipsis whitespace-nowrap', isCollapsed && 'hidden')}>{label}</span>
        {reminderBadges?.[module.key] ? (
          <strong
            className={cn(
              'ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-app-danger px-1.5 text-xs leading-none text-white',
              isCollapsed && 'absolute right-1 top-1.5 h-4 min-w-4 px-1 text-[10px]',
            )}
          >
            {reminderBadges[module.key]}
          </strong>
        ) : null}
      </button>
    </Tooltip>
  );
}

function sidebarItemClass({
  active,
  collapsed,
  nested = false,
}: {
  active: boolean;
  collapsed: boolean;
  nested?: boolean;
}) {
  return cn(
    'group/nav relative flex h-10 min-h-10 w-full items-center gap-3 rounded-panel border border-transparent bg-transparent px-3 text-left',
    'text-[color-mix(in_srgb,var(--text)_78%,var(--muted))] transition-[background,color,border-color,padding,box-shadow] duration-200 ease-out',
    'hover:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--glass-highlight)_92%,transparent),transparent),color-mix(in_srgb,var(--accent)_13%,var(--glass-surface-strong))] hover:text-app-text',
    active &&
    "border-[color-mix(in_srgb,var(--accent)_34%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_20%,var(--glass-highlight)),transparent_58%),color-mix(in_srgb,var(--accent)_18%,var(--glass-surface-strong))] text-app-accent-strong shadow-[inset_3px_0_0_var(--accent),0_10px_26px_color-mix(in_srgb,var(--accent)_10%,transparent)] after:absolute after:right-0 after:top-[9px] after:bottom-[9px] after:w-1 after:rounded-full after:bg-app-accent-strong after:shadow-[0_0_18px_var(--accent-glow-strong)]",
    collapsed && 'justify-center gap-0 px-3 after:hidden',
    nested && !collapsed && 'pl-[18px]',
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
